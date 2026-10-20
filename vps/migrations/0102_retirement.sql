-- 0102 — Retraite et cotisations (relevé de carrière, trimestres, pension, départ à 64 ans).
-- Touché :
--   * 4 nouvelles tables : retirement_settings (réglages), retirement_years (une ligne par année d'âge : salaire brut annualisé,
--     trimestres, points), retirement_profiles (suivi + départ), retirement_payments (une pension par mois, clé unique).
--   * Fonctions : retirement_period_income (interne), retirement_settle (interne), retirement_estimate (interne),
--     retirement_state, retirement_claim.
--   * Réutilise sans les modifier : âge (0100, 1 an par mois réel), salaires (agenda) et payes de secours (security_ledger),
--     brut recalculé comme sur les bulletins (net = 78 % du brut), economy_cash pour verser la pension.
-- Règles validées par Alex : trimestres comme en vrai (1 par tranche de 1 800 € brut/an, 4 max par an) ;
--   pension = 50 % × salaire annuel moyen (25 meilleures années) × trimestres / 172 + complémentaire en points ;
--   départ réel possible à 64 ans. Une année d'âge dure ~1 mois réel : son salaire est ramené à l'année (annualisé).
--   Seules les années commencées après l'installation comptent. Il faut avoir quitté son emploi pour partir.
-- Installation : docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0102_retirement.sql
BEGIN;

CREATE TABLE public.retirement_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  legal_age integer NOT NULL DEFAULT 64,
  quarter_gross integer NOT NULL DEFAULT 1800,
  full_quarters integer NOT NULL DEFAULT 172,
  base_rate integer NOT NULL DEFAULT 50,
  best_years integer NOT NULL DEFAULT 25,
  net_to_gross_pct integer NOT NULL DEFAULT 78,
  compl_rate_permille integer NOT NULL DEFAULT 62,
  point_price_cents integer NOT NULL DEFAULT 2019,
  point_value_cents integer NOT NULL DEFAULT 1439
);
INSERT INTO public.retirement_settings DEFAULT VALUES;

CREATE TABLE public.retirement_years (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  age integer NOT NULL,
  game_from timestamptz NOT NULL,
  game_to timestamptz NOT NULL,
  gross_annual integer NOT NULL CHECK (gross_annual >= 0),
  quarters integer NOT NULL CHECK (quarters BETWEEN 0 AND 4),
  points numeric(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (character_id, age)
);
CREATE TABLE public.retirement_profiles (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  last_age integer NOT NULL,
  last_game_at timestamptz NOT NULL,
  retired_at timestamptz,
  monthly_pension integer
);
CREATE TABLE public.retirement_payments (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, month)
);
GRANT SELECT ON public.retirement_settings, public.retirement_years, public.retirement_profiles, public.retirement_payments TO authenticated;
GRANT ALL ON public.retirement_settings, public.retirement_years, public.retirement_profiles, public.retirement_payments TO service_role;
ALTER TABLE public.retirement_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retirement_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retirement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retirement_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retirement settings read" ON public.retirement_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "own retirement years" ON public.retirement_years FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY "own retirement profile" ON public.retirement_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY "own retirement payments" ON public.retirement_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- Interne : revenus nets gagnés entre deux instants du jeu (mêmes sources que l'impôt sur le revenu).
CREATE FUNCTION public.retirement_period_income(_cid uuid, _from timestamptz, _to timestamptz) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (COALESCE((SELECT sum(reward) FROM public.activities WHERE character_id = _cid AND type = 'work' AND status = 'completed' AND reward > 0
            AND end_time >= _from AND end_time < _to), 0)
        + COALESCE((SELECT sum(amount) FROM public.security_ledger WHERE character_id = _cid AND kind IN ('salaire','indemnite')
            AND created_at >= _from AND created_at < _to), 0))::int $$;

-- Interne : estimation mensuelle de la pension à partir du relevé.
CREATE FUNCTION public.retirement_estimate(_cid uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.retirement_settings; q int; sam numeric; pts numeric; base numeric; compl numeric;
BEGIN
  SELECT * INTO s FROM public.retirement_settings WHERE id = 1;
  SELECT COALESCE(sum(quarters), 0), COALESCE(sum(points), 0) INTO q, pts FROM public.retirement_years WHERE character_id = _cid;
  SELECT COALESCE(avg(gross_annual), 0) INTO sam FROM (SELECT gross_annual FROM public.retirement_years WHERE character_id = _cid
    ORDER BY gross_annual DESC LIMIT s.best_years) b;
  base := sam * s.base_rate / 100.0 * LEAST(q, s.full_quarters) / s.full_quarters;
  compl := pts * s.point_value_cents / 100.0;
  RETURN jsonb_build_object('quarters', q, 'points', round(pts, 2), 'average_salary', round(sam)::int,
    'base_monthly', round(base / 12)::int, 'compl_monthly', round(compl / 12)::int, 'monthly', round((base + compl) / 12)::int);
END $$;

-- Interne : clôt les années d'âge terminées (une seule fois) et verse les pensions dues (une par mois du jeu).
CREATE FUNCTION public.retirement_settle(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.retirement_settings; p public.retirement_profiles; a int; t timestamptz := public.game_now(); net int; gross numeric;
  months numeric; annual int; i int; m date; now_m date;
BEGIN
  SELECT * INTO s FROM public.retirement_settings WHERE id = 1;
  a := public.aging_settle(_cid);
  INSERT INTO public.retirement_profiles (character_id, last_age, last_game_at) VALUES (_cid, a, t) ON CONFLICT DO NOTHING;
  SELECT * INTO p FROM public.retirement_profiles WHERE character_id = _cid FOR UPDATE;
  IF p.retired_at IS NULL AND a > p.last_age AND t > p.last_game_at THEN
    net := public.retirement_period_income(_cid, p.last_game_at, t);
    gross := net * 100.0 / s.net_to_gross_pct;
    months := GREATEST(1, extract(epoch FROM (t - p.last_game_at)) / (30.44 * 86400));
    -- Revenus répartis à parts égales entre les années d'âge écoulées depuis la dernière lecture.
    annual := round(gross * 12 / months)::int;
    FOR i IN p.last_age .. a - 1 LOOP
      INSERT INTO public.retirement_years (character_id, age, game_from, game_to, gross_annual, quarters, points)
      VALUES (_cid, i, p.last_game_at, t, annual, LEAST(4, annual / s.quarter_gross),
        round(annual * s.compl_rate_permille / 1000.0 / (s.point_price_cents / 100.0), 2))
      ON CONFLICT DO NOTHING;
    END LOOP;
    UPDATE public.retirement_profiles SET last_age = a, last_game_at = t WHERE character_id = _cid;
  END IF;
  IF p.retired_at IS NOT NULL AND p.monthly_pension > 0 THEN
    now_m := date_trunc('month', t AT TIME ZONE 'UTC')::date;
    m := (date_trunc('month', p.retired_at AT TIME ZONE 'UTC') + interval '1 month')::date;
    m := GREATEST(m, (now_m - interval '12 months')::date);
    WHILE m <= now_m LOOP
      INSERT INTO public.retirement_payments (character_id, month, amount) VALUES (_cid, to_char(m, 'YYYY-MM'), p.monthly_pension) ON CONFLICT DO NOTHING;
      IF FOUND THEN
        PERFORM public.economy_cash(_cid, 'pension:' || to_char(m, 'YYYY-MM'), p.monthly_pension, 'Pension de retraite ' || to_char(m, 'MM/YYYY'), 'salaire', '{}'::jsonb);
      END IF;
      m := (m + interval '1 month')::date;
    END LOOP;
  END IF;
END $$;

CREATE FUNCTION public.retirement_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.retirement_settings; p public.retirement_profiles; a int;
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  PERFORM public.retirement_settle(cid);
  SELECT * INTO s FROM public.retirement_settings WHERE id = 1;
  SELECT * INTO p FROM public.retirement_profiles WHERE character_id = cid;
  SELECT age INTO a FROM public.characters WHERE id = cid;
  RETURN jsonb_build_object('age', a, 'settings', to_jsonb(s) - 'id',
    'employed', EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid),
    'retired_at', p.retired_at, 'monthly_pension', p.monthly_pension,
    'estimate', public.retirement_estimate(cid),
    'years', COALESCE((SELECT jsonb_agg(jsonb_build_object('age', y.age, 'gross_annual', y.gross_annual, 'quarters', y.quarters, 'points', y.points) ORDER BY y.age DESC)
      FROM public.retirement_years y WHERE y.character_id = cid), '[]'::jsonb),
    'payments', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', x.month, 'amount', x.amount) ORDER BY x.month DESC)
      FROM (SELECT * FROM public.retirement_payments WHERE character_id = cid ORDER BY month DESC LIMIT 12) x), '[]'::jsonb));
END $$;

-- Départ à la retraite : 64 ans, sans emploi en cours ; montant figé au départ.
CREATE FUNCTION public.retirement_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.retirement_settings; p public.retirement_profiles; a int; est jsonb;
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  PERFORM public.retirement_settle(cid);
  SELECT * INTO s FROM public.retirement_settings WHERE id = 1;
  SELECT * INTO p FROM public.retirement_profiles WHERE character_id = cid FOR UPDATE;
  SELECT age INTO a FROM public.characters WHERE id = cid;
  IF p.retired_at IS NOT NULL THEN RETURN public.retirement_state(); END IF;
  IF a < s.legal_age THEN RAISE EXCEPTION 'Départ possible à partir de % ans.', s.legal_age; END IF;
  IF EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid) THEN RAISE EXCEPTION 'Quittez d''abord votre emploi.'; END IF;
  est := public.retirement_estimate(cid);
  UPDATE public.retirement_profiles SET retired_at = public.game_now(), monthly_pension = (est->>'monthly')::int WHERE character_id = cid;
  RETURN public.retirement_state();
END $$;

REVOKE ALL ON FUNCTION public.retirement_period_income(uuid, timestamptz, timestamptz), public.retirement_estimate(uuid), public.retirement_settle(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.retirement_state(), public.retirement_claim() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retirement_state(), public.retirement_claim() TO authenticated;

COMMIT;
