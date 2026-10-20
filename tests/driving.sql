-- Run on the isolated fixture after driving_fixture + 0098.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.err(q text, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'should refuse: %', m; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'should refuse%' THEN RAISE; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.cash; DELETE FROM public.personal_assets; DELETE FROM public.activities; DELETE FROM public.transport_ledger; DELETE FROM public.vehicle_inspections;
UPDATE public.transport_profiles SET debt = 0, points_lost = 0;
UPDATE public.fake_clock SET t = '2026-10-26 10:00+00';
UPDATE public.characters SET energy = 100;
INSERT INTO public.personal_assets(character_id,catalog_id,acquired_at) VALUES ('00000000-0000-0000-0000-0000000000c1','car','2026-10-20');
-- Sans permis : refusé
DELETE FROM public.driving_licenses;
SELECT pg_temp.err($$SELECT public.travel_drive_intercity('lyon','car')$$, 'no license');
INSERT INTO public.driving_licenses(character_id, license_at) VALUES ('00000000-0000-0000-0000-0000000000c1','2020-01-01');
-- Départ : 85 % de 240 min = 204 min, carburant 31 €, 4 radars
SELECT public.travel_drive_intercity('lyon','car') AS aid \gset
SELECT pg_temp.ok((SELECT end_time - start_time FROM public.activities WHERE id = :'aid') = interval '204 minutes', 'duration 204');
SELECT pg_temp.ok((SELECT amount FROM public.cash WHERE key = 'drive_fuel:' || :'aid') = -31, 'fuel 31');
SELECT pg_temp.ok((SELECT jsonb_array_length(radars) FROM public.drive_trips) = 4, '4 radars');
SELECT pg_temp.ok(public.drive_state()->'trip'->>'kind' = 'voiture', 'state voiture');
-- Relevé : 52 en ville toléré, 100 sur départementale (90) = flash ; une seule fois
SELECT public.drive_report(:'aid', ARRAY[52, 100, 120, 50]);
SELECT pg_temp.ok((SELECT count(*) FROM public.transport_ledger WHERE kind='radar' AND amount=135) = 1 AND (SELECT points_lost FROM public.transport_profiles)=1, 'one flash, 1 point');
SELECT public.drive_report(:'aid', ARRAY[200, 200, 200, 200]);
SELECT pg_temp.ok((SELECT count(*) FROM public.transport_ledger WHERE kind='radar') = 1, 'report once');
SELECT pg_temp.err($$SELECT public.travel_drive_intercity('lyon','car')$$, 'already travelling');
-- Arrivée sans relevé : risque habituel une seule fois, trajet clos
UPDATE public.activities SET status='completed' WHERE id = :'aid';
INSERT INTO public.activities(id,character_id,type,title,start_time,end_time,status) VALUES ('00000000-0000-0000-0000-00000000d002','00000000-0000-0000-0000-0000000000c1','intercity_travel','Voyage en voiture vers Lyon','2026-10-26 15:00+00','2026-10-26 18:00+00','running');
INSERT INTO public.drive_trips(activity_id,character_id,catalog_id,from_city,to_city,segments,radars) VALUES ('00000000-0000-0000-0000-00000000d002','00000000-0000-0000-0000-0000000000c1','car','paris','lyon','[]','[{"at":5,"limit":50}]');
UPDATE public.activities SET status='completed' WHERE id = '00000000-0000-0000-0000-00000000d002';
SELECT pg_temp.ok((SELECT settled AND mode='automatique' FROM public.drive_trips WHERE activity_id='00000000-0000-0000-0000-00000000d002'), 'auto settled on arrival');
SELECT pg_temp.err($$SELECT public.drive_report('00000000-0000-0000-0000-00000000d002', ARRAY[200])$$ , 'no-op after settle') ;
ROLLBACK;
SELECT 'driving tests OK';
