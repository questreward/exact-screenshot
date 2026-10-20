-- Copie jetable uniquement, jamais sur le VPS.
CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.characters(id uuid PRIMARY KEY,user_id uuid UNIQUE);
CREATE TABLE public.economy_catalog(id text PRIMARY KEY,name text,config jsonb DEFAULT '{}');
CREATE TABLE public.personal_assets(id uuid PRIMARY KEY,character_id uuid REFERENCES public.characters(id),catalog_id text REFERENCES public.economy_catalog(id),purchase_price integer DEFAULT 0);
GRANT SELECT ON public.characters TO authenticated;
INSERT INTO public.characters VALUES('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002');
INSERT INTO public.economy_catalog VALUES('home','Maison test','{"realestate":true,"rooms":2}'),('home2','Studio test','{"realestate":true,"rooms":1}'),('object','Objet non plaçable','{}');
INSERT INTO public.economy_catalog(id,name) SELECT x,x FROM unnest(ARRAY['shop-kivik','shop-malm','shop-billy','shop-matelas','shop-frigo-bosch','shop-lave-linge','shop-micro-ondes','shop-cafetiere','shop-cookeo','shop-tv-55']) x;
INSERT INTO public.personal_assets VALUES
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','home',100000),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','home2',50000),
('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','shop-kivik',599),
('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','shop-malm',229),
('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','shop-billy',59);
