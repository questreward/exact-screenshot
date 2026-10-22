BEGIN;
INSERT INTO public.locations VALUES ('11111111-1111-1111-1111-111111111111', 'Magasin de Lyon'), ('22222222-2222-2222-2222-222222222222', 'Parc');
INSERT INTO public.character_positions VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111');
INSERT INTO public.shop_orders(character_id, reference, name, brand, price, ordered_at) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CIV-1', 'Lit', 'CIVITAS', 37, now());
UPDATE public.character_positions SET location_id = '22222222-2222-2222-2222-222222222222';
UPDATE public.locations SET name = 'Magasin renommé' WHERE id = '11111111-1111-1111-1111-111111111111';
DO $$ BEGIN
 IF (public.shop_state()->'orders'->0->>'location_name') IS DISTINCT FROM 'Magasin de Lyon' THEN RAISE EXCEPTION 'Historical place changed'; END IF;
 IF (public.shop_state()->'orders'->0->>'price')::integer <> 37 THEN RAISE EXCEPTION 'Recorded amount changed'; END IF;
 IF (public.shop_state()->'orders'->0->>'location_id') IS DISTINCT FROM '11111111-1111-1111-1111-111111111111' THEN RAISE EXCEPTION 'Historical position changed'; END IF;
END $$;
INSERT INTO public.shop_orders(character_id, reference, name, brand, price, ordered_at) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CIV-2', 'Téléphone', 'CIVITAS', 100, now());
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.shop_orders WHERE reference = 'CIV-2' AND location_name IS NOT NULL) THEN RAISE EXCEPTION 'Invented place'; END IF;
END $$;
ROLLBACK;