-- Isolated fixture only (after driving_fixture + 0098), never install on the VPS.
CREATE TABLE public.study_fields(id text PRIMARY KEY, name text, skill text);
INSERT INTO public.study_fields VALUES ('law','Droit','x'),('economics','Éco','x'),('politics','Sciences po','x'),('journalism','Journalisme','x'),('business','Commerce','x'),('computing','Informatique','x');
CREATE TABLE public.study_enrollments(character_id uuid PRIMARY KEY, field_id text, location_id uuid, progress integer DEFAULT 0);
ALTER TABLE public.characters ADD COLUMN path_id text DEFAULT 'student';
ALTER TABLE public.locations ADD COLUMN district_id uuid DEFAULT gen_random_uuid();
INSERT INTO public.locations(city_id, kind, name) VALUES ('paris','universite','Université de Paris');
