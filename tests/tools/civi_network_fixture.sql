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
CREATE TABLE public.cities(id text PRIMARY KEY);
INSERT INTO public.cities VALUES ('paris'),('lyon');
CREATE TABLE public.characters(id uuid PRIMARY KEY, user_id uuid, first_name text, last_name text, city_id text);
CREATE TABLE public.character_positions(character_id uuid PRIMARY KEY, city_id text);
CREATE TABLE public.social_stats(character_id uuid PRIMARY KEY, reputation integer NOT NULL DEFAULT 0, influence integer NOT NULL DEFAULT 0);
CREATE FUNCTION public.social_actor() RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM public.characters WHERE user_id = auth.uid() $$;
CREATE TABLE public.social_posts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_kind text NOT NULL, author_label text NOT NULL,
 character_id uuid REFERENCES public.characters(id), city_id text, news_id uuid, body text NOT NULL, source_key text NOT NULL UNIQUE,
 posted_at timestamptz NOT NULL DEFAULT public.game_now(), CHECK ((author_kind='player')=(character_id IS NOT NULL)));
CREATE TABLE public.social_post_reactions(post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE, character_id uuid, kind text, PRIMARY KEY(post_id,character_id,kind));
CREATE TABLE public.player_follows(follower_id uuid, followed_id uuid, PRIMARY KEY(follower_id,followed_id), CHECK(follower_id<>followed_id));
CREATE TABLE public.player_blocks(blocker_id uuid, blocked_id uuid, PRIMARY KEY(blocker_id,blocked_id));
CREATE FUNCTION public.network_blocked(a uuid, b uuid) RETURNS boolean LANGUAGE sql AS $$
 SELECT EXISTS(SELECT 1 FROM public.player_blocks WHERE (blocker_id=a AND blocked_id=b) OR (blocker_id=b AND blocked_id=a)) $$;
INSERT INTO public.characters
 SELECT ('00000000-0000-0000-0000-0000000000'||lpad(i::text,2,'0'))::uuid, ('00000000-0000-0000-0000-0000000001'||lpad(i::text,2,'0'))::uuid, 'Prenom'||i, 'Nom'||i, 'paris'
 FROM generate_series(1,12) i;
\ir ../../vps/migrations/0118_civi_network.sql
