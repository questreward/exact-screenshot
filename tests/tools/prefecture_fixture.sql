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
CREATE TABLE public.admin_document_types (
  id text PRIMARY KEY, name text NOT NULL, category text NOT NULL, origin text NOT NULL,
  validity_days integer NOT NULL, explanation text NOT NULL, sort_order integer NOT NULL DEFAULT 0);
INSERT INTO public.admin_document_types VALUES
 ('identity','Justificatif d''identité simulé','Situation personnelle','Mairie fictive CIVITAS',3650,'Prouve qui vous êtes dans le jeu. Jamais une vraie pièce d''identité.',1),
 ('bank_statement','Relevé bancaire simulé','Fiscalité','Banque CIVITAS',30,'Résume les mouvements de votre compte du jeu.',2),
 ('income_proof','Justificatif de revenus','Travail','Banque CIVITAS',90,'Indique les salaires réellement reçus dans le jeu.',3),
 ('housing_proof','Justificatif de logement','Logement','Bailleur fictif',90,'Prouve où vous habitez et combien coûte votre logement.',4),
 ('school_certificate','Certificat de scolarité','Études','Établissement fictif',180,'Prouve que vous êtes inscrit en formation.',5),
 ('work_contract','Contrat de travail','Travail','Employeur fictif',365,'Prouve votre emploi actuel et votre salaire.',6),
 ('situation_proof','Justificatif de situation','Situation personnelle','Organisme fictif CIVITAS',90,'Indique si vous étudiez ou travaillez.',7);


CREATE TABLE public.administrative_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  type_id text NOT NULL REFERENCES public.admin_document_types(id),
  issued_at timestamptz NOT NULL, valid_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'valide' CHECK (status IN ('valide','perime','remplace')),
  details jsonb NOT NULL DEFAULT '{}');
CREATE UNIQUE INDEX administrative_documents_one_valid ON public.administrative_documents (character_id, type_id) WHERE status = 'valide';


CREATE TABLE public.economy_catalog(id text PRIMARY KEY, name text NOT NULL, kind text NOT NULL CHECK(kind IN('item','vehicle','training','housing')),category text NOT NULL, price integer NOT NULL CHECK(price>=0), duration_minutes integer NOT NULL DEFAULT 60 CHECK(duration_minutes>0), energy_cost integer NOT NULL DEFAULT 5 CHECK(energy_cost>=0), location_kind text NOT NULL DEFAULT 'commerce', config jsonb NOT NULL DEFAULT '{}',sort_order integer NOT NULL DEFAULT 0);

CREATE TABLE public.personal_assets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,catalog_id text NOT NULL REFERENCES public.economy_catalog(id),purchase_price integer NOT NULL CHECK(purchase_price>=0),condition text NOT NULL DEFAULT 'Bon état',acquired_at timestamptz NOT NULL DEFAULT public.game_now(),next_maintenance timestamptz,UNIQUE(character_id,catalog_id));

ALTER TABLE characters ADD COLUMN age integer DEFAULT 25, ADD COLUMN city_id uuid; CREATE TABLE cities(id uuid PRIMARY KEY,name text);
CREATE TABLE public.identity_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  validity_years integer NOT NULL DEFAULT 10,
  photo_max_chars integer NOT NULL DEFAULT 280000,   -- ≈ 200 Ko d'image encodée
  allowed_appearance jsonb NOT NULL DEFAULT '{
    "silhouette":["slim","regular","broad"], "skin":["s1","s2","s3","s4","s5"],
    "hair":["short","long","curly","bun","bald"], "hairColor":["black","brown","blond","red","grey"],
    "outfit":["coral","navy","green","sand","charcoal"], "style":["casual","chic","sport"],
    "accessory":["none","glasses","sunglasses","earrings","cap","scarf"]}'::jsonb,
  signature_styles text[] NOT NULL DEFAULT ARRAY['classique','penchee','rapide','paraphe']
);
INSERT INTO public.identity_settings (id) VALUES (1);

CREATE TABLE public.character_identity (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  doc_number text NOT NULL UNIQUE,
  birth_date date NOT NULL,
  birth_city text NOT NULL,
  issued_at date NOT NULL,
  expires_at date NOT NULL,
  signature_style text,
  signature_text text CHECK (signature_text IS NULL OR char_length(signature_text) BETWEEN 2 AND 30),
  photo text,
  photo_updated_at timestamptz,
  use_photo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);

CREATE FUNCTION public.identity_ensure(_cid uuid) RETURNS public.character_identity LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.character_identity; c public.characters; s public.identity_settings; today date := public.game_now()::date; h bigint; BEGIN
  SELECT * INTO r FROM public.character_identity WHERE character_id = _cid;
  IF FOUND THEN RETURN r; END IF;
  SELECT * INTO c FROM public.characters WHERE id = _cid;
  SELECT * INTO s FROM public.identity_settings WHERE id = 1;
  h := abs(hashtextextended(_cid::text, 70));
  INSERT INTO public.character_identity (character_id, doc_number, birth_date, birth_city, issued_at, expires_at)
  VALUES (_cid,
    'CIV-' || to_char(today, 'YY') || '-' || upper(substr(md5(_cid::text || ':identite'), 1, 4)) || '-' || lpad((h % 1000000)::text, 6, '0'),
    (today - make_interval(years => c.age) - make_interval(days => (h % 360)::integer))::date,
    COALESCE((SELECT name FROM public.cities WHERE id = c.city_id), 'Inconnue'),
    today, (today + make_interval(years => s.validity_years))::date)
  ON CONFLICT (character_id) DO NOTHING;
  SELECT * INTO r FROM public.character_identity WHERE character_id = _cid;
  RETURN r;
END $$;

\ir ../../vps/migrations/0105_la_poste.sql
\ir ../../vps/migrations/0107_prefecture_titres.sql
