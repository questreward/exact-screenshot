-- Isolated disposable local database only. Never install on production.
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
CREATE TABLE characters(id uuid PRIMARY KEY,user_id uuid);
INSERT INTO characters VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011');
CREATE FUNCTION social_actor() RETURNS uuid LANGUAGE sql AS $$SELECT id FROM characters WHERE user_id=auth.uid()$$;
CREATE FUNCTION game_now() RETURNS timestamptz LANGUAGE sql AS $$SELECT '2026-10-20+00'::timestamptz$$;
CREATE TABLE economy_catalog(id text PRIMARY KEY,name text,kind text,category text,price integer,energy_cost integer,location_kind text,config jsonb,sort_order integer);
INSERT INTO economy_catalog SELECT 'legacy-'||n,'Ancien '||n,'item','boutique',100,0,'commerce','{"shop":true,"brand":"Ancien","section":"maison","dep":10}'::jsonb,n FROM generate_series(1,62) n;
CREATE TABLE shop_orders(catalog_id text,character_id uuid);
CREATE TABLE personal_assets(catalog_id text,character_id uuid);
CREATE TABLE shop_wishlist(catalog_id text,character_id uuid);
CREATE FUNCTION shop_promos(_t timestamptz) RETURNS TABLE(catalog_id text,percent integer,ends_at timestamptz) LANGUAGE sql AS $$SELECT 'shop-v1-0115-00001',10,_t$$;
CREATE FUNCTION shop_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := social_actor(); t timestamptz := game_now(); BEGIN
RETURN jsonb_build_object('balance',42,'products', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ec.id)) FROM public.economy_catalog ec WHERE COALESCE(ec.config->>'shop', 'false') = 'true'), '[]'));
END $$;
CREATE TABLE original_fixture AS SELECT id,to_jsonb(e) AS row FROM economy_catalog e;