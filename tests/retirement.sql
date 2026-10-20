-- Run on the isolated fixture after retirement_fixture + 0102.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.err(q text, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'should refuse: %', m; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'should refuse%' THEN RAISE; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';
SELECT public.retirement_state();
SELECT pg_temp.ok((SELECT last_age FROM public.retirement_profiles) = 20, 'starts now at 20');
-- 6 mois de jeu à 1 560 € net/mois = 1 an d'âge ; brut 2 000 €/mois -> 24 000 €/an, 4 trimestres
INSERT INTO public.activities SELECT '00000000-0000-0000-0000-0000000000c1','work','completed',1560, '2026-10-15 10:00+00'::timestamptz + n * interval '1 month' FROM generate_series(0,5) n;
UPDATE public.fake_clock SET t = '2027-04-01 10:00+00';
UPDATE public.character_aging SET anchor_at = now() - interval '1 month 1 day';
SELECT public.retirement_state() AS s \gset
SELECT pg_temp.ok((SELECT gross_annual BETWEEN 23500 AND 24500 AND quarters = 4 FROM public.retirement_years WHERE age = 20), 'annualized gross, 4 quarters');
SELECT public.retirement_state();
SELECT pg_temp.ok((SELECT count(*) FROM public.retirement_years) = 1, 'once');
-- Petit salaire : 300 € net/mois -> ~4 600 €/an -> 2 trimestres
INSERT INTO public.activities SELECT '00000000-0000-0000-0000-0000000000c1','work','completed',300, '2027-04-15 10:00+00'::timestamptz + n * interval '1 month' FROM generate_series(0,5) n;
UPDATE public.fake_clock SET t = '2027-10-01 10:00+00';
UPDATE public.character_aging SET anchor_at = now() - interval '2 months 1 day';
SELECT public.retirement_state();
SELECT pg_temp.ok((SELECT quarters FROM public.retirement_years WHERE age = 21) = 2, 'small salary 2 quarters');
-- Trop jeune
SELECT pg_temp.err($$SELECT public.retirement_claim()$$, 'too young');
-- 64 ans, 172 trimestres à 24 000 € : base 12 000 €/an = 1 000 €/mois
DELETE FROM public.retirement_years;
INSERT INTO public.retirement_years SELECT '00000000-0000-0000-0000-0000000000c1', g, now(), now(), 24000, 4, 73.68 FROM generate_series(21, 63) g;
UPDATE public.characters SET age = 64; UPDATE public.character_aging SET base_age = 64, anchor_at = now(); UPDATE public.retirement_profiles SET last_age = 64;
INSERT INTO public.employments VALUES ('00000000-0000-0000-0000-0000000000c1');
SELECT pg_temp.err($$SELECT public.retirement_claim()$$, 'must quit job');
DELETE FROM public.employments;
SELECT public.retirement_claim();
SELECT pg_temp.ok((SELECT monthly_pension FROM public.retirement_profiles) BETWEEN 1370 AND 1390, 'pension base 1000 + compl ~380');
-- Pension versée chaque mois, une seule fois
UPDATE public.fake_clock SET t = '2027-12-05 10:00+00';
SELECT public.retirement_state(); SELECT public.retirement_state();
SELECT pg_temp.ok((SELECT count(*) FROM public.cash WHERE key LIKE 'pension:%') = 2, 'nov+dec paid once');
ROLLBACK;
SELECT 'retirement OK';
