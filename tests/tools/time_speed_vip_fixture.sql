-- Uniquement dans une base de test vide et isolée.
CREATE TABLE public.world_state (
  id integer PRIMARY KEY, world_date date NOT NULL, world_time time NOT NULL,
  clock_started_at timestamptz NOT NULL, time_speed numeric NOT NULL
);
INSERT INTO public.world_state VALUES (1, '2027-09-01', '08:00', now(), 12);
CREATE TABLE public.characters (id uuid PRIMARY KEY, user_id uuid NOT NULL);
CREATE TABLE public.vip_subscriptions (user_id uuid PRIMARY KEY, status text, period_end timestamptz);
CREATE TABLE public.activities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, character_id uuid, type text,
  start_time timestamptz, end_time timestamptz, cost integer, energy integer, fuel numeric
);
CREATE FUNCTION public.game_now() RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT (world_date + world_time + extract(epoch FROM (now() - clock_started_at)) * time_speed * interval '1 second') AT TIME ZONE 'UTC'
  FROM public.world_state WHERE id = 1
$$;
INSERT INTO public.characters VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003');
INSERT INTO public.vip_subscriptions VALUES
 ('00000000-0000-0000-0000-000000000001', 'actif', now() + interval '1 day'),
 ('00000000-0000-0000-0000-000000000003', 'actif', now() - interval '1 day');