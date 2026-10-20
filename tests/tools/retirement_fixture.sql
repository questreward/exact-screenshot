-- Isolated fixture only (after aging_fixture + 0100), never install on the VPS.
CREATE TABLE public.fake_clock(t timestamptz); INSERT INTO public.fake_clock VALUES ('2026-10-01 10:00+00');
CREATE FUNCTION public.game_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT t FROM public.fake_clock $$;
CREATE FUNCTION public.social_actor() RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM public.characters WHERE user_id = auth.uid() $$;
CREATE TABLE public.activities(character_id uuid, type text, status text, reward integer, end_time timestamptz);
CREATE TABLE public.security_ledger(character_id uuid, kind text, amount integer, created_at timestamptz);
CREATE TABLE public.employments(character_id uuid PRIMARY KEY);
CREATE TABLE public.cash(key text PRIMARY KEY, cid uuid, amount integer);
CREATE FUNCTION public.economy_cash(_cid uuid,_key text,_amount integer,_label text,_category text,_payload jsonb DEFAULT '{}') RETURNS boolean LANGUAGE sql AS $$ INSERT INTO public.cash VALUES(_key,_cid,_amount) ON CONFLICT DO NOTHING RETURNING true $$;
