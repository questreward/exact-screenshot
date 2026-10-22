-- Proposition à approuver avant installation. Aucun lieu historique reconstitué.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('civitas:0138:shop-purchase-places'));

ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS location_name text;
GRANT SELECT ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;

CREATE OR REPLACE FUNCTION public.record_shop_purchase_place() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Capture actual position in the secured purchase transaction, not a URL label.
  SELECT l.id, l.name INTO NEW.location_id, NEW.location_name
  FROM public.character_positions p JOIN public.locations l ON l.id = p.location_id
  WHERE p.character_id = NEW.character_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_shop_purchase_place() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS shop_purchase_place ON public.shop_orders;
CREATE TRIGGER shop_purchase_place BEFORE INSERT ON public.shop_orders
FOR EACH ROW EXECUTE FUNCTION public.record_shop_purchase_place();

DO $$
DECLARE body text; needle text := '''at'', so.ordered_at)'; replacement text := '''at'', so.ordered_at, ''location_id'', so.location_id, ''location_name'', so.location_name)';
BEGIN
  SELECT pg_get_functiondef('public.shop_state()'::regprocedure) INTO body;
  IF strpos(body, replacement) > 0 THEN RETURN; END IF;
  IF (length(body) - length(replace(body, needle, ''))) / length(needle) <> 1 THEN
    RAISE EXCEPTION 'shop_state inattendue : aucune modification appliquée';
  END IF;
  EXECUTE replace(body, needle, replacement);
END $$;
COMMIT;