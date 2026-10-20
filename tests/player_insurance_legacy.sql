-- Base jetable avec tests/tools/player_insurance_fixture.sql uniquement.
-- Exécuter deux fois sur deux bases neuves : -v migrated=false puis true.
-- Les lignes LEGACY_RESULT doivent être identiques avant/après 0087.
\set ON_ERROR_STOP on
CREATE FUNCTION public.test_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Échec : %',label; END IF;
  RAISE NOTICE 'OK : %',label;
END $$;
INSERT INTO public.cities VALUES ('test','Ville test',10000);
INSERT INTO public.characters
SELECT ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
       ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
       25,100,'Ancien '||n,'test' FROM generate_series(1,5) n;
INSERT INTO public.accounts SELECT id,10000 FROM public.characters;
CREATE TABLE public.test_legacy_refs(n integer PRIMARY KEY,ct uuid);
DO $$ DECLARE n integer; cid uuid; product text; BEGIN
  FOR n IN 1..5 LOOP
    cid:=('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid;
    PERFORM set_config('test.user',('10000000-0000-0000-0000-'||lpad(n::text,12,'0')),false);
    product:= (ARRAY['home','health','accident','pack','auto'])[n];
    INSERT INTO public.test_legacy_refs VALUES(n,public.subscribe_insurance(product,gen_random_uuid()));
  END LOOP;
END $$;
-- Préparer AVANT 0087 : actif échu, suspendu avec réessai futur,
-- résilié échu, pack encore en carence, auto échu.
UPDATE public.insurance_contracts SET covered_from=game_now()-interval '40 days';
UPDATE public.insurance_contracts SET next_due_at=game_now()-interval '1 day'
WHERE id IN (SELECT ct FROM public.test_legacy_refs WHERE n IN (1,2,3,5));
UPDATE public.insurance_contracts SET status='suspended',next_try_at=game_now()+interval '1 day'
WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=2);
UPDATE public.insurance_contracts SET status='cancelled',cancelled_at=game_now()-interval '2 days'
WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=3);
UPDATE public.insurance_contracts SET covered_from=game_now()+interval '3 days'
WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=4);
UPDATE public.accounts SET balance=0 WHERE character_id=(SELECT character_id FROM public.insurance_contracts WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=2));
CREATE TABLE public.test_legacy_before AS SELECT to_jsonb(c) AS row FROM public.insurance_contracts c;
CREATE TABLE public.test_legacy_config AS
SELECT 'settings' kind,to_jsonb(x) row FROM public.insurance_settings x
UNION ALL SELECT 'products',to_jsonb(x) FROM public.insurance_products x
UNION ALL SELECT 'coverage',to_jsonb(x) FROM public.insurance_coverage x
UNION ALL SELECT 'incidents',to_jsonb(x) FROM public.incident_types x;
\if :migrated
\ir ../vps/migrations/0087_player_insurance.sql
SELECT public.test_assert(NOT EXISTS (SELECT 1 FROM public.insurance_contracts WHERE insurer_id IS NOT NULL),'Les cinq anciens contrats restent fictifs');
SELECT public.test_assert(NOT EXISTS (
 (SELECT row FROM public.test_legacy_before EXCEPT SELECT to_jsonb(c)-'insurer_id' FROM public.insurance_contracts c)
 UNION ALL (SELECT to_jsonb(c)-'insurer_id' FROM public.insurance_contracts c EXCEPT SELECT row FROM public.test_legacy_before)
),'Toutes les anciennes colonnes des contrats sont identiques après installation');
\endif
SELECT public.test_assert(NOT EXISTS (
 SELECT kind,row FROM public.test_legacy_config EXCEPT (
 SELECT 'settings',to_jsonb(x) FROM public.insurance_settings x UNION ALL
 SELECT 'products',to_jsonb(x) FROM public.insurance_products x UNION ALL
 SELECT 'coverage',to_jsonb(x) FROM public.insurance_coverage x UNION ALL
 SELECT 'incidents',to_jsonb(x) FROM public.incident_types x)
),'Réglages, tarifs, franchises, plafonds et risques conservés');
UPDATE public.incident_types SET chance=0,chance_with_vehicle=0;
DO $$ DECLARE n integer; BEGIN FOR n IN 1..5 LOOP
 PERFORM set_config('test.user',('10000000-0000-0000-0000-'||lpad(n::text,12,'0')),false);
 PERFORM public.insurance_state(); PERFORM public.insurance_state();
END LOOP; END $$;
SELECT public.test_assert((SELECT months_paid=2 AND monthly_price=15 AND status='active' FROM public.insurance_contracts WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=1)),'Ancienne habitation : une mensualité de 15 €, sans double débit');
SELECT public.test_assert((SELECT balance=9970 FROM public.accounts WHERE character_id=(SELECT character_id FROM public.insurance_contracts WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=1))),'Habitation : solde 9 970 €');
SELECT public.test_assert((SELECT status='suspended' AND months_paid=1 FROM public.insurance_contracts WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=2)),'Ancienne suspension et délai de réessai conservés');
SELECT public.test_assert((SELECT status='cancelled' AND months_paid=1 FROM public.insurance_contracts WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=3)),'Ancien contrat résilié : aucune cotisation');
SELECT public.test_assert((SELECT months_paid=2 AND monthly_price=35 FROM public.insurance_contracts WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=5)),'Ancienne auto : cotisation de 35 € conservée');
-- Réessai sans argent : suspension maintenue, puis reprise après paiement.
UPDATE public.test_clock SET t=t+interval '2 days';
SELECT set_config('test.user','10000000-0000-0000-0000-000000000002',false);
SELECT public.insurance_state();
SELECT public.test_assert((SELECT status='suspended' AND months_paid=1 AND next_try_at=game_now()+interval '1 day' FROM public.insurance_contracts WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=2)),'Cotisation impayée : pas de mensualité inventée');
UPDATE public.accounts SET balance=1000 WHERE character_id='00000000-0000-0000-0000-000000000002';
UPDATE public.test_clock SET t=t+interval '2 days';
SELECT public.insurance_state(); SELECT public.insurance_state();
SELECT public.test_assert((SELECT status='active' AND months_paid=2 AND next_try_at IS NULL FROM public.insurance_contracts WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=2)),'Ancienne mutuelle réactivée après paiement');
SELECT public.test_assert((SELECT balance=980 FROM public.accounts WHERE character_id='00000000-0000-0000-0000-000000000002'),'Mutuelle : une seule cotisation de 20 €');
-- Incidents habitation forcés : couvert / résilié / carence.
-- Fin de semaine : tous les tirages déterministes de cette semaine sont échus.
UPDATE public.test_clock SET t='2026-11-08 23:59Z';
UPDATE public.incident_types SET chance=CASE WHEN id='home' THEN 100 ELSE 0 END;
UPDATE public.insurance_profiles SET settled_week=floor(extract(epoch FROM game_now())/604800)::int-1;
UPDATE public.insurance_contracts SET covered_from=game_now()+interval '3 days' WHERE id=(SELECT ct FROM public.test_legacy_refs WHERE n=4);
DO $$ DECLARE n integer; BEGIN FOR n IN 1..5 LOOP
 PERFORM set_config('test.user',('10000000-0000-0000-0000-'||lpad(n::text,12,'0')),false);
 PERFORM public.insurance_state(); PERFORM public.insurance_state();
END LOOP; END $$;
SELECT public.test_assert(EXISTS(SELECT 1 FROM public.incidents WHERE character_id='00000000-0000-0000-0000-000000000001' AND insurer_paid=cost-50 AND player_paid=50 AND unpaid=0),'Ancienne habitation : franchise 50 €, indemnisation fictive inchangée');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.incidents WHERE character_id IN ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004') AND insurer_paid<>0),'Résiliation et carence : aucune couverture ajoutée');
\if :migrated
SELECT public.test_assert((SELECT count(*)=0 FROM public.insurer_ledger),'Anciens contrats : aucun paiement détourné vers une compagnie');
\endif
-- Résultat comparable sans UUID aléatoires et sans nouveaux champs d'affichage.
SELECT 'LEGACY_RESULT '||jsonb_build_object(
 'contracts',(SELECT jsonb_agg(jsonb_build_object('n',r.n,'product',c.product_id,'status',c.status,'price',c.monthly_price,'covered',c.covered_from,'due',c.next_due_at,'retry',c.next_try_at,'months',c.months_paid,'cancelled',c.cancelled_at) ORDER BY r.n) FROM public.test_legacy_refs r JOIN public.insurance_contracts c ON c.id=r.ct),
 'accounts',(SELECT jsonb_agg(to_jsonb(a) ORDER BY character_id) FROM public.accounts a),
 'profiles',(SELECT jsonb_agg(to_jsonb(p) ORDER BY character_id) FROM public.insurance_profiles p),
 'incidents',(SELECT jsonb_agg(to_jsonb(i)-'id'-'contract_id' ORDER BY character_id,incident_key) FROM public.incidents i),
 'energy',(SELECT jsonb_agg(jsonb_build_object('id',id,'energy',energy) ORDER BY id) FROM public.characters)
)::text;