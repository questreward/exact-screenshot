-- CIVITAS – BLOC P1 : DÉPLACEMENTS ENTRE VILLES & ESPACES INTÉRIEURS
-- À appliquer sur le VPS :
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d postgres < /data/civitas-live/app/vps/migrations/0044_p1_intercity_travel.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.intercity_routes (
  id text PRIMARY KEY,
  from_city_id text NOT NULL REFERENCES public.cities(id),
  to_city_id text NOT NULL REFERENCES public.cities(id),
  mode text NOT NULL CHECK (mode IN ('train','car')),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  money_cost integer NOT NULL CHECK (money_cost >= 0),
  energy_cost integer NOT NULL CHECK (energy_cost >= 0),
  departure_kind text NOT NULL CHECK (departure_kind IN ('gare','station')),
  arrival_kind text NOT NULL CHECK (arrival_kind IN ('gare','station')),
  CONSTRAINT uq_intercity_route UNIQUE (from_city_id, to_city_id, mode)
);
GRANT SELECT ON public.intercity_routes TO anon, authenticated;
GRANT ALL ON public.intercity_routes TO service_role;
ALTER TABLE public.intercity_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intercity_routes_read" ON public.intercity_routes;
CREATE POLICY "intercity_routes_read" ON public.intercity_routes FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.intercity_routes (id, from_city_id, to_city_id, mode, duration_minutes, money_cost, energy_cost, departure_kind, arrival_kind)
SELECT a||'-'||b||'-'||m, a, b, m, d, p, e, k, k FROM (VALUES
  ('paris','lille',60,35,10,150,15,20),
  ('paris','lyon',120,55,15,300,25,30),
  ('paris','bordeaux',135,60,15,360,28,35),
  ('paris','marseille',195,75,20,480,35,45),
  ('lyon','marseille',105,40,12,210,18,25),
  ('lyon','lille',180,70,20,450,32,40),
  ('lyon','bordeaux',270,70,25,420,30,40),
  ('bordeaux','marseille',360,75,30,510,35,45),
  ('bordeaux','lille',285,80,25,540,38,50),
  ('lille','marseille',285,85,25,660,45,55)
) AS r(x,y,td,tp,te,cd,cp,ce)
CROSS JOIN LATERAL (VALUES
  (x,y,'train',td,tp,te,'gare'),(y,x,'train',td,tp,te,'gare'),
  (x,y,'car',cd,cp,ce,'station'),(y,x,'car',cd,cp,ce,'station')
) AS v(a,b,m,d,p,e,k)
ON CONFLICT (id) DO UPDATE SET duration_minutes=EXCLUDED.duration_minutes, money_cost=EXCLUDED.money_cost, energy_cost=EXCLUDED.energy_cost;

INSERT INTO public.life_rules (id, title, duration_minutes, energy_cost, energy_gain, money_cost, progression_gain, allowed_kinds)
VALUES ('intercity_travel','Voyage interurbain',60,10,0,0,0,ARRAY['gare','station'])
ON CONFLICT (id) DO NOTHING;

UPDATE public.location_spaces SET accessible = true
WHERE kind = 'batiment' AND name IN ('Amphithéâtre','Salle du conseil');

ALTER TABLE public.character_positions
  ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES public.location_spaces(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.enter_location_space(_space_id uuid)
RETURNS public.character_positions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; pos public.character_positions; sp public.location_spaces;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  SELECT * INTO pos FROM public.character_positions WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Position introuvable'; END IF;
  SELECT * INTO sp FROM public.location_spaces WHERE id = _space_id;
  IF NOT FOUND OR NOT sp.accessible OR sp.location_id <> pos.location_id THEN
    RAISE EXCEPTION 'Espace inaccessible depuis votre lieu actuel';
  END IF;
  UPDATE public.character_positions SET space_id = sp.id, updated_at = now()
  WHERE character_id = cid RETURNING * INTO pos;
  RETURN pos;
END $$;
REVOKE ALL ON FUNCTION public.enter_location_space(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enter_location_space(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_location_space()
RETURNS public.character_positions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; pos public.character_positions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  UPDATE public.character_positions SET space_id = NULL, updated_at = now()
  WHERE character_id = cid RETURNING * INTO pos;
  RETURN pos;
END $$;
REVOKE ALL ON FUNCTION public.leave_location_space() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_location_space() TO authenticated;

CREATE OR REPLACE FUNCTION public.travel_intercity(_to_city text, _mode text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid uuid; c public.characters; pos public.character_positions;
  curr_loc public.locations; target_loc public.locations; route public.intercity_routes;
  t timestamptz := public.game_now(); aid uuid;
  mode_label text := CASE _mode WHEN 'train' THEN 'Train' ELSE 'Autocar' END;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _mode NOT IN ('train','car') THEN RAISE EXCEPTION 'Mode de transport inconnu'; END IF;
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  SELECT * INTO pos FROM public.character_positions WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Position introuvable'; END IF;
  IF pos.city_id = _to_city THEN RAISE EXCEPTION 'Vous êtes déjà dans cette ville'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE id = _to_city AND available) THEN
    RAISE EXCEPTION 'Ville de destination indisponible';
  END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND status = 'running') THEN
    RAISE EXCEPTION 'Une activité est déjà en cours dans votre agenda';
  END IF;
  SELECT * INTO route FROM public.intercity_routes
  WHERE from_city_id = pos.city_id AND to_city_id = _to_city AND mode = _mode;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucune liaison disponible pour ce trajet'; END IF;
  SELECT * INTO curr_loc FROM public.locations WHERE id = pos.location_id;
  IF curr_loc.kind IS DISTINCT FROM route.departure_kind THEN
    IF route.departure_kind = 'gare' THEN
      RAISE EXCEPTION 'Rendez-vous à la Gare centrale pour prendre le train';
    ELSE
      RAISE EXCEPTION 'Rendez-vous à la Station de transport pour prendre le car';
    END IF;
  END IF;
  SELECT * INTO target_loc FROM public.locations
  WHERE city_id = _to_city AND kind = route.arrival_kind AND accessible ORDER BY name LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lieu d''arrivée introuvable'; END IF;
  IF c.energy < route.energy_cost THEN RAISE EXCEPTION 'Énergie insuffisante pour ce voyage'; END IF;

  IF NOT public.economy_cash(cid, 'intercity_ticket:' || gen_random_uuid(), -route.money_cost,
       'Billet ' || mode_label || ' — ' || pos.city_id || ' → ' || _to_city, 'transport') THEN
    RAISE EXCEPTION 'Argent insuffisant pour ce billet';
  END IF;

  UPDATE public.characters SET energy = energy - route.energy_cost, updated_at = now() WHERE id = cid;
  UPDATE public.character_positions SET space_id = NULL, updated_at = now() WHERE character_id = cid;

  INSERT INTO public.activities (character_id, type, title, start_time, end_time, location_id,
    target_location_id, energy_cost, money_cost, status, source_key)
  VALUES (cid, 'intercity_travel',
    'Voyage en ' || mode_label || ' vers ' || (SELECT name FROM public.cities WHERE id = _to_city),
    t, t + route.duration_minutes * interval '1 minute', curr_loc.id, target_loc.id,
    route.energy_cost, route.money_cost, 'running', 'intercity:' || gen_random_uuid())
  RETURNING id INTO aid;
  RETURN aid;
END $$;
REVOKE ALL ON FUNCTION public.travel_intercity(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_intercity(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.settle_intercity_arrival()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.locations;
BEGIN
  IF NEW.type = 'intercity_travel' AND OLD.status = 'running' AND NEW.status = 'completed'
     AND NEW.target_location_id IS NOT NULL THEN
    SELECT * INTO target FROM public.locations WHERE id = NEW.target_location_id;
    IF FOUND THEN
      UPDATE public.character_positions
      SET city_id = target.city_id, district_id = target.district_id, location_id = target.id,
          space_id = NULL, updated_at = now()
      WHERE character_id = NEW.character_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.settle_intercity_arrival() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_settle_intercity_arrival ON public.activities;
CREATE TRIGGER trg_settle_intercity_arrival
  AFTER UPDATE OF status ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.settle_intercity_arrival();

NOTIFY pgrst, 'reload schema';
COMMIT;
