-- Isolated fixture only (after security_careers_fixture + 0093 + 0094), never install on the VPS.
ALTER TABLE public.activities ADD COLUMN reward integer NOT NULL DEFAULT 0, ADD COLUMN created_at timestamptz DEFAULT now();
CREATE TABLE public.cities(id text PRIMARY KEY, name text, sort_order integer DEFAULT 0);
INSERT INTO public.cities VALUES ('paris','Paris',1),('lyon','Lyon',2);
CREATE TABLE public.health_settings(id integer PRIMARY KEY, doctor_cost integer);
INSERT INTO public.health_settings VALUES (1, 25);
CREATE TABLE public.health_log(character_id uuid, day date, kind text, created_at timestamptz DEFAULT public.game_now(), PRIMARY KEY(character_id, day, kind));
CREATE TABLE public.accounts(character_id uuid, balance integer, created_at timestamptz DEFAULT now());
INSERT INTO public.accounts VALUES ('00000000-0000-0000-0000-0000000000c1', 2000), ('00000000-0000-0000-0000-0000000000c2', 10);
CREATE TABLE public.economy_catalog(id text PRIMARY KEY, kind text);
INSERT INTO public.economy_catalog VALUES ('car','vehicle'),('phone','item');
CREATE TABLE public.personal_assets(character_id uuid, catalog_id text);
