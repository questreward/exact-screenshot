-- CIVITAS – BOUTIQUE, VAGUE 1 : BOUTIQUE, CATALOGUE, ACHATS, HISTORIQUE, PATRIMOINE
-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0076_shop.sql
-- Pas de deuxième patrimoine : les produits sont de nouvelles lignes du catalogue existant (economy_catalog,
--   kind 'item', config.shop = true) et un achat crée un bien dans personal_assets (le patrimoine existant).
-- Pas de deuxième monnaie : paiement uniquement via economy_cash (compte courant, clé unique, jamais négatif).
-- Un exemplaire par produit (règle existante du patrimoine). Prix indicatifs en euros, marques réelles, aucun partenariat.
-- Valeur estimée = prix d'achat × (1 − décote annuelle)^années, calculée à la lecture (rien de stocké).
BEGIN;

INSERT INTO public.economy_catalog (id, name, kind, category, price, energy_cost, location_kind, config, sort_order) VALUES
('shop-iphone-15','iPhone 15 128 Go','item','boutique',969,0,'commerce','{"shop":true,"brand":"Apple","section":"tech","dep":20,"desc":"Smartphone 6,1 pouces, appareil photo 48 Mpx."}',100),
('shop-galaxy-s24','Galaxy S24 128 Go','item','boutique',899,0,'commerce','{"shop":true,"brand":"Samsung","section":"tech","dep":22,"desc":"Smartphone Android 6,2 pouces."}',101),
('shop-redmi-note-13','Redmi Note 13','item','boutique',229,0,'commerce','{"shop":true,"brand":"Xiaomi","section":"tech","dep":25,"desc":"Smartphone abordable, grande autonomie."}',102),
('shop-macbook-air-m3','MacBook Air 13" M3','item','boutique',1299,0,'commerce','{"shop":true,"brand":"Apple","section":"tech","dep":15,"desc":"Ordinateur portable léger, 8 Go, 256 Go."}',103),
('shop-ideapad-slim-3','IdeaPad Slim 3','item','boutique',549,0,'commerce','{"shop":true,"brand":"Lenovo","section":"tech","dep":20,"desc":"Ordinateur portable 15 pouces pour les études."}',104),
('shop-ps5','PlayStation 5 Slim','item','boutique',549,0,'commerce','{"shop":true,"brand":"Sony","section":"tech","dep":15,"desc":"Console de salon avec lecteur."}',105),
('shop-switch-oled','Switch OLED','item','boutique',349,0,'commerce','{"shop":true,"brand":"Nintendo","section":"tech","dep":12,"desc":"Console portable et de salon."}',106),
('shop-airpods-pro','AirPods Pro 2','item','boutique',279,0,'commerce','{"shop":true,"brand":"Apple","section":"tech","dep":25,"desc":"Écouteurs sans fil à réduction de bruit."}',107),
('shop-tv-55','TV 55" Crystal UHD','item','boutique',499,0,'commerce','{"shop":true,"brand":"Samsung","section":"tech","dep":18,"desc":"Téléviseur 4K 55 pouces."}',108),
('shop-kivik','Canapé KIVIK 3 places','item','boutique',599,0,'commerce','{"shop":true,"brand":"IKEA","section":"maison","dep":10,"desc":"Canapé tissu, housse lavable."}',120),
('shop-malm','Lit MALM 140×200','item','boutique',229,0,'commerce','{"shop":true,"brand":"IKEA","section":"maison","dep":10,"desc":"Cadre de lit avec rangements."}',121),
('shop-billy','Bibliothèque BILLY','item','boutique',59,0,'commerce','{"shop":true,"brand":"IKEA","section":"maison","dep":8,"desc":"Étagère classique 80×202 cm."}',122),
('shop-matelas','Matelas 140×190','item','boutique',399,0,'commerce','{"shop":true,"brand":"Emma","section":"maison","dep":12,"desc":"Matelas mousse, 10 ans de garantie."}',123),
('shop-dyson-v15','Aspirateur V15 Detect','item','boutique',699,0,'commerce','{"shop":true,"brand":"Dyson","section":"electromenager","dep":15,"desc":"Aspirateur balai sans fil."}',140),
('shop-frigo-bosch','Réfrigérateur combiné','item','boutique',649,0,'commerce','{"shop":true,"brand":"Bosch","section":"electromenager","dep":8,"desc":"Réfrigérateur 2 portes, 300 L."}',141),
('shop-lave-linge','Lave-linge 8 kg','item','boutique',429,0,'commerce','{"shop":true,"brand":"Whirlpool","section":"electromenager","dep":10,"desc":"Lave-linge hublot, classe A."}',142),
('shop-micro-ondes','Micro-ondes 20 L','item','boutique',89,0,'commerce','{"shop":true,"brand":"Moulinex","section":"electromenager","dep":12,"desc":"Micro-ondes simple et compact."}',143),
('shop-cafetiere','Machine à café Inissia','item','boutique',79,0,'commerce','{"shop":true,"brand":"Nespresso","section":"electromenager","dep":15,"desc":"Machine à capsules."}',144),
('shop-cookeo','Cookeo','item','boutique',199,0,'commerce','{"shop":true,"brand":"Moulinex","section":"electromenager","dep":12,"desc":"Multicuiseur intelligent."}',145),
('shop-af1','Air Force 1','item','boutique',119,0,'commerce','{"shop":true,"brand":"Nike","section":"mode","dep":35,"desc":"Baskets blanches classiques."}',160),
('shop-stan-smith','Stan Smith','item','boutique',100,0,'commerce','{"shop":true,"brand":"Adidas","section":"mode","dep":35,"desc":"Baskets en cuir."}',161),
('shop-levis-501','Jean 501','item','boutique',110,0,'commerce','{"shop":true,"brand":"Levi''s","section":"mode","dep":30,"desc":"Jean coupe droite."}',162),
('shop-doudoune','Doudoune Nuptse','item','boutique',330,0,'commerce','{"shop":true,"brand":"The North Face","section":"mode","dep":20,"desc":"Doudoune chaude d''hiver."}',163),
('shop-costume','Costume deux pièces','item','boutique',249,0,'commerce','{"shop":true,"brand":"Celio","section":"mode","dep":25,"desc":"Tenue pour entretiens et cérémonies."}',164),
('shop-velo-rockrider','VTT Rockrider ST 520','item','boutique',449,0,'commerce','{"shop":true,"brand":"Decathlon","section":"loisirs","dep":12,"desc":"Vélo tout terrain."}',180),
('shop-tente','Tente 2 Seconds','item','boutique',79,0,'commerce','{"shop":true,"brand":"Quechua","section":"loisirs","dep":15,"desc":"Tente de camping 2 places."}',181),
('shop-kindle','Liseuse Kindle','item','boutique',109,0,'commerce','{"shop":true,"brand":"Amazon","section":"loisirs","dep":20,"desc":"Liseuse 6 pouces."}',182),
('shop-guitare','Guitare folk','item','boutique',189,0,'commerce','{"shop":true,"brand":"Yamaha","section":"loisirs","dep":8,"desc":"Guitare acoustique pour débuter."}',183);

CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  name text NOT NULL,
  brand text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  request_id uuid NOT NULL,
  reference text NOT NULL,
  ordered_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (character_id, request_id)
);
CREATE INDEX shop_orders_char ON public.shop_orders (character_id, ordered_at DESC);
GRANT SELECT ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mes commandes" ON public.shop_orders FOR SELECT TO authenticated
  USING (character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));

CREATE FUNCTION public.shop_buy(_catalog_id text, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; cat public.economy_catalog; o public.shop_orders; ref text;
BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO o FROM public.shop_orders WHERE character_id = cid AND request_id = _request_id;
  IF FOUND THEN RETURN jsonb_build_object('reference', o.reference, 'already', true); END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND COALESCE(config->>'shop', 'false') = 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF EXISTS (SELECT 1 FROM public.personal_assets WHERE character_id = cid AND catalog_id = cat.id) THEN RAISE EXCEPTION 'Vous possédez déjà ce produit'; END IF;
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < cat.price THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
  PERFORM public.economy_cash(cid, 'shop:' || _request_id, -cat.price, 'Boutique — ' || (cat.config->>'brand') || ' ' || cat.name, 'achat',
    jsonb_build_object('catalog_id', cat.id, 'reference', ref));
  INSERT INTO public.personal_assets (character_id, catalog_id, purchase_price) VALUES (cid, cat.id, cat.price);
  INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
  VALUES (cid, cat.id, cat.name, cat.config->>'brand', cat.price, _request_id, ref);
  RETURN jsonb_build_object('reference', ref, 'already', false);
END $$;

CREATE FUNCTION public.shop_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; t timestamptz;
BEGIN
  cid := public.prepare_daily_life();
  t := public.game_now();
  RETURN jsonb_build_object(
    'balance', COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0),
    'products', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ec.id, 'name', ec.name, 'price', ec.price,
        'brand', ec.config->>'brand', 'section', ec.config->>'section', 'desc', ec.config->>'desc', 'dep', (ec.config->>'dep')::integer,
        'owned', EXISTS (SELECT 1 FROM public.personal_assets a WHERE a.character_id = cid AND a.catalog_id = ec.id),
        'sales', (SELECT count(*) FROM public.shop_orders so WHERE so.catalog_id = ec.id)) ORDER BY ec.sort_order)
      FROM public.economy_catalog ec WHERE COALESCE(ec.config->>'shop', 'false') = 'true'), '[]'),
    'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('reference', so.reference, 'name', so.name, 'brand', so.brand, 'price', so.price, 'at', so.ordered_at) ORDER BY so.ordered_at DESC)
      FROM public.shop_orders so WHERE so.character_id = cid), '[]'),
    'assets', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', ec.name, 'kind', ec.kind, 'brand', ec.config->>'brand', 'price', a.purchase_price, 'acquired_at', a.acquired_at,
        'value', floor(a.purchase_price * power(1 - COALESCE((ec.config->>'dep')::numeric, 10) / 100, GREATEST(0, extract(epoch FROM t - a.acquired_at) / 31557600)))::integer)
        ORDER BY a.purchase_price DESC)
      FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id WHERE a.character_id = cid), '[]'));
END $$;

GRANT EXECUTE ON FUNCTION public.shop_buy(text, uuid), public.shop_state() TO authenticated;

COMMIT;
