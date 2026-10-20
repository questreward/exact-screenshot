-- Run on the isolated security_careers fixture after 0093 and 0094.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.err(q text, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'should refuse: %', m; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'should refuse%' THEN RAISE; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';

-- Infirmier : 21 ans requis (personnage de 20 ans)
SELECT pg_temp.err($$SELECT public.security_apply('samu_infirmier','garde_jour','{}',gen_random_uuid())$$, 'nurse at 20');
-- Gendarmerie : questions propres, 20/20 à l'écrit
SELECT public.security_apply('gendarmerie','matin','{"g1":1,"g2":0,"g3":1,"g4":0}',gen_random_uuid());
SELECT pg_temp.ok((SELECT written FROM public.security_exams ORDER BY taken_at DESC LIMIT 1)=20, 'gendarmerie written 20');
SELECT pg_temp.ok((SELECT situation FROM public.characters WHERE id='00000000-0000-0000-0000-0000000000c1')='Élève gendarme', 'élève gendarme');
-- Police inchangée : ses propres questions
SELECT pg_temp.ok((SELECT count(*) FROM public.security_exam_questions WHERE service='police')=4, 'police questions kept');

-- Fin de formation (28 j) puis cycle 5/2 : jour 5 = repos, jour 0 = travail à 5h
UPDATE public.fake_clock SET t = '2026-11-21 05:00:00+00'; -- trained_at + 5 jours
SELECT public.security_state();
SELECT pg_temp.ok((SELECT status FROM public.security_careers WHERE character_id='00000000-0000-0000-0000-0000000000c1')='service', 'trained');
SELECT pg_temp.err($$SELECT public.security_start_shift(gen_random_uuid())$$, 'gendarme rest day');
UPDATE public.fake_clock SET t = '2026-11-23 05:00:00+00'; -- +7 jours : travail
SELECT public.security_start_shift(gen_random_uuid());
SELECT pg_temp.ok((SELECT 'gendarmerie' = ANY(m.services) FROM public.security_shifts s JOIN public.security_missions m ON m.id=s.mission_id), 'gendarmerie mission');
SELECT pg_temp.ok((SELECT amount FROM public.cash WHERE key LIKE 'security-paie:%' LIMIT 1)=323, 'training 1400 -> 323/week');

-- Ambulancier sans concours dès 18 ans (personnage 2 a 16 ans -> refusé)
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000002';
SELECT pg_temp.err($$SELECT public.security_apply('samu_ambulancier','garde_jour','{}',gen_random_uuid())$$, 'ambulancier at 16');
ROLLBACK;
SELECT 'security_careers wave2 OK';
