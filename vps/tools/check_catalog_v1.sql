-- Read-only inventory before proposing the exact 10,000-product expansion.
BEGIN TRANSACTION READ ONLY;
SELECT count(*) AS produits_catalogue,
       count(DISTINCT id) AS identifiants_distincts
FROM public.economy_catalog WHERE config->>'shop' = 'true';
SELECT coalesce(config->>'section', 'sans rubrique') AS rubrique,
       count(*) AS produits, min(price) AS prix_min, max(price) AS prix_max
FROM public.economy_catalog WHERE config->>'shop' = 'true'
GROUP BY 1 ORDER BY 1;
SELECT sections, count(*) AS magasins
FROM public.city_stores GROUP BY sections ORDER BY sections;
COMMIT;