-- CIVITAS – BOUTIQUE, PHASE 3 : MAGASINS DES VILLES, BOUTIQUES DE JOUEURS, MARCHÉ ENTRE JOUEURS
-- Uniquement des ajouts, tout ou rien.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0079_shop_phase3_market.sql
-- Modifications d'existant (3) :
--   * business_ledger : deux nouveaux types d'écriture autorisés ('stock' achat en gros, 'sale' vente en boutique).
--   * guard_player_block : la protection anti-blocage unique couvre aussi les offres et les achats du marché.
--   * aucune autre fonction existante touchée.
-- Magasins des villes : enseignes fictives inspirées de vraies (Fnac, Carrefour…) dans chaque ville ; on y achète
--   sur place (même ville que le personnage) avec une petite remise propre à l'enseigne. Paiement economy_cash.
-- Commerces de joueurs : les entreprises existantes (secteur Commerce). Leur caisse séparée achète du stock en gros
--   (70 % du prix neuf) ; le patron fixe le prix (70 à 150 %). Clients fictifs chaque semaine (selon le prix, réglé à
--   la lecture, clé unique par semaine) + joueurs qui achètent en vitrine. Recettes uniquement dans la caisse.
-- Marché entre joueurs : annonce à prix fixe d'un bien possédé (objets et voitures, sans crédit en cours).
--   Offres : l'acheteur propose un prix, le vendeur accepte (réservation 2 jours de jeu) ou refuse ; l'acheteur paie
--   lui-même. Le vendeur encaisse au prochain passage (ligne à encaisser, clé unique), frais de 5 %.
BEGIN;

-- 1. Réglages -----------------------------------------------------------------------------
CREATE TABLE public.market_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  fee_percent integer NOT NULL DEFAULT 5,
  max_price_percent integer NOT NULL DEFAULT 200,
  min_offer_percent integer NOT NULL DEFAULT 50,
  reservation_days integer NOT NULL DEFAULT 2,
  max_listings integer NOT NULL DEFAULT 10,
  wholesale_percent integer NOT NULL DEFAULT 70,
  shop_min_percent integer NOT NULL DEFAULT 70,
  shop_max_percent integer NOT NULL DEFAULT 150,
  npc_weekly_customers integer NOT NULL DEFAULT 4,
  max_stock integer NOT NULL DEFAULT 50,
  max_weeks_back integer NOT NULL DEFAULT 4
);
INSERT INTO public.market_settings (id) VALUES (1);

-- 2. Magasins des villes --------------------------------------------------------------------
CREATE TABLE public.city_stores (
  id text PRIMARY KEY,
  city_id text NOT NULL REFERENCES public.cities(id),
  name text NOT NULL,
  kind text NOT NULL,
  district text NOT NULL,
  sections text[] NOT NULL,
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 0 AND 20),
  hours text NOT NULL DEFAULT '9h–20h'
);
INSERT INTO public.city_stores (id, city_id, name, kind, district, sections, discount_percent, hours)
SELECT c.city || '-' || s.id, c.city, s.name || ' ' || c.label, s.kind, c.district, s.sections, (s.base + (abs(hashtext(c.city || s.id)) % 3))::integer, s.hours
FROM (VALUES ('paris','Paris','Centre'), ('lyon','Lyon','Presqu’île'), ('marseille','Marseille','Vieux-Port'), ('bordeaux','Bordeaux','Centre'), ('lille','Lille','Centre')) c(city, label, district)
CROSS JOIN (VALUES
  ('fnac', 'Fnac', 'Culture et high-tech', ARRAY['tech','loisirs'], 3, '10h–20h'),
  ('carrefour', 'Carrefour', 'Hypermarché', ARRAY['electromenager','maison'], 4, '8h30–21h'),
  ('ikea', 'IKEA', 'Ameublement', ARRAY['maison'], 5, '10h–20h'),
  ('decathlon', 'Decathlon', 'Sport', ARRAY['loisirs','mode'], 4, '9h–20h'),
  ('galeries', 'Galeries Lafayette', 'Grand magasin', ARRAY['mode'], 2, '10h–20h30'),
  ('concession', 'Concession auto', 'Voitures neuves et d''occasion', ARRAY['auto'], 3, '9h–19h')) s(id, name, kind, sections, base, hours)
WHERE EXISTS (SELECT 1 FROM public.cities WHERE id = c.city);

-- 3. Stock des commerces de joueurs ------------------------------------------------------------
ALTER TABLE public.business_ledger DROP CONSTRAINT business_ledger_kind_check;
ALTER TABLE public.business_ledger ADD CONSTRAINT business_ledger_kind_check
  CHECK (kind IN ('capital','deposit','revenue','rent','npc_wage','player_salary','owner_salary','closing','stock','sale'));

CREATE TABLE public.business_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_cost integer NOT NULL CHECK (unit_cost > 0),
  price integer NOT NULL CHECK (price > 0),
  sold_npc integer NOT NULL DEFAULT 0,
  sold_players integer NOT NULL DEFAULT 0,
  settled_week integer NOT NULL,
  UNIQUE (business_id, catalog_id)
);
CREATE TABLE public.business_restocks (
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  request_id uuid NOT NULL,
  catalog_id text NOT NULL,
  quantity integer NOT NULL,
  cost integer NOT NULL,
  world_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (business_id, request_id)
);

-- 4. Marché entre joueurs ----------------------------------------------------------------------
CREATE TABLE public.market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.characters(id),
  asset_id uuid NOT NULL,
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  price integer NOT NULL CHECK (price > 0),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 200),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reserved','sold','cancelled')),
  reserved_for uuid REFERENCES public.characters(id),
  reserved_price integer,
  reserved_until timestamptz,
  buyer_id uuid REFERENCES public.characters(id),
  request_id uuid,
  sold_price integer,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  closed_at timestamptz
);
CREATE UNIQUE INDEX market_listings_one_per_asset ON public.market_listings (asset_id) WHERE status IN ('open','reserved');
CREATE UNIQUE INDEX market_listings_buyer_request ON public.market_listings (buyer_id, request_id) WHERE request_id IS NOT NULL;
CREATE TABLE public.market_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.market_listings(id),
  buyer_id uuid NOT NULL REFERENCES public.characters(id),
  seller_id uuid NOT NULL REFERENCES public.characters(id),
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','refused','cancelled','expired','done')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  answered_at timestamptz
);
CREATE UNIQUE INDEX market_offers_one_pending ON public.market_offers (listing_id, buyer_id) WHERE status IN ('pending','accepted');
CREATE TABLE public.market_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.characters(id),
  buyer_id uuid NOT NULL REFERENCES public.characters(id),
  listing_id uuid NOT NULL REFERENCES public.market_listings(id) UNIQUE,
  amount integer NOT NULL CHECK (amount >= 0),
  fee integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  collected_at timestamptz
);

GRANT SELECT ON public.market_settings, public.city_stores, public.business_stock, public.business_restocks,
  public.market_listings, public.market_offers, public.market_payouts TO authenticated;
GRANT ALL ON public.market_settings, public.city_stores, public.business_stock, public.business_restocks,
  public.market_listings, public.market_offers, public.market_payouts TO service_role;
ALTER TABLE public.market_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_restocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY market_settings_read ON public.market_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY city_stores_read ON public.city_stores FOR SELECT TO authenticated USING (true);
CREATE POLICY business_stock_read ON public.business_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY business_restocks_owner ON public.business_restocks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE b.id = business_restocks.business_id AND c.user_id = auth.uid()));
-- Les annonces ouvertes sont publiques (sans données privées) ; l'historique reste aux deux parties.
CREATE POLICY market_listings_read ON public.market_listings FOR SELECT TO authenticated USING (
  status = 'open' OR seller_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid())
  OR buyer_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid())
  OR reserved_for IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));
CREATE POLICY market_offers_parties ON public.market_offers FOR SELECT TO authenticated USING (
  buyer_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()) OR seller_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));
CREATE POLICY market_payouts_seller ON public.market_payouts FOR SELECT TO authenticated USING (
  seller_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));

-- Protection anti-blocage unique, étendue au marché (mêmes branches qu'avant + 2)
CREATE OR REPLACE FUNCTION public.guard_player_block() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a uuid; b uuid; BEGIN
  IF TG_TABLE_NAME = 'player_contacts' THEN a := NEW.requester_id; b := NEW.addressee_id;
  ELSIF TG_TABLE_NAME = 'player_follows' THEN a := NEW.follower_id; b := NEW.followed_id;
  ELSIF TG_TABLE_NAME = 'player_transfers' THEN a := NEW.sender_id; b := NEW.recipient_id;
  ELSIF TG_TABLE_NAME = 'together_invites' THEN a := NEW.inviter_id; b := NEW.invitee_id;
  ELSIF TG_TABLE_NAME = 'player_messages' THEN a := NEW.sender_id;
    SELECT CASE WHEN t.a_id = NEW.sender_id THEN t.b_id ELSE t.a_id END INTO b FROM public.player_threads t WHERE t.id = NEW.thread_id;
  ELSIF TG_TABLE_NAME = 'market_offers' THEN a := NEW.buyer_id; b := NEW.seller_id;
  ELSIF TG_TABLE_NAME = 'market_payouts' THEN a := NEW.buyer_id; b := NEW.seller_id;
  END IF;
  IF public.network_blocked(a, b) THEN RAISE EXCEPTION 'Interaction impossible avec ce joueur'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_block BEFORE INSERT ON public.market_offers FOR EACH ROW EXECUTE FUNCTION public.guard_player_block();
CREATE TRIGGER guard_block BEFORE INSERT ON public.market_payouts FOR EACH ROW EXECUTE FUNCTION public.guard_player_block();

-- 5. Outils internes ------------------------------------------------------------------------------
-- Achat commun : vérifie et crée le bien (le paiement est fait par l'appelant)
CREATE FUNCTION public.market_check_buyer(_cid uuid, _cat public.economy_catalog) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.characters; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = _cid;
  IF EXISTS (SELECT 1 FROM public.personal_assets WHERE character_id = _cid AND catalog_id = _cat.id) THEN RAISE EXCEPTION 'Vous possédez déjà ce produit'; END IF;
  IF c.age < COALESCE((_cat.config->>'min_age')::integer, 16) THEN RAISE EXCEPTION 'Âge insuffisant'; END IF;
  IF _cat.config ? 'license' AND COALESCE((c.progression->>(_cat.config->>'license'))::integer, 0) < 1 THEN RAISE EXCEPTION 'Permis requis'; END IF;
END $$;

-- Clients fictifs des commerces : semaines terminées, ventes selon le prix, clé unique par semaine
CREATE FUNCTION public.business_stock_settle(_biz uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.market_settings; b public.businesses; st record; cur integer; w integer; ratio numeric; units integer; BEGIN
  SELECT * INTO s FROM public.market_settings WHERE id = 1;
  SELECT * INTO b FROM public.businesses WHERE id = _biz FOR UPDATE;
  IF NOT FOUND OR b.status <> 'active' THEN RETURN; END IF;
  cur := floor(extract(epoch FROM public.game_now()) / 604800)::integer;
  FOR st IN SELECT bs.*, ec.price AS ref_price, ec.name FROM public.business_stock bs JOIN public.economy_catalog ec ON ec.id = bs.catalog_id
            WHERE bs.business_id = _biz FOR UPDATE OF bs LOOP
    w := GREATEST(st.settled_week + 1, cur - s.max_weeks_back);
    WHILE w <= cur - 1 LOOP
      IF st.quantity > 0 THEN
        ratio := LEAST(1, GREATEST(0, 1.6 - st.price::numeric / st.ref_price));
        units := LEAST(st.quantity, floor(s.npc_weekly_customers * ratio * (70 + abs(hashtext(st.id::text || ':' || w)) % 61) / 100.0)::integer);
        IF units > 0 AND public.business_move(_biz, 'npcsale:' || st.id || ':' || w, units * st.price, 'sale', 'Ventes en boutique — ' || units || ' × ' || st.name) THEN
          st.quantity := st.quantity - units; st.sold_npc := st.sold_npc + units;
        END IF;
      END IF;
      w := w + 1;
    END LOOP;
    UPDATE public.business_stock SET quantity = st.quantity, sold_npc = st.sold_npc, settled_week = GREATEST(st.settled_week, cur - 1) WHERE id = st.id;
  END LOOP;
END $$;

-- Encaissement des ventes du marché par le vendeur (à la lecture, une seule fois)
CREATE FUNCTION public.market_collect(_cid uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; total integer := 0; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cid AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  FOR p IN SELECT * FROM public.market_payouts WHERE seller_id = _cid AND collected_at IS NULL FOR UPDATE LOOP
    IF p.amount > 0 THEN PERFORM public.economy_cash(_cid, 'market-payout:' || p.id, p.amount, p.label, 'achat'); END IF;
    UPDATE public.market_payouts SET collected_at = public.game_now() WHERE id = p.id;
    total := total + p.amount;
  END LOOP;
  RETURN total;
END $$;

-- Réservations expirées : l'annonce redevient ouverte
CREATE FUNCTION public.market_expire() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; BEGIN
  FOR l IN SELECT * FROM public.market_listings WHERE status = 'reserved' AND reserved_until <= public.game_now() FOR UPDATE SKIP LOCKED LOOP
    UPDATE public.market_offers SET status = 'expired', answered_at = public.game_now() WHERE listing_id = l.id AND status = 'accepted';
    UPDATE public.market_listings SET status = 'open', reserved_for = NULL, reserved_price = NULL, reserved_until = NULL WHERE id = l.id;
    PERFORM public.economy_notify(l.reserved_for, 'market-expired:' || l.id || ':' || l.reserved_until, 'Réservation expirée', 'Vous n''avez pas payé à temps : l''annonce est de nouveau ouverte à tous.');
  END LOOP;
END $$;

-- 6. Actions : magasins des villes ------------------------------------------------------------------
CREATE FUNCTION public.store_buy(_store_id text, _catalog_id text, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; st public.city_stores; cat public.economy_catalog; o public.shop_orders; ref text; price integer; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO o FROM public.shop_orders WHERE character_id = cid AND request_id = _request_id;
  IF FOUND THEN RETURN jsonb_build_object('reference', o.reference, 'already', true); END IF;
  SELECT * INTO st FROM public.city_stores WHERE id = _store_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Magasin introuvable'; END IF;
  IF st.city_id IS DISTINCT FROM c.city_id THEN RAISE EXCEPTION 'Ce magasin est dans une autre ville : rendez-vous sur place'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND COALESCE(config->>'shop','false') = 'true' AND COALESCE(config->>'realestate','false') <> 'true';
  IF NOT FOUND OR NOT (cat.config->>'section' = ANY(st.sections)) THEN RAISE EXCEPTION 'Produit absent de ce magasin'; END IF;
  PERFORM public.market_check_buyer(cid, cat);
  price := cat.price - floor(cat.price * st.discount_percent / 100.0)::integer;
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < price THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
  PERFORM public.economy_cash(cid, 'store:' || _request_id, -price, st.name || ' — ' || cat.name, 'achat', jsonb_build_object('catalog_id', cat.id, 'reference', ref, 'store', st.id));
  INSERT INTO public.personal_assets (character_id, catalog_id, purchase_price, next_maintenance)
  VALUES (cid, cat.id, price, CASE WHEN cat.kind = 'vehicle' THEN t + COALESCE((cat.config->>'maintenance_days')::integer, 30) * interval '1 day' END);
  INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
  VALUES (cid, cat.id, cat.name || ' (' || st.name || ')', COALESCE(cat.config->>'brand', ''), price, _request_id, ref);
  RETURN jsonb_build_object('reference', ref, 'already', false, 'price', price);
END $$;

-- 7. Actions : commerce du joueur ---------------------------------------------------------------------
CREATE FUNCTION public.business_restock(_biz uuid, _catalog_id text, _quantity integer, _price integer, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.market_settings; b public.businesses; cat public.economy_catalog; unit integer; cost integer; cur integer; stock_now integer; BEGIN
  cid := public.social_actor();
  b := public.business_owned(cid, _biz);
  IF b.sector_id <> 'commerce' THEN RAISE EXCEPTION 'Seuls les commerces peuvent vendre des produits'; END IF;
  IF EXISTS (SELECT 1 FROM public.business_restocks WHERE business_id = _biz AND request_id = _request_id) THEN RETURN jsonb_build_object('already', true); END IF;
  PERFORM public.business_settle(_biz);
  PERFORM public.business_stock_settle(_biz);
  SELECT * INTO s FROM public.market_settings WHERE id = 1;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND COALESCE(config->>'shop','false') = 'true' AND kind = 'item' AND COALESCE(config->>'realestate','false') <> 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit non disponible en gros'; END IF;
  IF _quantity < 0 OR _quantity > s.max_stock THEN RAISE EXCEPTION 'Quantité de 0 à %', s.max_stock; END IF;
  IF _price < ceil(cat.price * s.shop_min_percent / 100.0) OR _price > floor(cat.price * s.shop_max_percent / 100.0) THEN
    RAISE EXCEPTION 'Prix de vente entre % et % crédits', ceil(cat.price * s.shop_min_percent / 100.0), floor(cat.price * s.shop_max_percent / 100.0); END IF;
  SELECT COALESCE(quantity, 0) INTO stock_now FROM public.business_stock WHERE business_id = _biz AND catalog_id = cat.id;
  IF COALESCE(stock_now, 0) + _quantity > s.max_stock THEN RAISE EXCEPTION 'Stock maximum : % par produit', s.max_stock; END IF;
  unit := ceil(cat.price * s.wholesale_percent / 100.0)::integer; cost := unit * _quantity;
  IF _quantity > 0 AND NOT public.business_move(_biz, 'stock:' || _request_id, -cost, 'stock', 'Achat en gros — ' || _quantity || ' × ' || cat.name) THEN
    RAISE EXCEPTION 'Caisse de l''entreprise insuffisante (% crédits nécessaires)', cost; END IF;
  cur := floor(extract(epoch FROM public.game_now()) / 604800)::integer;
  INSERT INTO public.business_stock (business_id, catalog_id, quantity, unit_cost, price, settled_week)
  VALUES (_biz, cat.id, _quantity, unit, _price, cur)
  ON CONFLICT (business_id, catalog_id) DO UPDATE SET quantity = business_stock.quantity + EXCLUDED.quantity, price = EXCLUDED.price, unit_cost = EXCLUDED.unit_cost;
  INSERT INTO public.business_restocks (business_id, request_id, catalog_id, quantity, cost) VALUES (_biz, _request_id, cat.id, _quantity, cost);
  RETURN jsonb_build_object('already', false, 'cost', cost);
END $$;

CREATE FUNCTION public.business_stock_buy(_stock_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; st public.business_stock; b public.businesses; cat public.economy_catalog; o public.shop_orders; ref text; BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO o FROM public.shop_orders WHERE character_id = cid AND request_id = _request_id;
  IF FOUND THEN RETURN jsonb_build_object('reference', o.reference, 'already', true); END IF;
  SELECT * INTO st FROM public.business_stock WHERE id = _stock_id FOR UPDATE;
  IF NOT FOUND OR st.quantity < 1 THEN RAISE EXCEPTION 'Rupture de stock'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = st.business_id;
  IF b.status <> 'active' THEN RAISE EXCEPTION 'Ce commerce est fermé'; END IF;
  IF b.owner_id = cid THEN RAISE EXCEPTION 'Vous ne pouvez pas acheter dans votre propre commerce'; END IF;
  IF public.network_blocked(cid, b.owner_id) THEN RAISE EXCEPTION 'Interaction impossible avec ce joueur'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = st.catalog_id;
  PERFORM public.market_check_buyer(cid, cat);
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < st.price THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
  PERFORM public.economy_cash(cid, 'bizbuy:' || _request_id, -st.price, b.name || ' — ' || cat.name, 'achat', jsonb_build_object('catalog_id', cat.id, 'reference', ref, 'business', b.id));
  PERFORM public.business_move(b.id, 'playersale:' || cid || ':' || _request_id, st.price, 'sale', 'Vente en vitrine — ' || cat.name);
  UPDATE public.business_stock SET quantity = quantity - 1, sold_players = sold_players + 1 WHERE id = st.id;
  INSERT INTO public.personal_assets (character_id, catalog_id, purchase_price) VALUES (cid, cat.id, st.price);
  INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
  VALUES (cid, cat.id, cat.name || ' (' || b.name || ')', COALESCE(cat.config->>'brand', ''), st.price, _request_id, ref);
  RETURN jsonb_build_object('reference', ref, 'already', false);
END $$;

-- 8. Actions : marché entre joueurs -------------------------------------------------------------------
CREATE FUNCTION public.market_list(_asset_id uuid, _price integer, _note text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.market_settings; a public.personal_assets; cat public.economy_catalog; lid uuid; BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.market_settings WHERE id = 1;
  SELECT * INTO a FROM public.personal_assets WHERE id = _asset_id AND character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bien introuvable dans votre patrimoine'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = a.catalog_id;
  IF COALESCE(cat.config->>'shop','false') <> 'true' OR COALESCE(cat.config->>'realestate','false') = 'true' THEN RAISE EXCEPTION 'Seuls les objets et voitures de la boutique se vendent au marché'; END IF;
  IF EXISTS (SELECT 1 FROM public.purchase_credits WHERE character_id = cid AND catalog_id = cat.id AND status = 'active') THEN RAISE EXCEPTION 'Crédit en cours : remboursez-le ou revendez à la boutique'; END IF;
  IF EXISTS (SELECT 1 FROM public.market_listings WHERE asset_id = a.id AND status IN ('open','reserved')) THEN RAISE EXCEPTION 'Ce bien est déjà en vente'; END IF;
  IF (SELECT count(*) FROM public.market_listings WHERE seller_id = cid AND status IN ('open','reserved')) >= s.max_listings THEN RAISE EXCEPTION 'Maximum % annonces en même temps', s.max_listings; END IF;
  IF _price < 1 OR _price > floor(cat.price * s.max_price_percent / 100.0) THEN RAISE EXCEPTION 'Prix de 1 à % crédits', floor(cat.price * s.max_price_percent / 100.0); END IF;
  INSERT INTO public.market_listings (seller_id, asset_id, catalog_id, price, note) VALUES (cid, a.id, cat.id, _price, left(COALESCE(_note, ''), 200)) RETURNING id INTO lid;
  RETURN lid;
END $$;

CREATE FUNCTION public.market_cancel(_listing_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; l public.market_listings; BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO l FROM public.market_listings WHERE id = _listing_id AND seller_id = cid FOR UPDATE;
  IF NOT FOUND OR l.status NOT IN ('open','reserved') THEN RAISE EXCEPTION 'Annonce introuvable'; END IF;
  UPDATE public.market_offers SET status = 'cancelled', answered_at = public.game_now() WHERE listing_id = l.id AND status IN ('pending','accepted');
  UPDATE public.market_listings SET status = 'cancelled', closed_at = public.game_now() WHERE id = l.id;
END $$;

CREATE FUNCTION public.market_offer(_listing_id uuid, _amount integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.market_settings; l public.market_listings; oid uuid; BEGIN
  cid := public.prepare_daily_life();
  PERFORM public.market_expire();
  SELECT * INTO s FROM public.market_settings WHERE id = 1;
  SELECT * INTO l FROM public.market_listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND OR l.status <> 'open' THEN RAISE EXCEPTION 'Annonce indisponible'; END IF;
  IF l.seller_id = cid THEN RAISE EXCEPTION 'C''est votre annonce'; END IF;
  IF _amount >= l.price THEN RAISE EXCEPTION 'Offre au prix affiché : achetez directement'; END IF;
  IF _amount < ceil(l.price * s.min_offer_percent / 100.0) THEN RAISE EXCEPTION 'Offre minimum : % crédits', ceil(l.price * s.min_offer_percent / 100.0); END IF;
  IF EXISTS (SELECT 1 FROM public.market_offers WHERE listing_id = l.id AND buyer_id = cid AND status = 'pending') THEN RAISE EXCEPTION 'Vous avez déjà une offre en attente'; END IF;
  INSERT INTO public.market_offers (listing_id, buyer_id, seller_id, amount) VALUES (l.id, cid, l.seller_id, _amount) RETURNING id INTO oid;
  PERFORM public.economy_notify(l.seller_id, 'market-offer:' || oid, 'Nouvelle offre au marché', 'Un joueur propose ' || _amount || ' crédits pour votre annonce.');
  RETURN oid;
END $$;

CREATE FUNCTION public.market_offer_answer(_offer_id uuid, _accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.market_settings; o public.market_offers; l public.market_listings; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  PERFORM public.market_expire();
  SELECT * INTO s FROM public.market_settings WHERE id = 1;
  SELECT * INTO o FROM public.market_offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre introuvable'; END IF;
  IF o.buyer_id = cid AND NOT _accept AND o.status = 'pending' THEN
    UPDATE public.market_offers SET status = 'cancelled', answered_at = t WHERE id = o.id; RETURN; END IF;
  IF o.seller_id <> cid THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'Offre déjà traitée'; END IF;
  SELECT * INTO l FROM public.market_listings WHERE id = o.listing_id FOR UPDATE;
  IF NOT _accept THEN
    UPDATE public.market_offers SET status = 'refused', answered_at = t WHERE id = o.id;
    PERFORM public.economy_notify(o.buyer_id, 'market-refused:' || o.id, 'Offre refusée', 'Le vendeur a refusé votre offre de ' || o.amount || ' crédits.');
    RETURN;
  END IF;
  IF l.status <> 'open' THEN RAISE EXCEPTION 'Annonce déjà réservée ou vendue'; END IF;
  UPDATE public.market_offers SET status = 'accepted', answered_at = t WHERE id = o.id;
  UPDATE public.market_offers SET status = 'refused', answered_at = t WHERE listing_id = l.id AND status = 'pending' AND id <> o.id;
  UPDATE public.market_listings SET status = 'reserved', reserved_for = o.buyer_id, reserved_price = o.amount,
    reserved_until = t + s.reservation_days * interval '1 day' WHERE id = l.id;
  PERFORM public.economy_notify(o.buyer_id, 'market-accepted:' || o.id, 'Offre acceptée',
    'Le vendeur accepte ' || o.amount || ' crédits. Payez dans les ' || s.reservation_days || ' jours de jeu depuis le Marché.');
END $$;

CREATE FUNCTION public.market_buy(_listing_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.market_settings; l public.market_listings; a public.personal_assets; cat public.economy_catalog; amt integer; fee integer; ref text; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO l FROM public.market_listings WHERE buyer_id = cid AND request_id = _request_id;
  IF FOUND THEN RETURN jsonb_build_object('already', true, 'price', l.sold_price); END IF;
  PERFORM public.market_expire();
  SELECT * INTO s FROM public.market_settings WHERE id = 1;
  SELECT * INTO l FROM public.market_listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Annonce introuvable'; END IF;
  IF l.seller_id = cid THEN RAISE EXCEPTION 'C''est votre annonce'; END IF;
  IF l.status = 'open' THEN amt := l.price;
  ELSIF l.status = 'reserved' AND l.reserved_for = cid THEN amt := l.reserved_price;
  ELSE RAISE EXCEPTION 'Annonce indisponible'; END IF;
  SELECT * INTO a FROM public.personal_assets WHERE id = l.asset_id AND character_id = l.seller_id FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE public.market_listings SET status = 'cancelled', closed_at = t WHERE id = l.id;
    RAISE EXCEPTION 'Le vendeur ne possède plus ce bien : annonce retirée'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = l.catalog_id;
  PERFORM public.market_check_buyer(cid, cat);
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < amt THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  fee := floor(amt * s.fee_percent / 100.0)::integer;
  ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
  -- La ligne à encaisser passe la protection anti-blocage avant tout paiement
  INSERT INTO public.market_payouts (seller_id, buyer_id, listing_id, amount, fee, label)
  VALUES (l.seller_id, cid, l.id, amt - fee, fee, 'Vente au marché — ' || cat.name);
  PERFORM public.economy_cash(cid, 'market:' || _request_id, -amt, 'Marché — ' || cat.name, 'achat', jsonb_build_object('catalog_id', cat.id, 'reference', ref));
  UPDATE public.personal_assets SET character_id = cid, purchase_price = amt, acquired_at = t WHERE id = a.id;
  UPDATE public.market_listings SET status = 'sold', buyer_id = cid, request_id = _request_id, sold_price = amt, closed_at = t WHERE id = l.id;
  UPDATE public.market_offers SET status = CASE WHEN buyer_id = cid AND status = 'accepted' THEN 'done' ELSE 'cancelled' END, answered_at = t
    WHERE listing_id = l.id AND status IN ('pending','accepted');
  INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
  VALUES (cid, cat.id, cat.name || ' (marché)', COALESCE(cat.config->>'brand', ''), amt, _request_id, ref);
  PERFORM public.economy_notify(l.seller_id, 'market-sold:' || l.id, 'Vendu au marché', cat.name || ' vendu ' || amt || ' crédits (frais ' || fee || ').');
  RETURN jsonb_build_object('already', false, 'price', amt, 'reference', ref);
END $$;

-- 9. État du marché (une seule lecture pour la page) -----------------------------------------------------
CREATE FUNCTION public.market_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.market_settings; collected integer; biz public.businesses; b record; BEGIN
  cid := public.prepare_daily_life();
  PERFORM public.market_expire();
  collected := public.market_collect(cid);
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.market_settings WHERE id = 1;
  FOR b IN SELECT DISTINCT bs.business_id FROM public.business_stock bs JOIN public.businesses bb ON bb.id = bs.business_id WHERE bb.status = 'active' LOOP
    PERFORM public.business_stock_settle(b.business_id);
  END LOOP;
  SELECT * INTO biz FROM public.businesses WHERE owner_id = cid AND status = 'active';
  RETURN jsonb_build_object(
    'me', cid, 'city', c.city_id, 'collected', collected, 'balance', COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0),
    'license', COALESCE((c.progression->>'Permis')::integer, 0) >= 1,
    'settings', to_jsonb(s) - 'id',
    'stores', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', st.id, 'city_id', st.city_id, 'city', ci.name, 'name', st.name, 'kind', st.kind, 'district', st.district,
        'sections', st.sections, 'discount', st.discount_percent, 'hours', st.hours, 'here', st.city_id = c.city_id) ORDER BY st.city_id = c.city_id DESC, ci.sort_order, st.name)
      FROM public.city_stores st JOIN public.cities ci ON ci.id = st.city_id), '[]'),
    'listings', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'catalog_id', l.catalog_id, 'name', ec.name, 'brand', ec.config->>'brand', 'section', ec.config->>'section',
        'kind', ec.kind, 'price', l.price, 'new_price', ec.price, 'note', l.note, 'status', l.status, 'mine', l.seller_id = cid,
        'seller', ch.first_name, 'created_at', l.created_at,
        'reserved_for_me', l.reserved_for = cid, 'reserved_price', CASE WHEN l.reserved_for = cid OR l.seller_id = cid THEN l.reserved_price END,
        'reserved_until', CASE WHEN l.reserved_for = cid OR l.seller_id = cid THEN l.reserved_until END,
        'owned', EXISTS (SELECT 1 FROM public.personal_assets pa WHERE pa.character_id = cid AND pa.catalog_id = l.catalog_id)) ORDER BY l.created_at DESC)
      FROM public.market_listings l JOIN public.economy_catalog ec ON ec.id = l.catalog_id JOIN public.characters ch ON ch.id = l.seller_id
      WHERE (l.status = 'open' AND NOT public.network_blocked(cid, l.seller_id)) OR (l.status = 'reserved' AND (l.reserved_for = cid OR l.seller_id = cid))), '[]'),
    'my_assets', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', ec.name, 'brand', ec.config->>'brand', 'new_price', ec.price,
        'listed', EXISTS (SELECT 1 FROM public.market_listings ml WHERE ml.asset_id = a.id AND ml.status IN ('open','reserved')),
        'credit', EXISTS (SELECT 1 FROM public.purchase_credits pc WHERE pc.character_id = cid AND pc.catalog_id = a.catalog_id AND pc.status = 'active')) ORDER BY ec.name)
      FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id
      WHERE a.character_id = cid AND COALESCE(ec.config->>'shop','false') = 'true' AND COALESCE(ec.config->>'realestate','false') <> 'true'), '[]'),
    'offers_received', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'listing_id', o.listing_id, 'name', ec.name, 'amount', o.amount, 'price', l.price,
        'buyer', ch.first_name, 'status', o.status, 'at', o.created_at) ORDER BY o.created_at DESC)
      FROM public.market_offers o JOIN public.market_listings l ON l.id = o.listing_id JOIN public.economy_catalog ec ON ec.id = l.catalog_id JOIN public.characters ch ON ch.id = o.buyer_id
      WHERE o.seller_id = cid AND (o.status IN ('pending','accepted') OR o.answered_at > public.game_now() - interval '7 days')), '[]'),
    'offers_sent', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'listing_id', o.listing_id, 'name', ec.name, 'amount', o.amount, 'price', l.price,
        'status', o.status, 'reserved_until', CASE WHEN o.status = 'accepted' THEN l.reserved_until END, 'at', o.created_at) ORDER BY o.created_at DESC)
      FROM public.market_offers o JOIN public.market_listings l ON l.id = o.listing_id JOIN public.economy_catalog ec ON ec.id = l.catalog_id
      WHERE o.buyer_id = cid AND (o.status IN ('pending','accepted') OR o.answered_at > public.game_now() - interval '7 days')), '[]'),
    'sales', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', p.label, 'amount', p.amount, 'fee', p.fee, 'at', p.created_at) ORDER BY p.created_at DESC)
      FROM public.market_payouts p WHERE p.seller_id = cid), '[]'),
    'shops', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', bb.id, 'name', bb.name, 'city_id', bb.city_id, 'owner', ch.first_name, 'mine', bb.owner_id = cid,
        'stock', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', bs.id, 'catalog_id', bs.catalog_id, 'name', ec.name, 'brand', ec.config->>'brand', 'price', bs.price,
            'new_price', ec.price, 'quantity', bs.quantity,
            'owned', EXISTS (SELECT 1 FROM public.personal_assets pa WHERE pa.character_id = cid AND pa.catalog_id = bs.catalog_id)) ORDER BY ec.name), '[]')
          FROM public.business_stock bs JOIN public.economy_catalog ec ON ec.id = bs.catalog_id WHERE bs.business_id = bb.id AND bs.quantity > 0),
        'listings', (SELECT count(*) FROM public.market_listings ml WHERE ml.seller_id = bb.owner_id AND ml.status = 'open')) ORDER BY bb.city_id = c.city_id DESC, bb.name)
      FROM public.businesses bb JOIN public.characters ch ON ch.id = bb.owner_id
      WHERE bb.status = 'active' AND bb.sector_id = 'commerce' AND NOT public.network_blocked(cid, bb.owner_id)
        AND (bb.owner_id = cid OR EXISTS (SELECT 1 FROM public.business_stock bs WHERE bs.business_id = bb.id AND bs.quantity > 0))), '[]'),
    'my_business', CASE WHEN biz.id IS NULL THEN NULL ELSE jsonb_build_object('id', biz.id, 'name', biz.name, 'sector', biz.sector_id,
        'treasury', (SELECT balance FROM public.business_treasuries WHERE business_id = biz.id),
        'stock', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', bs.id, 'catalog_id', bs.catalog_id, 'name', ec.name, 'quantity', bs.quantity, 'price', bs.price,
            'unit_cost', bs.unit_cost, 'new_price', ec.price, 'sold_npc', bs.sold_npc, 'sold_players', bs.sold_players) ORDER BY ec.name)
          FROM public.business_stock bs JOIN public.economy_catalog ec ON ec.id = bs.catalog_id WHERE bs.business_id = biz.id), '[]'),
        'wholesale', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ec.id, 'name', ec.name, 'brand', ec.config->>'brand', 'price', ec.price,
            'unit_cost', ceil(ec.price * s.wholesale_percent / 100.0)::integer) ORDER BY ec.sort_order)
          FROM public.economy_catalog ec WHERE COALESCE(ec.config->>'shop','false') = 'true' AND ec.kind = 'item' AND COALESCE(ec.config->>'realestate','false') <> 'true'), '[]'))
      END);
END $$;

REVOKE ALL ON FUNCTION public.market_check_buyer(uuid, public.economy_catalog), public.business_stock_settle(uuid), public.market_collect(uuid), public.market_expire() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_buy(text, text, uuid), public.business_restock(uuid, text, integer, integer, uuid), public.business_stock_buy(uuid, uuid),
  public.market_list(uuid, integer, text), public.market_cancel(uuid), public.market_offer(uuid, integer), public.market_offer_answer(uuid, boolean),
  public.market_buy(uuid, uuid), public.market_state() TO authenticated;

COMMIT;
