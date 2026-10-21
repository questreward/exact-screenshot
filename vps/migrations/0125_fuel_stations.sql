-- CIVITAS 0125 : stations-service visitables sur la carte des villes (2 par ville), plein sur place.
-- Prérequis : 0124 installée. Ajoute des lieux de type « station_service » et exige d'être dans une station pour faire le plein.
-- Prix et consommation inchangés (0124). Idempotent, tout ou rien.
BEGIN;

DO $$ BEGIN IF to_regprocedure('public.fuel_fill(text,uuid)') IS NULL THEN RAISE EXCEPTION '0125: installer 0124 d''abord'; END IF; END $$;

WITH st(name, description, district_kind) AS (VALUES
  ('Station-service du centre', 'Carburants, borne de recharge, gonflage des pneus.', 'centre'),
  ('Station-service de la rocade', 'Station ouverte tard, carburants et bornes rapides.', 'transport')
), cities(city_id) AS (VALUES ('paris'),('lyon'),('marseille'),('bordeaux'),('lille'))
INSERT INTO public.locations (city_id, district_id, name, kind, description, accessible, opening_hours)
SELECT c.city_id, c.city_id || '-' || s.district_kind, s.name, 'station_service', s.description, true, 'Tous les jours, 6 h – 22 h'
FROM cities c CROSS JOIN st s
WHERE EXISTS (SELECT 1 FROM public.districts d WHERE d.id = c.city_id || '-' || s.district_kind)
  AND NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.city_id = c.city_id AND l.name = s.name AND l.kind = 'station_service');

DO $$ DECLARE bad text; BEGIN
  SELECT string_agg(id || '=' || n, ', ') INTO bad FROM (
    SELECT c.id, count(l.id) n FROM public.cities c LEFT JOIN public.locations l ON l.city_id = c.id AND l.kind = 'station_service'
    WHERE c.id IN ('paris','lyon','marseille','bordeaux','lille') GROUP BY c.id) x WHERE n <> 2;
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'Stations incomplètes : %', bad; END IF;
END $$;

-- Le plein se fait seulement sur place, dans une station-service.
DO $$ DECLARE def text; a text := $a$IF EXISTS (SELECT 1 FROM public.vehicle_fuel_log WHERE key = 'fuel:fill:' || _request) THEN RETURN public.fuel_state(); END IF;$a$; BEGIN
  def := pg_get_functiondef('public.fuel_fill(text,uuid)'::regprocedure);
  IF position('station_service' IN def) > 0 THEN RETURN; END IF;
  IF position(a IN def) = 0 THEN RAISE EXCEPTION '0125: ancre absente (fuel_fill)'; END IF;
  EXECUTE replace(def, a, a || $r$
  IF NOT EXISTS (SELECT 1 FROM public.character_positions p JOIN public.locations l ON l.id = p.location_id WHERE p.character_id = cid AND l.kind = 'station_service') THEN
    RAISE EXCEPTION 'Rendez-vous dans une station-service (carte de la ville) pour faire le plein.'; END IF;$r$);
END $$;

-- Prix local au litre affiché avant le plein (en centimes / 100).
DO $$ DECLARE def text; a text := $a$'settings', to_jsonb(s),$a$; BEGIN
  def := pg_get_functiondef('public.fuel_state()'::regprocedure);
  IF position('liter_local' IN def) > 0 THEN RETURN; END IF;
  IF position(a IN def) = 0 THEN RAISE EXCEPTION '0125: ancre absente (fuel_state)'; END IF;
  EXECUTE replace(def, a, a || $r$ 'liter_local', public.real_economy_price(COALESCE(city, 'paris'), 'fuel', s.liter_price * 100) / 100.0,$r$);
END $$;

COMMIT;
