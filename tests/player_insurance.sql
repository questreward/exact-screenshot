-- Régression 0087 sur base jetable uniquement (fixture test_clock/test_payments).
-- Jamais exécuter sur le VPS en production.
BEGIN;
INSERT INTO public.cities VALUES ('test','Ville test',10000);
INSERT INTO public.locations VALUES ('00000000-0000-0000-0000-000000000010','test','entreprise',true,'00000000-0000-0000-0000-000000000011');
INSERT INTO public.characters VALUES
 ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',25,100,'Patron','test'),
 ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',25,100,'Client','test'),
 ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003',25,100,'Tiers','test');
INSERT INTO public.accounts VALUES ('00000000-0000-0000-0000-000000000001',10000),('00000000-0000-0000-0000-000000000002',10000),('00000000-0000-0000-0000-000000000003',10000);
CREATE FUNCTION public.test_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Échec : %',label; END IF; RAISE NOTICE 'OK : %',label; END $$;
SELECT set_config('test.user','10000000-0000-0000-0000-000000000001',true);
CREATE TEMP TABLE refs(bid uuid,ct uuid);
INSERT INTO refs(bid) SELECT public.insurer_found('Assurance test','20000000-0000-0000-0000-000000000001');
SELECT public.test_assert((SELECT balance=5000 FROM accounts WHERE character_id='00000000-0000-0000-0000-000000000001'),'Ouverture exactement 5 000 €');
SELECT public.test_assert((SELECT balance=4700 FROM business_treasuries WHERE business_id=(SELECT bid FROM refs)),'Capital 4 700 € après 300 € de frais existants');
SELECT public.insurer_found('Assurance test','20000000-0000-0000-0000-000000000001');
SELECT public.test_assert((SELECT count(*)=1 FROM businesses),'Double création neutralisée');
SELECT public.insurer_set_price(70);
SELECT public.test_assert((SELECT percent=70 FROM service_prices),'Borne 70 % acceptée');
SELECT public.insurer_set_price(150);
SELECT public.test_assert((SELECT percent=150 FROM service_prices),'Borne 150 % acceptée');
DO $$ BEGIN BEGIN PERFORM public.insurer_set_price(69); RAISE EXCEPTION 'Tarif 69 accepté'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='Tarif 69 accepté' THEN RAISE; END IF; END;
 BEGIN PERFORM public.insurer_set_price(151); RAISE EXCEPTION 'Tarif 151 accepté'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='Tarif 151 accepté' THEN RAISE; END IF; END; END $$;
SELECT set_config('test.user','10000000-0000-0000-0000-000000000002',true);
UPDATE refs SET ct=public.insurer_subscribe('home',bid,'20000000-0000-0000-0000-000000000002');
SELECT public.test_assert((SELECT monthly_price=22 FROM insurance_contracts WHERE id=(SELECT ct FROM refs)),'Habitation 15 € à 150 % : 22 €');
SELECT public.test_assert((SELECT balance=9978 FROM accounts WHERE character_id='00000000-0000-0000-0000-000000000002'),'Première cotisation débitée une fois');
SELECT public.test_assert((SELECT balance=4722 FROM business_treasuries WHERE business_id=(SELECT bid FROM refs)),'Première cotisation versée en caisse');
SELECT public.insurer_subscribe('home',bid,'20000000-0000-0000-0000-000000000002') FROM refs;
SELECT public.test_assert((SELECT count(*)=1 FROM insurer_ledger WHERE kind='premium'),'Souscription répétée sans double recette');
SELECT public.test_assert((SELECT covered_from=game_now()+interval '3 days' FROM insurance_contracts WHERE id=(SELECT ct FROM refs)),'Attente inchangée : 3 jours');
SELECT public.test_assert((SELECT deductible=50 AND cap=1000 FROM insurance_coverage WHERE incident_type='home'),'Franchise 50 € et plafond habitation 1 000 € inchangés');
DO $$ BEGIN BEGIN PERFORM public.insurer_subscribe('auto',(SELECT bid FROM refs),gen_random_uuid()); RAISE EXCEPTION 'Auto joueur acceptée'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='Auto joueur acceptée' THEN RAISE; END IF; END; END $$;
SELECT public.subscribe_insurance('auto','20000000-0000-0000-0000-000000000003');
SELECT public.test_assert((SELECT insurer_id IS NULL AND monthly_price=35 FROM insurance_contracts WHERE product_id='auto'),'Assurance auto fictive conservée à 35 €');
-- Force seulement les délais sur la base isolée, conserve les fonctions réellement installées.
UPDATE insurance_contracts SET next_due_at=game_now()-interval '1 day' WHERE id=(SELECT ct FROM refs);
SELECT public.insurance_state();
SELECT public.test_assert((SELECT count(*)=2 FROM insurer_ledger WHERE kind='premium'),'Cotisation mensuelle reçue');
SELECT public.insurance_state();
SELECT public.test_assert((SELECT count(*)=2 FROM insurer_ledger WHERE kind='premium'),'Relecture sans deuxième mensualité');
-- Incident réel dans insurance_settle : tirage forcé uniquement dans la fixture.
UPDATE public.test_clock SET t=t+interval '8 days';
UPDATE incident_types SET chance=CASE WHEN id='home' THEN 100 ELSE 0 END,chance_with_vehicle=0;
UPDATE insurance_profiles SET settled_week=floor(extract(epoch FROM game_now())/604800)::int-1 WHERE character_id='00000000-0000-0000-0000-000000000002';
UPDATE insurance_contracts SET covered_from=game_now()-interval '30 days' WHERE id=(SELECT ct FROM refs);
UPDATE business_treasuries SET balance=10 WHERE business_id=(SELECT bid FROM refs);
SELECT public.insurance_state();
SELECT public.test_assert((SELECT count(*)=1 FROM insurer_ledger WHERE kind='claim'),'Sinistre financé par le règlement réel');
SELECT public.test_assert((SELECT treasury_amount=10 AND fictive_amount=amount-10 FROM insurer_ledger WHERE kind='claim'),'Déficit partiel : caisse 10 €, complément fictif');
SELECT public.test_assert((SELECT balance=0 FROM business_treasuries WHERE business_id=(SELECT bid FROM refs)),'Caisse jamais négative');
SELECT public.test_assert((SELECT insurer_paid=cost-50 AND player_paid=50 AND unpaid=0 FROM incidents WHERE character_id='00000000-0000-0000-0000-000000000002' AND type_id='home'),'Assuré ne paie que sa franchise malgré la caisse vide');
SELECT public.insurance_state();
SELECT public.test_assert((SELECT count(*)=1 FROM insurer_ledger WHERE kind='claim'),'Sinistre réglé une seule fois');
SELECT public.insurer_claim(ct,'test-empty',200) FROM refs;
SELECT public.test_assert((SELECT treasury_amount=0 AND fictive_amount=200 FROM insurer_ledger WHERE operation_key='test-empty'),'Caisse vide : secours intégral 200 €');
UPDATE business_treasuries SET balance=300 WHERE business_id=(SELECT bid FROM refs);
SELECT public.insurer_claim(ct,'test-full',200) FROM refs;
SELECT public.test_assert((SELECT treasury_amount=200 AND fictive_amount=0 FROM insurer_ledger WHERE operation_key='test-full'),'Caisse suffisante : prise en charge intégrale 200 €');
UPDATE businesses SET status='closed' WHERE id=(SELECT bid FROM refs);
SELECT public.insurer_claim(ct,'test-closed',200) FROM refs;
SELECT public.test_assert((SELECT treasury_amount=0 AND fictive_amount=200 FROM insurer_ledger WHERE operation_key='test-closed'),'Fermeture : protection maintenue');
SELECT public.test_assert((public.insurance_state()->'contracts'->0->>'insurer')='Assureur fictif CIVITAS','Relais fictif visible sur le contrat');
DO $$ BEGIN BEGIN PERFORM public.insurer_subscribe('health',(SELECT bid FROM refs),gen_random_uuid()); RAISE EXCEPTION 'Compagnie fermée acceptée'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='Compagnie fermée acceptée' THEN RAISE; END IF; END; END $$;
SELECT public.test_assert(NOT has_function_privilege('authenticated','public.insurer_claim(uuid,text,integer)','EXECUTE'),'Paiement interne inaccessible aux joueurs');
SELECT public.test_assert(NOT has_function_privilege('authenticated','public.insurer_premium(uuid,text,integer)','EXECUTE'),'Recette interne inaccessible aux joueurs');
SELECT public.test_assert(NOT has_column_privilege('authenticated','public.insurer_ledger','operation_key','SELECT'),'Identifiants techniques invisibles aux joueurs');
-- Propriétaire ne peut lire les contrats/incidents privés : mêmes politiques que 0050.
GRANT SELECT ON public.characters,public.businesses TO authenticated;
SELECT set_config('test.user','10000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT public.test_assert((SELECT count(*)=0 FROM insurance_contracts),'Contrats du client invisibles au patron');
SELECT public.test_assert((SELECT count(*)=0 FROM incidents),'Sinistres privés invisibles au patron');
SELECT public.test_assert((SELECT count(*)>0 FROM insurer_ledger),'Journal anonyme visible au patron');
RESET ROLE;
SELECT set_config('test.user','10000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
SELECT public.test_assert((SELECT count(*)=0 FROM insurer_ledger),'Journal invisible à un tiers');
RESET ROLE;
ROLLBACK;