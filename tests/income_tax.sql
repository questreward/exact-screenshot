-- Run on the isolated fixture after 0095 + 0096 (clock 2026-10 at install).
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
CREATE FUNCTION pg_temp.err(q text, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'should refuse: %', m; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'should refuse%' THEN RAISE; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';
-- Barème : 24 000 € -> abattement 2 400, imposable 21 600, impôt (21600-11497)*11 % = 1 111
SELECT pg_temp.ok((public.income_tax_compute(24000)->>'tax')::int = 1111, 'tax 24000');
SELECT pg_temp.ok((public.income_tax_compute(12000)->>'tax')::int = 0, 'no tax under threshold');
SELECT pg_temp.ok((public.income_tax_compute(3000)->>'abatement')::int = 495, 'min abatement');
SELECT pg_temp.ok((public.income_tax_compute(60000)->>'tax')::int = round((29315-11497)*0.11 + (54000-29315)*0.30)::int, 'tax 60000');
-- Octobre (mois d'installation) jamais imposé ; novembre : 2 000 € -> taux neutre sur 24 000
DELETE FROM public.activities; DELETE FROM public.security_ledger;
INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,reward) VALUES
 ('00000000-0000-0000-0000-0000000000c1','work','Vendeur','2026-10-21 09:00+00','2026-10-21 13:00+00','completed',5000),
 ('00000000-0000-0000-0000-0000000000c1','work','Vendeur','2026-11-05 09:00+00','2026-11-05 13:00+00','completed',2000);
UPDATE public.fake_clock SET t = '2026-12-02 10:00+00';
SELECT public.income_tax_state();
SELECT pg_temp.ok((SELECT count(*) FROM public.income_tax_months)=1, 'only november');
SELECT pg_temp.ok((SELECT withheld FROM public.income_tax_months WHERE month='2026-11') = round(2000*round(1111*100.0/24000,2)/100), 'withheld 4.63%');
SELECT public.income_tax_state();
SELECT pg_temp.ok((SELECT count(*) FROM public.income_tax_months)=1 AND (SELECT paid_total FROM public.income_tax_profiles)=93, 'idempotent, paid once');
-- Déclaration refusée hors période, acceptée en avril ; aucune majoration
SELECT pg_temp.err($$SELECT public.income_tax_declare(2026)$$, 'outside window');
UPDATE public.fake_clock SET t = '2027-04-10 10:00+00';
SELECT public.income_tax_declare(2026);
SELECT pg_temp.ok((SELECT kind='declaree' AND late_fee=0 AND income=2000 AND tax=0 AND balance=-93 FROM public.income_tax_returns WHERE year=2026), 'declared, refund 93');
SELECT pg_temp.ok((SELECT amount FROM public.cash WHERE key='tax:refund:2026')=93, 'refund paid');
SELECT pg_temp.err($$SELECT public.income_tax_declare(2026)$$, 'twice');
-- Oubli 2027 : avis automatique + 10 % en juin 2028 ; reste dû si solde insuffisant (jamais négatif)
INSERT INTO public.activities(character_id,type,title,start_time,end_time,status,reward) VALUES
 ('00000000-0000-0000-0000-0000000000c1','work','Cadre','2027-05-05 09:00+00','2027-05-05 13:00+00','completed',60000);
UPDATE public.fake_clock SET t = '2028-06-03 10:00+00';
UPDATE public.accounts SET balance = 0 WHERE character_id='00000000-0000-0000-0000-0000000000c1';
SELECT public.income_tax_state();
SELECT pg_temp.ok((SELECT kind='automatique' AND late_fee = round(tax*0.10) AND balance = tax + late_fee - withheld FROM public.income_tax_returns WHERE year=2027), 'auto + 10%');
SELECT pg_temp.ok((SELECT debt FROM public.income_tax_profiles) > 0, 'debt kept, no negative balance');
ROLLBACK;
SELECT 'income tax tests OK';
