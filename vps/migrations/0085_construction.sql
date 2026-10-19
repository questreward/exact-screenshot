-- CIVITAS – ENTREPRISES DE SERVICES : CONSTRUCTION (RÉNOVATION + AGRANDISSEMENT)
-- Tout ou rien :
--   docker exec -i civitas-db psql -1 -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0085_construction.sql
-- Réutilise : entreprises/caisses (0051), paiement service_pay + tarif 70–150 % + clients fictifs (0081),
--   biens immobiliers du patrimoine (0077-0078), loyer de référence de l'agence (0082).
-- Règles :
--   * Rénovation : coût 3 % du prix du bien, valeur +5 %, une fois par an (jeu) et par bien.
--   * Agrandissement : coût 15 % du prix du bien, +10 m², valeur +12 % ET loyer de référence relevé d'autant ; 2 au maximum.
--   * Payé au tarif d'une entreprise joueur de la ville, ou à l'entreprise fictive CIVITAS au prix de référence.
--   * Clients fictifs hebdomadaires : 400 € par client au tarif de référence.
-- Modifications d'existant : personal_assets (3 colonnes ajoutées), service_orders (service autorisé),
--   service_settle / service_set_price / service_state (liste des secteurs), agency_mandate / agency_state
--   (loyer de référence + bonus d'agrandissement) — remplacements vérifiés, échec si le texte attendu manque.
BEGIN;

-- 1. Secteur et réglages
INSERT INTO public.business_sectors (id, label, description, location_kind, min_capital, base_revenue, per_worker, per_shift, weekly_rent, npc_wage, max_npc, sort_order) VALUES
  ('construction', 'Entreprise de construction', 'Rénovations et agrandissements de logements pour les habitants et les joueurs.', 'commerce', 4000, 140, 130, 80, 220, 110, 5, 10);

ALTER TABLE public.service_settings
  ADD COLUMN build_renov_percent integer NOT NULL DEFAULT 3,
  ADD COLUMN build_renov_gain integer NOT NULL DEFAULT 5,
  ADD COLUMN build_renov_days integer NOT NULL DEFAULT 365,
  ADD COLUMN build_ext_percent integer NOT NULL DEFAULT 15,
  ADD COLUMN build_ext_gain integer NOT NULL DEFAULT 12,
  ADD COLUMN build_ext_m2 integer NOT NULL DEFAULT 10,
  ADD COLUMN build_ext_max integer NOT NULL DEFAULT 2,
  ADD COLUMN build_npc_ticket integer NOT NULL DEFAULT 400;

ALTER TABLE public.personal_assets
  ADD COLUMN extension_m2 integer NOT NULL DEFAULT 0,
  ADD COLUMN rent_bonus integer NOT NULL DEFAULT 0,
  ADD COLUMN renovated_at timestamptz;

ALTER TABLE public.service_orders DROP CONSTRAINT service_orders_service_check;
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_service_check CHECK (service IN ('garage','demenagement','immobilier','concession','construction'));

-- 2. Historique des chantiers
CREATE TABLE public.construction_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL UNIQUE,
  character_id uuid NOT NULL REFERENCES public.characters(id),
  business_id uuid REFERENCES public.businesses(id),
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  kind text NOT NULL CHECK (kind IN ('renovation','extension')),
  amount integer NOT NULL,
  gain integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE INDEX construction_works_business ON public.construction_works (business_id, created_at DESC);
GRANT SELECT ON public.construction_works TO authenticated;
GRANT ALL ON public.construction_works TO service_role;
ALTER TABLE public.construction_works ENABLE ROW LEVEL SECURITY;
CREATE POLICY construction_works_parties ON public.construction_works FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE b.id = business_id AND c.user_id = auth.uid()));

-- 3. Commander un chantier (entreprise joueur ou fictive si _business_id est NULL)
CREATE FUNCTION public.construction_order(_business_id uuid, _property_id text, _kind text, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.service_settings; a public.personal_assets; cat public.economy_catalog; ref integer; gain integer; amount integer;
  key text := 'construction:' || _request_id; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.construction_works WHERE operation_key = key) THEN RETURN jsonb_build_object('already', true); END IF;
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _property_id AND COALESCE(config->>'realestate','false') = 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bien immobilier inconnu'; END IF;
  SELECT * INTO a FROM public.personal_assets WHERE character_id = cid AND catalog_id = cat.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ce bien ne vous appartient pas'; END IF;
  IF _kind = 'renovation' THEN
    IF a.renovated_at IS NOT NULL AND a.renovated_at > t - make_interval(days => s.build_renov_days) THEN
      RAISE EXCEPTION 'Ce bien a déjà été rénové cette année'; END IF;
    ref := ceil(cat.price * s.build_renov_percent / 100.0)::integer;
    gain := floor(cat.price * s.build_renov_gain / 100.0)::integer;
  ELSIF _kind = 'extension' THEN
    IF a.extension_m2 >= s.build_ext_m2 * s.build_ext_max THEN RAISE EXCEPTION 'Agrandissement maximum atteint'; END IF;
    ref := ceil(cat.price * s.build_ext_percent / 100.0)::integer;
    gain := floor(cat.price * s.build_ext_gain / 100.0)::integer;
  ELSE RAISE EXCEPTION 'Type de chantier inconnu'; END IF;
  amount := CASE WHEN _business_id IS NULL THEN ref ELSE public.service_amount(ref, public.service_percent(_business_id)) END;
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < amount THEN RAISE EXCEPTION 'Solde insuffisant (% €)', amount; END IF;
  amount := public.service_pay(cid, _business_id, 'construction', ref, key,
    CASE WHEN _kind = 'renovation' THEN 'Rénovation' ELSE 'Agrandissement' END || ' — ' || cat.name, 'logement');
  UPDATE public.personal_assets SET purchase_price = purchase_price + gain,
    renovated_at = CASE WHEN _kind = 'renovation' THEN t ELSE renovated_at END,
    extension_m2 = extension_m2 + CASE WHEN _kind = 'extension' THEN s.build_ext_m2 ELSE 0 END,
    rent_bonus = rent_bonus + CASE WHEN _kind = 'extension' THEN gain ELSE 0 END
  WHERE id = a.id;
  INSERT INTO public.construction_works (operation_key, character_id, business_id, catalog_id, kind, amount, gain)
  VALUES (key, cid, _business_id, cat.id, _kind, amount, gain);
  RETURN jsonb_build_object('already', false, 'amount', amount, 'gain', gain);
END $$;

-- 4. Lecture
CREATE FUNCTION public.construction_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.service_settings; mine public.businesses; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.service_settings WHERE id = 1;
  SELECT * INTO mine FROM public.businesses WHERE owner_id = cid AND status = 'active' AND sector_id = 'construction' LIMIT 1;
  IF mine.id IS NOT NULL THEN PERFORM public.service_settle(mine.id); END IF;
  RETURN jsonb_build_object(
    'settings', jsonb_build_object('renov_percent', s.build_renov_percent, 'renov_gain', s.build_renov_gain, 'renov_days', s.build_renov_days,
      'ext_percent', s.build_ext_percent, 'ext_gain', s.build_ext_gain, 'ext_m2', s.build_ext_m2, 'ext_max', s.build_ext_max),
    'builders', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'percent', public.service_percent(b.id),
        'rating', public.service_rating(b.id), 'mine', b.owner_id = cid) ORDER BY b.name)
      FROM public.businesses b WHERE b.sector_id = 'construction' AND b.status = 'active' AND b.city_id = c.city_id), '[]'::jsonb),
    'properties', COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog_id', e.id, 'name', e.name, 'price', e.price,
        'surface', COALESCE((e.config->>'surface')::integer, 0) + a.extension_m2, 'extension_m2', a.extension_m2,
        'value', a.purchase_price, 'renovated_at', a.renovated_at,
        'can_renovate', a.renovated_at IS NULL OR a.renovated_at <= t - make_interval(days => s.build_renov_days),
        'can_extend', a.extension_m2 < s.build_ext_m2 * s.build_ext_max,
        'renov_ref', ceil(e.price * s.build_renov_percent / 100.0)::integer, 'renov_gain', floor(e.price * s.build_renov_gain / 100.0)::integer,
        'ext_ref', ceil(e.price * s.build_ext_percent / 100.0)::integer, 'ext_gain', floor(e.price * s.build_ext_gain / 100.0)::integer) ORDER BY e.price)
      FROM public.personal_assets a JOIN public.economy_catalog e ON e.id = a.catalog_id
      WHERE a.character_id = cid AND COALESCE(e.config->>'realestate','false') = 'true'), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('kind', w.kind, 'name', e.name, 'amount', w.amount, 'gain', w.gain, 'at', w.created_at,
        'builder', COALESCE(b.name, 'Entreprise fictive CIVITAS')) ORDER BY w.created_at DESC)
      FROM (SELECT * FROM public.construction_works WHERE character_id = cid ORDER BY created_at DESC LIMIT 20) w
      JOIN public.economy_catalog e ON e.id = w.catalog_id LEFT JOIN public.businesses b ON b.id = w.business_id), '[]'::jsonb),
    'mine', CASE WHEN mine.id IS NULL THEN NULL ELSE jsonb_build_object('id', mine.id, 'name', mine.name,
      'balance', (SELECT balance FROM public.business_treasuries WHERE business_id = mine.id),
      'percent', public.service_percent(mine.id),
      'works', COALESCE((SELECT jsonb_agg(jsonb_build_object('kind', w.kind, 'name', e.name, 'amount', w.amount, 'at', w.created_at,
          'client', (SELECT first_name FROM public.characters WHERE id = w.character_id)) ORDER BY w.created_at DESC)
        FROM (SELECT * FROM public.construction_works WHERE business_id = mine.id ORDER BY created_at DESC LIMIT 20) w
        JOIN public.economy_catalog e ON e.id = w.catalog_id), '[]'::jsonb),
      'npc_weeks', COALESCE((SELECT jsonb_agg(jsonb_build_object('week', n.week, 'clients', n.clients, 'revenue', n.revenue) ORDER BY n.week DESC)
        FROM (SELECT * FROM public.service_npc_weeks WHERE business_id = mine.id ORDER BY week DESC LIMIT 8) n), '[]'::jsonb)) END);
END $$;

-- 5. Branchements vérifiés
DO $$
DECLARE f text; def text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.service_settle(uuid)', 'public.service_set_price(integer)', 'public.service_state()'] LOOP
    def := pg_get_functiondef(f::regprocedure);
    IF position('IN (''garage'',''demenagement'',''immobilier'',''concession'')' IN def) = 0 THEN RAISE EXCEPTION 'Liste des secteurs introuvable dans %', f; END IF;
    def := replace(def, 'IN (''garage'',''demenagement'',''immobilier'',''concession'')', 'IN (''garage'',''demenagement'',''immobilier'',''concession'',''construction'')');
    IF f = 'public.service_settle(uuid)' THEN
      IF position('WHEN ''concession'' THEN s.dealer_npc_ticket' IN def) = 0 THEN RAISE EXCEPTION 'Ticket introuvable'; END IF;
      def := replace(def, 'WHEN ''concession'' THEN s.dealer_npc_ticket', 'WHEN ''concession'' THEN s.dealer_npc_ticket WHEN ''construction'' THEN s.build_npc_ticket');
    END IF;
    EXECUTE def;
  END LOOP;

  def := pg_get_functiondef('public.agency_mandate(text, uuid, integer)'::regprocedure);
  IF position('public.agency_ref_rent(cat.price)' IN def) = 0 THEN RAISE EXCEPTION 'Loyer de référence introuvable (agency_mandate)'; END IF;
  def := replace(def, 'public.agency_ref_rent(cat.price)',
    'public.agency_ref_rent(cat.price + COALESCE((SELECT pa.rent_bonus FROM public.personal_assets pa WHERE pa.character_id = cid AND pa.catalog_id = cat.id), 0))');
  EXECUTE def;

  def := pg_get_functiondef('public.agency_state()'::regprocedure);
  IF position('public.agency_ref_rent(ec.price)' IN def) = 0 THEN RAISE EXCEPTION 'Loyer de référence introuvable (agency_state)'; END IF;
  def := replace(def, 'public.agency_ref_rent(ec.price)', 'public.agency_ref_rent(ec.price + a.rent_bonus)');
  EXECUTE def;
END $$;

-- 6. Droits
REVOKE ALL ON FUNCTION public.construction_order(uuid, text, text, uuid), public.construction_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.construction_order(uuid, text, text, uuid), public.construction_state() TO authenticated;

-- 7. Contrôles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.business_sectors WHERE id = 'construction') THEN RAISE EXCEPTION 'Secteur construction manquant'; END IF;
  IF position('''construction''' IN pg_get_functiondef('public.service_settle(uuid)'::regprocedure)) = 0 THEN RAISE EXCEPTION 'service_settle non branché'; END IF;
  IF position('rent_bonus' IN pg_get_functiondef('public.agency_mandate(text, uuid, integer)'::regprocedure)) = 0 THEN RAISE EXCEPTION 'agency_mandate non branché'; END IF;
  IF position('rent_bonus' IN pg_get_functiondef('public.agency_state()'::regprocedure)) = 0 THEN RAISE EXCEPTION 'agency_state non branché'; END IF;
END $$;

COMMIT;
