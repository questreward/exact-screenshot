CREATE ROLE authenticated;
CREATE ROLE anon;
CREATE ROLE service_role;
CREATE TABLE public.locations(id uuid PRIMARY KEY, name text);
CREATE TABLE public.character_positions(character_id uuid PRIMARY KEY, location_id uuid);
CREATE TABLE public.shop_orders(character_id uuid, reference text, name text, brand text, price integer, ordered_at timestamptz);
CREATE FUNCTION public.shop_state() RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('reference', so.reference, 'name', so.name, 'brand', so.brand, 'price', so.price, 'at', so.ordered_at) ORDER BY so.ordered_at DESC) FROM public.shop_orders so), '[]'));
$$;