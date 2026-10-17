
-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- USER SETTINGS
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY,
  language text NOT NULL DEFAULT 'fr',
  notifications_enabled boolean NOT NULL DEFAULT true,
  reduced_motion boolean NOT NULL DEFAULT false,
  profile_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings read" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own settings update" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own settings insert" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, split_part(NEW.email, '@', 1)) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CITIES (public reference)
CREATE TABLE public.cities (
  id text PRIMARY KEY,
  name text NOT NULL,
  region text NOT NULL,
  population integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities public" ON public.cities FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.cities (id, name, region, population, description, sort_order) VALUES
 ('paris','Paris','Île-de-France',2100000,'La capitale, cœur du pouvoir et des médias.',1),
 ('lyon','Lyon','Auvergne-Rhône-Alpes',520000,'Ville d''affaires et de gastronomie, au carrefour de l''Europe.',2),
 ('marseille','Marseille','Provence-Alpes-Côte d''Azur',870000,'Port méditerranéen vibrant et populaire.',3),
 ('bordeaux','Bordeaux','Nouvelle-Aquitaine',260000,'Élégante, étudiante et tournée vers l''Atlantique.',4),
 ('lille','Lille','Hauts-de-France',235000,'Ville jeune, ouvrière et européenne.',5);

-- STARTING PATHS (public reference)
CREATE TABLE public.starting_paths (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  starting_money integer NOT NULL,
  initial_situation text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.starting_paths TO anon, authenticated;
GRANT ALL ON public.starting_paths TO service_role;
ALTER TABLE public.starting_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paths public" ON public.starting_paths FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.starting_paths VALUES
 ('student','Étudiant','Vous commencez vos études. Peu d''argent, beaucoup de temps et de rencontres.',16,30,500,'Étudiant en première année',1),
 ('young_worker','Jeune actif','Premier emploi, premier salaire, premières responsabilités.',18,30,1500,'Employé débutant',2),
 ('early_career','Début de carrière','Diplôme en poche, vous lancez votre carrière professionnelle.',18,30,3000,'Jeune professionnel',3);

-- LOCATIONS
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL REFERENCES public.cities(id),
  name text NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations read" ON public.locations FOR SELECT TO authenticated USING (true);

-- CHARACTERS
CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  age integer NOT NULL,
  city_id text NOT NULL REFERENCES public.cities(id),
  path_id text NOT NULL REFERENCES public.starting_paths(id),
  appearance jsonb NOT NULL DEFAULT '{}'::jsonb,
  situation text NOT NULL DEFAULT '',
  energy integer NOT NULL DEFAULT 100,
  progression jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.characters TO authenticated;
GRANT ALL ON public.characters TO service_role;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own character read" ON public.characters FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ORGANIZATIONS & MEMBERSHIPS
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL,
  city_id text REFERENCES public.cities(id),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs read" ON public.organizations FOR SELECT TO authenticated USING (true);

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, organization_id)
);
GRANT SELECT ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memberships" ON public.memberships FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- JOBS
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  city_id text REFERENCES public.cities(id),
  organization_id uuid REFERENCES public.organizations(id),
  salary integer NOT NULL DEFAULT 0,
  min_age integer NOT NULL DEFAULT 18,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs read" ON public.jobs FOR SELECT TO authenticated USING (true);

-- ACCOUNTS & TRANSACTIONS (read-only for players)
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Compte courant',
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own accounts" ON public.accounts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accounts a JOIN public.characters c ON c.id = a.character_id
                 WHERE a.id = account_id AND c.user_id = auth.uid()));

-- EVENTS, NEWS (world-wide, readable)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  city_id text REFERENCES public.cities(id),
  starts_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events read" ON public.events FOR SELECT TO authenticated USING (true);

CREATE TABLE public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  published_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news TO authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news read" ON public.news FOR SELECT TO authenticated USING (true);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifs read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifs update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- WORLD STATE
CREATE TABLE public.world_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  world_date date NOT NULL DEFAULT '2027-09-01',
  world_time time NOT NULL DEFAULT '08:00',
  season text NOT NULL DEFAULT 'Saison 1',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.world_state TO anon, authenticated;
GRANT ALL ON public.world_state TO service_role;
ALTER TABLE public.world_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "world read" ON public.world_state FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.world_state (id) VALUES (1);

-- SECURE CHARACTER CREATION
CREATE OR REPLACE FUNCTION public.create_character(
  _first_name text, _last_name text, _age integer, _city_id text, _path_id text, _appearance jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _path public.starting_paths%ROWTYPE;
  _char_id uuid;
  _acc_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF EXISTS (SELECT 1 FROM public.characters WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'Vous avez déjà un personnage';
  END IF;
  _first_name := btrim(coalesce(_first_name,''));
  _last_name := btrim(coalesce(_last_name,''));
  IF length(_first_name) < 1 OR length(_first_name) > 40 OR length(_last_name) < 1 OR length(_last_name) > 40 THEN
    RAISE EXCEPTION 'Prénom et nom requis (40 caractères max)';
  END IF;
  IF _age IS NULL OR _age < 16 OR _age > 30 THEN RAISE EXCEPTION 'Âge autorisé : 16 à 30 ans'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE id = _city_id) THEN RAISE EXCEPTION 'Ville inconnue'; END IF;
  SELECT * INTO _path FROM public.starting_paths WHERE id = _path_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcours inconnu'; END IF;
  IF _age < _path.min_age OR _age > _path.max_age THEN
    RAISE EXCEPTION 'Ce parcours n''est pas accessible à % ans', _age;
  END IF;
  IF _appearance IS NULL OR jsonb_typeof(_appearance) <> 'object' THEN _appearance := '{}'::jsonb; END IF;

  INSERT INTO public.characters (user_id, first_name, last_name, age, city_id, path_id, appearance, situation)
  VALUES (_uid, _first_name, _last_name, _age, _city_id, _path_id, _appearance, _path.initial_situation)
  RETURNING id INTO _char_id;

  INSERT INTO public.accounts (character_id, balance) VALUES (_char_id, _path.starting_money) RETURNING id INTO _acc_id;
  INSERT INTO public.transactions (account_id, amount, label) VALUES (_acc_id, _path.starting_money, 'Capital de départ');
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (_uid, 'Bienvenue à CIVITAS', 'Votre nouvelle vie commence. Explorez votre ville et votre téléphone.');
  RETURN _char_id;
END $$;
REVOKE ALL ON FUNCTION public.create_character(text,text,integer,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_character(text,text,integer,text,text,jsonb) TO authenticated;
