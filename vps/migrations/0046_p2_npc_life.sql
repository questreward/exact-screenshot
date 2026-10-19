-- CIVITAS – P2 : PERSONNAGES FICTIFS VIVANTS
-- Uniquement des ajouts. Tout ou rien : la moindre erreur annule l'ensemble.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0046_p2_npc_life.sql
-- Ne touche ni argent, ni élections, ni lois, ni événements, ni horloge.
BEGIN;

-- 1. Réglages (lecture seule pour les joueurs) ---------------------------------
CREATE TABLE public.npc_life_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  travel_every_days integer NOT NULL DEFAULT 10 CHECK (travel_every_days >= 2),
  evening_out_percent integer NOT NULL DEFAULT 50 CHECK (evening_out_percent BETWEEN 0 AND 100),
  greeting_percent integer NOT NULL DEFAULT 40 CHECK (greeting_percent BETWEEN 0 AND 100)
);
GRANT SELECT ON public.npc_life_settings TO authenticated;
GRANT ALL ON public.npc_life_settings TO service_role;
ALTER TABLE public.npc_life_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY npc_life_settings_read ON public.npc_life_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.npc_life_settings (id) VALUES (1);

-- 2. Profil de journée de chaque habitant fictif -------------------------------
CREATE TABLE public.npc_routines (
  npc_id uuid PRIMARY KEY REFERENCES public.social_npcs(id),
  home_location uuid NOT NULL REFERENCES public.locations(id),
  work_location uuid NOT NULL REFERENCES public.locations(id),
  civic_location uuid REFERENCES public.locations(id),
  leisure_locations uuid[] NOT NULL
);
GRANT SELECT ON public.npc_routines TO authenticated;
GRANT ALL ON public.npc_routines TO service_role;
ALTER TABLE public.npc_routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY npc_routines_read ON public.npc_routines FOR SELECT TO authenticated USING (true);

INSERT INTO public.npc_routines (npc_id, home_location, work_location, civic_location, leisure_locations)
SELECT n.id,
  (SELECT id FROM public.locations WHERE city_id = n.city_id AND kind = 'logement' ORDER BY id LIMIT 1),
  coalesce(n.location_id,
    (SELECT id FROM public.locations WHERE city_id = n.city_id
       AND kind = CASE WHEN n.profession ILIKE 'étudiant%' THEN 'universite' ELSE 'entreprise' END ORDER BY id LIMIT 1)),
  CASE WHEN n.political_role IS NOT NULL
       THEN (SELECT id FROM public.locations WHERE city_id = n.city_id AND kind = 'mairie' ORDER BY id LIMIT 1) END,
  ARRAY(SELECT id FROM public.locations WHERE city_id = n.city_id AND kind IN ('cafe','parc','place','commerce') ORDER BY kind, id)
FROM public.social_npcs n;

-- 3. Où est un habitant à un instant donné (calcul fixe, identique pour tous) ---
CREATE FUNCTION public.npc_location_at(_npc uuid, _at timestamptz)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.npc_routines; s public.npc_life_settings; n public.social_npcs;
  t timestamp := _at AT TIME ZONE 'UTC'; d date := t::date; h integer := extract(hour FROM t);
  wd integer := extract(isodow FROM t); seed integer; dest text; arr uuid[];
BEGIN
  SELECT * INTO r FROM public.npc_routines WHERE npc_id = _npc; IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO s FROM public.npc_life_settings WHERE id = 1;
  SELECT * INTO n FROM public.social_npcs WHERE id = _npc;
  seed := abs(hashtext(_npc::text || d::text));
  -- Jour de voyage : gare le matin, l'autre ville la journée, gare le soir
  IF seed % s.travel_every_days = 0 AND h BETWEEN 8 AND 19 THEN
    SELECT to_city_id INTO dest FROM public.intercity_routes
      WHERE from_city_id = n.city_id AND mode = 'train' ORDER BY id OFFSET (seed / 7) % 4 LIMIT 1;
    IF dest IS NOT NULL THEN
      IF h = 8 OR h = 19 THEN
        RETURN (SELECT id FROM public.locations WHERE city_id = CASE WHEN h = 8 THEN n.city_id ELSE dest END AND kind = 'gare' ORDER BY id LIMIT 1);
      END IF;
      arr := ARRAY(SELECT id FROM public.locations WHERE city_id = dest AND kind IN ('cafe','parc','place','commerce') ORDER BY kind, id);
      RETURN arr[1 + abs(hashtext(_npc::text || d::text || (h / 3)::text)) % array_length(arr, 1)];
    END IF;
  END IF;
  IF wd <= 5 THEN
    IF h < 8 OR h >= 22 THEN RETURN r.home_location; END IF;
    IF h < 12 THEN RETURN r.work_location; END IF;
    IF h < 14 THEN RETURN r.leisure_locations[1 + abs(hashtext(_npc::text || d::text || 'midi')) % array_length(r.leisure_locations, 1)]; END IF;
    IF h < 16 AND r.civic_location IS NOT NULL THEN RETURN r.civic_location; END IF;
    IF h < 18 THEN RETURN r.work_location; END IF;
    IF abs(hashtext(_npc::text || d::text || 'soir')) % 100 < s.evening_out_percent THEN
      RETURN r.leisure_locations[1 + abs(hashtext(_npc::text || d::text || 'soirlieu')) % array_length(r.leisure_locations, 1)];
    END IF;
    RETURN r.home_location;
  END IF;
  -- Week-end
  IF h < 10 OR h >= 23 THEN RETURN r.home_location; END IF;
  RETURN r.leisure_locations[1 + abs(hashtext(_npc::text || d::text || (h / 3)::text)) % array_length(r.leisure_locations, 1)];
END $$;

-- 4. Personnes présentes dans un lieu (+ message spontané éventuel, sans récompense)
INSERT INTO public.message_templates (id, trigger_kind, body, replies) VALUES
('presence_1', 'meet', 'Tiens, {player}, tu es aussi à {place} ? Ça fait plaisir de te croiser !',
 '[{"id":"hi","label":"Salut !","body":"Salut ! Content(e) de te voir."},{"id":"busy","label":"Je file","body":"Je file, on se reparle vite !"},{"id":"later","label":"À plus tard","body":"À plus tard !"}]');

CREATE FUNCTION public.location_presence(_location_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.npc_life_settings; now_t timestamptz := public.game_now();
  d date := (public.game_now() AT TIME ZONE 'UTC')::date; here boolean := false; res jsonb; p record;
BEGIN
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Aucun personnage'; END IF;
  SELECT * INTO s FROM public.npc_life_settings WHERE id = 1;
  IF NOT s.enabled THEN RETURN '[]'::jsonb; END IF;
  SELECT EXISTS(SELECT 1 FROM public.character_positions WHERE character_id = cid AND location_id = _location_id) INTO here;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'first_name', n.first_name, 'last_name', n.last_name,
           'profession', n.profession, 'appearance', n.appearance,
           'known', EXISTS(SELECT 1 FROM public.social_relations sr WHERE sr.character_id = cid AND sr.npc_id = n.id))
         ORDER BY n.first_name), '[]'::jsonb)
    INTO res FROM public.social_npcs n WHERE public.npc_location_at(n.id, now_t) = _location_id;
  -- Message spontané : seulement sur place, seulement d'un habitant déjà connu, au plus 1 par habitant et par jour
  IF here THEN
    FOR p IN SELECT (x->>'id')::uuid AS npc FROM jsonb_array_elements(res) x WHERE (x->>'known')::boolean LOOP
      IF abs(hashtext(p.npc::text || cid::text || d::text)) % 100 < s.greeting_percent THEN
        PERFORM public.comm_push(cid, p.npc, 'presence:' || p.npc || ':' || d, 'presence_1', _location_id, NULL);
      END IF;
    END LOOP;
  END IF;
  RETURN res;
END $$;

REVOKE ALL ON FUNCTION public.npc_location_at(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.npc_location_at(uuid, timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.location_presence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.location_presence(uuid) TO authenticated, service_role;

-- 5. Contrôles -----------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT count(*) FROM public.npc_routines) <> (SELECT count(*) FROM public.social_npcs) THEN RAISE EXCEPTION 'Contrôle : un profil par habitant attendu'; END IF;
  IF EXISTS(SELECT 1 FROM public.npc_routines WHERE coalesce(array_length(leisure_locations,1),0) = 0) THEN RAISE EXCEPTION 'Contrôle : lieux de loisir manquants'; END IF;
  IF public.npc_location_at((SELECT npc_id FROM public.npc_routines LIMIT 1), public.game_now()) IS NULL THEN RAISE EXCEPTION 'Contrôle : emploi du temps vide'; END IF;
  IF (SELECT count(*) FROM public.events) < 81 THEN RAISE EXCEPTION 'Contrôle : événements modifiés'; END IF;
END $$;

COMMIT;
