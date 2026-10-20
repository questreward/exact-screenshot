-- Isolated fixture only (after driving_fixture + 0098), never install on the VPS.
ALTER TABLE public.personal_assets ADD COLUMN IF NOT EXISTS purchase_price integer NOT NULL DEFAULT 20000;
CREATE TABLE public.businesses(id uuid PRIMARY KEY, name text, sector_id text, status text, city_id text, owner_id uuid);
CREATE TABLE public.biz_cash(key text PRIMARY KEY, biz uuid, amount integer);
CREATE FUNCTION public.service_percent(_b uuid) RETURNS integer LANGUAGE sql AS $$ SELECT 80 $$;
CREATE FUNCTION public.service_rating(_b uuid) RETURNS numeric LANGUAGE sql AS $$ SELECT 4.0 $$;
CREATE FUNCTION public.service_pay(_cid uuid, _biz uuid, _service text, _ref integer, _key text, _label text, _category text) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE amt integer := CASE WHEN _biz IS NULL THEN _ref ELSE round(_ref * 0.8)::int END; BEGIN
  PERFORM public.economy_cash(_cid, _key, -amt, _label, _category, '{}'::jsonb);
  IF _biz IS NOT NULL THEN INSERT INTO public.biz_cash VALUES (_key, _biz, amt); END IF;
  RETURN amt; END $$;
INSERT INTO public.businesses VALUES ('00000000-0000-0000-0000-0000000000b1','Garage Martin','garage','active','paris','00000000-0000-0000-0000-0000000000c2');
