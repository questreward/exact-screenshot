-- Disposable test database only. Projected columns retain production names/types.
CREATE SCHEMA auth;
CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE TABLE characters(id uuid PRIMARY KEY,user_id uuid NOT NULL UNIQUE,first_name text NOT NULL,last_name text NOT NULL);
CREATE TABLE fake_clock(t timestamptz); INSERT INTO fake_clock VALUES('2026-01-01Z');
CREATE FUNCTION game_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT t FROM fake_clock $$;
CREATE FUNCTION social_actor() RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM characters WHERE user_id=auth.uid() $$;
CREATE TABLE test_contacts(a uuid,b uuid,blocked boolean DEFAULT false);
CREATE FUNCTION network_is_contact(a uuid,b uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM test_contacts c WHERE c.a=$1 AND c.b=$2) $$;
CREATE FUNCTION network_blocked(a uuid,b uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM test_contacts c WHERE c.a=$1 AND c.b=$2 AND blocked) $$;
CREATE TABLE test_cash(cid uuid,key text UNIQUE,amount integer);
CREATE FUNCTION economy_cash(_cid uuid,_key text,_amount integer,_label text,_category text,_payload jsonb DEFAULT '{}') RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM characters WHERE id=_cid AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
 INSERT INTO test_cash VALUES(_cid,_key,_amount) ON CONFLICT DO NOTHING; RETURN FOUND;
END $$;
CREATE TABLE test_receipts(key text PRIMARY KEY,amount bigint,category text);
CREATE FUNCTION economy_post(_key text,_amount bigint,_category text) RETURNS void LANGUAGE sql AS $$ INSERT INTO test_receipts VALUES(_key,_amount,_category) ON CONFLICT DO NOTHING $$;
