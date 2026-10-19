-- À exécuter uniquement sur une copie jetable avec 0086 installée.
-- Identités simulées réservées au banc d'essai (auth.uid lit test.user).
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check(ok boolean,msg text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ÉCHEC : %',msg; END IF;
END $$;
CREATE FUNCTION pg_temp.denied(q text,expected text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  BEGIN EXECUTE q; EXCEPTION WHEN OTHERS THEN
    IF position(expected IN SQLERRM)>0 THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Opération autorisée à tort : %',q;
END $$;
-- La copie t85 sert de socle services ; conserver ses données, utiliser une ville d'essai.
INSERT INTO characters(id,user_id,first_name,city_id,age) VALUES
 ('86000000-0000-0000-0000-000000000001','86000000-0000-0000-0000-000000000001','Employeur','paris',25),
 ('86000000-0000-0000-0000-000000000002','86000000-0000-0000-0000-000000000002','Agence','paris',25),
 ('86000000-0000-0000-0000-000000000003','86000000-0000-0000-0000-000000000003','Candidat','paris',25),
 ('86000000-0000-0000-0000-000000000004','86000000-0000-0000-0000-000000000004','Autre','paris',25);
INSERT INTO businesses(id,owner_id,name,city_id,sector_id,status) VALUES
 ('86000000-0000-0000-0000-000000000011','86000000-0000-0000-0000-000000000001','Employeur test','paris','garage','active'),
 ('86000000-0000-0000-0000-000000000012','86000000-0000-0000-0000-000000000002','Agence test','paris','recrutement','active');
INSERT INTO business_treasuries VALUES('86000000-0000-0000-0000-000000000011',1000),('86000000-0000-0000-0000-000000000012',1000);
INSERT INTO service_prices(business_id,percent) VALUES('86000000-0000-0000-0000-000000000012',100);
INSERT INTO business_offers(id,business_id,title,weekly_salary) SELECT ('86000000-0000-0000-0000-00000000002'||i)::uuid,'86000000-0000-0000-0000-000000000011','Offre '||i,150 FROM generate_series(1,5) i;
INSERT INTO social_npcs(id,city_id,first_name) VALUES('86000000-0000-0000-0000-000000000031','paris','PNJ test');
SET LOCAL "test.user"='86000000-0000-0000-0000-000000000003';
SELECT recruit_seek(true);
SET LOCAL "test.user"='86000000-0000-0000-0000-000000000001';
SELECT recruit_mandate('86000000-0000-0000-0000-000000000021','86000000-0000-0000-0000-000000000012');
SELECT pg_temp.check((SELECT balance=1000 FROM business_treasuries WHERE business_id='86000000-0000-0000-0000-000000000011'),'pas de prime avant embauche');
SET LOCAL "test.user"='86000000-0000-0000-0000-000000000002';
SELECT recruit_propose('86000000-0000-0000-0000-000000000021','86000000-0000-0000-0000-000000000003');
SELECT pg_temp.denied($q$SELECT recruit_propose('86000000-0000-0000-0000-000000000021','86000000-0000-0000-0000-000000000004')$q$,'Candidat indisponible');
SET LOCAL "test.user"='86000000-0000-0000-0000-000000000003';
SELECT recruit_seek(false);
SELECT pg_temp.denied($q$SELECT recruit_accept('86000000-0000-0000-0000-000000000021')$q$,'Recherche d’emploi inactive');
SELECT recruit_seek(true);
INSERT INTO player_blocks VALUES('86000000-0000-0000-0000-000000000001','86000000-0000-0000-0000-000000000003');
SELECT pg_temp.denied($q$SELECT recruit_accept('86000000-0000-0000-0000-000000000021')$q$,'Mise en relation indisponible');
DELETE FROM player_blocks WHERE blocker_id='86000000-0000-0000-0000-000000000001';
UPDATE business_treasuries SET balance=100 WHERE business_id='86000000-0000-0000-0000-000000000011';
SELECT pg_temp.denied($q$SELECT recruit_accept('86000000-0000-0000-0000-000000000021')$q$,'Caisse employeur insuffisante');
SELECT pg_temp.check(NOT EXISTS(SELECT 1 FROM business_employees WHERE character_id='86000000-0000-0000-0000-000000000003'),'pas d’embauche si prime impossible');
UPDATE business_treasuries SET balance=1000 WHERE business_id='86000000-0000-0000-0000-000000000011';
SELECT recruit_accept('86000000-0000-0000-0000-000000000021');
SELECT pg_temp.check((recruit_accept('86000000-0000-0000-0000-000000000021')->>'already')::boolean,'double clic sans double prime');
SELECT pg_temp.check((SELECT balance=800 FROM business_treasuries WHERE business_id='86000000-0000-0000-0000-000000000011'),'prime employeur 200');
SELECT pg_temp.check((SELECT balance=1200 FROM business_treasuries WHERE business_id='86000000-0000-0000-0000-000000000012'),'prime agence 200');
SELECT pg_temp.check((SELECT count(*)=1 FROM recruit_placements WHERE offer_id='86000000-0000-0000-0000-000000000021'),'placement unique');
SELECT pg_temp.check((recruit_state()->'placements'->0->>'candidate')='Candidat','relecture du placement côté candidat');
SELECT pg_temp.check((recruit_state()->>'seeking')::boolean=false,'recherche retirée après embauche');
SET LOCAL "test.user"='86000000-0000-0000-0000-000000000004';
SELECT pg_temp.check(jsonb_array_length(recruit_state()->'placements')=0,'historique privé');
SELECT pg_temp.denied($q$SELECT recruit_hire_npc('86000000-0000-0000-0000-000000000021')$q$,'Entreprise introuvable');
-- Embauche directe inchangée : pas de frais ni placement d’agence.
SELECT business_join('86000000-0000-0000-0000-000000000022');
SELECT pg_temp.check((SELECT balance=800 FROM business_treasuries WHERE business_id='86000000-0000-0000-0000-000000000011'),'embauche directe inchangée');
SET LOCAL "test.user"='86000000-0000-0000-0000-000000000001';
SELECT recruit_mandate('86000000-0000-0000-0000-000000000023',NULL);
SELECT recruit_hire_npc('86000000-0000-0000-0000-000000000023');
SELECT pg_temp.check((recruit_hire_npc('86000000-0000-0000-0000-000000000023')->>'already')::boolean,'double embauche PNJ neutralisée');
SELECT pg_temp.check((SELECT balance=600 FROM business_treasuries WHERE business_id='86000000-0000-0000-0000-000000000011'),'prime fictive payée par employeur');
SELECT pg_temp.check((SELECT balance=1200 FROM business_treasuries WHERE business_id='86000000-0000-0000-0000-000000000012'),'aucun revenu pour une agence non choisie');
SELECT recruit_mandate('86000000-0000-0000-0000-000000000024',NULL);
DELETE FROM business_npc_staff WHERE npc_id='86000000-0000-0000-0000-000000000031';
SELECT recruit_hire_npc('86000000-0000-0000-0000-000000000024');
SELECT pg_temp.check((SELECT count(*)=2 FROM recruit_placements WHERE npc_id='86000000-0000-0000-0000-000000000031'),'réembauche PNJ sous nouveau placement');
SELECT pg_temp.check(NOT has_function_privilege('authenticated','public.recruit_pay(uuid)','EXECUTE'),'paiement interne inaccessible');
SELECT 'Recrutement : contrôles réussis' AS result;
ROLLBACK;