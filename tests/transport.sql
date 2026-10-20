-- Run on the isolated fixture after transport_fixture + 0097 (installed 2026-10).
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.err(q text, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'should refuse: %', m; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'should refuse%' THEN RAISE; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.cash; DELETE FROM public.personal_assets; DELETE FROM public.activities;
UPDATE public.fake_clock SET t = '2026-10-25 10:00+00';
-- Abonnement 86 €, moitié remboursée si emploi ; trajet couvert = ticket rendu
INSERT INTO public.employments VALUES ('00000000-0000-0000-0000-0000000000c1') ON CONFLICT DO NOTHING;
SELECT public.transit_buy_pass();
SELECT pg_temp.ok((SELECT amount FROM public.cash WHERE key='transport:abonnement:2026-10')=-86 AND (SELECT amount FROM public.cash WHERE key='transport:employeur:2026-10')=43, 'pass 86, employer 43');
SELECT public.transit_buy_pass();
SELECT pg_temp.ok((SELECT count(*) FROM public.transit_passes)=1, 'pass once');
INSERT INTO public.activities(id,character_id,type,title,start_time,end_time,status,money_cost) VALUES ('00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-0000000000c1','transport','Transport public','2026-10-25 10:00+00','2026-10-25 10:10+00','running',2);
SELECT pg_temp.ok((SELECT amount FROM public.cash WHERE key='transport:pass-ride:00000000-0000-0000-0000-00000000a001')=2, 'ride covered');
-- Sans ticket en novembre : ticket rendu, contrôle 1 fois sur 10 environ (50 €)
UPDATE public.fake_clock SET t = '2026-11-02 10:00+00';
SELECT public.transport_set_without_ticket(true);
INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,money_cost)
  SELECT '00000000-0000-0000-0000-0000000000c1','transport','Transport public','2026-11-02 10:00+00','2026-11-02 10:10+00','running',2 FROM generate_series(1,200);
SELECT pg_temp.ok((SELECT count(*) FROM public.cash WHERE key LIKE 'transport:no-ticket:%')=200, 'tickets not paid');
SELECT pg_temp.ok((SELECT count(*) FROM public.transport_ledger WHERE kind='amende_transport') BETWEEN 8 AND 35, 'about 1 in 10 controls');
SELECT pg_temp.ok((SELECT bool_and(amount=50) FROM public.transport_ledger WHERE kind='amende_transport'), 'fine 50');
-- Voiture : assurance 90 € (permis récent) dès novembre, contrôle technique dû 2 ans après
UPDATE public.driving_licenses SET license_at = '2026-10-01' WHERE character_id='00000000-0000-0000-0000-0000000000c1';
INSERT INTO public.driving_licenses(character_id, license_at) SELECT '00000000-0000-0000-0000-0000000000c1','2026-10-01' WHERE NOT EXISTS (SELECT 1 FROM public.driving_licenses WHERE character_id='00000000-0000-0000-0000-0000000000c1');
INSERT INTO public.personal_assets(character_id,catalog_id,acquired_at) VALUES ('00000000-0000-0000-0000-0000000000c1','car','2026-10-20');
UPDATE public.transport_profiles SET debt = 0;
SELECT public.transport_state();
SELECT pg_temp.ok((SELECT amount FROM public.transport_ledger WHERE key='assurance:2026-11')=90 AND NOT EXISTS (SELECT 1 FROM public.transport_ledger WHERE key='assurance:2026-10'), 'insurance young 90 from next month');
SELECT pg_temp.ok((SELECT due_at::date FROM public.vehicle_inspections)='2028-10-20' OR (SELECT due_at FROM public.vehicle_inspections) > '2028-10-01', 'CT due in 2 years');
SELECT pg_temp.err($$SELECT public.transport_inspect((SELECT id FROM public.personal_assets LIMIT 1))$$, 'CT too early');
-- Trajet voiture OK, puis bloqué si CT dépassé
INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,economy_payload) VALUES ('00000000-0000-0000-0000-0000000000c1','economy','Trajet — Clio','2026-11-02 11:00+00','2026-11-02 11:05+00','running','{"action":"travel","catalog_id":"car"}');
UPDATE public.vehicle_inspections SET due_at = '2026-11-01';
SELECT pg_temp.err($$INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,economy_payload) VALUES ('00000000-0000-0000-0000-0000000000c1','economy','Trajet — Clio','2026-11-02 12:00+00','2026-11-02 12:05+00','running','{"action":"travel","catalog_id":"car"}')$$, 'CT overdue blocks');
SELECT public.transport_inspect((SELECT id FROM public.personal_assets LIMIT 1));
SELECT pg_temp.ok((SELECT due_at FROM public.vehicle_inspections) > '2028-11-01' AND EXISTS (SELECT 1 FROM public.transport_ledger WHERE kind='controle_technique' AND amount=80), 'CT done 80');
-- Radar : environ 3 % des trajets, 135 € et 1 point ; reste dû -> voiture bloquée
UPDATE public.accounts SET balance = 0 WHERE character_id='00000000-0000-0000-0000-0000000000c1';
DO $$ BEGIN FOR i IN 1..300 LOOP
  BEGIN INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,economy_payload) VALUES ('00000000-0000-0000-0000-0000000000c1','economy','Trajet — Clio','2026-11-03 10:00+00','2026-11-03 10:05+00','running','{"action":"travel","catalog_id":"car"}');
  EXCEPTION WHEN raise_exception THEN EXIT; END; END LOOP; END $$;
SELECT pg_temp.ok((SELECT count(*) FROM public.transport_ledger WHERE kind='radar' AND amount=135)>=1, 'radar flashed');
SELECT pg_temp.ok((SELECT points_lost FROM public.transport_profiles)>=1 AND (SELECT debt FROM public.transport_profiles)>0, 'points lost, debt kept');
SELECT pg_temp.err($$INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,economy_payload) VALUES ('00000000-0000-0000-0000-0000000000c1','economy','Trajet — Clio','2026-11-03 12:00+00','2026-11-03 12:05+00','running','{"action":"travel","catalog_id":"car"}')$$, 'debt blocks car');
ROLLBACK;
SELECT 'transport tests OK';
