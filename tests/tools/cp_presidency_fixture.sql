\ir security_careers_fixture.sql
CREATE TABLE public.cities(id text PRIMARY KEY,name text);
INSERT INTO public.cities VALUES('paris','Paris'),('lyon','Lyon'),('lille','Lille'),('marseille','Marseille'),('bordeaux','Bordeaux');
CREATE TABLE public.state_ledger(entry_key text PRIMARY KEY, amount bigint, category text);
CREATE FUNCTION public.economy_post(text,bigint,text) RETURNS void LANGUAGE sql AS $$ INSERT INTO public.state_ledger VALUES($1,$2,$3) ON CONFLICT DO NOTHING $$;
\ir ../../vps/migrations/0093_security_careers.sql
\ir ../../vps/migrations/0094_security_careers_wave2.sql
\ir ../../vps/migrations/0114_volunteer_dossier.sql
\ir ../../vps/migrations/0117_civil_protection_presidency.sql
