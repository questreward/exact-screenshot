-- 0096 — Impôt sur le revenu réaliste (barème français, prélèvement à la source, déclaration annuelle).
-- Touché :
--   * 4 nouvelles tables : income_tax_settings (barème, réglable), income_tax_months (prélèvement mensuel),
--     income_tax_returns (déclarations/avis annuels), income_tax_profiles (reste à payer + total réglé).
--   * 4 fonctions : income_tax_compute (calcul du barème, lecture seule), income_tax_settle (règlement interne),
--     income_tax_state (lecture du joueur, règle ce qui est échu), income_tax_declare (déclarer une année).
--   * Aucune table ni fonction existante modifiée. Revenus imposables lus (sans les changer) :
--     travail terminé (activities) et traitements des métiers de secours (security_ledger).
--   * Seuls les mois APRÈS l'installation sont imposés : pas d'impôt rétroactif.
-- Règles validées par Alex : barème 0/11/30/41/45 %, abattement 10 % (495 € à 14 171 €), 1 part ;
--   prélèvement chaque mois ; déclaration d'avril à fin mai pour l'année précédente ; oubli = avis automatique + 10 %.
--   Le solde ne devient jamais négatif : ce qui ne peut être payé reste dû et est prélevé plus tard.
-- Installation : docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0096_income_tax.sql
BEGIN;

CREATE TABLE public.income_tax_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  installed_at timestamptz NOT NULL DEFAULT public.game_now(),
  thresholds integer[] NOT NULL DEFAULT '{11497,29315,83823,180294}',
  rates integer[] NOT NULL DEFAULT '{0,11,30,41,45}',
  abatement_pct integer NOT NULL DEFAULT 10,
  abatement_min integer NOT NULL DEFAULT 495,
  abatement_max integer NOT NULL DEFAULT 14171,
  late_pct integer NOT NULL DEFAULT 10,
  declare_from_month integer NOT NULL DEFAULT 4,
  declare_until_month integer NOT NULL DEFAULT 5,
  catchup_months integer NOT NULL DEFAULT 24
);
INSERT INTO public.income_tax_settings (id) VALUES (1);

CREATE TABLE public.income_tax_months (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  month text NOT NULL,
  income integer NOT NULL,
  rate numeric(5,2) NOT NULL,
  withheld integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, month)
);
CREATE TABLE public.income_tax_returns (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  year integer NOT NULL,
  income integer NOT NULL,
  abatement integer NOT NULL,
  taxable integer NOT NULL,
  tax integer NOT NULL,
  late_fee integer NOT NULL DEFAULT 0,
  withheld integer NOT NULL,
  balance integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('declaree','automatique')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, year)
);
CREATE TABLE public.income_tax_profiles (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  debt integer NOT NULL DEFAULT 0 CHECK (debt >= 0),
  paid_total integer NOT NULL DEFAULT 0 CHECK (paid_total >= 0)
);

GRANT SELECT ON public.income_tax_settings TO authenticated;
GRANT SELECT ON public.income_tax_months, public.income_tax_returns, public.income_tax_profiles TO authenticated;
GRANT ALL ON public.income_tax_settings, public.income_tax_months, public.income_tax_returns, public.income_tax_profiles TO service_role;
ALTER TABLE public.income_tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_tax_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_tax_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_tax_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY income_tax_settings_read ON public.income_tax_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY income_tax_months_owner ON public.income_tax_months FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY income_tax_returns_owner ON public.income_tax_returns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY income_tax_profiles_owner ON public.income_tax_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- Barème : revenu annuel (salaires nets) -> abattement, net imposable, impôt (1 part).
CREATE FUNCTION public.income_tax_compute(_income integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.income_tax_settings; ab int; taxable int; tax numeric := 0; lo int := 0; i int; hi int; BEGIN
  SELECT * INTO s FROM public.income_tax_settings WHERE id = 1;
  IF _income <= 0 THEN RETURN jsonb_build_object('abatement', 0, 'taxable', 0, 'tax', 0); END IF;
  ab := least(_income, least(s.abatement_max, greatest(s.abatement_min, round(_income * s.abatement_pct / 100.0)::int)));
  taxable := _income - ab;
  FOR i IN 1 .. array_length(s.rates, 1) LOOP
    hi := CASE WHEN i <= array_length(s.thresholds, 1) THEN s.thresholds[i] ELSE NULL END;
    IF taxable > lo THEN tax := tax + (least(taxable, coalesce(hi, taxable)) - lo) * s.rates[i] / 100.0; END IF;
    EXIT WHEN hi IS NULL OR taxable <= hi; lo := hi;
  END LOOP;
  RETURN jsonb_build_object('abatement', ab, 'taxable', taxable, 'tax', round(tax)::int);
END $$;

-- Revenus d'un mois (mêmes sources que les bulletins de paie).
CREATE FUNCTION public.income_tax_month_income(_cid uuid, _month text) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (COALESCE((SELECT sum(reward) FROM public.activities WHERE character_id = _cid AND type = 'work' AND status = 'completed' AND reward > 0
            AND to_char(end_time AT TIME ZONE 'UTC', 'YYYY-MM') = _month), 0)
        + COALESCE((SELECT sum(amount) FROM public.security_ledger WHERE character_id = _cid AND kind IN ('salaire','indemnite')
            AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = _month), 0))::int $$;

-- Crée l'avis d'une année (une seule fois) et ajoute le solde au reste à payer ou rembourse le trop-perçu.
CREATE FUNCTION public.income_tax_close_year(_cid uuid, _year integer, _kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.income_tax_settings; inc int; wh int; r jsonb; fee int := 0; bal int; BEGIN
  SELECT * INTO s FROM public.income_tax_settings WHERE id = 1;
  IF EXISTS (SELECT 1 FROM public.income_tax_returns WHERE character_id = _cid AND year = _year) THEN RETURN; END IF;
  SELECT COALESCE(sum(income), 0), COALESCE(sum(withheld), 0) INTO inc, wh FROM public.income_tax_months WHERE character_id = _cid AND month LIKE _year || '-%';
  r := public.income_tax_compute(inc);
  IF _kind = 'automatique' THEN fee := round((r->>'tax')::int * s.late_pct / 100.0)::int; END IF;
  bal := (r->>'tax')::int + fee - wh;
  INSERT INTO public.income_tax_returns (character_id, year, income, abatement, taxable, tax, late_fee, withheld, balance, kind)
    VALUES (_cid, _year, inc, (r->>'abatement')::int, (r->>'taxable')::int, (r->>'tax')::int, fee, wh, bal, _kind);
  IF bal > 0 THEN UPDATE public.income_tax_profiles SET debt = debt + bal WHERE character_id = _cid;
  ELSIF bal < 0 THEN PERFORM public.economy_cash(_cid, 'tax:refund:' || _year, -bal, 'Remboursement d''impôt ' || _year, 'impot', '{}'::jsonb);
  END IF;
END $$;

-- Règlement idempotent (verrou sur le profil) : mois échus, avis automatiques, paiement du reste dû.
CREATE FUNCTION public.income_tax_settle(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.income_tax_settings; p public.income_tax_profiles; now_m date; m date; first_m date; inc int; rate numeric; wh int; y int; bal int; pay int; BEGIN
  SELECT * INTO s FROM public.income_tax_settings WHERE id = 1;
  INSERT INTO public.income_tax_profiles (character_id) VALUES (_cid) ON CONFLICT DO NOTHING;
  SELECT * INTO p FROM public.income_tax_profiles WHERE character_id = _cid FOR UPDATE;
  now_m := date_trunc('month', public.game_now() AT TIME ZONE 'UTC')::date;
  first_m := greatest((date_trunc('month', s.installed_at AT TIME ZONE 'UTC') + interval '1 month')::date, (now_m - s.catchup_months * interval '1 month')::date);
  m := first_m;
  WHILE m < now_m LOOP
    IF NOT EXISTS (SELECT 1 FROM public.income_tax_months WHERE character_id = _cid AND month = to_char(m, 'YYYY-MM')) THEN
      inc := public.income_tax_month_income(_cid, to_char(m, 'YYYY-MM'));
      rate := CASE WHEN inc > 0 THEN round((public.income_tax_compute(inc * 12)->>'tax')::numeric * 100 / (inc * 12), 2) ELSE 0 END;
      wh := round(inc * rate / 100)::int;
      INSERT INTO public.income_tax_months (character_id, month, income, rate, withheld) VALUES (_cid, to_char(m, 'YYYY-MM'), inc, rate, wh);
      UPDATE public.income_tax_profiles SET debt = debt + wh WHERE character_id = _cid;
    END IF;
    m := (m + interval '1 month')::date;
  END LOOP;
  -- Avis automatique (+ majoration) pour toute année non déclarée après la fin de la période.
  FOR y IN SELECT DISTINCT left(month, 4)::int FROM public.income_tax_months WHERE character_id = _cid LOOP
    IF now_m >= make_date(y + 1, s.declare_until_month + 1, 1) THEN PERFORM public.income_tax_close_year(_cid, y, 'automatique'); END IF;
  END LOOP;
  -- Paiement de ce qui est dû, dans la limite du solde (jamais négatif).
  SELECT * INTO p FROM public.income_tax_profiles WHERE character_id = _cid;
  bal := COALESCE((SELECT balance FROM public.accounts WHERE character_id = _cid ORDER BY created_at LIMIT 1), 0);
  pay := least(p.debt, greatest(bal, 0));
  IF pay > 0 THEN
    PERFORM public.economy_cash(_cid, 'tax:pay:' || p.paid_total, -pay, 'Impôt sur le revenu (prélèvement à la source)', 'impot', '{}'::jsonb);
    UPDATE public.income_tax_profiles SET debt = debt - pay, paid_total = paid_total + pay WHERE character_id = _cid;
  END IF;
END $$;

CREATE FUNCTION public.income_tax_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.income_tax_settings; cur text; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  PERFORM public.income_tax_settle(cid);
  SELECT * INTO s FROM public.income_tax_settings WHERE id = 1;
  cur := to_char(public.game_now() AT TIME ZONE 'UTC', 'YYYY-MM');
  RETURN jsonb_build_object('now', public.game_now(),
    'settings', to_jsonb(s) - 'id',
    'profile', (SELECT to_jsonb(p) - 'character_id' FROM public.income_tax_profiles p WHERE p.character_id = cid),
    'current_month', jsonb_build_object('month', cur, 'income', public.income_tax_month_income(cid, cur)),
    'months', COALESCE((SELECT jsonb_agg(to_jsonb(x) - 'character_id' ORDER BY x.month DESC) FROM public.income_tax_months x WHERE x.character_id = cid), '[]'::jsonb),
    'returns', COALESCE((SELECT jsonb_agg(to_jsonb(r) - 'character_id' ORDER BY r.year DESC) FROM public.income_tax_returns r WHERE r.character_id = cid), '[]'::jsonb));
END $$;

CREATE FUNCTION public.income_tax_declare(_year integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.income_tax_settings; t date := (public.game_now() AT TIME ZONE 'UTC')::date; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.income_tax_settings WHERE id = 1;
  PERFORM public.income_tax_settle(cid);
  IF EXISTS (SELECT 1 FROM public.income_tax_returns WHERE character_id = cid AND year = _year) THEN RAISE EXCEPTION 'Revenus % déjà déclarés.', _year; END IF;
  IF extract(year FROM t)::int <> _year + 1 OR extract(month FROM t)::int NOT BETWEEN s.declare_from_month AND s.declare_until_month THEN
    RAISE EXCEPTION 'La déclaration des revenus % est ouverte d''avril à fin mai %.', _year, _year + 1; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.income_tax_months WHERE character_id = cid AND month LIKE _year || '-%') THEN
    RAISE EXCEPTION 'Aucun revenu à déclarer pour %.', _year; END IF;
  PERFORM public.income_tax_close_year(cid, _year, 'declaree');
  PERFORM public.income_tax_settle(cid);
  RETURN public.income_tax_state();
END $$;

REVOKE ALL ON FUNCTION public.income_tax_compute(integer), public.income_tax_month_income(uuid, text), public.income_tax_close_year(uuid, integer, text),
  public.income_tax_settle(uuid), public.income_tax_state(), public.income_tax_declare(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.income_tax_month_income(uuid, text), public.income_tax_close_year(uuid, integer, text), public.income_tax_settle(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.income_tax_month_income(uuid, text), public.income_tax_close_year(uuid, integer, text), public.income_tax_settle(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.income_tax_compute(integer), public.income_tax_state(), public.income_tax_declare(integer) TO authenticated, service_role;

COMMIT;
