-- Run on the isolated fixture after student_fixture + 0099.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.err(q text, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'should refuse: %', m; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'should refuse%' THEN RAISE; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.cash;
UPDATE public.fake_clock SET t = '2026-10-27 10:00+00';
UPDATE public.accounts SET balance = 5000;
SELECT public.student_state();
-- Profil fixé : moyenne 12, revenus 20 000 € -> échelon 5
UPDATE public.student_profiles SET hs_average = 12, family_income = 20000, scholarship_level = 5;
-- Vœux : 16 ans refusé
UPDATE public.characters SET age = 16 WHERE id='00000000-0000-0000-0000-0000000000c1';
SELECT pg_temp.err($$SELECT public.student_wish('lic-droit')$$, 'too young');
UPDATE public.characters SET age = 18 WHERE id='00000000-0000-0000-0000-0000000000c1';
SELECT public.student_wish('lic-droit'); SELECT public.student_wish('but-info'); SELECT public.student_wish('iep'); SELECT public.student_wish('but-gea');
SELECT pg_temp.err($$SELECT public.student_accept('lic-droit')$$, 'no answer yet');
UPDATE public.fake_clock SET t = '2026-10-31 10:00+00';
SELECT public.student_state();
SELECT pg_temp.ok((SELECT answer FROM public.student_wishes WHERE program_id='lic-droit')='oui' AND (SELECT answer FROM public.student_wishes WHERE program_id='but-info')='oui'
  AND (SELECT answer FROM public.student_wishes WHERE program_id='iep')='non' AND (SELECT answer FROM public.student_wishes WHERE program_id='but-gea')='oui', 'answers by grade');
UPDATE public.student_profiles SET hs_average = 11;
UPDATE public.student_wishes SET answer='attente_reponse' WHERE program_id='but-info';
SELECT public.student_state();
SELECT pg_temp.ok((SELECT answer FROM public.student_wishes WHERE program_id='but-info')='en_attente', 'waitlist within 1 point');
UPDATE public.student_profiles SET hs_average = 12;
SELECT public.student_accept('lic-droit');
SELECT pg_temp.ok((SELECT field_id FROM public.study_enrollments)='law' AND (SELECT answer FROM public.student_wishes WHERE program_id='but-info')='renoncee', 'accepted, others dropped');
-- Bourse échelon 5 : 460 €/mois dès novembre, pas en juillet/août ; une seule fois
SELECT public.student_room_request();
SELECT pg_temp.ok((SELECT status FROM public.student_rooms)='attribuee', 'scholar gets room');
UPDATE public.fake_clock SET t = '2026-12-02 10:00+00';
SELECT public.student_state(); SELECT public.student_state();
SELECT pg_temp.ok((SELECT count(*) FROM public.cash WHERE key LIKE 'student:bourse:%')=2 AND (SELECT amount FROM public.cash WHERE key='student:bourse:2026-11')=460, 'bourse nov+dec 460');
SELECT pg_temp.ok((SELECT amount FROM public.cash WHERE key='student:loyer:2026-11')=-250, 'rent 250');
-- Partiels : peu de travail -> année non validée, rattrapage en juin
UPDATE public.fake_clock SET t = '2027-05-20 10:00+00';
SELECT public.student_state();
SELECT pg_temp.ok((SELECT count(*) FROM public.student_ledger WHERE kind='partiel')=2 AND (SELECT retake_open FROM public.student_profiles), 'two sessions, retake open');
SELECT pg_temp.err($$SELECT public.student_retake()$$, 'retake only in june');
UPDATE public.study_enrollments SET progress = 400;
UPDATE public.fake_clock SET t = '2027-06-10 10:00+00';
SELECT public.student_retake();
SELECT pg_temp.ok((SELECT grade FROM public.student_ledger WHERE kind='rattrapage') >= 10, 'retake passed with work');
UPDATE public.fake_clock SET t = '2027-07-02 10:00+00';
SELECT public.student_state();
SELECT pg_temp.ok((SELECT year FROM public.student_profiles)=2 AND NOT EXISTS (SELECT 1 FROM public.cash WHERE key='student:bourse:2027-07'), 'year 2, no july bourse');
-- Années 2 et 3 bien travaillées -> diplôme
UPDATE public.study_enrollments SET progress = 900; UPDATE public.fake_clock SET t = '2028-07-02 10:00+00'; SELECT public.student_state();
UPDATE public.study_enrollments SET progress = 1400; UPDATE public.fake_clock SET t = '2029-07-02 10:00+00'; SELECT public.student_state();
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.student_ledger WHERE kind='diplome' AND label='Licence de droit obtenu') AND (SELECT program_id FROM public.student_profiles) IS NULL, 'diploma');
ROLLBACK;
SELECT 'student life tests OK';
