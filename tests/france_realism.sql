-- Run on the isolated fixture after 0095.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.err(q text, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'should refuse: %', m; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'should refuse%' THEN RAISE; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';

-- Calendrier : Pâques 2027 = 28 mars ; lundi de Pâques, Ascension, Pentecôte, 14 juillet fériés
SELECT pg_temp.ok(public.fr_easter(2027) = '2027-03-28', 'easter 2027');
SELECT pg_temp.ok(public.fr_easter(2026) = '2026-04-05', 'easter 2026');
SELECT pg_temp.ok(public.fr_is_holiday('2027-03-29') AND public.fr_is_holiday('2027-05-06') AND public.fr_is_holiday('2027-05-17') AND public.fr_is_holiday('2026-07-14'), 'holidays');
SELECT pg_temp.ok(NOT public.fr_is_holiday('2026-10-20'), 'ordinary day');
-- Jour férié : cours refusé, travail payé double ; jour normal inchangé
INSERT INTO public.life_rules VALUES ('course','Cours',60,0,0,0,0,'{}'),('work','Travail',240,0,0,0,0,'{}');
SELECT pg_temp.err($$INSERT INTO public.activities(character_id,type,title,start_time,end_time,status) VALUES('00000000-0000-0000-0000-0000000000c1','course','Cours','2026-11-11 09:00+00','2026-11-11 10:00+00','running')$$, 'course on holiday');
INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,reward) VALUES('00000000-0000-0000-0000-0000000000c1','work','Vendeur','2026-11-11 09:00+00','2026-11-11 13:00+00','running',80);
SELECT pg_temp.ok((SELECT reward FROM public.activities WHERE type='work' AND start_time='2026-11-11 09:00+00')=160, 'double pay');
INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,reward) VALUES('00000000-0000-0000-0000-0000000000c1','work','Vendeur','2026-11-12 09:00+00','2026-11-12 13:00+00','planned',80);
UPDATE public.activities SET status='running' WHERE start_time='2026-11-12 09:00+00';
SELECT pg_temp.ok((SELECT reward FROM public.activities WHERE start_time='2026-11-12 09:00+00')=80, 'normal day unchanged');
UPDATE public.activities SET status='completed' WHERE type='work';
SELECT pg_temp.ok((SELECT reward FROM public.activities WHERE start_time='2026-11-11 09:00+00')=160, 'not doubled twice');

-- Bulletins : vacations regroupées par mois
SELECT pg_temp.ok((SELECT (m->>'net')::int FROM jsonb_array_elements(public.payslips_state()->'months') m WHERE m->>'employer'='Vendeur')=240, 'payslip net 240');

-- Médecin traitant : sans médecin 30 %, avec 70 %, après 3 jours, une seule fois
UPDATE public.fake_clock SET t = '2026-10-20 10:00+00';
INSERT INTO public.health_log VALUES ('00000000-0000-0000-0000-0000000000c1','2026-10-20','medecin','2026-10-20 10:00+00');
SELECT public.medical_state();
SELECT pg_temp.ok((SELECT count(*) FROM public.medical_refunds)=0, 'refund waits 3 days');
SELECT pg_temp.ok(jsonb_array_length(public.medical_state()->'doctors')=3, '3 doctors in city');
SELECT public.medical_choose_doctor('paris-dr1');
SELECT pg_temp.err($$SELECT public.medical_choose_doctor('paris-dr2')$$, 'change too soon');
SELECT pg_temp.err($$SELECT public.medical_choose_doctor('lyon-dr1')$$, 'other city');
INSERT INTO public.health_log VALUES ('00000000-0000-0000-0000-0000000000c1','2026-10-21','medecin','2026-10-21 10:00+00');
UPDATE public.fake_clock SET t = '2026-10-24 10:00+00';
SELECT public.medical_state(); SELECT public.medical_state();
SELECT pg_temp.ok((SELECT amount FROM public.medical_refunds WHERE consult_day='2026-10-20')=18, 'with doctor chosen same day: 70% of 25 = 18');
SELECT pg_temp.ok((SELECT amount FROM public.medical_refunds WHERE consult_day='2026-10-21')=18, '70%');
SELECT pg_temp.ok((SELECT count(*) FROM public.cash WHERE key LIKE 'medical-refund:%')=2, 'paid once each');

-- Permis : voiture refusée sans permis, objet ordinaire accepté
SELECT pg_temp.err($$INSERT INTO public.personal_assets VALUES('00000000-0000-0000-0000-0000000000c1','car')$$, 'car without license');
INSERT INTO public.personal_assets VALUES('00000000-0000-0000-0000-0000000000c1','phone');
-- Parcours : inscription 30 €, code 7/10, 20 leçons, examen
SELECT pg_temp.err($$SELECT public.driving_lesson(gen_random_uuid())$$, 'lesson before code');
SELECT public.driving_register('00000000-0000-0000-0000-00000000d001');
SELECT public.driving_register('00000000-0000-0000-0000-00000000d001');
SELECT pg_temp.ok((SELECT amount FROM public.cash WHERE key='driving:00000000-0000-0000-0000-00000000d001')=-30, 'fee 30 once');
SELECT public.driving_code('{"c01":0,"c02":0,"c03":1}', gen_random_uuid());
SELECT pg_temp.ok((SELECT code_passed_at IS NULL FROM public.driving_licenses), 'code failed');
SELECT pg_temp.err($$SELECT public.driving_code('{}', gen_random_uuid())$$, 'one code try per day');
UPDATE public.fake_clock SET t = '2026-10-25 10:00+00';
SELECT public.driving_code('{"c01":1,"c02":1,"c03":0,"c04":1,"c05":1,"c06":1,"c07":0,"c08":0,"c09":0}', gen_random_uuid());
SELECT pg_temp.ok((SELECT code_passed_at IS NOT NULL FROM public.driving_licenses), 'code 7/10 passed');
SELECT public.driving_lesson(gen_random_uuid()); SELECT public.driving_lesson(gen_random_uuid());
SELECT pg_temp.err($$SELECT public.driving_lesson(gen_random_uuid())$$, '2 lessons per day');
SELECT pg_temp.err($$SELECT public.driving_exam(gen_random_uuid())$$, 'exam needs 20 lessons');
UPDATE public.driving_licenses SET lessons = 30;
-- 30 leçons : 55 + 3*10 = 85 % ; on boucle jusqu'à réussite en respectant 7 jours
DO $$ DECLARE i int := 0; BEGIN
  WHILE NOT public.has_driving_license('00000000-0000-0000-0000-0000000000c1') AND i < 20 LOOP
    PERFORM public.driving_exam(gen_random_uuid()); UPDATE public.fake_clock SET t = t + interval '8 days'; i := i + 1; END LOOP;
  IF NOT public.has_driving_license('00000000-0000-0000-0000-0000000000c1') THEN RAISE EXCEPTION 'license never obtained'; END IF; END $$;
INSERT INTO public.personal_assets VALUES('00000000-0000-0000-0000-0000000000c1','car');

-- Ambulancier : permis exigé (personnage 2 n'a pas le permis, mais 16 ans -> âge refusé d'abord ; on teste le déclencheur directement)
SELECT pg_temp.err($$INSERT INTO public.security_careers(character_id,service,status,team,joined_at,trained_at) VALUES('00000000-0000-0000-0000-0000000000c2','samu_ambulancier','formation','garde_jour',now(),now())$$, 'ambulance without license');
-- Personnage 1 (permis) : accepté
UPDATE public.characters SET energy = 100 WHERE id='00000000-0000-0000-0000-0000000000c1';
SELECT public.security_apply('samu_ambulancier','garde_jour','{}',gen_random_uuid());
SELECT pg_temp.ok((SELECT service FROM public.security_careers WHERE character_id='00000000-0000-0000-0000-0000000000c1')='samu_ambulancier', 'ambulance with license');

-- Accès
SET LOCAL test.uid = '';
SELECT pg_temp.ok(NOT has_function_privilege('anon','public.driving_state()','EXECUTE'), 'anon refused');
SELECT pg_temp.ok(NOT has_function_privilege('authenticated','public.medical_settle(uuid)','EXECUTE'), 'settle private');
SELECT pg_temp.ok(NOT has_table_privilege('authenticated','public.driving_questions','SELECT'), 'answers hidden');
ROLLBACK;
SELECT 'france_realism OK';
