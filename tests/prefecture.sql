\set ON_ERROR_STOP on
BEGIN;
INSERT INTO characters(id,user_id,first_name,last_name) VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Test','Titre');
SELECT set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
INSERT INTO accounts(character_id,balance) VALUES('00000000-0000-0000-0000-000000000001',1000);
SELECT prefecture_state();
DO $$ BEGIN
 BEGIN PERFORM prefecture_request('identity',gen_random_uuid()); RAISE EXCEPTION 'duplicate CNI allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='duplicate CNI allowed' THEN RAISE; END IF; END;
END $$;
SELECT prefecture_loss('identity');
SELECT prefecture_request('identity','10000000-0000-0000-0000-000000000001');
SELECT prefecture_request('passport','10000000-0000-0000-0000-000000000002');
SELECT prefecture_request('passport','10000000-0000-0000-0000-000000000002');
DO $$ BEGIN
 IF (SELECT balance FROM accounts)<>889 THEN RAISE EXCEPTION 'wrong fees'; END IF;
 IF (SELECT sum(amount) FROM test_receipts)<>111 THEN RAISE EXCEPTION 'wrong State receipts'; END IF;
 IF EXISTS(SELECT 1 FROM prefecture_requests WHERE ready_at-requested_at NOT BETWEEN interval '7 days' AND interval '21 days') THEN RAISE EXCEPTION 'bad delay'; END IF;
 IF prefecture_cv('{"vehicle_type":"scooter"}')<>1 OR prefecture_cv('{"fiscal_hp":8}')<>8 THEN RAISE EXCEPTION 'CV'; END IF;
END $$;
UPDATE fake_clock SET t=t+interval '22 days';
SELECT prefecture_state(); SELECT prefecture_state();
DO $$ BEGIN
 IF (SELECT count(*) FROM post_letters WHERE letter_key LIKE 'prefecture:%')<>2 THEN RAISE EXCEPTION 'mail duplication'; END IF;
 IF EXISTS(SELECT 1 FROM prefecture_requests WHERE completed_at IS NOT NULL) THEN RAISE EXCEPTION 'activated before collection'; END IF;
END $$;
UPDATE post_letters SET collected_at=game_now(),status='retiré' WHERE letter_key LIKE 'prefecture:%';
SELECT prefecture_state(); SELECT prefecture_state();
DO $$ BEGIN
 IF (SELECT count(*) FROM administrative_documents WHERE status='valide')<>2 THEN RAISE EXCEPTION 'title activation'; END IF;
 IF EXISTS(SELECT 1 FROM character_identity WHERE prefecture_lost_at IS NOT NULL) THEN RAISE EXCEPTION 'loss not cleared'; END IF;
END $$;
SELECT prefecture_loss('passport');
ROLLBACK;
