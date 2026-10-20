-- Disposable PostgreSQL only; projected production tables, constraints and economy_cash/transfer_collect bodies.
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
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Compte courant',
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE transactions ADD COLUMN category text NOT NULL DEFAULT 'autres', ADD COLUMN operation_key text, ADD COLUMN world_at timestamptz;
CREATE TABLE public.economy_operations(character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,operation_key text NOT NULL,kind text NOT NULL,amount integer NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'done' CHECK(status IN('done','failed')),payload jsonb NOT NULL DEFAULT '{}',occurred_at timestamptz NOT NULL DEFAULT public.game_now(),PRIMARY KEY(character_id,operation_key));
CREATE FUNCTION public.economy_cash(_cid uuid,_key text,_amount integer,_label text,_category text,_payload jsonb DEFAULT '{}') RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE acc public.accounts; BEGIN
IF NOT EXISTS(SELECT 1 FROM public.characters WHERE id=_cid AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
IF EXISTS(SELECT 1 FROM public.economy_operations WHERE character_id=_cid AND operation_key=_key) THEN RETURN false; END IF;
SELECT * INTO acc FROM public.accounts WHERE character_id=_cid FOR UPDATE;
IF NOT FOUND OR acc.balance+_amount<0 THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
INSERT INTO public.economy_operations(character_id,operation_key,kind,amount,payload) VALUES(_cid,_key,_category,_amount,_payload);
UPDATE public.accounts SET balance=balance+_amount WHERE id=acc.id;
IF _amount<>0 THEN INSERT INTO public.transactions(account_id,amount,label,category,operation_key,world_at) VALUES(acc.id,_amount,_label,_category,_key,public.game_now()); END IF;
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.economy_cash(uuid,text,integer,text,text,jsonb) FROM PUBLIC;

CREATE TABLE test_receipts(key text PRIMARY KEY,amount bigint,category text);
CREATE FUNCTION economy_post(_key text,_amount bigint,_category text) RETURNS void LANGUAGE sql AS $$ INSERT INTO test_receipts VALUES(_key,_amount,_category) ON CONFLICT DO NOTHING $$;
CREATE TABLE housing_types(id text PRIMARY KEY,name text NOT NULL,daily_cost integer NOT NULL CHECK(daily_cost>=0));
CREATE TABLE economy_catalog(id text PRIMARY KEY,name text NOT NULL,kind text NOT NULL CHECK(kind IN('item','vehicle','training','housing')),category text NOT NULL,price integer NOT NULL CHECK(price>=0),duration_minutes integer NOT NULL DEFAULT 60 CHECK(duration_minutes>0),energy_cost integer NOT NULL DEFAULT 5 CHECK(energy_cost>=0),location_kind text NOT NULL DEFAULT 'commerce',config jsonb NOT NULL DEFAULT '{}',sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE personal_assets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,catalog_id text NOT NULL REFERENCES economy_catalog(id),purchase_price integer NOT NULL CHECK(purchase_price>=0),condition text NOT NULL DEFAULT 'Bon état',acquired_at timestamptz NOT NULL DEFAULT game_now(),next_maintenance timestamptz,UNIQUE(character_id,catalog_id));
CREATE TABLE activities(character_id uuid,type text,status text,reward integer,end_time timestamptz);
CREATE TABLE security_ledger(character_id uuid,kind text,amount integer,created_at timestamptz);
\ir ../../vps/migrations/0096_income_tax.sql
\ir ../../vps/migrations/0105_la_poste.sql
\ir ../../vps/migrations/0108_tax_space.sql
