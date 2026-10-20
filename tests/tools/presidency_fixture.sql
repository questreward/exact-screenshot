-- Isolated fixture only, never install on the VPS.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE TABLE public.fake_clock(t timestamptz); INSERT INTO public.fake_clock VALUES ('2026-10-19 09:00:00+00');
CREATE FUNCTION public.game_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT t FROM public.fake_clock $$;
CREATE TABLE public.characters(id uuid PRIMARY KEY, user_id uuid, first_name text, last_name text, age integer);
CREATE FUNCTION public.social_actor() RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM public.characters WHERE user_id = auth.uid() $$;
INSERT INTO public.characters SELECT ('00000000-0000-0000-0000-0000000000'||lpad(i::text,2,'0'))::uuid, ('00000000-0000-0000-0000-0000000001'||lpad(i::text,2,'0'))::uuid, 'Prenom'||i, 'Nom'||i, CASE WHEN i=12 THEN 17 ELSE 25 END FROM generate_series(1,12) i;
CREATE TABLE public.news(key text PRIMARY KEY, title text, body text);
CREATE FUNCTION public.national_publish(_key text,_title text,_body text) RETURNS uuid LANGUAGE sql AS $$ INSERT INTO public.news VALUES(_key,_title,_body) ON CONFLICT DO NOTHING; SELECT gen_random_uuid() $$;
CREATE TABLE public.national_settings(id integer PRIMARY KEY, rules jsonb, enabled boolean); INSERT INTO public.national_settings VALUES (1,'{}',true);
CREATE TABLE public.national_elections(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, candidacies_at timestamptz, candidacies_end_at timestamptz, vote_at timestamptz, vote_end_at timestamptz, term_end_at timestamptz, rules jsonb, predecessor_id uuid, status text NOT NULL DEFAULT 'scheduled', counted_at timestamptz,
 CHECK (candidacies_end_at=candidacies_at+interval '7 days' AND vote_at=candidacies_end_at+interval '1 day' AND vote_end_at=vote_at+interval '2 days' AND term_end_at=vote_end_at+interval '28 days'));
CREATE TABLE public.legislative_elections(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), national_election_id uuid);
CREATE TABLE public.national_legislatures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), election_id uuid, starts_at timestamptz, ends_at timestamptz, CHECK(starts_at<ends_at));
CREATE TABLE public.national_governments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), starts_at timestamptz, ends_at timestamptz, CHECK(starts_at<ends_at));
CREATE TABLE public.national_offices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), starts_at timestamptz, ends_at timestamptz, CHECK(starts_at<ends_at));
CREATE TABLE public.national_laws(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), current_version integer NOT NULL DEFAULT 1, status text, adopted_at timestamptz);
CREATE TABLE public.national_law_versions(law_id uuid, version integer, template_id text, title text, description text, category text, effects jsonb, cost integer, delay_minutes integer, budget_allocations jsonb, PRIMARY KEY(law_id,version));
INSERT INTO public.national_elections(name,candidacies_at,candidacies_end_at,vote_at,vote_end_at,term_end_at,rules,status,counted_at)
 VALUES ('Législatives','2026-10-01','2026-10-08','2026-10-09','2026-10-11','2026-11-08','{}','completed','2026-10-11');
INSERT INTO public.national_legislatures(election_id,starts_at,ends_at) SELECT id,'2026-10-11','2026-11-08' FROM public.national_elections;
INSERT INTO public.national_laws(id,status,adopted_at) VALUES ('00000000-0000-0000-0000-00000000aaa1','adopted','2026-10-19 08:00'),('00000000-0000-0000-0000-00000000aaa2','adopted','2026-10-19 08:00');
INSERT INTO public.national_law_versions SELECT id,1,'t','Loi test','Description de test','x','{}',12000,1440,'{}' FROM public.national_laws;
\ir ../../vps/migrations/0119_player_presidency.sql
