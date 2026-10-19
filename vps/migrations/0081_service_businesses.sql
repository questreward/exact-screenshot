-- CIVITAS – ENTREPRISES DE SERVICES, PHASE 1 : GARAGES ET DÉMÉNAGEURS
-- Uniquement des ajouts, tout ou rien.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0081_service_businesses.sql
-- Réutilise les entreprises existantes (caisse, salariés, paie, règlement hebdomadaire) : deux nouveaux secteurs
--   « Garage automobile » et « Déménagement », créés depuis Patrimoine comme les autres.
-- Priorité aux joueurs : un garage ou un déménageur de joueur de la ville est proposé en premier ; sinon, une
--   entreprise fictive gérée par CIVITAS fait le travail au prix de référence (le monde marche toujours).
-- Argent : le client paie par economy_cash (seul chemin de l'argent personnel) ; la somme entre dans la caisse
--   de l'entreprise par business_move (clé unique). Jamais de retrait vers un compte personnel.
-- Clients fictifs : chaque semaine de jeu terminée, des habitants fictifs passent (plus si les prix sont bas et la
--   note bonne), réglé une seule fois à la lecture (une ligne unique par entreprise et par semaine).
-- Avis : un par service payé (jamais sur sa propre entreprise) + avis automatiques des habitants fictifs.
-- Modifications d'existant (2) :
--   * business_ledger : nouveau type d'écriture 'service'.
--   * housing_action : la seule ligne qui payait le déménagement passe par le déménageur choisi (ou fictif).
--     Remplacement ciblé, vérifié : la migration échoue si la ligne attendue n'est pas trouvée.
BEGIN;

-- 1. Secteurs et réglages -------------------------------------------------------------
INSERT INTO public.business_sectors (id, label, description, location_kind, min_capital, base_revenue, per_worker, per_shift, weekly_rent, npc_wage, max_npc, sort_order) VALUES
  ('garage', 'Garage automobile', 'Entretien et réparation des voitures des habitants et des joueurs.', 'commerce', 1500, 120, 120, 80, 180, 100, 4, 6),
  ('demenagement', 'Déménagement', 'Cartons, camion et bras : les joueurs qui changent de logement font appel à vous.', 'entreprise', 1200, 100, 130, 80, 140, 100, 5, 7);

CREATE TABLE public.service_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  min_percent integer NOT NULL DEFAULT 70,
  max_percent integer NOT NULL DEFAULT 150,
  npc_base_clients integer NOT NULL DEFAULT 3,
  npc_max_clients integer NOT NULL DEFAULT 8,
  garage_npc_ticket integer NOT NULL DEFAULT 120,
  moving_npc_ticket integer NOT NULL DEFAULT 350,
  npc_reviews_per_week integer NOT NULL DEFAULT 2,
  max_weeks_back integer NOT NULL DEFAULT 4,
  CHECK (min_percent > 0 AND min_percent <= 100 AND max_percent >= 100)
);
INSERT INTO public.service_settings (id) VALUES (1);

ALTER TABLE public.business_ledger DROP CONSTRAINT business_ledger_kind_check;
ALTER TABLE public.business_ledger ADD CONSTRAINT business_ledger_kind_check
  CHECK (kind IN ('capital','deposit','revenue','rent','npc_wage','player_salary','owner_salary','closing','stock','sale','service'));

-- 2. Données ------------------------------------------------------------------------
CREATE TABLE public.service_prices (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id),
  percent integer NOT NULL DEFAULT 100 CHECK (percent BETWEEN 50 AND 200)
);
CREATE TABLE public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL UNIQUE,
  reference text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.characters(id),
  business_id uuid REFERENCES public.businesses(id),
  service text NOT NULL CHECK (service IN ('garage','demenagement')),
  label text NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE INDEX service_orders_business ON public.service_orders (business_id, created_at DESC);
CREATE TABLE public.service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  order_id uuid UNIQUE REFERENCES public.service_orders(id),
  author_id uuid REFERENCES public.characters(id),
  npc_name text,
  week integer,
  slot integer,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text CHECK (length(comment) <= 200),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  CHECK ((order_id IS NOT NULL AND author_id IS NOT NULL) OR (npc_name IS NOT NULL AND week IS NOT NULL AND slot IS NOT NULL)),
  UNIQUE (business_id, week, slot)
);
CREATE TABLE public.service_npc_weeks (
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  week integer NOT NULL,
  clients integer NOT NULL,
  revenue integer NOT NULL,
  PRIMARY KEY (business_id, week)
);

GRANT SELECT ON public.service_settings, public.service_prices, public.service_orders, public.service_reviews, public.service_npc_weeks TO authenticated;
GRANT ALL ON public.service_settings, public.service_prices, public.service_orders, public.service_reviews, public.service_npc_weeks TO service_role;
ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_npc_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_settings_read ON public.service_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY service_prices_read ON public.service_prices FOR SELECT TO authenticated USING (true);
-- Factures : visibles par le client et par le patron de l'entreprise.
CREATE POLICY service_orders_parties ON public.service_orders FOR SELECT TO authenticated USING (
  client_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid())
  OR business_id IN (SELECT b.id FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE c.user_id = auth.uid()));
-- Les avis publics passent par service_state (prénom seulement) ; la table reste à l'auteur et au patron.
CREATE POLICY service_reviews_parties ON public.service_reviews FOR SELECT TO authenticated USING (
  author_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid())
  OR business_id IN (SELECT b.id FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE c.user_id = auth.uid()));
CREATE POLICY service_npc_weeks_owner ON public.service_npc_weeks FOR SELECT TO authenticated USING (
  business_id IN (SELECT b.id FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE c.user_id = auth.uid()));

-- 3. Outils internes -------------------------------------------------------------------
CREATE FUNCTION public.service_percent(_biz uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT percent FROM public.service_prices WHERE business_id = _biz), 100)
$$;
CREATE FUNCTION public.service_amount(_ref integer, _percent integer) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _ref <= 0 THEN 0 ELSE GREATEST(1, floor(_ref * _percent / 100.0)::integer) END
$$;
CREATE FUNCTION public.service_rating(_biz uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT round(avg(stars)::numeric, 1) FROM public.service_reviews WHERE business_id = _biz
$$;

-- Clients fictifs des semaines terminées (une ligne unique par semaine = exactement une fois).
CREATE FUNCTION public.service_settle(_biz uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.service_settings; b public.businesses; cur integer; w integer; first_w integer; pct integer; rating numeric;
  clients integer; ticket integer; rev integer; i integer; stars integer; names text[] := ARRAY['Camille','Nadia','Julien','Sofiane','Inès','Marc','Léa','Hugo','Fatou','Paul'];
BEGIN
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT * INTO b FROM public.businesses WHERE id = _biz FOR UPDATE;
  IF NOT FOUND OR b.status <> 'active' OR b.sector_id NOT IN ('garage','demenagement') THEN RETURN; END IF;
  cur := floor(extract(epoch FROM public.game_now()) / 604800)::integer;
  first_w := GREATEST(floor(extract(epoch FROM b.created_at) / 604800)::integer, cur - s.max_weeks_back);
  FOR w IN first_w .. cur - 1 LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.service_npc_weeks WHERE business_id = _biz AND week = w);
    pct := public.service_percent(_biz);
    rating := COALESCE(public.service_rating(_biz), 3.5);
    clients := LEAST(s.npc_max_clients, GREATEST(0, s.npc_base_clients + floor((rating - 3) * 2)::integer + (100 - pct) / 15));
    ticket := CASE WHEN b.sector_id = 'garage' THEN s.garage_npc_ticket ELSE s.moving_npc_ticket END;
    rev := clients * public.service_amount(ticket, pct);
    INSERT INTO public.service_npc_weeks (business_id, week, clients, revenue) VALUES (_biz, w, clients, rev);
    IF rev > 0 THEN
      PERFORM public.business_move(_biz, 'npc-service:' || w, rev, 'service', clients || ' client(s) fictif(s) — semaine ' || w);
    END IF;
    FOR i IN 1 .. LEAST(clients, s.npc_reviews_per_week) LOOP
      stars := LEAST(5, GREATEST(1, 4 - (pct - 100) / 40 + (abs(hashtext(_biz::text || ':' || w || ':' || i)) % 3) - 1));
      INSERT INTO public.service_reviews (business_id, npc_name, week, slot, stars, comment)
      VALUES (_biz, names[1 + abs(hashtext(_biz::text || w || i)) % 10] || ' (habitant fictif)', w, i, stars,
        CASE WHEN stars >= 4 THEN 'Travail sérieux, je recommande.' WHEN stars = 3 THEN 'Correct, sans plus.' ELSE 'Trop cher pour le service rendu.' END)
      ON CONFLICT (business_id, week, slot) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Paiement d'un service : prestataire joueur choisi (même ville, bon secteur, pas soi-même) ou entreprise fictive.
CREATE FUNCTION public.service_pay(_cid uuid, _biz uuid, _service text, _ref integer, _key text, _label text, _category text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.businesses; amount integer; c public.characters; ref text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.service_orders WHERE operation_key = _key) THEN
    RETURN (SELECT o.amount FROM public.service_orders o WHERE o.operation_key = _key); END IF;
  SELECT * INTO c FROM public.characters WHERE id = _cid;
  amount := _ref;
  IF _biz IS NOT NULL THEN
    SELECT * INTO b FROM public.businesses WHERE id = _biz AND status = 'active' FOR UPDATE;
    IF NOT FOUND OR b.sector_id <> _service THEN RAISE EXCEPTION 'Prestataire indisponible'; END IF;
    IF b.city_id <> c.city_id THEN RAISE EXCEPTION 'Ce prestataire travaille dans une autre ville'; END IF;
    IF b.owner_id = _cid THEN RAISE EXCEPTION 'Vous ne pouvez pas être votre propre client'; END IF;
    amount := public.service_amount(_ref, public.service_percent(_biz));
  END IF;
  ref := 'FAC-' || upper(substr(md5(_key), 1, 8));
  IF amount > 0 THEN
    PERFORM public.economy_cash(_cid, _key, -amount, _label || CASE WHEN _biz IS NULL THEN ' (entreprise fictive)' ELSE ' — ' || b.name END, _category,
      jsonb_build_object('reference', ref, 'business', _biz));
    IF _biz IS NOT NULL THEN
      PERFORM public.business_move(_biz, _key, amount, 'service', _label || ' — client ' || c.first_name);
    END IF;
  END IF;
  INSERT INTO public.service_orders (operation_key, reference, client_id, business_id, service, label, amount)
  VALUES (_key, ref, _cid, _biz, _service, _label, amount);
  RETURN amount;
END $$;

-- 4. Actions des joueurs ---------------------------------------------------------------
CREATE FUNCTION public.service_garage(_catalog_id text, _business_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; cat public.economy_catalog; asset public.personal_assets; amount integer; t timestamptz := public.game_now();
BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.service_orders WHERE operation_key = 'garage:' || _request_id) THEN
    RETURN jsonb_build_object('already', true); END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND kind = 'vehicle';
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule inconnu'; END IF;
  SELECT * INTO asset FROM public.personal_assets WHERE character_id = cid AND catalog_id = cat.id FOR UPDATE;
  IF NOT FOUND OR asset.condition <> 'Entretien nécessaire' THEN RAISE EXCEPTION 'Aucun entretien nécessaire'; END IF;
  amount := public.service_pay(cid, _business_id, 'garage', COALESCE((cat.config->>'maintenance')::integer, 0),
    'garage:' || _request_id, 'Entretien — ' || cat.name, 'transport');
  UPDATE public.personal_assets SET condition = 'Bon état',
    next_maintenance = t + GREATEST(1, COALESCE((cat.config->>'maintenance_days')::integer, 7)) * interval '1 day' WHERE id = asset.id;
  RETURN jsonb_build_object('already', false, 'amount', amount);
END $$;

CREATE FUNCTION public.service_set_price(_percent integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.service_settings; b public.businesses;
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT * INTO b FROM public.businesses WHERE owner_id = cid AND status = 'active' AND sector_id IN ('garage','demenagement') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucune entreprise de services'; END IF;
  IF _percent IS NULL OR _percent NOT BETWEEN s.min_percent AND s.max_percent THEN
    RAISE EXCEPTION 'Tarif entre % et % %% du prix de référence', s.min_percent, s.max_percent; END IF;
  INSERT INTO public.service_prices (business_id, percent) VALUES (b.id, _percent)
    ON CONFLICT (business_id) DO UPDATE SET percent = EXCLUDED.percent;
END $$;

CREATE FUNCTION public.service_review(_order_id uuid, _stars integer, _comment text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; o public.service_orders;
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO o FROM public.service_orders WHERE id = _order_id AND client_id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture introuvable'; END IF;
  IF o.business_id IS NULL THEN RAISE EXCEPTION 'Les entreprises fictives ne sont pas notées'; END IF;
  IF (SELECT owner_id FROM public.businesses WHERE id = o.business_id) = cid THEN RAISE EXCEPTION 'Pas d''avis sur votre propre entreprise'; END IF;
  IF _stars IS NULL OR _stars NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Note de 1 à 5'; END IF;
  IF EXISTS (SELECT 1 FROM public.service_reviews WHERE order_id = o.id) THEN RAISE EXCEPTION 'Avis déjà donné'; END IF;
  INSERT INTO public.service_reviews (business_id, order_id, author_id, stars, comment)
  VALUES (o.business_id, o.id, cid, _stars, NULLIF(left(btrim(COALESCE(_comment, '')), 200), ''));
END $$;

-- 5. Lecture ---------------------------------------------------------------------------
CREATE FUNCTION public.service_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.service_settings; b public.businesses; x record;
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  FOR x IN SELECT id FROM public.businesses WHERE status = 'active' AND city_id = c.city_id AND sector_id IN ('garage','demenagement') LOOP
    PERFORM public.service_settle(x.id);
  END LOOP;
  SELECT * INTO b FROM public.businesses WHERE owner_id = cid AND status = 'active' AND sector_id IN ('garage','demenagement');
  IF FOUND THEN PERFORM public.service_settle(b.id); END IF;
  RETURN jsonb_build_object(
    'balance', COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0),
    'city', (SELECT name FROM public.cities WHERE id = c.city_id),
    'settings', to_jsonb(s) - 'id',
    'providers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', bb.id, 'name', bb.name, 'service', bb.sector_id,
        'owner', ch.first_name, 'mine', bb.owner_id = cid, 'percent', public.service_percent(bb.id),
        'rating', public.service_rating(bb.id), 'reviews', (SELECT count(*) FROM public.service_reviews r WHERE r.business_id = bb.id),
        'last_reviews', COALESCE((SELECT jsonb_agg(jsonb_build_object('stars', r.stars, 'comment', r.comment,
            'author', COALESCE(r.npc_name, (SELECT first_name FROM public.characters WHERE id = r.author_id)))) FROM
            (SELECT * FROM public.service_reviews WHERE business_id = bb.id ORDER BY created_at DESC LIMIT 3) r), '[]'))
        ORDER BY public.service_rating(bb.id) DESC NULLS LAST, public.service_percent(bb.id))
      FROM public.businesses bb JOIN public.characters ch ON ch.id = bb.owner_id
      WHERE bb.status = 'active' AND bb.city_id = c.city_id AND bb.sector_id IN ('garage','demenagement')), '[]'),
    'vehicles', COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog_id', ec.id, 'name', ec.name, 'brand', ec.config->>'brand',
        'condition', a.condition, 'next_maintenance', a.next_maintenance, 'maintenance', COALESCE((ec.config->>'maintenance')::integer, 0)))
      FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id WHERE a.character_id = cid AND ec.kind = 'vehicle'), '[]'),
    'invoices', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'reference', o.reference, 'label', o.label, 'amount', o.amount, 'service', o.service,
        'at', o.created_at, 'provider', COALESCE(bb.name, CASE o.service WHEN 'garage' THEN 'Garage fictif CIVITAS' ELSE 'Déménageurs fictifs CIVITAS' END),
        'fictive', o.business_id IS NULL, 'reviewed', EXISTS (SELECT 1 FROM public.service_reviews r WHERE r.order_id = o.id),
        'can_review', o.business_id IS NOT NULL AND bb.owner_id <> cid) ORDER BY o.created_at DESC)
      FROM public.service_orders o LEFT JOIN public.businesses bb ON bb.id = o.business_id WHERE o.client_id = cid), '[]'),
    'my_business', CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object('id', b.id, 'name', b.name, 'service', b.sector_id,
        'percent', public.service_percent(b.id), 'rating', public.service_rating(b.id),
        'treasury', (SELECT balance FROM public.business_treasuries WHERE business_id = b.id),
        'weeks', COALESCE((SELECT jsonb_agg(jsonb_build_object('week', w.week, 'clients', w.clients, 'revenue', w.revenue) ORDER BY w.week DESC)
          FROM (SELECT * FROM public.service_npc_weeks WHERE business_id = b.id ORDER BY week DESC LIMIT 6) w), '[]'),
        'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('reference', o.reference, 'label', o.label, 'amount', o.amount, 'at', o.created_at,
            'client', (SELECT first_name FROM public.characters WHERE id = o.client_id)) ORDER BY o.created_at DESC)
          FROM (SELECT * FROM public.service_orders WHERE business_id = b.id ORDER BY created_at DESC LIMIT 20) o), '[]'),
        'reviews', COALESCE((SELECT jsonb_agg(jsonb_build_object('stars', r.stars, 'comment', r.comment, 'at', r.created_at,
            'author', COALESCE(r.npc_name, (SELECT first_name FROM public.characters WHERE id = r.author_id))) ORDER BY r.created_at DESC)
          FROM (SELECT * FROM public.service_reviews WHERE business_id = b.id ORDER BY created_at DESC LIMIT 10) r), '[]')) END);
END $$;

-- 6. Déménagement : la ligne de paiement de housing_action passe par le déménageur choisi ---------
DO $$
DECLARE def text; old text := 'IF move_cost > 0 THEN PERFORM public.economy_cash(cid, ''lease-move:'' || _request_id, -move_cost, ''Déménagement — '' || li.title, ''logement''); END IF;';
BEGIN
  SELECT pg_get_functiondef('public.housing_action(text,jsonb,uuid)'::regprocedure) INTO def;
  IF position(old IN def) = 0 THEN RAISE EXCEPTION 'housing_action : ligne de déménagement introuvable, migration annulée'; END IF;
  def := replace(def, old, 'IF move_cost > 0 THEN PERFORM public.service_pay(cid, NULLIF(_input->>''mover_id'', '''')::uuid, ''demenagement'', move_cost, ''lease-move:'' || _request_id, ''Déménagement — '' || li.title, ''logement''); END IF;');
  EXECUTE def;
END $$;

REVOKE ALL ON FUNCTION public.service_settle(uuid), public.service_pay(uuid, uuid, text, integer, text, text, text),
  public.service_percent(uuid), public.service_rating(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.service_garage(text, uuid, uuid), public.service_set_price(integer), public.service_review(uuid, integer, text),
  public.service_state() TO authenticated;

-- 7. Contrôles -------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT count(*) FROM public.business_sectors WHERE id IN ('garage','demenagement')) <> 2 THEN RAISE EXCEPTION 'Secteurs de services manquants'; END IF;
  IF position('service_pay' IN pg_get_functiondef('public.housing_action(text,jsonb,uuid)'::regprocedure)) = 0 THEN RAISE EXCEPTION 'Déménagement non branché'; END IF;
END $$;

COMMIT;
