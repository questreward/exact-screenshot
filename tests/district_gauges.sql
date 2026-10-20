-- Run only on the isolated district_gauges_fixture database after 0091.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.v(d text, g text) RETURNS integer LANGUAGE sql AS $$ SELECT value FROM public.district_gauges WHERE district_id=d AND gauge=g $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';

SELECT public.district_gauges_state('paris');
SELECT pg_temp.ok(pg_temp.v('D1','cadre') = 50, 'starts at 50, old facts ignored');

-- Travaux terminés +8, appliqué une seule fois
INSERT INTO public.public_decisions VALUES (gen_random_uuid(),'Parc','paris',NULL,'00000000-0000-0000-0000-0000000000a1','completed','2026-10-20 08:00:00+00');
SELECT public.district_gauges_state('paris'); SELECT public.district_gauges_state('paris');
SELECT pg_temp.ok(pg_temp.v('D1','cadre') = 58, 'works +8 once');
SELECT pg_temp.ok(pg_temp.v('D2','cadre') = 50, 'other district untouched');

-- Crise : -15 puis +10
INSERT INTO public.crises VALUES ('00000000-0000-0000-0000-0000000000c1','paris','D1','urgence','2026-10-20 08:00:00+00',NULL);
SELECT public.district_gauges_state('paris');
SELECT pg_temp.ok(pg_temp.v('D1','tranquillite') = 35, 'crisis -15');
UPDATE public.crises SET status='terminee', closed_at='2026-10-20 08:00:00+00';
SELECT public.district_gauges_state('paris');
SELECT pg_temp.ok(pg_temp.v('D1','tranquillite') = 45, 'crisis end +10');

-- Événements : +3 chacun, plafond 12 par semaine ; privés ignorés
INSERT INTO public.events SELECT gen_random_uuid(),'Fête '||i,'00000000-0000-0000-0000-0000000000a1',NULL,'published','2026-10-20 08:00:00+00' FROM generate_series(1,6) i;
INSERT INTO public.events VALUES (gen_random_uuid(),'Privé','00000000-0000-0000-0000-0000000000a2',gen_random_uuid(),'published','2026-10-20 08:00:00+00');
SELECT public.district_gauges_state('paris');
SELECT pg_temp.ok(pg_temp.v('D1','animation') = 62, 'events capped at +12');
SELECT pg_temp.ok(pg_temp.v('D2','animation') = 50, 'personal event ignored');

-- Deux semaines passent : semaine 0 et 1 réglées
INSERT INTO public.public_issues VALUES (gen_random_uuid(),'D2','00000000-0000-0000-0000-0000000000a2','reported',5),(gen_random_uuid(),'D2','00000000-0000-0000-0000-0000000000a2','reported',3);
UPDATE public.fake_clock SET t = '2026-11-03 09:00:00+00';
SELECT public.district_gauges_state('paris'); SELECT public.district_gauges_state('paris');
-- D1 animation : s0 a des événements → pas de -2, dérive -1 ; s1 sans événement → -2 puis -1 → 62-1-2-1 = 58
SELECT pg_temp.ok(pg_temp.v('D1','animation') = 58, 'quiet week and drift: '||pg_temp.v('D1','animation'));
-- D2 cadre : 1 signalement grave/semaine (-1) puis dérive +1 → 50
SELECT pg_temp.ok(pg_temp.v('D2','cadre') = 50, 'issue penalty then drift: '||pg_temp.v('D2','cadre'));
SELECT pg_temp.ok((SELECT count(*) FROM public.district_gauge_log WHERE effect_key LIKE 'wk-iss:D2:%') = 2, 'one issue entry per week');
-- D2 animation : 50 → -2 → 48 → +1 dérive → 49, deux fois → 48
SELECT pg_temp.ok(pg_temp.v('D2','animation') = 48, 'D2 animation '||pg_temp.v('D2','animation'));

-- Accès
SET LOCAL test.uid = '';
DO $$ BEGIN PERFORM public.district_gauges_state('paris'); RAISE EXCEPTION 'should refuse'; EXCEPTION WHEN raise_exception THEN IF SQLERRM = 'should refuse' THEN RAISE; END IF; END $$;
SELECT pg_temp.ok(NOT has_function_privilege('anon','public.district_gauges_state(text)','EXECUTE'), 'anon refused');
SELECT pg_temp.ok(NOT has_function_privilege('authenticated','public.district_gauges_settle(text)','EXECUTE'), 'settle not public');
ROLLBACK;
SELECT 'district_gauges OK';
