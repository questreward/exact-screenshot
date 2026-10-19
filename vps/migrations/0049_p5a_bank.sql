-- CIVITAS – P5a : BANQUE (prêt, découvert, note bancaire, impayés, saisie)
-- Uniquement des ajouts. Tout ou rien. Aucune fonction existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0049_p5a_bank.sql
-- Le découvert est une dette suivie à part : le solde du compte reste toujours positif ou nul,
-- donc les paiements existants (loyer, achats, salaires) ne changent pas.
BEGIN;

-- 1. Réglages --------------------------------------------------------------------
CREATE TABLE public.bank_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  min_loan integer NOT NULL DEFAULT 500,
  max_loan integer NOT NULL DEFAULT 20000,
  income_multiplier integer NOT NULL DEFAULT 6,
  min_months integer NOT NULL DEFAULT 3,
  max_months integer NOT NULL DEFAULT 24,
  rate_adult numeric(5,2) NOT NULL DEFAULT 4.00,
  rate_minor numeric(5,2) NOT NULL DEFAULT 5.00,
  minor_max_loan integer NOT NULL DEFAULT 1000,
  month_days integer NOT NULL DEFAULT 30,
  overdraft_limit integer NOT NULL DEFAULT 300,
  overdraft_daily_fee integer NOT NULL DEFAULT 1,
  score_start integer NOT NULL DEFAULT 70,
  score_min integer NOT NULL DEFAULT 40,
  score_on_time integer NOT NULL DEFAULT 2,
  score_missed integer NOT NULL DEFAULT 10,
  score_overdraft_week integer NOT NULL DEFAULT 1,
  late_fee_percent integer NOT NULL DEFAULT 5,
  seizure_after integer NOT NULL DEFAULT 3,
  seizure_percent integer NOT NULL DEFAULT 70
);
GRANT SELECT ON public.bank_settings TO authenticated;
GRANT ALL ON public.bank_settings TO service_role;
ALTER TABLE public.bank_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_settings_read ON public.bank_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.bank_settings (id) VALUES (1);

-- 2. Données bancaires (lecture par le propriétaire seulement) ---------------------
CREATE TABLE public.bank_profiles (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  overdraft_used integer NOT NULL DEFAULT 0 CHECK (overdraft_used >= 0),
  overdraft_since date,
  fees_settled_date date,
  consecutive_missed integer NOT NULL DEFAULT 0,
  blocked boolean NOT NULL DEFAULT false
);
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  request_key text NOT NULL,
  principal integer NOT NULL CHECK (principal > 0),
  months integer NOT NULL CHECK (months > 0),
  rate numeric(5,2) NOT NULL,
  monthly integer NOT NULL CHECK (monthly > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','repaid','seized')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  closed_at timestamptz,
  UNIQUE (character_id, request_key)
);
CREATE UNIQUE INDEX loans_one_active ON public.loans (character_id) WHERE status = 'active';
CREATE TABLE public.loan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id),
  number integer NOT NULL,
  due_at timestamptz NOT NULL,
  principal_part integer NOT NULL,
  interest_part integer NOT NULL,
  late_fee integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','late','paid','seized','cancelled')),
  next_try_at timestamptz,
  paid_at timestamptz,
  UNIQUE (loan_id, number)
);
CREATE TABLE public.bank_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  operation_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('overdraft_draw','overdraft_repay','overdraft_fee','score','late_fee','seizure')),
  amount integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  world_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (character_id, operation_key)
);
CREATE TABLE public.bank_seizures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  loan_id uuid NOT NULL REFERENCES public.loans(id),
  asset_name text,
  asset_value integer NOT NULL DEFAULT 0,
  recovered integer NOT NULL DEFAULT 0,
  world_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (loan_id)
);
GRANT SELECT ON public.bank_profiles, public.loans, public.loan_installments, public.bank_ledger, public.bank_seizures TO authenticated;
GRANT ALL ON public.bank_profiles, public.loans, public.loan_installments, public.bank_ledger, public.bank_seizures TO service_role;
ALTER TABLE public.bank_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_seizures ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_profiles_own ON public.bank_profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = bank_profiles.character_id AND c.user_id = auth.uid()));
CREATE POLICY loans_own ON public.loans FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = loans.character_id AND c.user_id = auth.uid()));
CREATE POLICY loan_installments_own ON public.loan_installments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.loans l JOIN public.characters c ON c.id = l.character_id WHERE l.id = loan_installments.loan_id AND c.user_id = auth.uid()));
CREATE POLICY bank_ledger_own ON public.bank_ledger FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = bank_ledger.character_id AND c.user_id = auth.uid()));
CREATE POLICY bank_seizures_own ON public.bank_seizures FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = bank_seizures.character_id AND c.user_id = auth.uid()));

-- 3. Outils internes ------------------------------------------------------------------
CREATE FUNCTION public.bank_score(_cid uuid, _key text, _delta integer, _label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lid uuid; BEGIN
  INSERT INTO public.bank_ledger (character_id, operation_key, kind, amount, label) VALUES (_cid, _key, 'score', _delta, _label)
  ON CONFLICT DO NOTHING RETURNING id INTO lid;
  IF lid IS NOT NULL THEN UPDATE public.bank_profiles SET score = LEAST(100, GREATEST(0, score + _delta)) WHERE character_id = _cid; END IF;
END $$;

CREATE FUNCTION public.bank_monthly_income(_cid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT j.salary + COALESCE(e.salary_bonus, 0) FROM public.employments e JOIN public.jobs j ON j.id = e.job_id WHERE e.character_id = _cid LIMIT 1), 0)
$$;

-- Paiement d'une somme due : d'abord le compte, puis le découvert disponible. Retourne false si impossible.
CREATE FUNCTION public.bank_pay(_cid uuid, _key text, _amount integer, _label text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal integer; bp public.bank_profiles; s public.bank_settings; from_account integer; from_od integer; lim integer; BEGIN
  IF EXISTS (SELECT 1 FROM public.economy_operations WHERE character_id = _cid AND operation_key = _key AND status = 'done') THEN RETURN true; END IF;
  SELECT * INTO s FROM public.bank_settings WHERE id = 1;
  SELECT * INTO bp FROM public.bank_profiles WHERE character_id = _cid FOR UPDATE;
  SELECT balance INTO bal FROM public.accounts WHERE character_id = _cid FOR UPDATE;
  lim := CASE WHEN bp.blocked OR bp.score < s.score_min OR (SELECT age FROM public.characters WHERE id = _cid) < 18 THEN 0 ELSE s.overdraft_limit END;
  from_account := LEAST(GREATEST(bal, 0), _amount);
  from_od := _amount - from_account;
  IF from_od > GREATEST(0, lim - bp.overdraft_used) THEN RETURN false; END IF;
  PERFORM public.economy_cash(_cid, _key, -from_account, _label, 'banque', jsonb_build_object('overdraft', from_od));
  IF from_od > 0 THEN
    INSERT INTO public.bank_ledger (character_id, operation_key, kind, amount, label) VALUES (_cid, 'od:' || _key, 'overdraft_draw', from_od, 'Découvert — ' || _label);
    UPDATE public.bank_profiles SET overdraft_used = overdraft_used + from_od, overdraft_since = COALESCE(overdraft_since, (public.game_now() AT TIME ZONE 'UTC')::date) WHERE character_id = _cid;
  END IF;
  RETURN true;
END $$;

-- 4. Règlement à la lecture (mensualités, frais, découvert, saisie) ------------------
CREATE FUNCTION public.bank_settle(_cid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.bank_settings; bp public.bank_profiles; t timestamptz := public.game_now(); today date := (public.game_now() AT TIME ZONE 'UTC')::date;
  d date; i record; ln public.loans; due integer; bal integer; repay integer; asset record; value integer; remaining integer; rec integer; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cid AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT * INTO s FROM public.bank_settings WHERE id = 1;
  INSERT INTO public.bank_profiles (character_id, score, fees_settled_date) VALUES (_cid, s.score_start, today) ON CONFLICT DO NOTHING;
  SELECT * INTO bp FROM public.bank_profiles WHERE character_id = _cid FOR UPDATE;

  -- Frais de découvert : 1 par jour de jeu passé à découvert, −1 de note par semaine
  d := COALESCE(bp.fees_settled_date, today);
  WHILE d < today LOOP
    IF bp.overdraft_used > 0 THEN
      INSERT INTO public.bank_ledger (character_id, operation_key, kind, amount, label) VALUES (_cid, 'odfee:' || d, 'overdraft_fee', s.overdraft_daily_fee, 'Frais de découvert — ' || to_char(d, 'DD/MM'))
      ON CONFLICT DO NOTHING;
      IF FOUND THEN bp.overdraft_used := bp.overdraft_used + s.overdraft_daily_fee; END IF;
      IF bp.overdraft_since IS NOT NULL AND (d - bp.overdraft_since) > 0 AND (d - bp.overdraft_since) % 7 = 0 THEN
        PERFORM public.bank_score(_cid, 'odweek:' || d, -s.score_overdraft_week, 'Une semaine de plus à découvert');
      END IF;
    END IF;
    d := d + 1;
  END LOOP;
  UPDATE public.bank_profiles SET overdraft_used = bp.overdraft_used, fees_settled_date = today WHERE character_id = _cid;

  -- Mensualités échues, dans l'ordre ; on s'arrête au premier impayé
  SELECT * INTO ln FROM public.loans WHERE character_id = _cid AND status = 'active' FOR UPDATE;
  IF FOUND THEN
    FOR i IN SELECT * FROM public.loan_installments WHERE loan_id = ln.id AND status IN ('pending','late') AND due_at <= t ORDER BY number FOR UPDATE LOOP
      IF i.next_try_at IS NOT NULL AND i.next_try_at > t THEN EXIT; END IF;
      due := i.principal_part + i.interest_part + i.late_fee;
      IF public.bank_pay(_cid, 'loan:' || i.id, due, 'Mensualité ' || i.number || '/' || ln.months) THEN
        UPDATE public.loan_installments SET status = 'paid', paid_at = t WHERE id = i.id;
        UPDATE public.bank_profiles SET consecutive_missed = 0 WHERE character_id = _cid;
        IF i.status = 'pending' THEN PERFORM public.bank_score(_cid, 'ontime:' || i.id, s.score_on_time, 'Mensualité payée à l''heure'); END IF;
      ELSE
        IF i.status = 'pending' THEN
          UPDATE public.loan_installments SET status = 'late', late_fee = CEIL((principal_part + interest_part) * s.late_fee_percent / 100.0) WHERE id = i.id;
          INSERT INTO public.bank_ledger (character_id, operation_key, kind, amount, label) VALUES (_cid, 'late:' || i.id, 'late_fee', CEIL((i.principal_part + i.interest_part) * s.late_fee_percent / 100.0), 'Frais de retard — mensualité ' || i.number) ON CONFLICT DO NOTHING;
        END IF;
        UPDATE public.loan_installments SET next_try_at = t + interval '1 day' WHERE id = i.id;
        INSERT INTO public.bank_ledger (character_id, operation_key, kind, amount, label) VALUES (_cid, 'miss:' || i.id || ':' || today, 'score', -s.score_missed, 'Mensualité impayée') ON CONFLICT DO NOTHING;
        IF FOUND THEN
          UPDATE public.bank_profiles SET score = GREATEST(0, score - s.score_missed), consecutive_missed = consecutive_missed + 1 WHERE character_id = _cid;
          PERFORM public.economy_notify(_cid, 'bank-miss:' || i.id || ':' || today, 'Mensualité impayée',
            'Solde insuffisant. Frais de retard appliqués, nouvel essai demain. Après ' || s.seizure_after || ' impayés de suite, la banque saisit un bien.');
        END IF;
        EXIT;
      END IF;
    END LOOP;

    -- Saisie après trop d'impayés consécutifs
    SELECT * INTO bp FROM public.bank_profiles WHERE character_id = _cid;
    IF bp.consecutive_missed >= s.seizure_after AND NOT EXISTS (SELECT 1 FROM public.bank_seizures WHERE loan_id = ln.id) THEN
      SELECT COALESCE(SUM(principal_part + interest_part + late_fee), 0) INTO remaining FROM public.loan_installments WHERE loan_id = ln.id AND status IN ('pending','late');
      SELECT a.id, a.purchase_price, ec.name INTO asset FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id
        WHERE a.character_id = _cid ORDER BY a.purchase_price DESC LIMIT 1;
      IF asset.id IS NOT NULL THEN
        value := FLOOR(asset.purchase_price * s.seizure_percent / 100.0);
        DELETE FROM public.personal_assets WHERE id = asset.id;
        rec := 0;
        FOR i IN SELECT * FROM public.loan_installments WHERE loan_id = ln.id AND status IN ('pending','late') ORDER BY number LOOP
          EXIT WHEN rec + i.principal_part + i.interest_part + i.late_fee > value;
          rec := rec + i.principal_part + i.interest_part + i.late_fee;
          UPDATE public.loan_installments SET status = 'seized', paid_at = t WHERE id = i.id;
        END LOOP;
        -- Le surplus éventuel de la vente revient au joueur
        IF value - rec > 0 THEN PERFORM public.economy_cash(_cid, 'seizure-rest:' || ln.id, value - rec, 'Reste de la vente saisie — ' || asset.name, 'banque'); END IF;
        INSERT INTO public.bank_seizures (character_id, loan_id, asset_name, asset_value, recovered) VALUES (_cid, ln.id, asset.name, value, rec);
        INSERT INTO public.bank_ledger (character_id, operation_key, kind, amount, label) VALUES (_cid, 'seizure:' || ln.id, 'seizure', rec, 'Saisie — ' || asset.name);
        UPDATE public.bank_profiles SET consecutive_missed = 0 WHERE character_id = _cid;
        PERFORM public.economy_notify(_cid, 'bank-seizure:' || ln.id, 'Saisie bancaire', asset.name || ' a été vendu ' || value || ' crédits pour rembourser votre prêt.');
      ELSE
        INSERT INTO public.bank_seizures (character_id, loan_id, asset_name, asset_value, recovered) VALUES (_cid, ln.id, NULL, 0, 0);
        UPDATE public.bank_profiles SET blocked = true WHERE character_id = _cid;
        PERFORM public.economy_notify(_cid, 'bank-seizure:' || ln.id, 'Compte bloqué par la banque', 'Aucun bien à saisir : la dette reste due. Plus de nouveau prêt ni de découvert tant qu''elle n''est pas remboursée.');
      END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.loan_installments WHERE loan_id = ln.id AND status IN ('pending','late')) THEN
      UPDATE public.loans SET status = CASE WHEN EXISTS (SELECT 1 FROM public.loan_installments WHERE loan_id = ln.id AND status = 'seized') THEN 'seized' ELSE 'repaid' END, closed_at = t WHERE id = ln.id;
      UPDATE public.bank_profiles SET blocked = false WHERE character_id = _cid;
    ELSIF EXISTS (SELECT 1 FROM public.loan_installments WHERE loan_id = ln.id AND status = 'pending' AND due_at > t AND due_at <= t + interval '1 day') THEN
      PERFORM public.economy_notify(_cid, 'bank-reminder:' || ln.id || ':' || today, 'Mensualité demain', 'Pensez à garder ' || ln.monthly || ' crédits sur votre compte.');
    END IF;
  END IF;

  -- Remboursement automatique du découvert dès que le compte le permet
  SELECT * INTO bp FROM public.bank_profiles WHERE character_id = _cid FOR UPDATE;
  SELECT balance INTO bal FROM public.accounts WHERE character_id = _cid;
  IF bp.overdraft_used > 0 AND bal > 0 THEN
    repay := LEAST(bal, bp.overdraft_used);
    PERFORM public.economy_cash(_cid, 'odrepay:' || gen_random_uuid(), -repay, 'Remboursement du découvert', 'banque');
    INSERT INTO public.bank_ledger (character_id, operation_key, kind, amount, label) VALUES (_cid, 'odrepay:' || gen_random_uuid(), 'overdraft_repay', repay, 'Remboursement automatique du découvert');
    UPDATE public.bank_profiles SET overdraft_used = overdraft_used - repay,
      overdraft_since = CASE WHEN overdraft_used - repay = 0 THEN NULL ELSE overdraft_since END WHERE character_id = _cid;
  END IF;
END $$;

-- 5. Actions du joueur ----------------------------------------------------------------
CREATE FUNCTION public.request_loan(_amount integer, _months integer, _request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.bank_settings; bp public.bank_profiles; cap integer; r numeric; m numeric; monthly integer;
  lid uuid; remaining numeric; ip integer; pp integer; t timestamptz := public.game_now(); BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  PERFORM public.bank_settle(cid);
  SELECT * INTO s FROM public.bank_settings WHERE id = 1; SELECT * INTO bp FROM public.bank_profiles WHERE character_id = cid;
  IF NOT s.enabled THEN RAISE EXCEPTION 'Banque fermée'; END IF;
  IF EXISTS (SELECT 1 FROM public.loans WHERE character_id = cid AND request_key = _request_id::text) THEN
    RETURN (SELECT id FROM public.loans WHERE character_id = cid AND request_key = _request_id::text); END IF;
  IF bp.blocked OR bp.score < s.score_min THEN RAISE EXCEPTION 'Note bancaire trop basse pour un nouveau prêt'; END IF;
  IF EXISTS (SELECT 1 FROM public.loans WHERE character_id = cid AND status = 'active') THEN RAISE EXCEPTION 'Vous avez déjà un prêt en cours'; END IF;
  IF _months NOT BETWEEN s.min_months AND s.max_months THEN RAISE EXCEPTION 'Durée de % à % mois', s.min_months, s.max_months; END IF;
  cap := LEAST(s.max_loan, public.bank_monthly_income(cid) * s.income_multiplier);
  IF c.age < 18 THEN cap := LEAST(cap, s.minor_max_loan); END IF;
  IF cap < s.min_loan THEN RAISE EXCEPTION 'Revenus insuffisants : un emploi est nécessaire pour emprunter'; END IF;
  IF _amount NOT BETWEEN s.min_loan AND cap THEN RAISE EXCEPTION 'Montant possible : de % à % crédits', s.min_loan, cap; END IF;
  r := CASE WHEN c.age < 18 THEN s.rate_minor ELSE s.rate_adult END;
  m := r / 100.0 / 12;
  monthly := CEIL(_amount * m / (1 - power(1 + m, -_months)));
  INSERT INTO public.loans (character_id, request_key, principal, months, rate, monthly) VALUES (cid, _request_id::text, _amount, _months, r, monthly) RETURNING id INTO lid;
  remaining := _amount;
  FOR n IN 1.._months LOOP
    ip := ROUND(remaining * m);
    pp := CASE WHEN n = _months THEN remaining::integer ELSE LEAST(remaining::integer, monthly - ip) END;
    INSERT INTO public.loan_installments (loan_id, number, due_at, principal_part, interest_part)
    VALUES (lid, n, t + n * s.month_days * interval '1 day', pp, CASE WHEN n = _months THEN GREATEST(0, monthly - pp) ELSE ip END);
    remaining := remaining - pp;
  END LOOP;
  PERFORM public.economy_cash(cid, 'loan-funds:' || lid, _amount, 'Prêt personnel accordé', 'banque');
  PERFORM public.economy_notify(cid, 'loan-start:' || lid, 'Prêt accordé', _amount || ' crédits versés. Mensualité : ' || monthly || ' crédits pendant ' || _months || ' mois.');
  RETURN lid;
END $$;

CREATE FUNCTION public.repay_loan_early(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; ln public.loans; owed integer; BEGIN
  cid := public.social_actor(); PERFORM public.bank_settle(cid);
  SELECT * INTO ln FROM public.loans WHERE character_id = cid AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucun prêt en cours'; END IF;
  -- Sans frais : capital restant + frais de retard déjà dus, intérêts futurs annulés
  SELECT COALESCE(SUM(principal_part + late_fee), 0) INTO owed FROM public.loan_installments WHERE loan_id = ln.id AND status IN ('pending','late');
  PERFORM public.economy_cash(cid, 'loan-early:' || _request_id, -owed, 'Remboursement anticipé du prêt', 'banque');
  UPDATE public.loan_installments SET status = 'paid', paid_at = public.game_now(), interest_part = 0 WHERE loan_id = ln.id AND status IN ('pending','late');
  UPDATE public.loans SET status = 'repaid', closed_at = public.game_now() WHERE id = ln.id;
  UPDATE public.bank_profiles SET consecutive_missed = 0, blocked = false WHERE character_id = cid;
END $$;

CREATE FUNCTION public.use_overdraft(_amount integer, _request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.bank_settings; bp public.bank_profiles; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  PERFORM public.bank_settle(cid);
  SELECT * INTO s FROM public.bank_settings WHERE id = 1; SELECT * INTO bp FROM public.bank_profiles WHERE character_id = cid FOR UPDATE;
  IF c.age < 18 THEN RAISE EXCEPTION 'Découvert réservé aux majeurs'; END IF;
  IF bp.blocked OR bp.score < s.score_min THEN RAISE EXCEPTION 'Note bancaire trop basse pour le découvert'; END IF;
  IF _amount < 1 OR bp.overdraft_used + _amount > s.overdraft_limit THEN RAISE EXCEPTION 'Découvert disponible : % crédits', s.overdraft_limit - bp.overdraft_used; END IF;
  IF NOT public.economy_cash(cid, 'od-draw:' || _request_id, _amount, 'Avance sur découvert', 'banque') THEN RETURN; END IF;
  INSERT INTO public.bank_ledger (character_id, operation_key, kind, amount, label) VALUES (cid, 'od-draw:' || _request_id, 'overdraft_draw', _amount, 'Avance sur découvert');
  -- Pas de remboursement automatique le jour même pour une avance volontaire
  UPDATE public.bank_profiles SET overdraft_used = overdraft_used + _amount, overdraft_since = COALESCE(overdraft_since, (public.game_now() AT TIME ZONE 'UTC')::date) WHERE character_id = cid;
END $$;

CREATE FUNCTION public.bank_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.bank_settings; bp public.bank_profiles; ln public.loans; cap integer; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.bank_settings WHERE id = 1;
  -- Le règlement à la lecture ne rembourse pas une avance volontaire tirée aujourd'hui
  PERFORM public.bank_settle(cid);
  SELECT * INTO bp FROM public.bank_profiles WHERE character_id = cid;
  SELECT * INTO ln FROM public.loans WHERE character_id = cid AND status = 'active';
  cap := LEAST(s.max_loan, public.bank_monthly_income(cid) * s.income_multiplier);
  IF c.age < 18 THEN cap := LEAST(cap, s.minor_max_loan); END IF;
  RETURN jsonb_build_object(
    'settings', to_jsonb(s), 'age', c.age, 'now', public.game_now(),
    'balance', (SELECT balance FROM public.accounts WHERE character_id = cid),
    'income', public.bank_monthly_income(cid), 'loan_cap', cap,
    'rate', CASE WHEN c.age < 18 THEN s.rate_minor ELSE s.rate_adult END,
    'profile', to_jsonb(bp),
    'overdraft_limit', CASE WHEN c.age < 18 OR bp.blocked OR bp.score < s.score_min THEN 0 ELSE s.overdraft_limit END,
    'loan', CASE WHEN ln.id IS NULL THEN NULL ELSE to_jsonb(ln) || jsonb_build_object(
      'installments', (SELECT jsonb_agg(to_jsonb(i) ORDER BY i.number) FROM public.loan_installments i WHERE i.loan_id = ln.id),
      'remaining_principal', (SELECT COALESCE(SUM(principal_part + late_fee), 0) FROM public.loan_installments WHERE loan_id = ln.id AND status IN ('pending','late'))) END,
    'history', COALESCE((SELECT jsonb_agg(x ORDER BY x.world_at DESC) FROM (SELECT kind, amount, label, world_at FROM public.bank_ledger WHERE character_id = cid ORDER BY world_at DESC LIMIT 20) x), '[]'::jsonb),
    'seizures', COALESCE((SELECT jsonb_agg(to_jsonb(z) ORDER BY z.world_at DESC) FROM public.bank_seizures z WHERE z.character_id = cid), '[]'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.bank_score(uuid, text, integer, text), public.bank_pay(uuid, text, integer, text), public.bank_settle(uuid), public.bank_monthly_income(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_loan(integer, integer, uuid), public.repay_loan_early(uuid), public.use_overdraft(integer, uuid), public.bank_state() TO authenticated;

-- 6. Contrôles ------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT count(*) FROM public.bank_settings) <> 1 THEN RAISE EXCEPTION 'Réglages manquants'; END IF;
  IF (SELECT count(*) FROM public.loans) <> 0 THEN RAISE EXCEPTION 'Aucun prêt attendu à l''installation'; END IF;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE balance < 0) THEN RAISE EXCEPTION 'Un compte est déjà négatif'; END IF;
  IF (SELECT count(*) FROM public.events) < 81 THEN RAISE EXCEPTION 'Événements existants perdus'; END IF;
  RAISE NOTICE 'P5a installé : banque prête';
END $$;

COMMIT;
