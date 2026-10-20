-- Isolated fixture only (after transport_fixture + 0097), never install on the VPS.
ALTER TABLE public.character_positions ADD COLUMN city_id text, ADD COLUMN district_id uuid, ADD COLUMN space_id uuid;
UPDATE public.character_positions SET city_id = 'paris';
ALTER TABLE public.cities ADD COLUMN available boolean DEFAULT true;
ALTER TABLE public.activities ADD COLUMN target_location_id uuid;
CREATE TABLE public.locations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), city_id text, kind text, name text, accessible boolean DEFAULT true);
INSERT INTO public.locations(city_id, kind, name) VALUES ('lyon','station','Station Lyon');
CREATE TABLE public.intercity_routes(id text PRIMARY KEY, from_city_id text, to_city_id text, mode text, duration_minutes int, money_cost int, energy_cost int, departure_kind text, arrival_kind text);
INSERT INTO public.intercity_routes VALUES ('paris-lyon-car','paris','lyon','car',240,35,20,'station','station');
CREATE TABLE public.world_state(id int PRIMARY KEY, time_speed numeric); INSERT INTO public.world_state VALUES (1, 6);
CREATE FUNCTION public.prepare_daily_life() RETURNS uuid LANGUAGE sql AS $$ SELECT public.social_actor() $$;
INSERT INTO public.life_rules VALUES ('intercity_travel','Voyage',10,0,0,0,0,'{}') ON CONFLICT DO NOTHING;
ALTER TABLE public.personal_assets ADD COLUMN condition text DEFAULT 'Bon état';
ALTER TABLE public.characters ADD COLUMN updated_at timestamptz; ALTER TABLE public.character_positions ADD COLUMN updated_at timestamptz;
