-- CIVITAS – ENTREPRISES DE SERVICES : CONCESSIONNAIRE AUTOMOBILE
-- Tout ou rien :
--   docker exec -i civitas-db psql -1 -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0084_car_dealership.sql
-- Réutilise : entreprises et caisses (0051), tarif 70–150 % / clients fictifs (0081), voitures du catalogue,
--   crédit auto et revente (0077-0078). La boutique actuelle reste la concession fictive (rien ne change pour elle).
-- Règles :
--   * L'entreprise achète des voitures neuves en stock au prix de gros (80 % du prix catalogue), payées par sa caisse.
--   * Vente comptant au tarif de l'entreprise (70–150 % du prix catalogue), payée à sa caisse.
--   * Vente à crédit : le moteur de crédit existant (prix catalogue) ; la banque fictive verse le prix catalogue à la caisse.
--   * Reprise : l'entreprise rachète la voiture d'un joueur 60 % de sa valeur actuelle (sa caisse paie, crédit soldé d'abord),
--     puis la revend d'occasion à 125 % de ce prix de reprise × son tarif.
--   * Clients fictifs hebdomadaires comme les autres services (commission de 150 € par client au tarif de référence).
-- Modifications d'existant : service_orders (nouveau service autorisé) et listes de secteurs dans service_settle,
--   service_set_price, service_state (remplacement vérifié, la migration échoue si le texte attendu manque).
BEGIN;

-- 1. Secteur et réglages ----------------------------------------------------------------
INSERT INTO public.business_sectors (id, label, description, location_kind, min_capital, base_revenue, per_worker, per_shift, weekly_rent, npc_wage, max_npc, sort_order) VALUES
  ('concession', 'Concessionnaire automobile', 'Voitures neuves en stock, reprises et occasions pour les habitants et les joueurs.', 'commerce', 5000, 150, 130, 80, 250, 110, 4, 9);

ALTER TABLE public.service_settings
  ADD COLUMN dealer_wholesale_percent integer NOT NULL DEFAULT 80,
  ADD COLUMN dealer_trade_percent integer NOT NULL DEFAULT 60,
  ADD COLUMN dealer_used_markup integer NOT NULL DEFAULT 125,
  ADD COLUMN dealer_npc_ticket integer NOT NULL DEFAULT 150,
  ADD COLUMN dealer_max_stock integer NOT NULL DEFAULT 10;

ALTER TABLE public.service_orders DROP CONSTRAINT service_orders_service_check;
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_service_check CHECK (service IN ('garage','demenagement','immobilier','concession'));

-- 2. Tables -------------------------------------------------------------------------------
CREATE TABLE public.dealer_stock (
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (business_id, catalog_id)
);
CREATE TABLE public.dealer_used (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  condition text NOT NULL,
  cost integer NOT NULL CHECK (cost >= 0),
  seller_id uuid REFERENCES public.characters(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','sold')),
  buyer_id uuid REFERENCES public.characters(id),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  sold_at timestamptz
);
CREATE INDEX dealer_used_open ON public.dealer_used (business_id) WHERE status = 'open';
CREATE TABLE public.dealer_ops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  kind text NOT NULL CHECK (kind IN ('restock','sale','credit_sale','trade_in','used_sale')),
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  quantity integer NOT NULL DEFAULT 1,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE INDEX dealer_ops_business ON public.dealer_ops (business_id, created_at DESC);

GRANT SELECT ON public.dealer_stock, public.dealer_used, public.dealer_ops TO authenticated;
GRANT ALL ON public.dealer_stock, public.dealer_used, public.dealer_ops TO service_role;
ALTER TABLE public.dealer_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_ops ENABLE ROW LEVEL SECURITY;
CREATE POLICY dealer_stock_read ON public.dealer_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY dealer_used_read ON public.dealer_used FOR SELECT TO authenticated USING (status = 'open' OR
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (seller_id, buyer_id) AND c.user_id = auth.uid()));
CREATE POLICY dealer_ops_parties ON public.dealer_ops FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE b.id = business_id AND c.user_id = auth.uid()));

-- 3. Outils internes -------------------------------------------------------------------------
-- Concession joueur valide pour un client : active, même ville, pas soi-même. Verrouille l'entreprise.
CREATE FUNCTION public.dealer_for_client(_biz uuid, _cid uuid) RETURNS public.businesses
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.businesses; BEGIN
  SELECT * INTO b FROM public.businesses WHERE id = _biz AND status = 'active' AND sector_id = 'concession' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Concession indisponible'; END IF;
  IF b.city_id <> (SELECT city_id FROM public.characters WHERE id = _cid) THEN RAISE EXCEPTION 'Cette concession est dans une autre ville'; END IF;
  IF b.owner_id = _cid THEN RAISE EXCEPTION 'Vous ne pouvez pas être votre propre client'; END IF;
  RETURN b;
END $$;

CREATE FUNCTION public.dealer_check_buyer(_cid uuid, _cat public.economy_catalog) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.characters; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = _cid;
  IF EXISTS (SELECT 1 FROM public.personal_assets WHERE character_id = _cid AND catalog_id = _cat.id) THEN RAISE EXCEPTION 'Vous possédez déjà ce véhicule'; END IF;
  IF c.age < COALESCE((_cat.config->>'min_age')::integer, 16) THEN RAISE EXCEPTION 'Âge insuffisant'; END IF;
  IF _cat.config ? 'license' AND COALESCE((c.progression->>(_cat.config->>'license'))::integer, 0) < 1 THEN RAISE EXCEPTION 'Permis requis'; END IF;
END $$;

-- 4. Actions -------------------------------------------------------------------------------------
-- Le patron achète des voitures neuves en stock (caisse de l'entreprise, prix de gros)
CREATE FUNCTION public.dealer_restock(_catalog_id text, _quantity integer, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.service_settings; b public.businesses; cat public.economy_catalog; cost integer; have integer; key text := 'dealer-restock:' || _request_id; BEGIN
  cid := public.prepare_daily_life();
  IF EXISTS (SELECT 1 FROM public.dealer_ops WHERE operation_key = key) THEN RETURN jsonb_build_object('already', true); END IF;
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT * INTO b FROM public.businesses WHERE owner_id = cid AND status = 'active' AND sector_id = 'concession' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucune concession'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND kind = 'vehicle' AND COALESCE(config->>'shop','false') = 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule inconnu'; END IF;
  IF _quantity IS NULL OR _quantity < 1 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  SELECT COALESCE(sum(quantity), 0) INTO have FROM public.dealer_stock WHERE business_id = b.id;
  IF have + _quantity > s.dealer_max_stock THEN RAISE EXCEPTION 'Stock maximum : % voitures', s.dealer_max_stock; END IF;
  cost := ceil(cat.price * s.dealer_wholesale_percent / 100.0)::integer * _quantity;
  IF NOT public.business_move(b.id, key, -cost, 'stock', 'Achat en stock — ' || _quantity || ' × ' || cat.name) THEN
    RAISE EXCEPTION 'Caisse de l''entreprise insuffisante (% €)', cost; END IF;
  INSERT INTO public.dealer_stock (business_id, catalog_id, quantity) VALUES (b.id, cat.id, _quantity)
    ON CONFLICT (business_id, catalog_id) DO UPDATE SET quantity = dealer_stock.quantity + EXCLUDED.quantity;
  INSERT INTO public.dealer_ops (operation_key, business_id, character_id, kind, catalog_id, quantity, amount)
  VALUES (key, b.id, cid, 'restock', cat.id, _quantity, -cost);
  RETURN jsonb_build_object('already', false, 'cost', cost);
END $$;

-- Acheter une voiture neuve chez une concession joueur : comptant (tarif de l'entreprise) ou à crédit (prix catalogue)
CREATE FUNCTION public.dealer_buy(_business_id uuid, _catalog_id text, _down_payment integer, _months integer, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; b public.businesses; cat public.economy_catalog; amount integer; ref text; res jsonb;
  key text := 'dealer-buy:' || _request_id; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.dealer_ops WHERE operation_key = key) THEN RETURN jsonb_build_object('already', true); END IF;
  b := public.dealer_for_client(_business_id, cid);
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND kind = 'vehicle';
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule inconnu'; END IF;
  UPDATE public.dealer_stock SET quantity = quantity - 1 WHERE business_id = b.id AND catalog_id = cat.id AND quantity > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plus en stock dans cette concession'; END IF;
  PERFORM public.dealer_check_buyer(cid, cat);
  IF _months IS NULL THEN
    amount := public.service_amount(cat.price, public.service_percent(b.id));
    IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < amount THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
    ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
    PERFORM public.economy_cash(cid, key, -amount, 'Concession ' || b.name || ' — ' || cat.name, 'achat', jsonb_build_object('catalog_id', cat.id, 'reference', ref, 'business', b.id));
    INSERT INTO public.personal_assets (character_id, catalog_id, purchase_price, next_maintenance)
    VALUES (cid, cat.id, amount, t + COALESCE((cat.config->>'maintenance_days')::integer, 30) * interval '1 day');
    INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
    VALUES (cid, cat.id, cat.name || ' (' || b.name || ')', COALESCE(cat.config->>'brand', ''), amount, _request_id, ref);
    PERFORM public.business_move(b.id, key, amount, 'sale', 'Vente — ' || cat.name || ' à ' || c.first_name);
    INSERT INTO public.dealer_ops (operation_key, business_id, character_id, kind, catalog_id, amount) VALUES (key, b.id, cid, 'sale', cat.id, amount);
    RETURN jsonb_build_object('already', false, 'amount', amount, 'reference', ref);
  END IF;
  -- À crédit : contrôles, apport et mensualités du moteur existant ; la banque fictive verse le prix catalogue à la caisse.
  res := public.shop_buy_credit(cat.id, _down_payment, _months, _request_id);
  PERFORM public.business_move(b.id, key, cat.price, 'sale', 'Vente à crédit — ' || cat.name || ' à ' || c.first_name);
  INSERT INTO public.dealer_ops (operation_key, business_id, character_id, kind, catalog_id, amount) VALUES (key, b.id, cid, 'credit_sale', cat.id, cat.price);
  RETURN res || jsonb_build_object('amount', cat.price);
END $$;

-- Reprise : la concession rachète la voiture d'un joueur avec sa caisse
CREATE FUNCTION public.dealer_trade_in(_business_id uuid, _asset_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.service_settings; b public.businesses; a public.personal_assets; cat public.economy_catalog; cr public.purchase_credits;
  offer integer; repaid integer := 0; key text := 'dealer-trade:' || _request_id; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.dealer_ops WHERE operation_key = key) THEN RETURN jsonb_build_object('already', true); END IF;
  PERFORM public.purchase_credit_settle(cid);
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  b := public.dealer_for_client(_business_id, cid);
  SELECT * INTO a FROM public.personal_assets WHERE id = _asset_id AND character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule introuvable dans votre patrimoine'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = a.catalog_id;
  IF cat.kind <> 'vehicle' THEN RAISE EXCEPTION 'La concession ne reprend que des véhicules'; END IF;
  offer := floor(public.asset_value(a.purchase_price, COALESCE((cat.config->>'dep')::numeric, 0), a.acquired_at, t) * s.dealer_trade_percent / 100.0)::integer;
  SELECT * INTO cr FROM public.purchase_credits WHERE character_id = cid AND catalog_id = cat.id AND status = 'active' FOR UPDATE;
  IF FOUND THEN
    IF offer < cr.remaining THEN RAISE EXCEPTION 'La reprise (% €) ne couvre pas le crédit restant (% €)', offer, cr.remaining; END IF;
    repaid := cr.remaining;
    UPDATE public.purchase_credits SET remaining = 0, status = 'sold', closed_at = t WHERE id = cr.id;
  END IF;
  IF offer > 0 AND NOT public.business_move(b.id, key, -offer, 'stock', 'Reprise — ' || cat.name) THEN
    RAISE EXCEPTION 'La concession n''a pas assez d''argent en caisse pour cette reprise'; END IF;
  DELETE FROM public.personal_assets WHERE id = a.id;
  IF offer - repaid > 0 THEN
    PERFORM public.economy_cash(cid, key, offer - repaid, 'Reprise par ' || b.name || ' — ' || cat.name || CASE WHEN repaid > 0 THEN ' (crédit soldé)' ELSE '' END, 'achat');
  END IF;
  INSERT INTO public.dealer_used (business_id, catalog_id, condition, cost, seller_id)
  VALUES (b.id, cat.id, CASE WHEN a.condition = 'Entretien nécessaire' THEN 'À entretenir' ELSE 'Bon état' END, offer, cid);
  INSERT INTO public.dealer_ops (operation_key, business_id, character_id, kind, catalog_id, amount) VALUES (key, b.id, cid, 'trade_in', cat.id, offer);
  RETURN jsonb_build_object('already', false, 'amount', offer, 'credit_repaid', repaid);
END $$;

CREATE FUNCTION public.dealer_used_price(_cost integer, _biz uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(1, public.service_amount(ceil(_cost * s.dealer_used_markup / 100.0)::integer, public.service_percent(_biz)))
  FROM public.service_settings s WHERE s.id = 1
$$;

-- Acheter une occasion reprise par une concession joueur
CREATE FUNCTION public.dealer_used_buy(_used_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; u public.dealer_used; b public.businesses; cat public.economy_catalog; amount integer; ref text;
  key text := 'dealer-used:' || _request_id; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.dealer_ops WHERE operation_key = key) THEN RETURN jsonb_build_object('already', true); END IF;
  SELECT * INTO u FROM public.dealer_used WHERE id = _used_id FOR UPDATE;
  IF NOT FOUND OR u.status <> 'open' THEN RAISE EXCEPTION 'Occasion déjà vendue'; END IF;
  b := public.dealer_for_client(u.business_id, cid);
  SELECT * INTO cat FROM public.economy_catalog WHERE id = u.catalog_id;
  PERFORM public.dealer_check_buyer(cid, cat);
  amount := public.dealer_used_price(u.cost, b.id);
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < amount THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
  PERFORM public.economy_cash(cid, key, -amount, 'Occasion ' || b.name || ' — ' || cat.name, 'achat', jsonb_build_object('catalog_id', cat.id, 'reference', ref, 'business', b.id));
  INSERT INTO public.personal_assets (character_id, catalog_id, purchase_price, condition, next_maintenance)
  VALUES (cid, cat.id, amount, CASE WHEN u.condition = 'À entretenir' THEN 'Entretien nécessaire' ELSE 'Bon état' END,
    t + COALESCE((cat.config->>'maintenance_days')::integer, 30) * interval '1 day');
  INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
  VALUES (cid, cat.id, cat.name || ' (occasion ' || b.name || ')', COALESCE(cat.config->>'brand', ''), amount, _request_id, ref);
  PERFORM public.business_move(b.id, key, amount, 'sale', 'Occasion — ' || cat.name || ' à ' || c.first_name);
  UPDATE public.dealer_used SET status = 'sold', buyer_id = cid, sold_at = t WHERE id = u.id;
  INSERT INTO public.dealer_ops (operation_key, business_id, character_id, kind, catalog_id, amount) VALUES (key, b.id, cid, 'used_sale', cat.id, amount);
  RETURN jsonb_build_object('already', false, 'amount', amount, 'reference', ref);
END $$;

-- Tarif de la concession (distinct de service_set_price, car un patron peut tenir plusieurs entreprises de services)
CREATE FUNCTION public.dealer_set_price(_percent integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.service_settings; b public.businesses; BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT * INTO b FROM public.businesses WHERE owner_id = cid AND status = 'active' AND sector_id = 'concession' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucune concession'; END IF;
  IF _percent IS NULL OR _percent NOT BETWEEN s.min_percent AND s.max_percent THEN
    RAISE EXCEPTION 'Tarif entre % et % %% du prix catalogue', s.min_percent, s.max_percent; END IF;
  INSERT INTO public.service_prices (business_id, percent) VALUES (b.id, _percent) ON CONFLICT (business_id) DO UPDATE SET percent = EXCLUDED.percent;
END $$;

-- 5. Lecture ---------------------------------------------------------------------------------------
CREATE FUNCTION public.dealer_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.service_settings; mine public.businesses; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT * INTO mine FROM public.businesses WHERE owner_id = cid AND status = 'active' AND sector_id = 'concession' LIMIT 1;
  IF mine.id IS NOT NULL THEN PERFORM public.service_settle(mine.id); END IF;
  RETURN jsonb_build_object(
    'settings', jsonb_build_object('wholesale_percent', s.dealer_wholesale_percent, 'trade_percent', s.dealer_trade_percent,
      'used_markup', s.dealer_used_markup, 'max_stock', s.dealer_max_stock, 'min_percent', s.min_percent, 'max_percent', s.max_percent),
    'dealers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'percent', public.service_percent(b.id),
        'rating', public.service_rating(b.id), 'mine', b.owner_id = cid,
        'stock', COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog_id', k.catalog_id, 'name', e.name, 'brand', e.config->>'brand', 'quantity', k.quantity,
            'catalog_price', e.price, 'price', public.service_amount(e.price, public.service_percent(b.id))) ORDER BY e.price)
          FROM public.dealer_stock k JOIN public.economy_catalog e ON e.id = k.catalog_id WHERE k.business_id = b.id AND k.quantity > 0), '[]'::jsonb),
        'used', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', u.id, 'catalog_id', u.catalog_id, 'name', e.name, 'condition', u.condition,
            'price', public.dealer_used_price(u.cost, b.id)) ORDER BY u.created_at DESC)
          FROM public.dealer_used u JOIN public.economy_catalog e ON e.id = u.catalog_id WHERE u.business_id = b.id AND u.status = 'open'), '[]'::jsonb)) ORDER BY b.name)
      FROM public.businesses b WHERE b.sector_id = 'concession' AND b.status = 'active' AND b.city_id = c.city_id), '[]'::jsonb),
    'my_cars', COALESCE((SELECT jsonb_agg(jsonb_build_object('asset_id', a.id, 'catalog_id', a.catalog_id, 'name', e.name, 'condition', a.condition,
        'value', public.asset_value(a.purchase_price, COALESCE((e.config->>'dep')::numeric, 0), a.acquired_at, t),
        'offer', floor(public.asset_value(a.purchase_price, COALESCE((e.config->>'dep')::numeric, 0), a.acquired_at, t) * s.dealer_trade_percent / 100.0)::integer,
        'credit', (SELECT remaining FROM public.purchase_credits p WHERE p.character_id = cid AND p.catalog_id = a.catalog_id AND p.status = 'active')))
      FROM public.personal_assets a JOIN public.economy_catalog e ON e.id = a.catalog_id WHERE a.character_id = cid AND e.kind = 'vehicle'), '[]'::jsonb),
    'catalog', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'brand', e.config->>'brand', 'price', e.price,
        'wholesale', ceil(e.price * s.dealer_wholesale_percent / 100.0)::integer) ORDER BY e.price)
      FROM public.economy_catalog e WHERE e.kind = 'vehicle' AND COALESCE(e.config->>'shop','false') = 'true'), '[]'::jsonb),
    'mine', CASE WHEN mine.id IS NULL THEN NULL ELSE jsonb_build_object('id', mine.id, 'name', mine.name,
      'balance', (SELECT balance FROM public.business_treasuries WHERE business_id = mine.id),
      'stock_count', (SELECT COALESCE(sum(quantity), 0) FROM public.dealer_stock WHERE business_id = mine.id),
      'ops', COALESCE((SELECT jsonb_agg(jsonb_build_object('kind', o.kind, 'name', e.name, 'quantity', o.quantity, 'amount', o.amount, 'at', o.created_at,
          'client', (SELECT first_name FROM public.characters WHERE id = o.character_id)) ORDER BY o.created_at DESC)
        FROM (SELECT * FROM public.dealer_ops WHERE business_id = mine.id ORDER BY created_at DESC LIMIT 20) o JOIN public.economy_catalog e ON e.id = o.catalog_id), '[]'::jsonb)) END);
END $$;

-- 6. Branchement sur les fonctions de services existantes (remplacement vérifié) ----------------------
DO $$
DECLARE f text; def text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.service_settle(uuid)', 'public.service_set_price(integer)', 'public.service_state()'] LOOP
    def := pg_get_functiondef(f::regprocedure);
    IF position('IN (''garage'',''demenagement'',''immobilier'')' IN def) = 0 THEN RAISE EXCEPTION 'Liste des secteurs introuvable dans %', f; END IF;
    def := replace(def, 'IN (''garage'',''demenagement'',''immobilier'')', 'IN (''garage'',''demenagement'',''immobilier'',''concession'')');
    IF f = 'public.service_settle(uuid)' THEN
      IF position('WHEN ''immobilier'' THEN s.agency_npc_ticket' IN def) = 0 THEN RAISE EXCEPTION 'Ticket introuvable'; END IF;
      def := replace(def, 'WHEN ''immobilier'' THEN s.agency_npc_ticket', 'WHEN ''immobilier'' THEN s.agency_npc_ticket WHEN ''concession'' THEN s.dealer_npc_ticket');
    END IF;
    EXECUTE def;
  END LOOP;
END $$;

-- 7. Droits --------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.dealer_for_client(uuid, uuid), public.dealer_check_buyer(uuid, public.economy_catalog) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dealer_restock(text, integer, uuid), public.dealer_buy(uuid, text, integer, integer, uuid),
  public.dealer_trade_in(uuid, uuid, uuid), public.dealer_used_buy(uuid, uuid), public.dealer_used_price(integer, uuid), public.dealer_state(), public.dealer_set_price(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dealer_restock(text, integer, uuid), public.dealer_buy(uuid, text, integer, integer, uuid),
  public.dealer_trade_in(uuid, uuid, uuid), public.dealer_used_buy(uuid, uuid), public.dealer_used_price(integer, uuid), public.dealer_state(), public.dealer_set_price(integer) TO authenticated;

-- 8. Contrôles -----------------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.business_sectors WHERE id = 'concession') THEN RAISE EXCEPTION 'Secteur concession manquant'; END IF;
  IF position('''concession''' IN pg_get_functiondef('public.service_settle(uuid)'::regprocedure)) = 0 THEN RAISE EXCEPTION 'service_settle non branché'; END IF;
  IF (SELECT count(*) FROM pg_proc WHERE proname LIKE 'dealer\_%' AND pronamespace = 'public'::regnamespace) <> 9 THEN RAISE EXCEPTION 'Fonctions concession incomplètes'; END IF;
END $$;

COMMIT;
