-- Disposable minimal schema: columns mirror 0000/0002, 0075, 0095, 0099.
CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE public.cities(id text PRIMARY KEY);
CREATE TABLE public.locations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),city_id text REFERENCES cities(id),kind text NOT NULL,district_id text);
CREATE TABLE public.characters(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),city_id text,age integer NOT NULL,path_id text NOT NULL,progression jsonb NOT NULL DEFAULT '{}');
CREATE TABLE public.jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,city_id text REFERENCES cities(id),salary integer NOT NULL DEFAULT 0,min_age integer NOT NULL DEFAULT 18,location_id uuid REFERENCES locations(id),description text NOT NULL DEFAULT '',required_skill text NOT NULL DEFAULT '',skill_min integer NOT NULL DEFAULT 0,economy_skill text,economy_level integer);
CREATE TABLE public.study_fields(id text PRIMARY KEY,name text NOT NULL,description text NOT NULL DEFAULT '',skill text NOT NULL);
INSERT INTO study_fields VALUES('law','Droit','','Raisonnement juridique');
CREATE TABLE public.higher_ed_programs(id text PRIMARY KEY,kind text NOT NULL CHECK(kind IN ('BTS','BUT','Licence','École')),name text NOT NULL,field_id text NOT NULL REFERENCES study_fields(id),years integer NOT NULL,min_grade numeric NOT NULL,diploma text NOT NULL);
INSERT INTO higher_ed_programs VALUES('lic-droit','Licence','Licence de droit','law',3,10,'Licence de droit');
CREATE TABLE public.student_ledger(character_id uuid NOT NULL REFERENCES characters(id),key text NOT NULL,kind text NOT NULL CHECK(kind IN ('bourse','loyer','loyer_impaye','partiel','rattrapage','annee','diplome')),amount integer NOT NULL DEFAULT 0,grade numeric,label text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(character_id,key));
CREATE TABLE public.driving_licenses(character_id uuid PRIMARY KEY,license_at timestamptz);
CREATE FUNCTION public.has_driving_license(_cid uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM driving_licenses WHERE character_id=_cid AND license_at IS NOT NULL) $$;
CREATE TABLE public.job_applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),character_id uuid NOT NULL REFERENCES characters(id),job_id uuid NOT NULL REFERENCES jobs(id),status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','rejected')),applied_at timestamptz NOT NULL,response_at timestamptz NOT NULL,UNIQUE(character_id,job_id));
CREATE TABLE public.employments(character_id uuid PRIMARY KEY REFERENCES characters(id),job_id uuid NOT NULL REFERENCES jobs(id),status text NOT NULL DEFAULT 'active',started_at timestamptz NOT NULL,progress integer NOT NULL DEFAULT 0,skills jsonb NOT NULL DEFAULT '{}');
CREATE TABLE public.life_rules(id text PRIMARY KEY,allowed_kinds text[] NOT NULL DEFAULT '{}');
INSERT INTO life_rules VALUES('work',ARRAY['entreprise','administration','commerce']);
INSERT INTO cities VALUES('paris'),('lyon');
INSERT INTO locations(city_id,kind,district_id) SELECT c.id,k,c.id||'-centre' FROM cities c CROSS JOIN unnest(ARRAY['banque','mairie','administration','universite','commerce','cafe','entreprise','station','gare']) k;
