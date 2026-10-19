-- CIVITAS – P5b : ASSURANCES ET IMPRÉVUS PERSONNELS
-- Uniquement des ajouts. Tout ou rien. Aucune fonction existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0050_p5b_insurance.sql
-- Nécessite P5a (bank_pay, bank_score, bank_settle).
BEGIN;

-- 1. Réglages et catalogue ----------------------------------------------------------
CREATE TABLE public.insurance_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  min_age integer NOT NULL DEFAULT 16,
  waiting_days integer NOT NULL DEFAULT 3,
  month_days integer NOT NULL DEFAULT 30,
  unpaid_score_penalty integer NOT NULL DEFAULT 5,
  health_energy_loss integer NOT NULL DEFAULT 20,
  max_weeks_back integer NOT NULL DEFAULT 4,
  started_week integer NOT NULL
);
CREATE TABLE public.incident_types (
  id text PRIMARY KEY,
  label text NOT NULL,
  chance integer NOT NULL CHECK (chance BETWEEN 0 AND 100),
  chance_with_vehicle integer,
  min_cost integer NOT NULL,
  max_cost integer NOT NULL,
  examples text[] NOT NULL
);
CREATE TABLE public.insurance_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  covers text[] NOT NULL,
  monthly_price integer NOT NULL CHECK (monthly_price > 0),
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE public.insurance_coverage (
  incident_type text PRIMARY KEY REFERENCES public.incident_types(id),
  deductible integer NOT NULL,
  cap integer NOT NULL
);
GRANT SELECT ON public.insurance_settings, public.incident_types, public.insurance_products, public.insurance_coverage TO authenticated;
GRANT ALL ON public.insurance_settings, public.incident_types, public.insurance_products, public.insurance_coverage TO service_role;
ALTER TABLE public.insurance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY insurance_settings_read ON public.insurance_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY incident_types_read ON public.incident_types FOR SELECT TO authenticated USING (true);
CREATE POLICY insurance_products_read ON public.insurance_products FOR SELECT TO authenticated USING (true);
CREATE POLICY insurance_coverage_read ON public.insurance_coverage FOR SELECT TO authenticated USING (true);

INSERT INTO public.insurance_settings (id, started_week)
VALUES (1, floor(extract(epoch FROM public.game_now()) / 604800)::integer);
INSERT INTO public.incident_types (id, label, chance, chance_with_vehicle, min_cost, max_cost, examples) VALUES
  ('home', 'Habitation', 8, NULL, 250, 600, ARRAY['Dégât des eaux', 'Serrure cassée', 'Panne de chauffe-eau']),
  ('health', 'Santé', 10, NULL, 80, 300, ARRAY['Grippe', 'Soins dentaires', 'Entorse']),
  ('accident', 'Accident', 6, 10, 150, 900, ARRAY['Chute à vélo', 'Accrochage en voiture', 'Téléphone cassé dans une chute']);
INSERT INTO public.insurance_coverage (incident_type, deductible, cap) VALUES ('home', 50, 1000), ('health', 20, 500), ('accident', 50, 1500);
INSERT INTO public.insurance_products (id, name, covers, monthly_price, sort_order) VALUES
  ('home', 'Assurance habitation', ARRAY['home'], 15, 1),
  ('health', 'Mutuelle santé', ARRAY['health'], 20, 2),
  ('accident', 'Assurance accident', ARRAY['accident'], 12, 3),
  ('pack', 'Pack complet', ARRAY['home','health','accident'], 40, 4);

-- 2. Contrats et imprévus (lecture par le propriétaire) --------------------------------
CREATE TABLE public.insurance_profiles (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  settled_week integer NOT NULL,
  debt integer NOT NULL DEFAULT 0 CHECK (debt >= 0)
);
CREATE TABLE public.insurance_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  product_id text NOT NULL REFERENCES public.insurance_products(id),
  request_key text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  monthly_price integer NOT NULL,
  covered_from timestamptz NOT NULL,
  next_due_at timestamptz NOT NULL,
  next_try_at timestamptz,
  months_paid integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  cancelled_at timestamptz,
  UNIQUE (character_id, request_key)
);
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  incident_key text NOT NULL,
  type_id text NOT NULL REFERENCES public.incident_types(id),
  label text NOT NULL,
  occurred_at timestamptz NOT NULL,
  cost integer NOT NULL,
  insurer_paid integer NOT NULL DEFAULT 0,
  player_paid integer NOT NULL DEFAULT 0,
  unpaid integer NOT NULL DEFAULT 0,
  contract_id uuid REFERENCES public.insurance_contracts(id),
  UNIQUE (character_id, incident_key)
);
GRANT SELECT ON public.insurance_profiles, public.insurance_contracts, public.incidents TO authenticated;
GRANT ALL ON public.insurance_profiles, public.insurance_contracts, public.incidents TO service_role;
ALTER TABLE public.insurance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY insurance_profiles_own ON public.insurance_profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = insurance_profiles.character_id AND c.user_id = auth.uid()));
CREATE POLICY insurance_contracts_own ON public.insurance_contracts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = insurance_contracts.character_id AND c.user_id = auth.uid()));
CREATE POLICY incidents_own ON public.incidents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = incidents.character_id AND c.user_id = auth.uid()));

-- 3. Règlement à la lecture --------------------------------------------------------------
CREATE FUNCTION public.insurance_settle(_cid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.insurance_settings; t timestamptz := public.game_now(); cur integer; w integer; ip public.insurance_profiles;
  ct record; it record; cov public.insurance_coverage; roll integer; chance integer; cost integer; occ timestamptz; lbl text;
  ins integer; mine integer; bal integer; paid integer; iid uuid; cid_contract uuid; has_vehicle boolean; repay integer; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cid AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT * INTO s FROM public.insurance_settings WHERE id = 1;
  IF NOT s.enabled THEN RETURN; END IF;
  PERFORM public.bank_settle(_cid);
  cur := floor(extract(epoch FROM t) / 604800)::integer;
  INSERT INTO public.insurance_profiles (character_id, settled_week) VALUES (_cid, GREATEST(s.started_week, cur - 1)) ON CONFLICT DO NOTHING;
  SELECT * INTO ip FROM public.insurance_profiles WHERE character_id = _cid FOR UPDATE;

  -- Cotisations mensuelles
  FOR ct IN SELECT * FROM public.insurance_contracts WHERE character_id = _cid AND status IN ('active','suspended') AND next_due_at <= t FOR UPDATE LOOP
    WHILE ct.next_due_at <= t LOOP
      IF ct.next_try_at IS NOT NULL AND ct.next_try_at > t THEN EXIT; END IF;
      IF public.bank_pay(_cid, 'premium:' || ct.id || ':' || (ct.months_paid + 1), ct.monthly_price, 'Cotisation assurance') THEN
        ct.months_paid := ct.months_paid + 1;
        ct.next_due_at := ct.next_due_at + s.month_days * interval '1 day';
        UPDATE public.insurance_contracts SET status = 'active', months_paid = ct.months_paid, next_due_at = ct.next_due_at, next_try_at = NULL WHERE id = ct.id;
      ELSE
        UPDATE public.insurance_contracts SET status = 'suspended', next_try_at = t + interval '1 day' WHERE id = ct.id;
        PERFORM public.economy_notify(_cid, 'premium-miss:' || ct.id || ':' || (ct.months_paid + 1), 'Assurance suspendue', 'Cotisation impayée : vous n''êtes plus couvert jusqu''au prochain paiement réussi.');
        EXIT;
      END IF;
    END LOOP;
  END LOOP;

  -- Imprévus de chaque semaine écoulée (tirage fixe)
  has_vehicle := EXISTS (SELECT 1 FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id WHERE a.character_id = _cid AND ec.kind = 'vehicle');
  w := GREATEST(ip.settled_week + 1, cur - s.max_weeks_back);
  WHILE w <= cur LOOP
    FOR it IN SELECT * FROM public.incident_types ORDER BY id LOOP
      chance := CASE WHEN has_vehicle AND it.chance_with_vehicle IS NOT NULL THEN it.chance_with_vehicle ELSE it.chance END;
      roll := abs(hashtext(_cid::text || ':' || w || ':' || it.id)) % 100;
      CONTINUE WHEN roll >= chance;
      occ := to_timestamp(w * 604800::bigint) + (abs(hashtext(_cid::text || ':' || w || ':' || it.id || ':d')) % 7) * interval '1 day' + interval '10 hours';
      CONTINUE WHEN occ > t;
      CONTINUE WHEN EXISTS (SELECT 1 FROM public.incidents WHERE character_id = _cid AND incident_key = w || ':' || it.id);
      cost := it.min_cost + abs(hashtext(_cid::text || ':' || w || ':' || it.id || ':c')) % (it.max_cost - it.min_cost + 1);
      lbl := it.examples[1 + abs(hashtext(_cid::text || ':' || w || ':' || it.id || ':l')) % array_length(it.examples, 1)];
      SELECT * INTO cov FROM public.insurance_coverage WHERE incident_type = it.id;
      SELECT c.id INTO cid_contract FROM public.insurance_contracts c JOIN public.insurance_products p ON p.id = c.product_id
        WHERE c.character_id = _cid AND c.status = 'active' AND c.covered_from <= occ AND it.id = ANY(p.covers) LIMIT 1;
      ins := CASE WHEN cid_contract IS NULL THEN 0 ELSE LEAST(GREATEST(cost - cov.deductible, 0), cov.cap) END;
      mine := cost - ins;
      INSERT INTO public.incidents (character_id, incident_key, type_id, label, occurred_at, cost, insurer_paid, contract_id)
      VALUES (_cid, w || ':' || it.id, it.id, lbl, occ, cost, ins, cid_contract) RETURNING id INTO iid;
      paid := 0;
      IF mine > 0 THEN
        IF public.bank_pay(_cid, 'incident:' || iid, mine, it.label || ' — ' || lbl) THEN paid := mine;
        ELSE
          SELECT balance INTO bal FROM public.accounts WHERE character_id = _cid;
          paid := LEAST(GREATEST(bal, 0), mine);
          IF paid > 0 THEN PERFORM public.economy_cash(_cid, 'incident-part:' || iid, -paid, it.label || ' — ' || lbl, 'imprevu'); END IF;
          UPDATE public.insurance_profiles SET debt = debt + (mine - paid) WHERE character_id = _cid;
          PERFORM public.bank_score(_cid, 'incident-unpaid:' || iid, -s.unpaid_score_penalty, 'Imprévu non payé');
        END IF;
      END IF;
      UPDATE public.incidents SET player_paid = paid, unpaid = mine - paid WHERE id = iid;
      IF it.id = 'health' THEN UPDATE public.characters SET energy = GREATEST(0, energy - s.health_energy_loss) WHERE id = _cid; END IF;
      PERFORM public.economy_notify(_cid, 'incident:' || iid, 'Imprévu : ' || lbl,
        'Coût ' || cost || ' crédits. ' || CASE WHEN ins > 0 THEN 'Votre assurance a payé ' || ins || '. ' ELSE '' END ||
        'Payé par vous : ' || paid || CASE WHEN mine - paid > 0 THEN '. Reste dû : ' || (mine - paid) ELSE '' END || '.');
    END LOOP;
    w := w + 1;
  END LOOP;
  UPDATE public.insurance_profiles SET settled_week = cur WHERE character_id = _cid;

  -- Remboursement automatique de la dette d'imprévus
  SELECT * INTO ip FROM public.insurance_profiles WHERE character_id = _cid FOR UPDATE;
  SELECT balance INTO bal FROM public.accounts WHERE character_id = _cid;
  IF ip.debt > 0 AND bal > 0 THEN
    repay := LEAST(bal, ip.debt);
    PERFORM public.economy_cash(_cid, 'incident-debt:' || gen_random_uuid(), -repay, 'Remboursement des imprévus', 'imprevu');
    UPDATE public.insurance_profiles SET debt = debt - repay WHERE character_id = _cid;
  END IF;
END $$;

-- 4. Actions du joueur ------------------------------------------------------------------
CREATE FUNCTION public.subscribe_insurance(_product text, _request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.insurance_settings; p public.insurance_products; ctid uuid; t timestamptz := public.game_now(); BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  PERFORM public.insurance_settle(cid);
  SELECT * INTO s FROM public.insurance_settings WHERE id = 1;
  SELECT id INTO ctid FROM public.insurance_contracts WHERE character_id = cid AND request_key = _request_id::text;
  IF ctid IS NOT NULL THEN RETURN ctid; END IF;
  IF c.age < s.min_age THEN RAISE EXCEPTION 'Assurance possible dès % ans', s.min_age; END IF;
  SELECT * INTO p FROM public.insurance_products WHERE id = _product;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrat inconnu'; END IF;
  IF EXISTS (SELECT 1 FROM public.insurance_contracts c2 JOIN public.insurance_products p2 ON p2.id = c2.product_id
             WHERE c2.character_id = cid AND c2.status IN ('active','suspended') AND p2.covers && p.covers) THEN
    RAISE EXCEPTION 'Vous êtes déjà assuré pour ce risque'; END IF;
  INSERT INTO public.insurance_contracts (character_id, product_id, request_key, monthly_price, covered_from, next_due_at)
  VALUES (cid, p.id, _request_id::text, p.monthly_price, t + s.waiting_days * interval '1 day', t + s.month_days * interval '1 day')
  RETURNING id INTO ctid;
  IF NOT public.bank_pay(cid, 'premium:' || ctid || ':1', p.monthly_price, 'Cotisation — ' || p.name) THEN
    RAISE EXCEPTION 'Solde insuffisant pour la première cotisation'; END IF;
  PERFORM public.economy_notify(cid, 'insurance-start:' || ctid, p.name || ' souscrite', 'Vous êtes couvert dans ' || s.waiting_days || ' jours de jeu.');
  RETURN ctid;
END $$;

CREATE FUNCTION public.cancel_insurance(_contract uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  UPDATE public.insurance_contracts SET status = 'cancelled', cancelled_at = public.game_now()
  WHERE id = _contract AND character_id = cid AND status IN ('active','suspended');
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrat introuvable'; END IF;
END $$;

CREATE FUNCTION public.insurance_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  PERFORM public.insurance_settle(cid);
  RETURN jsonb_build_object(
    'now', public.game_now(), 'age', c.age,
    'settings', (SELECT to_jsonb(s) FROM public.insurance_settings s WHERE id = 1),
    'debt', (SELECT debt FROM public.insurance_profiles WHERE character_id = cid),
    'products', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.sort_order) FROM public.insurance_products p),
    'coverage', (SELECT jsonb_agg(jsonb_build_object('type', it.id, 'label', it.label, 'deductible', cv.deductible, 'cap', cv.cap, 'examples', it.examples))
                 FROM public.incident_types it JOIN public.insurance_coverage cv ON cv.incident_type = it.id),
    'contracts', COALESCE((SELECT jsonb_agg(to_jsonb(ct) || jsonb_build_object('name', p.name, 'covers', p.covers) ORDER BY ct.created_at)
                 FROM public.insurance_contracts ct JOIN public.insurance_products p ON p.id = ct.product_id
                 WHERE ct.character_id = cid AND ct.status IN ('active','suspended')), '[]'::jsonb),
    'incidents', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.occurred_at DESC)
                 FROM (SELECT i.*, it.label AS type_label FROM public.incidents i JOIN public.incident_types it ON it.id = i.type_id
                       WHERE i.character_id = cid ORDER BY i.occurred_at DESC LIMIT 20) x), '[]'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.insurance_settle(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_insurance(text, uuid), public.cancel_insurance(uuid), public.insurance_state() TO authenticated;

-- 5. Contrôles ---------------------------------------------------------------------------
DO $$ BEGIN
  IF to_regprocedure('public.bank_pay(uuid,text,integer,text)') IS NULL THEN RAISE EXCEPTION 'P5a (banque) doit être installé avant P5b'; END IF;
  IF (SELECT count(*) FROM public.insurance_products) <> 4 THEN RAISE EXCEPTION 'Catalogue incomplet'; END IF;
  IF (SELECT count(*) FROM public.incident_types) <> 3 THEN RAISE EXCEPTION 'Types d''imprévus incomplets'; END IF;
  IF (SELECT count(*) FROM public.insurance_contracts) <> 0 THEN RAISE EXCEPTION 'Aucun contrat attendu'; END IF;
  IF (SELECT count(*) FROM public.events) < 81 THEN RAISE EXCEPTION 'Événements existants perdus'; END IF;
  RAISE NOTICE 'P5b installé : assurances et imprévus prêts';
END $$;

COMMIT;
