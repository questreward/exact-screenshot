-- Isolated fixture only, never install on the VPS.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE TABLE public.fake_clock(t timestamptz);
INSERT INTO public.fake_clock VALUES ('2026-10-20 08:00:00+00');
CREATE FUNCTION public.game_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT t FROM public.fake_clock $$;
CREATE TABLE public.cities(id text PRIMARY KEY);
CREATE TABLE public.districts(id text PRIMARY KEY, city_id text);
CREATE TABLE public.locations(id uuid PRIMARY KEY, district_id text);
CREATE TABLE public.public_decisions(id uuid PRIMARY KEY, title text, city_id text, district_id text, location_id uuid, workflow text, completed_at timestamptz);
CREATE TABLE public.public_issues(id uuid PRIMARY KEY, district_id text, location_id uuid, status text, severity integer);
CREATE TABLE public.crises(id uuid PRIMARY KEY, city_id text, district_id text, status text, starts_at timestamptz, closed_at timestamptz);
CREATE TABLE public.citizen_projects(id uuid PRIMARY KEY, title text, city_id text, district_id text, status text, closed_at timestamptz);
CREATE TABLE public.events(id uuid PRIMARY KEY, title text, location_id uuid, character_id uuid, status text, starts_at timestamptz);
INSERT INTO public.cities VALUES ('paris');
INSERT INTO public.districts VALUES ('D1','paris'),('D2','paris');
INSERT INTO public.locations VALUES ('00000000-0000-0000-0000-0000000000a1','D1'),('00000000-0000-0000-0000-0000000000a2','D2');
-- Fait antérieur à l'installation : ne doit jamais compter.
INSERT INTO public.public_decisions VALUES (gen_random_uuid(),'Ancien parc','paris',NULL,'00000000-0000-0000-0000-0000000000a1','completed','2026-01-01');
