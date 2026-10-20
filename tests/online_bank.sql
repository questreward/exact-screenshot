\set ON_ERROR_STOP on
BEGIN;
CREATE TRIGGER guard_block BEFORE INSERT ON player_transfers FOR EACH ROW EXECUTE FUNCTION guard_player_block();
INSERT INTO characters VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Alice','Test'),('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Bob','Test');
INSERT INTO accounts(character_id,balance) SELECT id,10000 FROM characters;
INSERT INTO test_contacts(a,b) VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
SELECT set_config('test.uid','00000000-0000-0000-0000-000000000001',false);
SELECT online_bank_state(); SELECT online_bank_state();
SELECT online_bank_card(true);
SELECT online_bank_transfer('00000000-0000-0000-0000-000000000002',100,'10000000-0000-0000-0000-000000000001');
SELECT online_bank_transfer('00000000-0000-0000-0000-000000000002',100,'10000000-0000-0000-0000-000000000001');
DO $$ BEGIN
 IF (SELECT balance FROM accounts WHERE character_id=auth.uid())<>9898 THEN RAISE EXCEPTION 'fee/transfer idempotency'; END IF;
 IF NOT (online_bank_state()->>'iban' ~ '^FR760000000000[0-9]{13}$') THEN RAISE EXCEPTION 'rib format'; END IF;
 IF (online_bank_state()->'statements'->0->>'opening')::int<>10000 OR (online_bank_state()->'statements'->0->>'closing')::int<>9898 THEN RAISE EXCEPTION 'statement balances'; END IF;
 IF (SELECT count(*) FROM player_transfers)<>1 THEN RAISE EXCEPTION 'transfer duplicate'; END IF;
 IF has_table_privilege('authenticated','online_bank_fees','INSERT') THEN RAISE EXCEPTION 'write exposed'; END IF;
 BEGIN PERFORM online_bank_transfer('00000000-0000-0000-0000-000000000002',5001,gen_random_uuid()); RAISE EXCEPTION 'amount failed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='amount failed' THEN RAISE; END IF; END;
END $$;
UPDATE test_contacts SET blocked=true;
DO $$ BEGIN
 BEGIN PERFORM online_bank_transfer('00000000-0000-0000-0000-000000000002',1,gen_random_uuid()); RAISE EXCEPTION 'block failed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='block failed' THEN RAISE; END IF; END;
END $$;
UPDATE test_contacts SET blocked=false;
SELECT set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
SELECT online_bank_state(); SELECT online_bank_state();
DO $$ BEGIN IF (SELECT balance FROM accounts WHERE character_id=auth.uid())<>10098 THEN RAISE EXCEPTION 'collect once'; END IF; END $$;
UPDATE fake_clock SET t='2026-02-01Z';
UPDATE accounts SET balance=0 WHERE character_id=auth.uid();
SELECT online_bank_state();
DO $$ BEGIN
 IF (SELECT paid FROM online_bank_fees WHERE character_id=auth.uid() AND month='2026-02-01')<>0 THEN RAISE EXCEPTION 'insufficient fee'; END IF;
 IF (SELECT count(*) FROM post_letters WHERE character_id=auth.uid() AND letter_key LIKE 'online-bank-statement:%')<>1 THEN RAISE EXCEPTION 'monthly mail'; END IF;
 IF (SELECT count(DISTINCT online_iban) FROM bank_profiles)<>2 THEN RAISE EXCEPTION 'unique RIB'; END IF;
END $$;
ROLLBACK;
