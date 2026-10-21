-- CIVITAS 0124 : jauge d'essence par voiture et stations-service.
-- Règles validées par Alex : l'essence se paie seulement au plein (le montant « carburant » par trajet est supprimé),
-- réservoir vide = voiture bloquée jusqu'au plein. Électriques : recharge à la borne, même logique.
-- Consommation : trajet en ville −4 %, trajet entre villes −15 % par heure de route (arrondi, minimum 5 %).
-- Plein : 45 L × 1,85 € (indice local du carburant), recharge complète 12 € (indice local). Tout ou rien.
BEGIN;

CREATE TABLE public.fuel_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tank_liters integer NOT NULL DEFAULT 45,
  liter_price numeric NOT NULL DEFAULT 1.85,
  charge_price integer NOT NULL DEFAULT 12,
  city_trip_pct integer NOT NULL DEFAULT 4,
  road_pct_per_hour integer NOT NULL DEFAULT 15,
  road_min_pct integer NOT NULL DEFAULT 5
);
INSERT INTO public.fuel_settings DEFAULT VALUES;

CREATE TABLE public.vehicle_fuel (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  level integer NOT NULL DEFAULT 100 CHECK (level BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id, catalog_id)
);
CREATE TABLE public.vehicle_fuel_log (
  key text PRIMARY KEY,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  catalog_id text NOT NULL,
  delta integer NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  at timestamptz NOT NULL DEFAULT public.game_now()
);
GRANT SELECT ON public.fuel_settings, public.vehicle_fuel, public.vehicle_fuel_log TO authenticated;
GRANT ALL ON public.fuel_settings, public.vehicle_fuel, public.vehicle_fuel_log TO service_role;
ALTER TABLE public.fuel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_fuel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_fuel_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY fuel_settings_read ON public.fuel_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY vehicle_fuel_owner ON public.vehicle_fuel FOR SELECT TO authenticated
  USING (character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));
CREATE POLICY vehicle_fuel_log_owner ON public.vehicle_fuel_log FOR SELECT TO authenticated
  USING (character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));

-- Niveau courant (une voiture jamais suivie part avec le plein).
CREATE FUNCTION public.fuel_level(_cid uuid, _catalog text) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT level FROM public.vehicle_fuel WHERE character_id = _cid AND catalog_id = _catalog), 100)
$$;
REVOKE ALL ON FUNCTION public.fuel_level(uuid, text) FROM PUBLIC, anon, authenticated;

-- Consommation unique par clé.
CREATE FUNCTION public.fuel_consume(_cid uuid, _catalog text, _key text, _pct integer, _label text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lvl integer; BEGIN
  IF EXISTS (SELECT 1 FROM public.vehicle_fuel_log WHERE key = _key) THEN RETURN; END IF;
  INSERT INTO public.vehicle_fuel (character_id, catalog_id) VALUES (_cid, _catalog) ON CONFLICT DO NOTHING;
  SELECT level INTO lvl FROM public.vehicle_fuel WHERE character_id = _cid AND catalog_id = _catalog FOR UPDATE;
  UPDATE public.vehicle_fuel SET level = greatest(0, lvl - _pct), updated_at = now() WHERE character_id = _cid AND catalog_id = _catalog;
  INSERT INTO public.vehicle_fuel_log (key, character_id, catalog_id, delta, label) VALUES (_key, _cid, _catalog, -least(lvl, _pct), _label);
END $$;
REVOKE ALL ON FUNCTION public.fuel_consume(uuid, text, text, integer, text) FROM PUBLIC, anon, authenticated;

-- Garde : réservoir vide = trajet refusé (ville et route).
CREATE FUNCTION public.fuel_guard_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF NEW.type <> 'economy' OR COALESCE(NEW.economy_payload->>'action', '') <> 'travel' THEN RETURN NEW; END IF;
  IF public.fuel_level(NEW.character_id, NEW.economy_payload->>'catalog_id') <= 0 THEN
    RAISE EXCEPTION 'Réservoir vide : faites le plein à la station-service (page Transports).'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fuel_guard_activity BEFORE INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.fuel_guard_activity();

CREATE FUNCTION public.fuel_city_trip() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.fuel_settings; BEGIN
  IF NEW.type <> 'economy' OR COALESCE(NEW.economy_payload->>'action', '') <> 'travel' THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.fuel_settings WHERE id = 1;
  PERFORM public.fuel_consume(NEW.character_id, NEW.economy_payload->>'catalog_id', 'fuel:city:' || NEW.id, s.city_trip_pct, 'Trajet en ville');
  RETURN NEW;
END $$;
CREATE TRIGGER fuel_city_trip AFTER INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.fuel_city_trip();

CREATE FUNCTION public.fuel_guard_drive() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF public.fuel_level(NEW.character_id, NEW.catalog_id) <= 0 THEN
    RAISE EXCEPTION 'Réservoir vide : faites le plein à la station-service (page Transports).'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fuel_guard_drive BEFORE INSERT ON public.drive_trips FOR EACH ROW EXECUTE FUNCTION public.fuel_guard_drive();

CREATE FUNCTION public.fuel_road_trip() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.fuel_settings; mins numeric; BEGIN
  SELECT * INTO s FROM public.fuel_settings WHERE id = 1;
  SELECT extract(epoch FROM (end_time - start_time)) / 60 INTO mins FROM public.activities WHERE id = NEW.activity_id;
  PERFORM public.fuel_consume(NEW.character_id, NEW.catalog_id, 'fuel:road:' || NEW.activity_id,
    greatest(s.road_min_pct, round(COALESCE(mins, 60) * s.road_pct_per_hour / 60.0)::int), 'Trajet entre villes');
  RETURN NEW;
END $$;
CREATE TRIGGER fuel_road_trip AFTER INSERT ON public.drive_trips FOR EACH ROW EXECUTE FUNCTION public.fuel_road_trip();

-- Plus de montant « carburant » par trajet : patch des définitions installées, ancres vérifiées.
DO $$ DECLARE def text; a1 text := $a$cat.price:=COALESCE((cat.config->>'usage')::integer,0);$a$;
  a2 text := $a$fuel := public.real_economy_price(pos.city_id,'fuel',greatest(1, round(mins * ds.fuel_per_hour / 60.0)::int));$a$;
  a3 text := $a$PERFORM public.economy_cash(cid, 'drive_fuel:' || aid, -fuel, 'Carburant — ' || pos.city_id || ' → ' || _to_city, 'transport');$a$;
BEGIN
  def := pg_get_functiondef('public.personal_economy_action(text,uuid,jsonb)'::regprocedure);
  IF position(a1 IN def) = 0 THEN RAISE EXCEPTION '0124: ancre absente (trajet en ville)'; END IF;
  EXECUTE replace(def, a1, $r$cat.price:=CASE WHEN _command='travel' THEN 0 ELSE COALESCE((cat.config->>'usage')::integer,0) END;$r$);
  def := pg_get_functiondef('public.travel_drive_intercity(text,text)'::regprocedure);
  IF position(a2 IN def) = 0 OR position(a3 IN def) = 0 THEN RAISE EXCEPTION '0124: ancre absente (trajet entre villes)'; END IF;
  def := replace(def, a2, 'fuel := 0;');
  EXECUTE replace(def, a3, 'IF fuel > 0 THEN ' || a3 || ' END IF;');
END $$;

-- État pour l'écran station-service.
CREATE FUNCTION public.fuel_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.fuel_settings; city text; BEGIN
  SELECT * INTO s FROM public.fuel_settings WHERE id = 1;
  SELECT d.city_id INTO city FROM public.character_positions p JOIN public.locations l ON l.id = p.location_id JOIN public.districts d ON d.id = l.district_id WHERE p.character_id = cid;
  RETURN jsonb_build_object(
    'settings', to_jsonb(s),
    'cars', COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog_id', e.id, 'name', e.name,
        'electric', COALESCE(e.config->>'fuel', '') = 'Électrique',
        'level', public.fuel_level(cid, e.id),
        'fill_price', CASE WHEN COALESCE(e.config->>'fuel', '') = 'Électrique'
          THEN greatest(1, ceil(public.real_economy_price(COALESCE(city, 'paris'), 'fuel', s.charge_price) * (100 - public.fuel_level(cid, e.id)) / 100.0))::int
          ELSE greatest(1, ceil(public.real_economy_price(COALESCE(city, 'paris'), 'fuel', s.tank_liters * s.liter_price) * (100 - public.fuel_level(cid, e.id)) / 100.0))::int END)
        ORDER BY e.name)
      FROM public.personal_assets a JOIN public.economy_catalog e ON e.id = a.catalog_id
      WHERE a.character_id = cid AND e.kind = 'vehicle'), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('delta', delta, 'amount', amount, 'label', label, 'at', at) ORDER BY at DESC)
      FROM (SELECT * FROM public.vehicle_fuel_log WHERE character_id = cid ORDER BY at DESC LIMIT 10) h), '[]'::jsonb));
END $$;

-- Faire le plein : paie le manque au prix local, une seule fois par demande.
CREATE FUNCTION public.fuel_fill(_catalog text, _request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); lvl integer; price integer; car jsonb; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.personal_assets a JOIN public.economy_catalog e ON e.id = a.catalog_id WHERE a.character_id = cid AND a.catalog_id = _catalog AND e.kind = 'vehicle') THEN
    RAISE EXCEPTION 'Véhicule introuvable.'; END IF;
  IF EXISTS (SELECT 1 FROM public.vehicle_fuel_log WHERE key = 'fuel:fill:' || _request) THEN RETURN public.fuel_state(); END IF;
  SELECT c INTO car FROM jsonb_array_elements(public.fuel_state()->'cars') c WHERE c->>'catalog_id' = _catalog;
  lvl := (car->>'level')::int; price := (car->>'fill_price')::int;
  IF lvl >= 100 THEN RAISE EXCEPTION 'Le réservoir est déjà plein.'; END IF;
  PERFORM public.economy_cash(cid, 'fuel:fill:' || _request, -price, CASE WHEN (car->>'electric')::boolean THEN 'Recharge — ' ELSE 'Plein d''essence — ' END || (car->>'name'), 'transport');
  INSERT INTO public.vehicle_fuel (character_id, catalog_id) VALUES (cid, _catalog) ON CONFLICT DO NOTHING;
  UPDATE public.vehicle_fuel SET level = 100, updated_at = now() WHERE character_id = cid AND catalog_id = _catalog;
  INSERT INTO public.vehicle_fuel_log (key, character_id, catalog_id, delta, amount, label) VALUES ('fuel:fill:' || _request, cid, _catalog, 100 - lvl, price,
    CASE WHEN (car->>'electric')::boolean THEN 'Recharge à la borne' ELSE 'Plein à la station-service' END);
  RETURN public.fuel_state();
END $$;
GRANT EXECUTE ON FUNCTION public.fuel_state(), public.fuel_fill(text, uuid) TO authenticated;

COMMIT;
