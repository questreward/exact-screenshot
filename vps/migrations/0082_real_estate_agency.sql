-- 0082 — Agence immobilière (entreprises de services, phase 2)
-- Réutilise : businesses / caisses (0051), service_pay / service_orders / avis / clients fictifs (0081),
-- housing_action / housing_leases / shop_buy (0077-0080). Aucune fonction existante n'est réécrite à la main :
-- service_settle, service_set_price et service_state reçoivent seulement le secteur 'immobilier' par remplacement vérifié.
-- Argent : le locataire paie via economy_cash ; la part de l'agence entre dans sa caisse (business_move, clé unique) ;
-- la part du propriétaire devient une ligne qu'il encaisse à la lecture (agency_payouts). Jamais de solde négatif.

-- 1. Configuration ----------------------------------------------------------------------
INSERT INTO public.business_sectors (id, label, description, location_kind, min_capital, base_revenue, per_worker, per_shift, weekly_rent, npc_wage, max_npc, sort_order) VALUES
  ('immobilier', 'Agence immobilière', 'Locations, ventes et gestion de logements pour les habitants et les joueurs.', 'entreprise', 2000, 150, 140, 90, 160, 110, 4, 8);

ALTER TABLE public.service_settings
  ADD COLUMN agency_npc_ticket integer NOT NULL DEFAULT 250,
  ADD COLUMN agency_rent_months integer NOT NULL DEFAULT 1,
  ADD COLUMN agency_buy_percent numeric NOT NULL DEFAULT 4,
  ADD COLUMN agency_manage_percent numeric NOT NULL DEFAULT 7,
  ADD COLUMN mandate_ref_permille numeric NOT NULL DEFAULT 4.5,
  ADD COLUMN mandate_min_percent integer NOT NULL DEFAULT 70,
  ADD COLUMN mandate_max_percent integer NOT NULL DEFAULT 150,
  ADD COLUMN rent_period_days integer NOT NULL DEFAULT 30,
  ADD COLUMN max_unpaid integer NOT NULL DEFAULT 2;

ALTER TABLE public.service_orders DROP CONSTRAINT service_orders_service_check;
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_service_check CHECK (service IN ('garage','demenagement','immobilier'));

INSERT INTO public.housing_types (id, name, daily_cost) VALUES ('tenant', 'Locataire (logement de joueur)', 3);
ALTER TABLE public.housing_leases ADD COLUMN mandate_id uuid;

-- 2. Données ------------------------------------------------------------------------
CREATE TABLE public.agency_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.characters(id),
  property_id text NOT NULL REFERENCES public.economy_catalog(id),
  city_id text NOT NULL,
  agency_id uuid REFERENCES public.businesses(id),
  rent integer NOT NULL CHECK (rent > 0),
  status text NOT NULL DEFAULT 'libre' CHECK (status IN ('libre','loue','termine')),
  tenant_id uuid REFERENCES public.characters(id),
  lease_id uuid,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  ended_at timestamptz
);
CREATE UNIQUE INDEX agency_mandates_one_active ON public.agency_mandates (owner_id, property_id) WHERE status <> 'termine';
CREATE INDEX agency_mandates_city ON public.agency_mandates (city_id, status);

CREATE TABLE public.agency_rents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL REFERENCES public.agency_mandates(id),
  lease_id uuid NOT NULL,
  period integer NOT NULL CHECK (period >= 1),
  amount integer NOT NULL CHECK (amount > 0),
  agency_amount integer NOT NULL DEFAULT 0 CHECK (agency_amount >= 0),
  status text NOT NULL CHECK (status IN ('paye','impaye')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  paid_at timestamptz,
  UNIQUE (lease_id, period)
);

CREATE TABLE public.agency_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL UNIQUE,
  recipient_id uuid NOT NULL REFERENCES public.characters(id),
  amount integer NOT NULL CHECK (amount > 0),
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  collected_at timestamptz
);
CREATE INDEX agency_payouts_recipient ON public.agency_payouts (recipient_id) WHERE collected_at IS NULL;

GRANT SELECT ON public.agency_mandates, public.agency_rents, public.agency_payouts TO authenticated;
GRANT ALL ON public.agency_mandates, public.agency_rents, public.agency_payouts TO service_role;
ALTER TABLE public.agency_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_rents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mandats des parties" ON public.agency_mandates FOR SELECT TO authenticated USING (
  owner_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid())
  OR tenant_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid())
  OR agency_id IN (SELECT b.id FROM public.businesses b JOIN public.characters ch ON ch.id = b.owner_id WHERE ch.user_id = auth.uid()));
CREATE POLICY "loyers des parties" ON public.agency_rents FOR SELECT TO authenticated USING (
  mandate_id IN (SELECT id FROM public.agency_mandates));
CREATE POLICY "mes encaissements" ON public.agency_payouts FOR SELECT TO authenticated USING (
  recipient_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));

-- 3. Fonctions internes -------------------------------------------------------------
CREATE FUNCTION public.agency_ref_rent(_price integer) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(1, round(_price * mandate_ref_permille / 1000.0)::integer) FROM public.service_settings WHERE id = 1 $$;

-- Part de gestion de l'agence sur un loyer (tarif de l'agence appliqué).
CREATE FUNCTION public.agency_manage_cut(_rent integer, _biz uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _biz IS NULL THEN 0 ELSE LEAST(_rent, floor(_rent * s.agency_manage_percent / 100.0 * public.service_percent(_biz) / 100.0)::integer) END
  FROM public.service_settings s WHERE s.id = 1 $$;

CREATE FUNCTION public.agency_housing_type(_cat public.economy_catalog) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _cat.name ILIKE 'Maison%' THEN 'house' WHEN COALESCE((_cat.config->>'rooms')::integer, 1) <= 1 THEN 'studio' ELSE 'flat' END $$;

-- Paiement à crédit au destinataire, encaissé à sa prochaine lecture.
CREATE FUNCTION public.agency_payout(_key text, _to uuid, _amount integer, _label text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _amount > 0 THEN
    INSERT INTO public.agency_payouts (operation_key, recipient_id, amount, label) VALUES (_key, _to, _amount, _label)
    ON CONFLICT (operation_key) DO NOTHING;
  END IF;
END $$;

-- Fin forcée d'un bail de logement de joueur (impayés ou bien retiré). Le locataire est relogé en chambre.
CREATE FUNCTION public.agency_end_lease(_lease uuid, _deposit_to uuid, _reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.housing_leases;
BEGIN
  SELECT * INTO l FROM public.housing_leases WHERE id = _lease AND status = 'actif' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.housing_leases SET status = 'terminé', ended_at = public.game_now() WHERE id = l.id;
  UPDATE public.character_housing SET type_id = 'room' WHERE character_id = l.character_id AND type_id = 'tenant';
  IF _deposit_to IS NOT NULL THEN
    PERFORM public.agency_payout('deposit:' || l.id, _deposit_to, l.deposit, 'Dépôt de garantie — ' || l.title || ' (' || _reason || ')');
  END IF;
END $$;

-- Loyers d'un bail de logement de joueur, réglés à la lecture du locataire (une ligne unique par mois).
CREATE FUNCTION public.agency_settle_lease(_lease uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.service_settings; l public.housing_leases; m public.agency_mandates; n integer; p integer; r public.agency_rents;
  cut integer; bal integer; left_dep integer;
BEGIN
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT * INTO l FROM public.housing_leases WHERE id = _lease AND mandate_id IS NOT NULL;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO m FROM public.agency_mandates WHERE id = l.mandate_id FOR UPDATE;
  n := LEAST(24, floor(extract(epoch FROM (COALESCE(l.ended_at, public.game_now()) - l.started_at)) / (s.rent_period_days * 86400))::integer);
  FOR p IN 1 .. n LOOP
    SELECT * INTO r FROM public.agency_rents WHERE lease_id = l.id AND period = p;
    CONTINUE WHEN FOUND AND r.status = 'paye';
    bal := COALESCE((SELECT balance FROM public.accounts WHERE character_id = l.character_id), 0);
    IF bal >= l.monthly THEN
      cut := public.agency_manage_cut(l.monthly, m.agency_id);
      PERFORM public.economy_cash(l.character_id, 'prent:' || l.id || ':' || p, -l.monthly, 'Loyer mois ' || p || ' — ' || l.title, 'logement');
      IF cut > 0 THEN
        PERFORM public.business_move(m.agency_id, 'prent-agency:' || l.id || ':' || p, cut, 'service', 'Gestion locative — ' || l.title || ' (mois ' || p || ')');
      END IF;
      PERFORM public.agency_payout('prent-owner:' || l.id || ':' || p, m.owner_id, l.monthly - cut, 'Loyer reçu mois ' || p || ' — ' || l.title);
      INSERT INTO public.agency_rents (mandate_id, lease_id, period, amount, agency_amount, status, paid_at)
      VALUES (m.id, l.id, p, l.monthly, cut, 'paye', public.game_now())
      ON CONFLICT (lease_id, period) DO UPDATE SET status = 'paye', agency_amount = EXCLUDED.agency_amount, paid_at = EXCLUDED.paid_at;
    ELSE
      -- Échec conservé sous sa propre ligne ; nouvel essai à chaque lecture.
      INSERT INTO public.agency_rents (mandate_id, lease_id, period, amount, status) VALUES (m.id, l.id, p, l.monthly, 'impaye')
      ON CONFLICT (lease_id, period) DO NOTHING;
    END IF;
  END LOOP;
  IF l.status = 'actif' AND (SELECT count(*) FROM public.agency_rents WHERE lease_id = l.id AND status = 'impaye') >= s.max_unpaid THEN
    -- Le dépôt couvre d'abord les loyers impayés (même partage propriétaire/agence) ; le reste revient au locataire.
    PERFORM public.agency_end_lease(l.id, NULL, 'impayés');
    left_dep := l.deposit;
    FOR r IN SELECT * FROM public.agency_rents WHERE lease_id = l.id AND status = 'impaye' ORDER BY period LOOP
      EXIT WHEN left_dep < r.amount;
      cut := public.agency_manage_cut(r.amount, m.agency_id);
      IF cut > 0 THEN
        PERFORM public.business_move(m.agency_id, 'prent-agency:' || l.id || ':' || r.period, cut, 'service', 'Gestion locative — ' || l.title || ' (mois ' || r.period || ', dépôt)');
      END IF;
      PERFORM public.agency_payout('prent-owner:' || l.id || ':' || r.period, m.owner_id, r.amount - cut, 'Loyer mois ' || r.period || ' payé par le dépôt — ' || l.title);
      UPDATE public.agency_rents SET status = 'paye', agency_amount = cut, paid_at = public.game_now() WHERE id = r.id;
      left_dep := left_dep - r.amount;
    END LOOP;
    PERFORM public.agency_payout('deposit:' || l.id, l.character_id, left_dep, 'Reste du dépôt de garantie — ' || l.title);
    SELECT * INTO l FROM public.housing_leases WHERE id = _lease;
  END IF;
  IF l.status <> 'actif' AND m.lease_id = l.id AND m.status = 'loue' THEN
    UPDATE public.agency_mandates SET status = 'libre', tenant_id = NULL, lease_id = NULL WHERE id = m.id;
  END IF;
END $$;

-- Contrôle d'un mandat : le propriétaire doit toujours posséder le bien et ne pas y habiter.
CREATE FUNCTION public.agency_settle_mandate(_m uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.agency_mandates; l public.housing_leases;
BEGIN
  SELECT * INTO m FROM public.agency_mandates WHERE id = _m AND status <> 'termine' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF m.lease_id IS NOT NULL THEN
    SELECT * INTO l FROM public.housing_leases WHERE id = m.lease_id;
    IF l.status <> 'actif' THEN UPDATE public.agency_mandates SET status = 'libre', tenant_id = NULL, lease_id = NULL WHERE id = m.id; m.status := 'libre'; m.lease_id := NULL; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.personal_assets WHERE character_id = m.owner_id AND catalog_id = m.property_id)
     OR EXISTS (SELECT 1 FROM public.housing_leases WHERE character_id = m.owner_id AND status = 'actif' AND property_id = m.property_id) THEN
    IF m.lease_id IS NOT NULL THEN
      PERFORM public.agency_end_lease(m.lease_id, m.tenant_id, 'rendu : le propriétaire a repris son bien');
    END IF;
    UPDATE public.agency_mandates SET status = 'termine', ended_at = public.game_now(), tenant_id = NULL, lease_id = NULL WHERE id = m.id;
  END IF;
END $$;

CREATE FUNCTION public.agency_collect(_cid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE x public.agency_payouts;
BEGIN
  FOR x IN SELECT * FROM public.agency_payouts WHERE recipient_id = _cid AND collected_at IS NULL ORDER BY created_at FOR UPDATE LOOP
    PERFORM public.economy_cash(_cid, 'apay:' || x.operation_key, x.amount, x.label, 'logement');
    UPDATE public.agency_payouts SET collected_at = public.game_now() WHERE id = x.id;
  END LOOP;
END $$;

-- 4. Actions des joueurs ------------------------------------------------------------
-- Confier un bien à une agence (agence de joueur de la ville, ou NULL = agence fictive CIVITAS).
CREATE FUNCTION public.agency_mandate(_property_id text, _agency_id uuid, _rent integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.service_settings; cat public.economy_catalog; b public.businesses; ref integer; mid uuid;
BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT ec.* INTO cat FROM public.economy_catalog ec JOIN public.personal_assets a ON a.catalog_id = ec.id AND a.character_id = cid
    WHERE ec.id = _property_id AND COALESCE(ec.config->>'realestate','false') = 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bien introuvable dans votre patrimoine'; END IF;
  IF EXISTS (SELECT 1 FROM public.housing_leases WHERE character_id = cid AND status = 'actif' AND property_id = cat.id) THEN
    RAISE EXCEPTION 'Vous habitez ce logement : déménagez avant de le louer'; END IF;
  IF EXISTS (SELECT 1 FROM public.agency_mandates WHERE owner_id = cid AND property_id = cat.id AND status <> 'termine') THEN
    RAISE EXCEPTION 'Ce bien est déjà confié à une agence'; END IF;
  IF _agency_id IS NOT NULL THEN
    SELECT * INTO b FROM public.businesses WHERE id = _agency_id AND status = 'active' AND sector_id = 'immobilier';
    IF NOT FOUND THEN RAISE EXCEPTION 'Agence indisponible'; END IF;
    IF b.city_id IS DISTINCT FROM cat.config->>'city' THEN RAISE EXCEPTION 'Cette agence travaille dans une autre ville'; END IF;
    IF b.owner_id = cid THEN RAISE EXCEPTION 'Vous ne pouvez pas être votre propre client'; END IF;
  END IF;
  ref := public.agency_ref_rent(cat.price);
  IF _rent IS NULL OR _rent < ceil(ref * s.mandate_min_percent / 100.0) OR _rent > floor(ref * s.mandate_max_percent / 100.0) THEN
    RAISE EXCEPTION 'Loyer entre % € et % €', ceil(ref * s.mandate_min_percent / 100.0)::integer, floor(ref * s.mandate_max_percent / 100.0)::integer; END IF;
  INSERT INTO public.agency_mandates (owner_id, property_id, city_id, agency_id, rent)
  VALUES (cid, cat.id, cat.config->>'city', _agency_id, _rent) RETURNING id INTO mid;
  RETURN mid;
END $$;

CREATE FUNCTION public.agency_mandate_end(_mandate_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; m public.agency_mandates;
BEGIN
  cid := public.prepare_daily_life();
  PERFORM public.agency_settle_mandate(_mandate_id);
  SELECT * INTO m FROM public.agency_mandates WHERE id = _mandate_id AND owner_id = cid FOR UPDATE;
  IF NOT FOUND OR m.status = 'termine' THEN RAISE EXCEPTION 'Mandat introuvable'; END IF;
  IF m.status = 'loue' THEN RAISE EXCEPTION 'Un locataire habite ce logement : attendez son départ'; END IF;
  UPDATE public.agency_mandates SET status = 'termine', ended_at = public.game_now() WHERE id = m.id;
END $$;

-- Louer le logement d'un joueur (propriétaire ↔ agence ↔ locataire).
CREATE FUNCTION public.agency_rent(_mandate_id uuid, _mover_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.service_settings; m public.agency_mandates; cat public.economy_catalog;
  home uuid; t text; move_cost integer; fee integer; lease public.housing_leases; o public.service_orders;
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO o FROM public.service_orders WHERE operation_key = 'agency-rent:' || _request_id;
  IF FOUND THEN RETURN jsonb_build_object('already', true); END IF;
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  PERFORM public.agency_settle_mandate(_mandate_id);
  SELECT * INTO m FROM public.agency_mandates WHERE id = _mandate_id FOR UPDATE;
  IF NOT FOUND OR m.status <> 'libre' THEN RAISE EXCEPTION 'Ce logement n''est plus disponible'; END IF;
  IF m.owner_id = cid THEN RAISE EXCEPTION 'Vous ne pouvez pas louer votre propre bien'; END IF;
  IF m.city_id IS DISTINCT FROM c.city_id THEN RAISE EXCEPTION 'Ce logement est dans une autre ville'; END IF;
  IF EXISTS (SELECT 1 FROM public.housing_leases WHERE character_id = cid AND started_at = public.game_now()) THEN
    RAISE EXCEPTION 'Un seul changement de logement à la fois'; END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND status = 'running') THEN RAISE EXCEPTION 'Terminez votre activité'; END IF;
  SELECT id INTO home FROM public.locations WHERE city_id = c.city_id AND kind = 'logement' ORDER BY created_at LIMIT 1;
  IF home IS NULL THEN RAISE EXCEPTION 'Aucun logement disponible dans cette ville'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = m.property_id;
  t := public.agency_housing_type(cat);
  move_cost := COALESCE((SELECT price FROM public.economy_catalog WHERE kind = 'housing' AND config->>'type_id' = t AND COALESCE(config->>'shop','false') <> 'true' LIMIT 1), 0);
  PERFORM public.housing_close_lease(cid, true);
  IF move_cost > 0 THEN
    PERFORM public.service_pay(cid, _mover_id, 'demenagement', move_cost, 'lease-move:' || _request_id, 'Déménagement — ' || cat.name, 'logement');
  END IF;
  fee := public.service_pay(cid, m.agency_id, 'immobilier', m.rent * s.agency_rent_months, 'agency-rent:' || _request_id, 'Frais d''agence (location) — ' || cat.name, 'logement');
  PERFORM public.economy_cash(cid, 'lease-deposit:' || _request_id, -m.rent, 'Dépôt de garantie — ' || cat.name, 'logement');
  INSERT INTO public.character_housing (character_id, type_id, location_id) VALUES (cid, 'tenant', home)
    ON CONFLICT (character_id) DO UPDATE SET type_id = 'tenant', location_id = EXCLUDED.location_id;
  INSERT INTO public.housing_leases (character_id, property_id, mandate_id, kind, type_id, location_id, title, monthly, deposit)
  VALUES (cid, cat.id, m.id, 'location', 'tenant', home, cat.name, m.rent, m.rent) RETURNING * INTO lease;
  UPDATE public.agency_mandates SET status = 'loue', tenant_id = cid, lease_id = lease.id WHERE id = m.id;
  RETURN jsonb_build_object('lease_id', lease.id, 'fee', fee, 'deposit', m.rent, 'move', move_cost, 'already', false);
END $$;

-- Louer une annonce fictive en passant par une agence (frais = 1 mois de loyer au tarif de l'agence).
CREATE FUNCTION public.agency_rent_listing(_listing_id uuid, _mover_id uuid, _agency_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.service_settings; r jsonb; monthly integer; fee integer; title text;
BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.service_orders WHERE operation_key = 'agency-rent:' || _request_id) THEN RETURN jsonb_build_object('already', true); END IF;
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT ht.daily_cost * 30, li.title INTO monthly, title FROM public.rental_listings li JOIN public.housing_types ht ON ht.id = li.type_id WHERE li.id = _listing_id;
  IF monthly IS NULL THEN RAISE EXCEPTION 'Annonce introuvable'; END IF;
  r := public.housing_action('rent', jsonb_build_object('listing_id', _listing_id, 'mover_id', _mover_id), _request_id);
  fee := public.service_pay(cid, _agency_id, 'immobilier', monthly * s.agency_rent_months, 'agency-rent:' || _request_id, 'Frais d''agence (location) — ' || title, 'logement');
  RETURN r || jsonb_build_object('fee', fee, 'already', false);
END $$;

-- Acheter un bien en passant par une agence (frais = 4 % du prix au tarif de l'agence).
CREATE FUNCTION public.agency_buy(_catalog_id text, _agency_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.service_settings; cat public.economy_catalog; r jsonb; fee integer;
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND COALESCE(config->>'realestate','false') = 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bien introuvable'; END IF;
  r := public.shop_buy(_catalog_id, _request_id);
  IF COALESCE((r->>'already')::boolean, false) THEN RETURN r; END IF;
  fee := public.service_pay(cid, _agency_id, 'immobilier', ceil(cat.price * s.agency_buy_percent / 100.0)::integer,
    'agency-buy:' || _request_id, 'Frais d''agence (achat) — ' || cat.name, 'logement');
  RETURN r || jsonb_build_object('agency_fee', fee);
END $$;

-- 5. Lecture unique ----------------------------------------------------------------
CREATE FUNCTION public.agency_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.service_settings; x record; b public.businesses;
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  -- Loyers dus par ce joueur (baux en cours ou terminés avec mois non réglés).
  FOR x IN SELECT id FROM public.housing_leases WHERE character_id = cid AND mandate_id IS NOT NULL
    AND (status = 'actif' OR EXISTS (SELECT 1 FROM public.agency_rents r WHERE r.lease_id = housing_leases.id AND r.status = 'impaye')
         OR ended_at > started_at + s.rent_period_days * interval '1 day') LOOP
    PERFORM public.agency_settle_lease(x.id);
  END LOOP;
  FOR x IN SELECT id FROM public.agency_mandates WHERE owner_id = cid AND status <> 'termine' LOOP
    PERFORM public.agency_settle_mandate(x.id);
  END LOOP;
  FOR x IN SELECT id FROM public.businesses WHERE status = 'active' AND city_id = c.city_id AND sector_id = 'immobilier' LOOP
    PERFORM public.service_settle(x.id);
  END LOOP;
  SELECT * INTO b FROM public.businesses WHERE owner_id = cid AND status = 'active' AND sector_id = 'immobilier';
  IF FOUND THEN PERFORM public.service_settle(b.id); END IF;
  PERFORM public.agency_collect(cid);
  RETURN jsonb_build_object(
    'balance', COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0),
    'city_id', c.city_id,
    'city', (SELECT name FROM public.cities WHERE id = c.city_id),
    'settings', jsonb_build_object('rent_months', s.agency_rent_months, 'buy_percent', s.agency_buy_percent, 'manage_percent', s.agency_manage_percent,
      'min_percent', s.mandate_min_percent, 'max_percent', s.mandate_max_percent, 'ref_permille', s.mandate_ref_permille,
      'period_days', s.rent_period_days, 'max_unpaid', s.max_unpaid),
    'agencies', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', bb.id, 'name', bb.name, 'city_id', bb.city_id, 'owner', ch.first_name,
        'mine', bb.owner_id = cid, 'percent', public.service_percent(bb.id), 'rating', public.service_rating(bb.id),
        'reviews', (SELECT count(*) FROM public.service_reviews r WHERE r.business_id = bb.id))
        ORDER BY public.service_rating(bb.id) DESC NULLS LAST, public.service_percent(bb.id))
      FROM public.businesses bb JOIN public.characters ch ON ch.id = bb.owner_id
      WHERE bb.status = 'active' AND bb.sector_id = 'immobilier'), '[]'),
    'listings', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', ec.name, 'rent', m.rent,
        'surface', ec.config->>'surface', 'rooms', ec.config->>'rooms', 'dpe', ec.config->>'dpe', 'district', ec.config->>'district',
        'owner', ch.first_name, 'agency', COALESCE(bb.name, 'Agence fictive CIVITAS'), 'agency_id', m.agency_id,
        'fee', public.service_amount(m.rent * s.agency_rent_months, CASE WHEN m.agency_id IS NULL THEN 100 ELSE public.service_percent(m.agency_id) END))
        ORDER BY m.rent)
      FROM public.agency_mandates m JOIN public.economy_catalog ec ON ec.id = m.property_id JOIN public.characters ch ON ch.id = m.owner_id
      LEFT JOIN public.businesses bb ON bb.id = m.agency_id
      WHERE m.status = 'libre' AND m.city_id = c.city_id AND m.owner_id <> cid), '[]'),
    'my_properties', COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog_id', ec.id, 'name', ec.name, 'city_id', ec.config->>'city',
        'price', ec.price, 'ref_rent', public.agency_ref_rent(ec.price),
        'living', EXISTS (SELECT 1 FROM public.housing_leases hl WHERE hl.character_id = cid AND hl.status = 'actif' AND hl.property_id = ec.id),
        'mandate', (SELECT jsonb_build_object('id', m.id, 'status', m.status, 'rent', m.rent, 'agency', COALESCE(bb.name, 'Agence fictive CIVITAS'),
            'tenant', (SELECT first_name FROM public.characters WHERE id = m.tenant_id),
            'cut', public.agency_manage_cut(m.rent, m.agency_id))
          FROM public.agency_mandates m LEFT JOIN public.businesses bb ON bb.id = m.agency_id
          WHERE m.owner_id = cid AND m.property_id = ec.id AND m.status <> 'termine')) ORDER BY ec.price)
      FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id
      WHERE a.character_id = cid AND COALESCE(ec.config->>'realestate','false') = 'true'), '[]'),
    'my_lease', (SELECT jsonb_build_object('id', l.id, 'title', l.title, 'rent', l.monthly, 'deposit', l.deposit, 'started_at', l.started_at,
        'owner', (SELECT ch.first_name FROM public.characters ch WHERE ch.id = m.owner_id),
        'agency', COALESCE((SELECT name FROM public.businesses WHERE id = m.agency_id), 'Agence fictive CIVITAS'),
        'next_due', l.started_at + ((SELECT count(*) FROM public.agency_rents r WHERE r.lease_id = l.id) + 1) * s.rent_period_days * interval '1 day',
        'unpaid', (SELECT count(*) FROM public.agency_rents r WHERE r.lease_id = l.id AND r.status = 'impaye'),
        'rents', COALESCE((SELECT jsonb_agg(jsonb_build_object('period', r.period, 'amount', r.amount, 'status', r.status) ORDER BY r.period DESC)
          FROM public.agency_rents r WHERE r.lease_id = l.id), '[]'))
      FROM public.housing_leases l JOIN public.agency_mandates m ON m.id = l.mandate_id
      WHERE l.character_id = cid AND l.status = 'actif'),
    'payouts', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', p.label, 'amount', p.amount, 'at', p.created_at) ORDER BY p.created_at DESC)
      FROM (SELECT * FROM public.agency_payouts WHERE recipient_id = cid ORDER BY created_at DESC LIMIT 15) p), '[]'),
    'my_agency', CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object('id', b.id, 'name', b.name, 'city_id', b.city_id,
        'percent', public.service_percent(b.id), 'rating', public.service_rating(b.id),
        'treasury', (SELECT balance FROM public.business_treasuries WHERE business_id = b.id),
        'mandates', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', ec.name, 'status', m.status, 'rent', m.rent,
            'owner', (SELECT first_name FROM public.characters WHERE id = m.owner_id),
            'tenant', (SELECT first_name FROM public.characters WHERE id = m.tenant_id),
            'cut', public.agency_manage_cut(m.rent, b.id)) ORDER BY m.created_at DESC)
          FROM public.agency_mandates m JOIN public.economy_catalog ec ON ec.id = m.property_id
          WHERE m.agency_id = b.id AND m.status <> 'termine'), '[]'),
        'weeks', COALESCE((SELECT jsonb_agg(jsonb_build_object('week', w.week, 'clients', w.clients, 'revenue', w.revenue) ORDER BY w.week DESC)
          FROM (SELECT * FROM public.service_npc_weeks WHERE business_id = b.id ORDER BY week DESC LIMIT 6) w), '[]'),
        'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('reference', o.reference, 'label', o.label, 'amount', o.amount, 'at', o.created_at,
            'client', (SELECT first_name FROM public.characters WHERE id = o.client_id)) ORDER BY o.created_at DESC)
          FROM (SELECT * FROM public.service_orders WHERE business_id = b.id ORDER BY created_at DESC LIMIT 20) o), '[]')) END);
END $$;

-- 6. Branchement du secteur sur les fonctions de services existantes (remplacement vérifié) --
DO $$
DECLARE f text; def text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.service_settle(uuid)', 'public.service_set_price(integer)', 'public.service_state()'] LOOP
    def := pg_get_functiondef(f::regprocedure);
    IF position('IN (''garage'',''demenagement'')' IN def) = 0 THEN RAISE EXCEPTION 'Liste des secteurs introuvable dans %', f; END IF;
    def := replace(def, 'IN (''garage'',''demenagement'')', 'IN (''garage'',''demenagement'',''immobilier'')');
    IF f = 'public.service_settle(uuid)' THEN
      IF position('CASE WHEN b.sector_id = ''garage'' THEN s.garage_npc_ticket ELSE s.moving_npc_ticket END' IN def) = 0 THEN RAISE EXCEPTION 'Ticket introuvable'; END IF;
      def := replace(def, 'CASE WHEN b.sector_id = ''garage'' THEN s.garage_npc_ticket ELSE s.moving_npc_ticket END',
        'CASE b.sector_id WHEN ''garage'' THEN s.garage_npc_ticket WHEN ''immobilier'' THEN s.agency_npc_ticket ELSE s.moving_npc_ticket END');
    END IF;
    IF f = 'public.service_state()' THEN
      IF position('CASE o.service WHEN ''garage'' THEN ''Garage fictif CIVITAS'' ELSE' IN def) = 0 THEN RAISE EXCEPTION 'Libellé fictif introuvable'; END IF;
      def := replace(def, 'CASE o.service WHEN ''garage'' THEN ''Garage fictif CIVITAS'' ELSE',
        'CASE o.service WHEN ''garage'' THEN ''Garage fictif CIVITAS'' WHEN ''immobilier'' THEN ''Agence fictive CIVITAS'' ELSE');
    END IF;
    EXECUTE def;
  END LOOP;
END $$;

-- 7. Droits ------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.agency_ref_rent(integer), public.agency_manage_cut(integer, uuid), public.agency_housing_type(public.economy_catalog),
  public.agency_payout(text, uuid, integer, text), public.agency_end_lease(uuid, uuid, text), public.agency_settle_lease(uuid),
  public.agency_settle_mandate(uuid), public.agency_collect(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agency_mandate(text, uuid, integer), public.agency_mandate_end(uuid), public.agency_rent(uuid, uuid, uuid),
  public.agency_rent_listing(uuid, uuid, uuid, uuid), public.agency_buy(text, uuid, uuid), public.agency_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_mandate(text, uuid, integer), public.agency_mandate_end(uuid), public.agency_rent(uuid, uuid, uuid),
  public.agency_rent_listing(uuid, uuid, uuid, uuid), public.agency_buy(text, uuid, uuid), public.agency_state() TO authenticated;

-- 8. Contrôles ---------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.business_sectors WHERE id = 'immobilier') THEN RAISE EXCEPTION 'Secteur immobilier manquant'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.housing_types WHERE id = 'room') THEN RAISE EXCEPTION 'Type chambre manquant (relogement)'; END IF;
  IF position('immobilier' IN pg_get_functiondef('public.service_settle(uuid)'::regprocedure)) = 0
     OR position('immobilier' IN pg_get_functiondef('public.service_state()'::regprocedure)) = 0
     OR position('immobilier' IN pg_get_functiondef('public.service_set_price(integer)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'Agence non branchée sur les services'; END IF;
END $$;
