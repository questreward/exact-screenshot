-- CIVITAS – BOUTIQUE, FIN DE PHASE 3 : PROMOTIONS, LISTE D'ENVIES, OBJECTIF D'ACHAT
-- Uniquement des ajouts, tout ou rien.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0080_shop_promos_wishlist.sql
-- Modification d'existant (1) :
--   * shop_buy (dernière version 0077) : même contrôles, le prix comptant tient compte de la promotion de la semaine.
-- Promotions : calculées à partir de l'heure du jeu (aucune tâche planifiée, rien de stocké). Chaque semaine de jeu,
--   quelques produits (jamais l'immobilier) sont remisés de 10 à 30 %. Le crédit et les magasins des villes gardent leurs prix.
-- Liste d'envies : privée, aucun argent ne bouge. Un seul produit peut être l'objectif d'achat (barre de progression
--   calculée sur le solde ; l'argent reste sur le compte courant, pas de cagnotte).
BEGIN;

CREATE TABLE public.shop_promo_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  per_week integer NOT NULL DEFAULT 6 CHECK (per_week BETWEEN 0 AND 30),
  min_percent integer NOT NULL DEFAULT 10 CHECK (min_percent BETWEEN 5 AND 50),
  max_percent integer NOT NULL DEFAULT 30 CHECK (max_percent BETWEEN 5 AND 50),
  week_days integer NOT NULL DEFAULT 7 CHECK (week_days > 0),
  max_wishes integer NOT NULL DEFAULT 30 CHECK (max_wishes > 0),
  CHECK (min_percent <= max_percent)
);
INSERT INTO public.shop_promo_settings (id) VALUES (1);

CREATE TABLE public.shop_wishlist (
  character_id uuid NOT NULL REFERENCES public.characters(id),
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  goal boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, catalog_id)
);
CREATE UNIQUE INDEX shop_wishlist_one_goal ON public.shop_wishlist (character_id) WHERE goal;

GRANT SELECT ON public.shop_promo_settings, public.shop_wishlist TO authenticated;
GRANT ALL ON public.shop_promo_settings, public.shop_wishlist TO service_role;
ALTER TABLE public.shop_promo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_promo_settings_read ON public.shop_promo_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY shop_wishlist_owner ON public.shop_wishlist FOR SELECT TO authenticated USING (
  character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));

-- Promotions de la semaine de jeu contenant _t (déterministe).
CREATE FUNCTION public.shop_promos(_t timestamptz) RETURNS TABLE (catalog_id text, percent integer, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (SELECT * FROM public.shop_promo_settings WHERE id = 1),
  w AS (SELECT floor(extract(epoch FROM _t) / (s.week_days * 86400))::bigint AS n, s.week_days FROM s),
  ranked AS (
    SELECT ec.id, row_number() OVER (ORDER BY md5(ec.id || ':' || w.n)) AS rn
    FROM public.economy_catalog ec, w
    WHERE COALESCE(ec.config->>'shop', 'false') = 'true' AND COALESCE(ec.config->>'realestate', 'false') <> 'true')
  SELECT r.id,
    s.min_percent + 5 * (abs(hashtext(r.id || ':p:' || w.n)) % ((s.max_percent - s.min_percent) / 5 + 1)),
    to_timestamp((w.n + 1) * w.week_days * 86400)
  FROM ranked r, s, w WHERE r.rn <= s.per_week
$$;

CREATE OR REPLACE FUNCTION public.shop_buy(_catalog_id text, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; cat public.economy_catalog; o public.shop_orders; ref text; fees integer := 0; t timestamptz := public.game_now();
  pct integer; price integer;
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO o FROM public.shop_orders WHERE character_id = cid AND request_id = _request_id;
  IF FOUND THEN RETURN jsonb_build_object('reference', o.reference, 'already', true); END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND COALESCE(config->>'shop', 'false') = 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF EXISTS (SELECT 1 FROM public.personal_assets WHERE character_id = cid AND catalog_id = cat.id) THEN RAISE EXCEPTION 'Vous possédez déjà ce produit'; END IF;
  IF c.age < COALESCE((cat.config->>'min_age')::integer, 16) THEN RAISE EXCEPTION 'Âge insuffisant'; END IF;
  IF cat.config ? 'license' AND COALESCE((c.progression->>(cat.config->>'license'))::integer, 0) < 1 THEN RAISE EXCEPTION 'Permis requis'; END IF;
  pct := COALESCE((SELECT p.percent FROM public.shop_promos(t) p WHERE p.catalog_id = cat.id), 0);
  price := cat.price - floor(cat.price * pct / 100.0)::integer;
  IF COALESCE(cat.config->>'realestate', 'false') = 'true' THEN fees := ceil(cat.price * 0.075)::integer; END IF;
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < price + fees THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
  PERFORM public.economy_cash(cid, 'shop:' || _request_id, -price, 'Boutique — ' || (cat.config->>'brand') || ' ' || cat.name
    || CASE WHEN pct > 0 THEN ' (promo −' || pct || ' %)' ELSE '' END, 'achat',
    jsonb_build_object('catalog_id', cat.id, 'reference', ref, 'promo', pct));
  IF fees > 0 THEN
    PERFORM public.economy_cash(cid, 'shop-notary:' || _request_id, -fees, 'Frais de notaire — ' || cat.name, 'logement', jsonb_build_object('reference', ref));
  END IF;
  INSERT INTO public.personal_assets (character_id, catalog_id, purchase_price, next_maintenance)
  VALUES (cid, cat.id, price, CASE WHEN cat.kind = 'vehicle' THEN t + COALESCE((cat.config->>'maintenance_days')::integer, 30) * interval '1 day' END);
  INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
  VALUES (cid, cat.id, cat.name || CASE WHEN pct > 0 THEN ' (promo)' ELSE '' END, cat.config->>'brand', price + fees, _request_id, ref);
  DELETE FROM public.shop_wishlist WHERE character_id = cid AND catalog_id = cat.id;
  RETURN jsonb_build_object('reference', ref, 'already', false, 'fees', fees, 'promo', pct);
END $$;

-- Liste d'envies : 'wish' ajoute/retire, 'goal' fait (ou défait) de ce produit l'objectif unique.
CREATE FUNCTION public.shop_wish(_command text, _catalog_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.shop_promo_settings; w public.shop_wishlist;
BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.shop_promo_settings WHERE id = 1;
  IF NOT EXISTS (SELECT 1 FROM public.economy_catalog WHERE id = _catalog_id AND COALESCE(config->>'shop', 'false') = 'true') THEN
    RAISE EXCEPTION 'Produit introuvable'; END IF;
  SELECT * INTO w FROM public.shop_wishlist WHERE character_id = cid AND catalog_id = _catalog_id;
  IF _command = 'wish' THEN
    IF FOUND THEN DELETE FROM public.shop_wishlist WHERE character_id = cid AND catalog_id = _catalog_id; RETURN jsonb_build_object('wished', false); END IF;
    IF (SELECT count(*) FROM public.shop_wishlist WHERE character_id = cid) >= s.max_wishes THEN RAISE EXCEPTION 'Liste d''envies pleine (% produits)', s.max_wishes; END IF;
    INSERT INTO public.shop_wishlist (character_id, catalog_id) VALUES (cid, _catalog_id);
    RETURN jsonb_build_object('wished', true);
  ELSIF _command = 'goal' THEN
    IF FOUND AND w.goal THEN UPDATE public.shop_wishlist SET goal = false WHERE character_id = cid AND catalog_id = _catalog_id; RETURN jsonb_build_object('goal', false); END IF;
    UPDATE public.shop_wishlist SET goal = false WHERE character_id = cid AND goal;
    IF NOT FOUND AND (SELECT count(*) FROM public.shop_wishlist WHERE character_id = cid) >= s.max_wishes THEN RAISE EXCEPTION 'Liste d''envies pleine (% produits)', s.max_wishes; END IF;
    INSERT INTO public.shop_wishlist (character_id, catalog_id, goal) VALUES (cid, _catalog_id, true)
      ON CONFLICT (character_id, catalog_id) DO UPDATE SET goal = true;
    RETURN jsonb_build_object('goal', true);
  END IF;
  RAISE EXCEPTION 'Action inconnue';
END $$;

CREATE FUNCTION public.shop_extras() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; t timestamptz;
BEGIN
  cid := public.prepare_daily_life();
  t := public.game_now();
  RETURN jsonb_build_object(
    'promos', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.catalog_id, 'percent', p.percent)) FROM public.shop_promos(t) p), '[]'),
    'promo_ends', (SELECT max(p.ends_at) FROM public.shop_promos(t) p),
    'wishlist', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', w.catalog_id, 'goal', w.goal) ORDER BY w.goal DESC, w.added_at DESC)
      FROM public.shop_wishlist w WHERE w.character_id = cid), '[]'));
END $$;

REVOKE ALL ON FUNCTION public.shop_promos(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_wish(text, text), public.shop_extras() TO authenticated;

COMMIT;
