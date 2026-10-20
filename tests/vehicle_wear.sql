-- Run on the isolated fixture after vehicle_wear_fixture + 0101.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.err(q text, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'should refuse: %', m; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'should refuse%' THEN RAISE; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.cash; DELETE FROM public.personal_assets; DELETE FROM public.activities; DELETE FROM public.transport_ledger; DELETE FROM public.vehicle_inspections;
UPDATE public.transport_profiles SET debt = 0, points_lost = 0;
UPDATE public.fake_clock SET t = '2026-10-26 10:00+00';
UPDATE public.characters SET energy = 100;
DELETE FROM public.driving_licenses;
INSERT INTO public.driving_licenses(character_id, license_at) VALUES ('00000000-0000-0000-0000-0000000000c1','2020-01-01');
INSERT INTO public.personal_assets(character_id,catalog_id,acquired_at,purchase_price) VALUES ('00000000-0000-0000-0000-0000000000c1','car','2026-10-20',20000);
SELECT pg_temp.ok((public.vehicle_wear_state()->'cars'->0->>'condition_pct')::int = 100, 'new car 100');
-- Trajet entre villes avec un flash : −4 −2 = 94, une seule fois
SELECT public.travel_drive_intercity('lyon','car') AS aid \gset
SELECT public.drive_report(:'aid', ARRAY[52, 100, 120, 50]);
SELECT public.drive_report(:'aid', ARRAY[52, 100, 120, 50]);
SELECT pg_temp.ok((SELECT condition_pct FROM public.vehicle_wear) = 94, 'intercity -6 once');
UPDATE public.activities SET status='completed' WHERE id = :'aid';
-- Trajet en ville : −1 (ou −3 si flashé)
INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,economy_payload) VALUES ('00000000-0000-0000-0000-0000000000c1','economy','Trajet','2026-10-26 15:00+00','2026-10-26 15:05+00','running','{"action":"travel","catalog_id":"car"}');
SELECT pg_temp.ok((SELECT condition_pct FROM public.vehicle_wear) IN (93, 91), 'city -1/-3');
UPDATE public.activities SET status='completed';
-- Panne sous 40 % : forcer un trajet qui tombe en panne
UPDATE public.vehicle_wear SET condition_pct = 30;
DO $$ DECLARE i int := 0; id uuid; BEGIN
  LOOP id := gen_random_uuid(); EXIT WHEN abs(hashtext(id::text || ':panne')) % 100 < 10; END LOOP;
  INSERT INTO public.activities(id,character_id,type,title,start_time,end_time,status) VALUES (id,'00000000-0000-0000-0000-0000000000c1','intercity_travel','V','2026-10-27 10:00+00','2026-10-27 12:00+00','running');
  INSERT INTO public.drive_trips(activity_id,character_id,catalog_id,from_city,to_city,segments,radars) VALUES (id,'00000000-0000-0000-0000-0000000000c1','car','paris','lyon','[]','[]');
  UPDATE public.drive_trips SET settled = true WHERE activity_id = id;
  UPDATE public.drive_trips SET settled = true WHERE activity_id = id;
  UPDATE public.activities SET status='completed' WHERE id = id;
END $$;
SELECT pg_temp.ok((SELECT count(*) FROM public.transport_ledger WHERE kind='depannage' AND amount=120) = 1, 'tow 120 once');
SELECT pg_temp.ok((SELECT condition_pct FROM public.vehicle_wear) = 26, 'breakdown trip -4');
-- 0 % : départ refusé
UPDATE public.vehicle_wear SET condition_pct = 0; UPDATE public.transport_profiles SET debt = 0;
SELECT pg_temp.err($$INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,economy_payload) VALUES ('00000000-0000-0000-0000-0000000000c1','economy','T','2026-10-28 15:00+00','2026-10-28 15:05+00','running','{"action":"travel","catalog_id":"car"}')$$, 'blocked at 0');
SELECT pg_temp.err($$SELECT public.travel_drive_intercity('lyon','car')$$, 'intercity blocked at 0');
-- Réparation garage fictif à 45 % : 6 tranches × 300 € = 1 800 €
UPDATE public.vehicle_wear SET condition_pct = 45;
SELECT pg_temp.ok((public.vehicle_wear_state()->'cars'->0->>'repair_ref')::int = 1800, 'ref 1800');
SELECT public.vehicle_repair('car', NULL, '00000000-0000-0000-0000-0000000000f1');
SELECT public.vehicle_repair('car', NULL, '00000000-0000-0000-0000-0000000000f1');
SELECT pg_temp.ok((SELECT condition_pct FROM public.vehicle_wear) = 100 AND (SELECT count(*) FROM public.cash WHERE amount = -1800) = 1, 'repaired, paid once');
SELECT pg_temp.err($$SELECT public.vehicle_repair('car', NULL, gen_random_uuid())$$, 'already perfect');
-- Garage d'un joueur : tarif 80 %, argent dans sa caisse
UPDATE public.vehicle_wear SET condition_pct = 85;
SELECT pg_temp.ok(jsonb_array_length(public.vehicle_wear_state()->'garages') = 1, 'player garage listed');
SELECT public.vehicle_repair('car', '00000000-0000-0000-0000-0000000000b1', gen_random_uuid());
SELECT pg_temp.ok((SELECT amount FROM public.biz_cash) = 480, 'player garage 2x300x80%');
ROLLBACK;
SELECT 'vehicle wear OK';
