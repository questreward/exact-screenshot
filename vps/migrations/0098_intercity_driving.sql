-- 0098 — Conduite entre villes avec sa voiture (route, limitations, radars) + trajet animé en car/train.
-- Touché :
--   * 2 nouvelles tables : drive_settings (réglages), drive_trips (un trajet en voiture : tronçons, radars, vitesses relevées).
--   * Fonctions : travel_drive_intercity (partir avec sa voiture), drive_report (vitesses aux radars, une seule fois),
--     drive_state (trajet en cours, voiture, car ou train), drive_finish (interne) + 1 déclencheur à l'arrivée.
--   * Réutilise sans les modifier : liaisons entre villes (durée de l'autocar), activité 'intercity_travel' et son arrivée,
--     permis (0095), assurance/contrôle technique/amendes/points (0097), economy_cash pour le carburant.
-- Règles validées par Alex : vue route simple, panneaux 130/110/90/50, radars visibles, 135 € + 1 point si flashé
--   (tolérance 5 km/h) ; « Conduite automatique » possible = risque radar habituel (3 %) ; car/train : trajet animé, rien à faire.
--   Si le joueur ne conduit pas jusqu'au bout, l'arrivée applique le risque habituel une seule fois.
-- Installation : docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0098_intercity_driving.sql
BEGIN;

CREATE TABLE public.drive_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  duration_pct integer NOT NULL DEFAULT 85,
  fuel_per_hour integer NOT NULL DEFAULT 9,
  energy_cost integer NOT NULL DEFAULT 15,
  tolerance integer NOT NULL DEFAULT 5
);
INSERT INTO public.drive_settings (id) VALUES (1);

CREATE TABLE public.drive_trips (
  activity_id uuid PRIMARY KEY,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  catalog_id text NOT NULL,
  from_city text NOT NULL,
  to_city text NOT NULL,
  segments jsonb NOT NULL,
  radars jsonb NOT NULL,
  mode text NOT NULL DEFAULT 'manuel' CHECK (mode IN ('manuel','automatique')),
  speeds integer[],
  flashes integer NOT NULL DEFAULT 0,
  settled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
GRANT SELECT ON public.drive_settings, public.drive_trips TO authenticated;
GRANT ALL ON public.drive_settings, public.drive_trips TO service_role;
ALTER TABLE public.drive_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY drive_settings_read ON public.drive_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY drive_trips_owner ON public.drive_trips FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- Flash (une fois par clé) : amende + points, via le moteur des transports.
CREATE FUNCTION public.drive_flash(_cid uuid, _key text, _label text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.transport_settings; BEGIN
  SELECT * INTO s FROM public.transport_settings WHERE id = 1;
  IF EXISTS (SELECT 1 FROM public.transport_ledger WHERE character_id = _cid AND key = _key) THEN RETURN; END IF;
  PERFORM public.transport_charge(_cid, _key, 'radar', s.radar_fine, _label);
  UPDATE public.transport_profiles SET points_lost = points_lost + s.radar_points WHERE character_id = _cid;
END $$;

CREATE FUNCTION public.travel_drive_intercity(_to_city text, _catalog text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; pos public.character_positions; ds public.drive_settings; ts public.transport_settings;
  route public.intercity_routes; target_loc public.locations; tp public.transport_profiles; lic timestamptz;
  t timestamptz := public.game_now(); mins int; fuel int; aid uuid; seed int; segs jsonb; rad jsonb; car_name text; BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  SELECT * INTO pos FROM public.character_positions WHERE character_id = cid FOR UPDATE;
  SELECT * INTO ds FROM public.drive_settings WHERE id = 1;
  SELECT * INTO ts FROM public.transport_settings WHERE id = 1;
  IF NOT public.has_driving_license(cid) THEN RAISE EXCEPTION 'Permis de conduire obligatoire.'; END IF;
  SELECT e.name INTO car_name FROM public.personal_assets a JOIN public.economy_catalog e ON e.id = a.catalog_id
    WHERE a.character_id = cid AND a.catalog_id = _catalog AND e.kind = 'vehicle' AND a.condition = 'Bon état';
  IF car_name IS NULL THEN RAISE EXCEPTION 'Voiture indisponible (entretien nécessaire ?).'; END IF;
  PERFORM public.transport_settle(cid);
  SELECT * INTO tp FROM public.transport_profiles WHERE character_id = cid;
  IF tp.debt > 0 THEN RAISE EXCEPTION 'Voiture bloquée : réglez d''abord vos frais auto ou amendes (% €).', tp.debt; END IF;
  IF EXISTS (SELECT 1 FROM public.vehicle_inspections v JOIN public.personal_assets a ON a.id = v.asset_id
             WHERE a.character_id = cid AND a.catalog_id = _catalog AND v.due_at <= t) THEN
    RAISE EXCEPTION 'Voiture bloquée : contrôle technique à faire (page Transports).'; END IF;
  SELECT license_at INTO lic FROM public.driving_licenses WHERE character_id = cid;
  IF tp.points_lost >= (CASE WHEN lic > t - ts.young_years * interval '1 year' THEN ts.points_young ELSE ts.points_full END) THEN
    RAISE EXCEPTION 'Permis invalide : plus aucun point.'; END IF;
  IF pos.city_id = _to_city THEN RAISE EXCEPTION 'Vous êtes déjà dans cette ville'; END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND status = 'running') THEN
    RAISE EXCEPTION 'Une activité est déjà en cours dans votre agenda'; END IF;
  SELECT * INTO route FROM public.intercity_routes WHERE from_city_id = pos.city_id AND to_city_id = _to_city AND mode = 'car';
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucune route disponible pour ce trajet'; END IF;
  SELECT * INTO target_loc FROM public.locations WHERE city_id = _to_city AND kind = route.arrival_kind AND accessible ORDER BY name LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lieu d''arrivée introuvable'; END IF;
  IF c.energy < ds.energy_cost THEN RAISE EXCEPTION 'Énergie insuffisante pour conduire'; END IF;
  mins := greatest(20, round(route.duration_minutes * ds.duration_pct / 100.0)::int);
  fuel := greatest(1, round(mins * ds.fuel_per_hour / 60.0)::int);
  aid := gen_random_uuid();
  PERFORM public.economy_cash(cid, 'drive_fuel:' || aid, -fuel, 'Carburant — ' || pos.city_id || ' → ' || _to_city, 'transport');
  UPDATE public.characters SET energy = energy - ds.energy_cost, updated_at = now() WHERE id = cid;
  UPDATE public.character_positions SET space_id = NULL, updated_at = now() WHERE character_id = cid;
  INSERT INTO public.activities (id, character_id, type, title, start_time, end_time, location_id, target_location_id, energy_cost, money_cost, status, source_key)
    VALUES (aid, cid, 'intercity_travel', 'Voyage en voiture vers ' || (SELECT name FROM public.cities WHERE id = _to_city),
      t, t + mins * interval '1 minute', pos.location_id, target_loc.id, ds.energy_cost, fuel, 'running', 'drive:' || aid);
  -- Tronçons : sortie de ville 50, départementale 90, autoroute 130 (110 par temps de pluie simplifié), entrée de ville 50.
  seed := abs(hashtext(aid::text));
  segs := jsonb_build_array(
    jsonb_build_object('from', 0, 'to', 8, 'limit', 50, 'label', 'Sortie de ville'),
    jsonb_build_object('from', 8, 'to', 22, 'limit', 90, 'label', 'Route départementale'),
    jsonb_build_object('from', 22, 'to', 78, 'limit', CASE WHEN seed % 4 = 0 THEN 110 ELSE 130 END, 'label', CASE WHEN seed % 4 = 0 THEN 'Autoroute (pluie)' ELSE 'Autoroute' END),
    jsonb_build_object('from', 78, 'to', 92, 'limit', 90, 'label', 'Route départementale'),
    jsonb_build_object('from', 92, 'to', 100, 'limit', 50, 'label', 'Entrée de ville'));
  rad := jsonb_build_array(
    jsonb_build_object('at', 5 + seed % 3, 'limit', 50),
    jsonb_build_object('at', 12 + seed % 8, 'limit', 90),
    jsonb_build_object('at', 30 + seed % 40, 'limit', CASE WHEN seed % 4 = 0 THEN 110 ELSE 130 END),
    jsonb_build_object('at', 94 + seed % 4, 'limit', 50));
  INSERT INTO public.drive_trips (activity_id, character_id, catalog_id, from_city, to_city, segments, radars)
    VALUES (aid, cid, _catalog, pos.city_id, _to_city, segs, rad);
  RETURN aid;
END $$;

-- Vitesses relevées aux radars (une seule fois par trajet) ou conduite automatique.
CREATE FUNCTION public.drive_report(_activity uuid, _speeds integer[], _auto boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); d public.drive_trips; ds public.drive_settings; ts public.transport_settings; r jsonb; i int := 0; n int := 0; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO d FROM public.drive_trips WHERE activity_id = _activity AND character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trajet introuvable.'; END IF;
  IF d.settled THEN RETURN public.drive_state(); END IF;
  SELECT * INTO ds FROM public.drive_settings WHERE id = 1;
  SELECT * INTO ts FROM public.transport_settings WHERE id = 1;
  IF _auto THEN
    IF abs(hashtext(_activity::text || ':radar')) % 100 < ts.radar_pct THEN
      PERFORM public.drive_flash(cid, 'radar:drive:' || _activity, 'Avis de contravention : excès de vitesse (radar autoroute)'); n := 1; END IF;
    UPDATE public.drive_trips SET mode = 'automatique', flashes = n, settled = true WHERE activity_id = _activity;
  ELSE
    IF _speeds IS NULL OR array_length(_speeds, 1) IS DISTINCT FROM jsonb_array_length(d.radars) THEN RAISE EXCEPTION 'Relevé de vitesse incomplet.'; END IF;
    FOR r IN SELECT * FROM jsonb_array_elements(d.radars) LOOP
      i := i + 1;
      IF _speeds[i] < 0 OR _speeds[i] > 250 THEN RAISE EXCEPTION 'Vitesse invalide.'; END IF;
      IF _speeds[i] > (r->>'limit')::int + ds.tolerance THEN
        PERFORM public.drive_flash(cid, 'radar:drive:' || _activity || ':' || i,
          'Avis de contravention : ' || _speeds[i] || ' km/h au lieu de ' || (r->>'limit') || ' km/h'); n := n + 1; END IF;
    END LOOP;
    UPDATE public.drive_trips SET speeds = _speeds, flashes = n, settled = true WHERE activity_id = _activity;
  END IF;
  RETURN public.drive_state();
END $$;

-- À l'arrivée : trajet non relevé = risque habituel, une seule fois.
CREATE FUNCTION public.drive_finish() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.drive_trips; ts public.transport_settings; BEGIN
  IF NEW.type <> 'intercity_travel' OR NEW.status <> 'completed' OR OLD.status = 'completed' THEN RETURN NEW; END IF;
  SELECT * INTO d FROM public.drive_trips WHERE activity_id = NEW.id FOR UPDATE;
  IF NOT FOUND OR d.settled THEN RETURN NEW; END IF;
  SELECT * INTO ts FROM public.transport_settings WHERE id = 1;
  IF abs(hashtext(NEW.id::text || ':radar')) % 100 < ts.radar_pct THEN
    PERFORM public.drive_flash(d.character_id, 'radar:drive:' || NEW.id, 'Avis de contravention : excès de vitesse (radar autoroute)');
    UPDATE public.drive_trips SET flashes = 1 WHERE activity_id = NEW.id;
  END IF;
  UPDATE public.drive_trips SET mode = 'automatique', settled = true WHERE activity_id = NEW.id;
  RETURN NEW;
END $$;
CREATE TRIGGER drive_finish AFTER UPDATE OF status ON public.activities FOR EACH ROW EXECUTE FUNCTION public.drive_finish();

CREATE FUNCTION public.drive_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); a public.activities; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO a FROM public.activities WHERE character_id = cid AND type = 'intercity_travel' ORDER BY start_time DESC LIMIT 1;
  RETURN jsonb_build_object('now', public.game_now(),
    'time_speed', (SELECT time_speed FROM public.world_state WHERE id = 1),
    'settings', (SELECT to_jsonb(s) - 'id' FROM public.drive_settings s),
    'trip', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('id', a.id, 'title', a.title, 'status', a.status,
      'start_time', a.start_time, 'end_time', a.end_time,
      'kind', CASE WHEN a.title LIKE 'Voyage en Train%' THEN 'train' WHEN a.title LIKE 'Voyage en voiture%' THEN 'voiture' ELSE 'car' END,
      'drive', (SELECT to_jsonb(d) - 'character_id' FROM public.drive_trips d WHERE d.activity_id = a.id)) END);
END $$;

REVOKE ALL ON FUNCTION public.drive_flash(uuid, text, text), public.drive_finish() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drive_flash(uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.travel_drive_intercity(text, text), public.drive_report(uuid, integer[], boolean), public.drive_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_drive_intercity(text, text), public.drive_report(uuid, integer[], boolean), public.drive_state() TO authenticated, service_role;

COMMIT;
