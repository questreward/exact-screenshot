-- Isolated fixture only (after france_realism_fixture + 0095), never install on the VPS.
ALTER TABLE public.activities ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ADD COLUMN money_cost integer DEFAULT 0, ADD COLUMN economy_payload jsonb;
ALTER TABLE public.personal_assets ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ADD COLUMN acquired_at timestamptz DEFAULT public.game_now();
CREATE TABLE IF NOT EXISTS public.economy_catalog_names(x int);
ALTER TABLE public.economy_catalog ADD COLUMN IF NOT EXISTS name text;
UPDATE public.economy_catalog SET name = 'Clio' WHERE id = 'car';
INSERT INTO public.life_rules VALUES ('transport','Transport public',10,0,0,2,0,'{}'),('economy','Économie',10,0,0,0,0,'{}') ON CONFLICT DO NOTHING;
