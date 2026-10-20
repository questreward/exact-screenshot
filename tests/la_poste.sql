\set ON_ERROR_STOP on
BEGIN;
INSERT INTO characters VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Alice','Test'),('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Bob','Test');
INSERT INTO test_contacts(a,b) SELECT min(id::text)::uuid,max(id::text)::uuid FROM characters;
SELECT set_config('test.uid','00000000-0000-0000-0000-000000000001',false);
SELECT post_state(); SELECT post_state();
SELECT post_send('00000000-0000-0000-0000-000000000002','Objet','Bonjour',true,'10000000-0000-0000-0000-000000000001');
SELECT post_send('00000000-0000-0000-0000-000000000002','Objet','Bonjour',true,'10000000-0000-0000-0000-000000000001');
DO $$ BEGIN
 IF (SELECT count(*) FROM post_letters)<>2 OR (SELECT count(*) FROM test_cash)<>1 OR (SELECT sum(amount) FROM test_cash)<>-6 OR (SELECT sum(amount) FROM test_receipts)<>6 THEN RAISE EXCEPTION 'idempotency/receipt'; END IF;
 IF has_function_privilege('authenticated','post_deliver(uuid,text,text,text,text,boolean)','EXECUTE') THEN RAISE EXCEPTION 'internal exposed'; END IF;
 IF has_table_privilege('authenticated','post_letters','INSERT') THEN RAISE EXCEPTION 'write exposed'; END IF;
END $$;
UPDATE test_contacts SET blocked=true;
DO $$ BEGIN
 BEGIN
  PERFORM post_send('00000000-0000-0000-0000-000000000002','Bloqué','Message',false,'10000000-0000-0000-0000-000000000002');
  RAISE EXCEPTION 'block failed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='block failed' THEN RAISE; END IF; END;
END $$;
UPDATE test_contacts SET blocked=false;
DO $$ DECLARE i int; BEGIN
 FOR i IN 2..10 LOOP
  PERFORM post_send('00000000-0000-0000-0000-000000000002','Lettre','Message',false,('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid);
 END LOOP;
 BEGIN
  PERFORM post_send('00000000-0000-0000-0000-000000000002','Limite','Message',false,'10000000-0000-0000-0000-000000000011');
  RAISE EXCEPTION 'rate failed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='rate failed' THEN RAISE; END IF; END;
 IF (SELECT sum(charged_euros) FROM post_letters)<>ceil((536+9*139)/100.0) THEN RAISE EXCEPTION 'cent carry'; END IF;
END $$;
SELECT set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
UPDATE fake_clock SET t=t+interval '15 days';
SELECT post_state();
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM post_letters WHERE registered AND status='avisé non réclamé' AND presented_at='2026-01-01Z') THEN RAISE EXCEPTION 'deadline'; END IF; END $$;
SELECT post_update(id,'read') FROM post_letters WHERE registered;
SELECT post_update(id,'archive') FROM post_letters WHERE registered;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM post_letters WHERE registered AND archived AND read_at IS NOT NULL) THEN RAISE EXCEPTION 'read/archive'; END IF; END $$;
ROLLBACK;
