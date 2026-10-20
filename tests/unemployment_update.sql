-- Run only on the isolated unemployment_fixture database after 0092.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.paid() RETURNS integer LANGUAGE sql AS $$ SELECT count(*)::integer FROM public.cash WHERE key LIKE 'career:chomage:%' $$;
INSERT INTO public.characters VALUES ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000e1','En recherche');
INSERT INTO public.career_ledger(character_id,key,kind,payload,created_at) VALUES ('00000000-0000-0000-0000-0000000000c1','licenciement:x','licenciement','{"job":"Caissier","salary":1733}','2026-10-20 08:00:00+00');
SET LOCAL test.uid = '00000000-0000-0000-0000-0000000000e1';

UPDATE public.fake_clock SET t='2026-11-10 09:00:00+00';
SELECT public.unemployment_state();
SELECT pg_temp.ok(pg_temp.paid() = 0, 'nothing paid before actualisation');
SELECT pg_temp.ok(public.unemployment_declare('00000000-0000-0000-0000-000000000101', true, false) = '2026-10', 'declares October until the 15th');
SELECT pg_temp.ok(pg_temp.paid() = 1, 'October week paid after declaration: '||pg_temp.paid());
SELECT pg_temp.ok((SELECT amount FROM public.cash LIMIT 1) = 228, 'amount unchanged (57 % weekly)');
SELECT pg_temp.ok(public.unemployment_declare('00000000-0000-0000-0000-000000000101', true, false) = '2026-10', 'same request is idempotent');
DO $$ BEGIN PERFORM public.unemployment_declare('00000000-0000-0000-0000-000000000102', true, false); RAISE EXCEPTION 'x'; EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%déjà actualisé%' THEN RAISE; END IF; END $$;

UPDATE public.fake_clock SET t='2026-11-20 09:00:00+00';
DO $$ BEGIN PERFORM public.unemployment_declare('00000000-0000-0000-0000-000000000103', true, false); RAISE EXCEPTION 'x'; EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%fermée%' THEN RAISE; END IF; END $$;

UPDATE public.fake_clock SET t='2026-11-29 09:00:00+00';
SELECT pg_temp.ok(public.unemployment_declare('00000000-0000-0000-0000-000000000104', true, false) = '2026-11', 'November opens on the 28th');
SELECT pg_temp.ok(pg_temp.paid() = 6, 'October + 4 November weeks + 0: '||pg_temp.paid());

-- Décembre oublié : radiation du mois
UPDATE public.fake_clock SET t='2027-01-16 09:00:00+00';
SELECT public.unemployment_state();
SELECT pg_temp.ok(pg_temp.paid() = 6, 'December weeks lost: '||pg_temp.paid());
DO $$ BEGIN PERFORM public.unemployment_declare('00000000-0000-0000-0000-000000000105', true, false); RAISE EXCEPTION 'x'; EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%fermée%' THEN RAISE; END IF; END $$;

-- Plus en recherche : pas d'allocation pour janvier
UPDATE public.fake_clock SET t='2027-01-30 09:00:00+00';
SELECT public.unemployment_declare('00000000-0000-0000-0000-000000000106', false, false);
SELECT pg_temp.ok(pg_temp.paid() = 6, 'not searching means no January payment');

-- Avec un emploi, pas d'actualisation
INSERT INTO public.employments VALUES ('00000000-0000-0000-0000-0000000000c1', gen_random_uuid(), '2027-01-30 09:00:00+00');
DO $$ BEGIN PERFORM public.unemployment_declare('00000000-0000-0000-0000-000000000107', true, false); RAISE EXCEPTION 'x'; EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%emploi%' THEN RAISE; END IF; END $$;

SELECT pg_temp.ok(NOT has_function_privilege('anon','public.unemployment_state()','EXECUTE'), 'anon refused');
SELECT pg_temp.ok(NOT has_function_privilege('authenticated','public.unemployment_week_ok(uuid,timestamptz)','EXECUTE'), 'helper private');
ROLLBACK;
SELECT 'unemployment OK';
