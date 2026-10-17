ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS map_x numeric NOT NULL DEFAULT 50, ADD COLUMN IF NOT EXISTS map_y numeric NOT NULL DEFAULT 50, ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS illustration text;
UPDATE public.cities SET map_x = CASE id WHEN 'paris' THEN 53 WHEN 'lyon' THEN 69 WHEN 'marseille' THEN 75 WHEN 'bordeaux' THEN 30 WHEN 'lille' THEN 58 ELSE 50 END, map_y = CASE id WHEN 'paris' THEN 30 WHEN 'lyon' THEN 62 WHEN 'marseille' THEN 84 WHEN 'bordeaux' THEN 68 WHEN 'lille' THEN 12 ELSE 50 END;
CREATE TABLE public.districts (id text PRIMARY KEY, city_id text NOT NULL REFERENCES public.cities(id), name text NOT NULL, description text NOT NULL DEFAULT '', map_x numeric NOT NULL DEFAULT 50, map_y numeric NOT NULL DEFAULT 50, available boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0);
GRANT SELECT ON public.districts TO anon, authenticated; GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "world districts read" ON public.districts FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS district_id text REFERENCES public.districts(id), ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS map_x numeric NOT NULL DEFAULT 50, ADD COLUMN IF NOT EXISTS map_y numeric NOT NULL DEFAULT 50, ADD COLUMN IF NOT EXISTS accessible boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS opening_hours text, ADD COLUMN IF NOT EXISTS illustration text;
CREATE INDEX locations_district_idx ON public.locations(district_id);
INSERT INTO public.districts (id,city_id,name,description,map_x,map_y,sort_order)
SELECT c.id || '-' || v.code,c.id, CASE v.code WHEN 'centre' THEN CASE c.id WHEN 'lyon' THEN 'Presqu’île' WHEN 'marseille' THEN 'Vieux-Port' WHEN 'bordeaux' THEN 'Centre historique' WHEN 'lille' THEN 'Vieux-Lille' ELSE 'Centre' END WHEN 'residentiel' THEN CASE c.id WHEN 'paris' THEN 'Quartier des Batignolles' WHEN 'lyon' THEN 'Croix-Rousse' WHEN 'marseille' THEN 'Le Panier' WHEN 'bordeaux' THEN 'Chartrons' ELSE 'Vauban' END WHEN 'campus' THEN 'Quartier universitaire' ELSE 'Quartier de la gare' END,v.description,v.x,v.y,v.ord
FROM public.cities c CROSS JOIN (VALUES ('centre','Le cœur de la vie publique et des rencontres.',48,40,0),('residentiel','Les logements, les commerces et les espaces de détente.',24,68,1),('campus','Les études et les premières opportunités professionnelles.',76,30,2),('transport','Les portes de la ville et ses transports.',76,76,3)) v(code,description,x,y,ord)
WHERE c.id IN ('paris','lyon','marseille','bordeaux','lille');
INSERT INTO public.locations (city_id,district_id,name,kind,description,map_x,map_y,opening_hours,accessible)
SELECT d.city_id,d.id,v.name || CASE WHEN v.kind = 'universite' THEN ' de ' || c.name ELSE '' END,v.kind,v.description,d.map_x+v.dx,d.map_y+v.dy,v.hours,v.accessible
FROM public.districts d JOIN public.cities c ON c.id=d.city_id
JOIN (VALUES
('centre','Hôtel de ville','mairie','Le siège de la municipalité et de la vie citoyenne.',-6,-7,'Accueil extérieur libre',true),
('centre','Place centrale','place','Une place publique où se croisent les habitants.',7,0,'Accès libre',true),
('centre','Banque du centre','banque','Une agence bancaire au cœur de la ville.',-3,9,'Façade accessible · services à venir',true),
('centre','Maison des services publics','administration','Un point de rencontre avec les services administratifs.',11,10,'Façade accessible · services à venir',true),
('residentiel','Mon logement','logement','Votre point de départ dans la ville.',-6,-5,'Accès libre',true),
('residentiel','Marché de quartier','commerce','Les commerces de proximité et les étals du quartier.',8,-3,'Espace extérieur accessible',true),
('residentiel','Café des voisins','cafe','Un café convivial au pied des immeubles.',-4,8,'Façade accessible · services à venir',true),
('residentiel','Parc des promenades','parc','Un espace de verdure pour retrouver un peu de calme.',11,10,'Accès libre',true),
('campus','Université','universite','Un établissement d’enseignement supérieur et son campus.',-6,-5,'Campus extérieur accessible',true),
('campus','Maison des entreprises','entreprise','Des bureaux et des espaces de travail partagés.',7,5,'Façade accessible · emplois à venir',true),
('transport','Gare centrale','gare','Le principal repère de transport de la ville.',-5,-4,'Parvis accessible · voyages à venir',true),
('transport','Station de transport','station','Une station reliant les différents quartiers.',8,7,'Accès extérieur libre',true)
) v(code,name,kind,description,dx,dy,hours,accessible) ON d.id=d.city_id || '-' || v.code;
CREATE TABLE public.location_spaces (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), location_id uuid NOT NULL REFERENCES public.locations(id), parent_id uuid REFERENCES public.location_spaces(id), name text NOT NULL, kind text NOT NULL DEFAULT 'espace', accessible boolean NOT NULL DEFAULT false);
GRANT SELECT ON public.location_spaces TO authenticated; GRANT ALL ON public.location_spaces TO service_role;
ALTER TABLE public.location_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spaces read" ON public.location_spaces FOR SELECT TO authenticated USING (true);
INSERT INTO public.location_spaces(location_id,name,kind) SELECT id, CASE kind WHEN 'universite' THEN 'Amphithéâtre' WHEN 'mairie' THEN 'Salle du conseil' ELSE 'Espace intérieur' END,'batiment' FROM public.locations WHERE district_id IS NOT NULL AND kind IN ('universite','mairie');
CREATE TABLE public.character_positions (character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE, city_id text NOT NULL REFERENCES public.cities(id), district_id text NOT NULL REFERENCES public.districts(id), location_id uuid NOT NULL REFERENCES public.locations(id), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.character_positions TO authenticated; GRANT ALL ON public.character_positions TO service_role;
ALTER TABLE public.character_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own position read" ON public.character_positions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
INSERT INTO public.character_positions(character_id,city_id,district_id,location_id) SELECT c.id,c.city_id,l.district_id,l.id FROM public.characters c JOIN public.locations l ON l.city_id=c.city_id AND l.kind='logement' AND l.district_id IS NOT NULL;
CREATE FUNCTION public.initialize_character_position() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.character_positions(character_id,city_id,district_id,location_id) SELECT NEW.id,NEW.city_id,l.district_id,l.id FROM public.locations l WHERE l.city_id=NEW.city_id AND l.kind='logement' AND l.district_id IS NOT NULL LIMIT 1; RETURN NEW; END $$;
CREATE TRIGGER character_world_position AFTER INSERT ON public.characters FOR EACH ROW EXECUTE FUNCTION public.initialize_character_position();
REVOKE ALL ON FUNCTION public.initialize_character_position() FROM PUBLIC;
CREATE FUNCTION public.move_character(_location_id uuid) RETURNS public.character_positions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE _char public.characters; _pos public.character_positions; _target public.locations; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF; SELECT * INTO _char FROM public.characters WHERE user_id=auth.uid() FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF; SELECT * INTO _pos FROM public.character_positions WHERE character_id=_char.id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Position introuvable'; END IF; SELECT l.* INTO _target FROM public.locations l JOIN public.districts d ON d.id=l.district_id JOIN public.cities c ON c.id=l.city_id WHERE l.id=_location_id AND l.accessible AND d.available AND c.available AND d.city_id=l.city_id; IF NOT FOUND THEN RAISE EXCEPTION 'Ce lieu est inaccessible'; END IF; IF _target.city_id<>_pos.city_id THEN RAISE EXCEPTION 'Voyage disponible dans une prochaine étape'; END IF; UPDATE public.character_positions SET district_id=_target.district_id,location_id=_target.id,updated_at=now() WHERE character_id=_char.id RETURNING * INTO _pos; RETURN _pos; END $$;
REVOKE ALL ON FUNCTION public.move_character(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.move_character(uuid) TO authenticated;
ALTER TABLE public.world_state ADD COLUMN IF NOT EXISTS clock_started_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS time_speed numeric NOT NULL DEFAULT 1;
CREATE FUNCTION public.world_clock() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$ SELECT jsonb_build_object('world_now', (world_date + world_time + ((extract(epoch FROM (now()-clock_started_at))*time_speed) * interval '1 second'))::text, 'time_speed',time_speed,'season',season) FROM public.world_state WHERE id=1 $$;
REVOKE ALL ON FUNCTION public.world_clock() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.world_clock() TO anon,authenticated;
CREATE TABLE public.city_weather (city_id text PRIMARY KEY REFERENCES public.cities(id), condition text NOT NULL DEFAULT 'clair', temperature numeric NOT NULL DEFAULT 20, wind_speed numeric NOT NULL DEFAULT 0, simulated boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.city_weather TO authenticated; GRANT ALL ON public.city_weather TO service_role;
ALTER TABLE public.city_weather ENABLE ROW LEVEL SECURITY; CREATE POLICY "weather read" ON public.city_weather FOR SELECT TO authenticated USING (true);
INSERT INTO public.city_weather(city_id,temperature) SELECT id,CASE id WHEN 'marseille' THEN 25 WHEN 'lille' THEN 17 ELSE 21 END FROM public.cities WHERE id IN ('paris','lyon','marseille','bordeaux','lille');