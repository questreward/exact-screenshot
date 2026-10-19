-- CIVITAS – P5b : ASSURANCES ET IMPRÉVUS PERSONNELS
-- Uniquement des ajouts. Tout ou rien. Aucune fonction existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0050_p5b_insurance.sql
-- Nécessite P5a (bank_pay, bank_score, bank_settle).
BEGIN;

-- 1. Réglages et catalogue ----------------------------------------------------------
CREATE TABLE public.insurance_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  min_age integer NOT NULL DEFAULT 16,
  waiting_days integer NOT NULL DEFAULT 3,
  month_days integer NOT NULL DEFAULT 30,
  unpaid_score_penalty integer NOT NULL DEFAULT 5,
  health_energy_loss integer NOT NULL DEFAULT 20,
  max_weeks_back integer NOT NULL DEFAULT 4,
  started_week integer NOT NULL
);
CREATE TABLE public.incident_types (
  id text PRIMARY KEY,
  label text NOT NULL,
  chance integer NOT NULL CHECK (chance BETWEEN 0 AND 100),
  chance_with_vehicle integer,
  min_cost integer NOT NULL,
  max_cost integer NOT NULL,
  examples text[] NOT NULL
);
CREATE TABLE public.insurance_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  covers text[] NOT NULL,
  monthly_price integer NOT NULL CHECK (monthly_price > 0),
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE public.insurance_coverage (
  incident_type text PRIMARY KEY REFERENCES public.incident_types(id),
  deductible integer NOT NULL,
  cap integer NOT NULL
);
GRANT SELECT ON public.insurance_settings, public.incident_types, public.insurance_products, public.insurance_coverage TO authenticated;
GRANT ALL ON public.insurance_settings, public.incident_types, public.insurance_products, public.insurance_coverage TO service_role;
ALTER TABLE public.insurance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY insurance_settings_read ON public.insurance_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY incident_types_read ON public.incident_types FOR SELECT TO authenticated USING (true);
CREATE POLICY insurance_products_read ON public.insurance_products FOR SELECT TO authenticated USING (true);
CREATE POLICY insurance_coverage_read ON public.insurance_coverage FOR SELECT TO authenticated USING (true);

INSERT INTO public.insurance_settings (id, started_week)
VALUES (1, floor(extract(epoch FROM public.game_now()) / 604800)::integer);
INSERT INTO public.incident_types (id, label, chance, chance_with_vehicle, min_cost, max_cost, examples) VALUES
  ('home', 'Habitation', 8, NULL, 250, 600, ARRAY['Dégât des eaux', 'Serrure cassée', 'Panne de chauffe-eau']),
  ('health', 'Santé', 10, NULL, 80, 300, ARRAY['Grippe', 'Soins dentaires', 'Entorse']),
  ('accident', 'Accident', 6, 10, 150, 900, ARRAY['Chute à vélo', 'Accrochage en voiture', 'Téléphone cassé dans une chute']);
INSERT INTO public.insurance_coverage (incident_type, deductible, cap) VALUES ('home', 50, 1000), ('health', 20, 500), ('accident', 50, 1500);
INSERT INTO public.insurance_products (id, name, covers, monthly_price, sort_order) VALUES
  ('home', 'Assurance habitation', ARRAY['home'], 15, 1),
  ('health', 'Mutuelle santé', ARRAY['health'], 20, 2),
  ('accident', 'Assurance accident', ARRAY['accident'], 12, 3),
  ('pack', 'Pack complet', ARRAY['home','health','accident'], 40, 4);

-- 2. Contrats et imprévus (lecture par le propriétaire) --------------------------------
CREATE TABLE public.insurance_profiles (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  settled_week integer NOT NULL,
  debt integer NOT NULL DEFAULT 0 CHECK (debt >= 0)
);
CREATE TABLE public.insurance_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  product_id text NOT NULL REFERENCES public.insurance_products(id),
  request_key text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  monthly_price integer NOT NULL,
  covered_from timestamptz NOT NULL,
  next_due_at timestamptz NOT NULL,
  next_try_at timestamptz,
  months_paid integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  cancelled_at timestamptz,
  UNIQUE (character_id, request_key)
);
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  incident_key text NOT NULL,
  type_id text NOT NULL REFERENCES public.incident_types(id),
  label text NOT NULL,
  occurred_at timestamptz NOT NULL,
  cost integer NOT NULL,
  insurer_paid integer NOT NULL DEFAULT 0,
  player_paid integer NOT NULL DEFAULT 0,
  unpaid integer NOT NULL DEFAULT 0,
  contract_id uuid REFERENCES public.insurance_contracts(id),
  UNIQUE (character_id, incident_key)
);
GRANT SELECT ON public.insurance_profiles, public.insurance_contracts, public.incidents TO authenticated;
GRANT ALL ON public.insurance_profiles, public.insurance_contracts, public.incidents TO service_role;
ALTER TABLE public.insurance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY insurance_profiles_own ON public.insurance_profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = insurance_profiles.character_id AND c.user_id = auth.uid()));
CREATE POLICY insurance_contracts_own ON public.insurance_contracts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = insurance_contracts.character_id AND c.user_id = auth.uid()));
CREATE POLICY incidents_own ON public.incidents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = incidents.character_id AND c.user_id = auth.uid()));

-- 3. Règlement à la lecture --------------------------------------------------------------
CREATE FUNCTION public.insurance_settle(_cid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.insurance_settings; t timestamptz := public.game_now(); cur integer; w integer; ip public.insurance_profiles;
  k public.contracts_dummy; ct record; it record; cov public.insurance_coverage; contract uuid; roll integer; chance integer;
  cost integer; at timestamptz; label text; ins integer; mine integer; bal integer; paid integer; iid uuid; has_vehicle boolean; repay integer; BEGIN
  RAISE EXCEPTION 'placeholder';
END $$;
