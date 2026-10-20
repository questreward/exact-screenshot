-- Isolated fixture only, never install on the VPS.
CREATE TABLE public.events(id uuid PRIMARY KEY, title text, category text, importance integer, location_id uuid, starts_at timestamptz, scope text, status text, character_id uuid, target_kind text);
CREATE TABLE public.locations(id uuid PRIMARY KEY, name text);
CREATE TABLE public.news(id uuid PRIMARY KEY, event_id uuid, status text, published_at timestamptz);
CREATE TABLE public.tv_segments(id uuid PRIMARY KEY, news_id uuid, kind text);
CREATE FUNCTION public.game_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '2026-10-20 08:00:00+00'::timestamptz $$;
CREATE FUNCTION public.social_actor() RETURNS uuid LANGUAGE plpgsql AS $$ BEGIN
  IF current_setting('test.actor', true) = 'signed-out' THEN RETURN NULL; END IF;
  RETURN '00000000-0000-0000-0000-000000000001'::uuid;
END $$;
CREATE FUNCTION public.tv_state(text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"legacy":true}'::jsonb $$;