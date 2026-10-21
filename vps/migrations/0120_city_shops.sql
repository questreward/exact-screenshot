-- CIVITAS 0120 : magasins visitables sur la carte des villes.
-- Ajoute uniquement des lieux (table public.locations), 6 par ville jouable, type « magasin ».
-- Aucune table, colonne ou fonction modifiée. Achats et prix inchangés (Boutique existante).
-- Idempotent : relancer ne crée pas de doublon. Tout ou rien (BEGIN/COMMIT).
BEGIN;

WITH shops(suffix, name, description, district_kind) AS (VALUES
  ('tech',          'Magasin high-tech',          'Téléphones, ordinateurs et objets connectés.',            'transport'),
  ('mode',          'Boutique de vêtements',       'Prêt-à-porter, chaussures et accessoires.',               'centre'),
  ('maison',        'Magasin de meubles et déco',  'Meubles, décoration et aménagement du logement.',         'centre'),
  ('electromenager','Magasin d''électroménager',   'Gros et petit électroménager pour la maison.',            'transport'),
  ('loisirs',       'Magasin de sport et loisirs', 'Sport, jeux, culture et loisirs.',                        'centre'),
  ('auto',          'Concession automobile',       'Voitures neuves et d''occasion, reprise possible.',       'campus')
), cities(city_id) AS (VALUES ('paris'),('lyon'),('marseille'),('bordeaux'),('lille'))
INSERT INTO public.locations (city_id, district_id, name, kind, description, accessible, opening_hours)
SELECT c.city_id, c.city_id || '-' || s.district_kind, s.name, 'magasin', s.description, true, 'Du lundi au samedi, 9 h – 19 h'
FROM cities c CROSS JOIN shops s
WHERE EXISTS (SELECT 1 FROM public.districts d WHERE d.id = c.city_id || '-' || s.district_kind)
  AND NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.city_id = c.city_id AND l.name = s.name AND l.kind = 'magasin');

-- Contrôle : 6 magasins par ville, sinon tout est annulé.
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(city_id || '=' || n, ', ') INTO bad FROM (
    SELECT c.id AS city_id, count(l.id) AS n FROM public.cities c
    LEFT JOIN public.locations l ON l.city_id = c.id AND l.kind = 'magasin'
    WHERE c.id IN ('paris','lyon','marseille','bordeaux','lille') GROUP BY c.id) x WHERE n <> 6;
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'Magasins incomplets : %', bad; END IF;
END $$;

COMMIT;
