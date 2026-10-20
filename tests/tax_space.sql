\set ON_ERROR_STOP on
BEGIN;
INSERT INTO characters VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Test','Fiscal');
SELECT set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
INSERT INTO accounts(character_id,balance) VALUES('00000000-0000-0000-0000-000000000001',10000);
INSERT INTO economy_catalog(id,name,kind,category,price,config) VALUES('home','Maison','item','immobilier',240720,'{"realestate":true}');
INSERT INTO personal_assets(character_id,catalog_id,purchase_price) SELECT id,'home',240720 FROM characters;
SELECT tax_space_state(); SELECT tax_space_state();
DO $$ BEGIN
 IF (SELECT count(*) FROM tax_space_notices)<>1 OR (SELECT amount FROM tax_space_notices)<>1003 THEN RAISE EXCEPTION 'property formula/idempotency'; END IF;
END $$;
SELECT tax_space_choose(id,10) FROM tax_space_notices;
DO $$ BEGIN IF (SELECT paid FROM tax_space_notices)<>101 THEN RAISE EXCEPTION 'first instalment'; END IF; END $$;
SELECT tax_space_state();
UPDATE fake_clock SET t=t+interval '9 months';
SELECT tax_space_state(); SELECT tax_space_state();
DO $$ BEGIN IF (SELECT paid FROM tax_space_notices)<>1003 OR (SELECT sum(amount) FROM test_receipts)<>1003 THEN RAISE EXCEPTION 'instalment settlement'; END IF; END $$;
SELECT tax_space_send('revenu','Comment déclarer mes revenus ?');
SELECT tax_space_state();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM tax_space_messages WHERE answer IS NOT NULL) THEN RAISE EXCEPTION 'early reply'; END IF; END $$;
UPDATE fake_clock SET t=t+interval '2 days';
SELECT tax_space_state();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM tax_space_messages WHERE answer IS NULL) THEN RAISE EXCEPTION 'missing reply'; END IF; END $$;
INSERT INTO income_tax_months(character_id,month,income,rate,withheld) SELECT id,'2024-01',100000,0,0 FROM characters;
SELECT income_tax_close_year(id,2024,'automatique') FROM characters;
SELECT tax_space_state(); SELECT tax_space_state();
DO $$ BEGIN
 IF (SELECT count(*) FROM post_letters WHERE letter_key='tax-space:revenu:2024')<>1 THEN RAISE EXCEPTION 'annual mail'; END IF;
 IF (SELECT debt FROM income_tax_profiles)<>0 THEN RAISE EXCEPTION 'annual debt duplicated'; END IF;
 IF NOT EXISTS(SELECT 1 FROM income_tax_returns WHERE late_fee>0) THEN RAISE EXCEPTION 'missing majoration'; END IF;
END $$;
UPDATE accounts SET balance=0;
SELECT tax_space_choose(id,1) FROM tax_space_notices WHERE kind='revenu';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM accounts WHERE balance<0) OR EXISTS(SELECT 1 FROM tax_space_notices WHERE kind='revenu' AND paid>0) THEN RAISE EXCEPTION 'insufficient cash'; END IF; END $$;
ROLLBACK;
