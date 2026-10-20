-- Isolated fixture only, never install on the VPS.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE TABLE public.fake_clock(t timestamptz); INSERT INTO public.fake_clock VALUES ('2026-10-19 05:00:00+00'); -- lundi 5h
CREATE FUNCTION public.game_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT t FROM public.fake_clock $$;
CREATE TABLE public.characters(id uuid PRIMARY KEY, user_id uuid, age integer, energy integer, city_id text, situation text);
CREATE FUNCTION public.social_actor() RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM public.characters WHERE user_id = auth.uid() $$;
CREATE TABLE public.character_positions(character_id uuid PRIMARY KEY, location_id uuid);
CREATE TABLE public.employments(character_id uuid PRIMARY KEY);
CREATE TABLE public.life_rules(id text PRIMARY KEY, title text, duration_minutes integer, energy_cost integer, energy_gain integer, money_cost integer, progression_gain integer, allowed_kinds text[]);
CREATE TABLE public.activities(character_id uuid, type text REFERENCES public.life_rules(id), title text, start_time timestamptz, end_time timestamptz, location_id uuid, energy_cost integer, status text, source_key text);
CREATE TABLE public.health_profiles(character_id uuid PRIMARY KEY, health integer);
CREATE TABLE public.social_stats(character_id uuid PRIMARY KEY, reputation integer, influence integer);
CREATE TABLE public.crises(city_id text, status text);
CREATE TABLE public.protests(city_id text, status text);
CREATE TABLE public.public_issues(city_id text, status text, severity integer);
CREATE TABLE public.cash(key text PRIMARY KEY, cid uuid, amount integer);
CREATE FUNCTION public.economy_cash(_cid uuid,_key text,_amount integer,_label text,_category text,_payload jsonb DEFAULT '{}') RETURNS boolean LANGUAGE sql AS $$ INSERT INTO public.cash VALUES(_key,_cid,_amount) ON CONFLICT DO NOTHING RETURNING true $$;
CREATE FUNCTION public.economy_notify(_cid uuid,_key text,_t text,_b text) RETURNS void LANGUAGE sql AS $$ SELECT $$;
CREATE TABLE public.civic(key text PRIMARY KEY, amount integer);
CREATE FUNCTION public.award_civic(_cid uuid,_key text,_kind text,_amount integer) RETURNS void LANGUAGE sql AS $$ INSERT INTO public.civic VALUES(_key,_amount) ON CONFLICT DO NOTHING $$;
INSERT INTO public.characters VALUES
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000001',20,100,'paris','Étudiant'),
 ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-000000000002',16,100,'paris','Lycéen');
INSERT INTO public.character_positions VALUES ('00000000-0000-0000-0000-0000000000c1',gen_random_uuid()),('00000000-0000-0000-0000-0000000000c2',gen_random_uuid());
INSERT INTO public.health_profiles VALUES ('00000000-0000-0000-0000-0000000000c1',90);
