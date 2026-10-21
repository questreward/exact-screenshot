-- CIVITAS 0130 : marché vivant (Bloc 7). Règles validées :
-- 1) Soldes de saison : -20 % en janvier et en juillet sur les produits de la boutique (hors immobilier), comptant seulement.
-- 2) Promotions des patrons : remise de 5 à 30 % pendant 3 jours de jeu sur le tarif de leur entreprise de service ; une à la fois.
-- 3) Prix selon la demande : produit acheté 5 fois ou plus sur 7 jours de jeu → +10 % (3-4 fois → +5 %) ;
--    produit déjà vendu mais plus acheté depuis 30 jours → -10 %.
-- Les remises ne se cumulent pas (la plus forte gagne), puis l'effet de la demande s'ajoute, borné entre +10 % et -40 %.
-- Les prix restent calculés uniquement par le serveur (shop_promos / service_percent). Prérequis : 0080, 0081. Tout ou rien.
BEGIN;

DO $$ BEGIN
  IF to_regprocedure('public.shop_promos(timestamptz)') IS NULL OR to_regprocedure('public.service_percent(uuid)') IS NULL THEN
    RAISE EXCEPTION '0130: installer 0080 et 0081 d''abord'; END IF;
END $$;

-- Pourcentage renvoyé : positif = remise, négatif = hausse (même formule de prix qu'avant).
CREATE OR REPLACE FUNCTION public.shop_promos(_t timestamptz) RETURNS TABLE (catalog_id text, percent integer, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (SELECT * FROM public.shop_promo_settings WHERE id = 1),
  w AS (SELECT floor(extract(epoch FROM _t) / (s.week_days * 86400))::bigint AS n, s.week_days FROM s),
  ranked AS (
    SELECT ec.id, row_number() OVER (ORDER BY md5(ec.id || ':' || w.n)) AS rn
    FROM public.economy_catalog ec, w
    WHERE COALESCE(ec.config->>'shop', 'false') = 'true' AND COALESCE(ec.config->>'realestate', 'false') <> 'true'),
  weekly AS (
    SELECT r.id, s.min_percent + 5 * (abs(hashtext(r.id || ':p:' || w.n)) % ((s.max_percent - s.min_percent) / 5 + 1)) AS pct,
      to_timestamp((w.n + 1) * w.week_days * 86400) AS ends
    FROM ranked r, s, w WHERE r.rn <= s.per_week),
  season AS (SELECT extract(month FROM _t AT TIME ZONE 'Europe/Paris')::int IN (1, 7) AS on_sale,
    (date_trunc('month', _t AT TIME ZONE 'Europe/Paris') + interval '1 month') AT TIME ZONE 'Europe/Paris' AS ends),
  demand AS (
    SELECT o.catalog_id AS id,
      CASE WHEN count(*) FILTER (WHERE o.ordered_at > _t - interval '7 days') >= 5 THEN -10
           WHEN count(*) FILTER (WHERE o.ordered_at > _t - interval '7 days') >= 3 THEN -5
           WHEN count(*) FILTER (WHERE o.ordered_at > _t - interval '30 days') = 0 THEN 10
           ELSE 0 END AS pct
    FROM public.shop_orders o GROUP BY o.catalog_id),
  base AS (
    SELECT ec.id,
      greatest(COALESCE(wk.pct, 0), CASE WHEN se.on_sale THEN 20 ELSE 0 END) AS disc,
      COALESCE(d.pct, 0) AS dem,
      COALESCE(wk.ends, CASE WHEN se.on_sale THEN se.ends END) AS ends
    FROM public.economy_catalog ec CROSS JOIN season se
    LEFT JOIN weekly wk ON wk.id = ec.id LEFT JOIN demand d ON d.id = ec.id
    WHERE COALESCE(ec.config->>'shop', 'false') = 'true' AND COALESCE(ec.config->>'realestate', 'false') <> 'true'
      AND (wk.id IS NOT NULL OR se.on_sale OR COALESCE(d.pct, 0) <> 0))
  SELECT id, least(40, greatest(-10, disc + dem)), ends FROM base WHERE disc + dem <> 0
$$;
REVOKE ALL ON FUNCTION public.shop_promos(timestamptz) FROM PUBLIC, anon;

CREATE TABLE IF NOT EXISTS public.business_promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  percent integer NOT NULL CHECK (percent BETWEEN 5 AND 30),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_promos_biz ON public.business_promos (business_id, ends_at DESC);
GRANT SELECT ON public.business_promos TO authenticated;
GRANT ALL ON public.business_promos TO service_role;
ALTER TABLE public.business_promos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promos visibles" ON public.business_promos;
CREATE POLICY "promos visibles" ON public.business_promos FOR SELECT TO authenticated USING (true);

-- Tarif réel = tarif choisi, moins la promotion en cours.
CREATE OR REPLACE FUNCTION public.service_percent(_biz uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(1, floor(COALESCE((SELECT percent FROM public.service_prices WHERE business_id = _biz), 100)
    * (100 - COALESCE((SELECT p.percent FROM public.business_promos p WHERE p.business_id = _biz
        AND public.game_now() >= p.starts_at AND public.game_now() < p.ends_at ORDER BY p.ends_at DESC LIMIT 1), 0)) / 100.0)::integer)
$$;

CREATE OR REPLACE FUNCTION public.business_start_promo(_percent integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; b public.businesses; t timestamptz := public.game_now(); e timestamptz; BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF _percent IS NULL OR _percent NOT BETWEEN 5 AND 30 THEN RAISE EXCEPTION 'La remise doit être entre 5 et 30 %%'; END IF;
  SELECT * INTO b FROM public.businesses WHERE owner_id = cid AND status = 'active' ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vous n''avez pas d''entreprise active'; END IF;
  IF EXISTS (SELECT 1 FROM public.business_promos WHERE business_id = b.id AND ends_at > t) THEN RAISE EXCEPTION 'Une promotion est déjà en cours'; END IF;
  e := t + interval '3 days';
  INSERT INTO public.business_promos (business_id, percent, starts_at, ends_at) VALUES (b.id, _percent, t, e);
  RETURN jsonb_build_object('percent', _percent, 'ends_at', e);
END $$;
REVOKE ALL ON FUNCTION public.business_start_promo(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_start_promo(integer) TO authenticated, service_role;

COMMIT;
