-- Run only on the isolated security_careers_fixture database after 0093.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.err(q text, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'should refuse: %', m; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'should refuse%' THEN RAISE; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';

-- Âge : 16 ans refusé dans la police, accepté chez les volontaires
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000002';
SELECT pg_temp.err($$SELECT public.security_apply('police','matin','{}',gen_random_uuid())$$, 'police at 16');
SELECT public.security_apply('pompier_vol','disponible','{}',gen_random_uuid());
SELECT pg_temp.ok((SELECT status FROM public.security_careers WHERE character_id='00000000-0000-0000-0000-0000000000c2')='formation', 'volunteer in training');
SELECT pg_temp.ok((SELECT situation FROM public.characters WHERE id='00000000-0000-0000-0000-0000000000c2')='Lycéen', 'volunteer keeps situation');

-- Concours police : mauvaises réponses = échec, puis attente de 30 jours
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';
SELECT public.security_apply('police','matin','{"p1":2,"p2":0,"p3":0,"p4":0}','00000000-0000-0000-0000-00000000e001');
SELECT pg_temp.ok(NOT (SELECT passed FROM public.security_exams WHERE request_id='00000000-0000-0000-0000-00000000e001'), 'fail with wrong answers');
SELECT pg_temp.ok((SELECT energy FROM public.characters WHERE id='00000000-0000-0000-0000-0000000000c1')=80, 'exam costs 20 energy');
SELECT public.security_apply('police','matin','{}','00000000-0000-0000-0000-00000000e001'); -- même requête : sans effet
SELECT pg_temp.ok((SELECT count(*) FROM public.security_exams WHERE character_id='00000000-0000-0000-0000-0000000000c1')=1, 'idempotent');
SELECT pg_temp.err($$SELECT public.security_apply('police','matin','{}',gen_random_uuid())$$, 'retry too early');
UPDATE public.fake_clock SET t = '2026-11-23 05:00:00+00'; -- lundi, 35 jours plus tard
SELECT public.security_apply('police','matin','{"p1":0,"p2":1,"p3":1,"p4":1}',gen_random_uuid());
SELECT pg_temp.ok((SELECT written FROM public.security_exams ORDER BY taken_at DESC LIMIT 1)=20, 'written 20/20');
SELECT pg_temp.ok((SELECT status FROM public.security_careers WHERE character_id='00000000-0000-0000-0000-0000000000c1')='formation', 'police training');
SELECT pg_temp.ok((SELECT situation FROM public.characters WHERE id='00000000-0000-0000-0000-0000000000c1')='Élève gardien de la paix', 'situation set');
SELECT pg_temp.err($$SELECT public.security_start_shift(gen_random_uuid())$$, 'no shift in training');

-- 4 semaines plus tard : formation finie, 4 semaines payées 335 € (1450*12/52)
UPDATE public.fake_clock SET t = '2026-12-21 05:00:00+00';
SELECT public.security_state();
SELECT pg_temp.ok((SELECT status||rank FROM public.security_careers WHERE character_id='00000000-0000-0000-0000-0000000000c1')='service1', 'gardien after training');
SELECT pg_temp.ok((SELECT count(*) FROM public.cash WHERE key LIKE 'security-paie:%' AND amount=335)=4, 'training pay x4: '||(SELECT string_agg(key||'='||amount,',') FROM public.cash));
SELECT public.security_state();
SELECT pg_temp.ok((SELECT count(*) FROM public.cash WHERE key LIKE 'security-paie:%')=4, 'pay once');

-- Horaires : équipe du matin (5h ±1) ; 10h refusé
UPDATE public.fake_clock SET t = '2026-12-21 10:00:00+00';
SELECT pg_temp.err($$SELECT public.security_start_shift(gen_random_uuid())$$, 'wrong hour');
UPDATE public.fake_clock SET t = '2026-12-21 05:30:00+00';
UPDATE public.characters SET energy = 100 WHERE id='00000000-0000-0000-0000-0000000000c1';
INSERT INTO public.public_issues VALUES ('paris','reported',4);
SELECT public.security_start_shift('00000000-0000-0000-0000-00000000a001');
SELECT pg_temp.ok((SELECT energy FROM public.characters WHERE id='00000000-0000-0000-0000-0000000000c1')=70, '8h shift costs 30');
SELECT pg_temp.ok((SELECT count(*) FROM public.activities WHERE type='security_shift' AND status='running')=1, 'agenda activity');
SELECT pg_temp.ok((SELECT 'police' = ANY(m.services) FROM public.security_shifts s JOIN public.security_missions m ON m.id=s.mission_id), 'police mission');
SELECT public.security_choose((SELECT id FROM public.security_shifts LIMIT 1), (SELECT m.choices->0->>'id' FROM public.security_shifts s JOIN public.security_missions m ON m.id=s.mission_id));
SELECT pg_temp.ok((SELECT outcome IS NOT NULL FROM public.security_shifts LIMIT 1), 'outcome chosen');
SELECT pg_temp.err($$SELECT public.security_choose((SELECT id FROM public.security_shifts LIMIT 1),'zzz')$$, 'unknown choice ignored? no: already chosen returns state');
-- Repos de 11 h obligatoire
UPDATE public.fake_clock SET t = '2026-12-21 13:40:00+00';
SELECT public.security_state();
SELECT pg_temp.ok((SELECT missions_total FROM public.security_careers WHERE character_id='00000000-0000-0000-0000-0000000000c1')=1, 'mission counted once');
SELECT public.security_state();
SELECT pg_temp.ok((SELECT missions_total FROM public.security_careers WHERE character_id='00000000-0000-0000-0000-0000000000c1')=1, 'not twice');

-- Cycle 4/2 : jours 4 et 5 après la fin de formation = repos
UPDATE public.fake_clock SET t = '2026-12-25 05:00:00+00';
SELECT pg_temp.err($$SELECT public.security_start_shift(gen_random_uuid())$$, 'rest day');

-- Semaine travaillée payée au grade Gardien (1950 -> 450 €)
UPDATE public.fake_clock SET t = '2026-12-29 05:00:00+00';
SELECT public.security_state();
SELECT pg_temp.ok((SELECT amount FROM public.cash WHERE key LIKE 'security-paie:%2026-12-21')=450 OR (SELECT outcome FROM public.security_shifts LIMIT 1)='blessure', 'worked week paid 450');

-- Volontaire : en journée de semaine refusé
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000002';
SELECT public.security_state();
SELECT pg_temp.err($$SELECT public.security_start_shift(gen_random_uuid())$$, 'volunteer weekday daytime');
UPDATE public.fake_clock SET t = '2026-12-29 19:00:00+00';
SELECT public.security_start_shift('00000000-0000-0000-0000-00000000b001');
UPDATE public.fake_clock SET t = '2026-12-29 23:30:00+00';
SELECT public.security_state();
SELECT pg_temp.ok((SELECT amount FROM public.cash WHERE key LIKE 'security-vac:%')=36, 'volunteer 4h x 9 €');
SELECT pg_temp.ok((SELECT amount FROM public.civic WHERE key LIKE 'security-shift:%')=2, 'civic +2');
SELECT pg_temp.ok((SELECT outcome FROM public.security_shifts WHERE request_id='00000000-0000-0000-0000-00000000b001')='equipe', 'no choice = team handled');

-- Quitter
SELECT public.security_quit();
SELECT pg_temp.ok((SELECT status FROM public.security_careers WHERE character_id='00000000-0000-0000-0000-0000000000c2')='quitte', 'quit');

-- Accès
SET LOCAL test.uid = '';
SELECT pg_temp.ok(NOT has_function_privilege('anon','public.security_state()','EXECUTE'), 'anon refused');
SELECT pg_temp.ok(NOT has_function_privilege('authenticated','public.security_settle(uuid)','EXECUTE'), 'settle private');
SELECT pg_temp.ok(NOT has_table_privilege('authenticated','public.security_exam_questions','SELECT'), 'answers hidden');
ROLLBACK;
SELECT 'security_careers OK';
