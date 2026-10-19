-- CIVITAS – BOUTIQUE, PHASE 2 : CRÉDITS AUTO/IMMO, ASSURANCE AUTO, ENTRETIEN, REVENTE, SECONDE MAIN
-- Uniquement des ajouts, tout ou rien. Seule fonction remplacée : shop_state (créée par 0076, remplacée par 0077).
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0078_shop_phase2.sql
-- Crédits : table à part (le prêt personnel existant reste unique). Mensualités prélevées à la lecture avec bank_pay
--   (compte puis découvert autorisé), une clé unique par mensualité, note bancaire existante.
--   3 jours d'impayés de suite = reprise du bien par l'organisme (le surplus éventuel est rendu une seule fois).
--   Endettement maximum 35 % des revenus (emploi existant), apport minimum 10 %, frais de notaire au comptant.
-- Assurance auto : nouveau contrat + nouveau type d'imprévu « Sinistre auto » dans le système d'assurance existant
--   (ne concerne que les joueurs qui possèdent un véhicule ; aucun effet rétroactif sur les semaines déjà réglées).
-- Entretien : système existant (entretien périodique automatique, bouton « Entretenir » existant) — rien à créer.
-- Revente : reprise par la boutique à la valeur estimée (−10 % objets/voitures, −5 % frais d'agence immobilier).
--   Un bien habité ne peut pas être vendu. Un crédit en cours est soldé en priorité par la vente.
-- Seconde main : les objets et voitures repris sont remis en vente (+20 %). Aucun argent ne circule entre joueurs,
--   aucune identité de vendeur n'est conservée.
BEGIN;

-- 1. Réglages -----------------------------------------------------------------------
CREATE TABLE public.purchase_credit_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  auto_rate numeric(5,2) NOT NULL DEFAULT 5.20,
  immo_rate numeric(5,2) NOT NULL DEFAULT 3.60,
  auto_min_months integer NOT NULL DEFAULT 12,
  auto_max_months integer NOT NULL DEFAULT 84,
  immo_min_months integer NOT NULL DEFAULT 60,
  immo_max_months integer NOT NULL DEFAULT 300,
  min_down_percent integer NOT NULL DEFAULT 10,
  max_debt_percent integer NOT NULL DEFAULT 35,
  seizure_after integer NOT NULL DEFAULT 3,
  resale_percent integer NOT NULL DEFAULT 90,
  realestate_resale_percent integer NOT NULL DEFAULT 95,
  secondhand_markup integer NOT NULL DEFAULT 120
);
INSERT INTO public.purchase_credit_settings (id) VALUES (1);

-- 2. Données ------------------------------------------------------------------------
CREATE TABLE public.purchase_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  request_key text NOT NULL,
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  kind text NOT NULL CHECK (kind IN ('auto','immo')),
  label text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  down_payment integer NOT NULL CHECK (down_payment >= 0),
  principal integer NOT NULL CHECK (principal > 0),
  months integer NOT NULL CHECK (months > 0),
  rate numeric(5,2) NOT NULL,
  monthly integer NOT NULL CHECK (monthly > 0),
  remaining integer NOT NULL CHECK (remaining >= 0),
  paid_count integer NOT NULL DEFAULT 0,
  missed integer NOT NULL DEFAULT 0,
  next_due timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','repaid','sold','seized')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  closed_at timestamptz,
  UNIQUE (character_id, request_key)
);
CREATE UNIQUE INDEX purchase_credits_one_per_asset ON public.purchase_credits (character_id, catalog_id) WHERE status = 'active';

CREATE TABLE public.shop_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  request_id uuid NOT NULL,
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  name text NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  credit_repaid integer NOT NULL DEFAULT 0,
  sold_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (character_id, request_id)
);

CREATE TABLE public.secondhand_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id text NOT NULL REFERENCES public.economy_catalog(id),
  price integer NOT NULL CHECK (price > 0),
  condition text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('boutique','reprise')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','sold')),
  buyer_id uuid REFERENCES public.characters(id),
  request_id uuid,
  listed_at timestamptz NOT NULL DEFAULT public.game_now(),
  sold_at timestamptz
);
CREATE INDEX secondhand_open ON public.secondhand_listings (listed_at DESC) WHERE status = 'open';

GRANT SELECT ON public.purchase_credit_settings, public.purchase_credits, public.shop_sales, public.secondhand_listings TO authenticated;
GRANT ALL ON public.purchase_credit_settings, public.purchase_credits, public.shop_sales, public.secondhand_listings TO service_role;
ALTER TABLE public.purchase_credit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondhand_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchase_credit_settings_read ON public.purchase_credit_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY purchase_credits_own ON public.purchase_credits FOR SELECT TO authenticated
  USING (character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));
CREATE POLICY shop_sales_own ON public.shop_sales FOR SELECT TO authenticated
  USING (character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));
CREATE POLICY secondhand_read ON public.secondhand_listings FOR SELECT TO authenticated
  USING (status = 'open' OR buyer_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));

-- Annonces de départ (objets de la boutique, 60–75 % du prix neuf)
INSERT INTO public.secondhand_listings (catalog_id, price, condition, origin)
SELECT ec.id, (ec.price * v.pct / 100)::integer, v.cond, 'boutique'
FROM public.economy_catalog ec
JOIN (VALUES (0, 70, 'Très bon état'), (1, 60, 'Bon état'), (2, 75, 'Comme neuf')) v(n, pct, cond)
  ON v.n = (abs(hashtext(ec.id)) % 3)
WHERE COALESCE(ec.config->>'shop','false') = 'true' AND ec.kind = 'item' AND COALESCE(ec.config->>'realestate','false') <> 'true'
  AND abs(hashtext(ec.id || ':occasion')) % 2 = 0;

-- 3. Assurance auto (système d'assurance existant) -------------------------------------
INSERT INTO public.incident_types (id, label, chance, chance_with_vehicle, min_cost, max_cost, examples)
VALUES ('car', 'Sinistre auto', 0, 8, 300, 2500, ARRAY['Pare-brise fissuré', 'Accrochage sur un parking', 'Rétroviseur arraché']);
INSERT INTO public.insurance_coverage (incident_type, deductible, cap) VALUES ('car', 150, 3000);
INSERT INTO public.insurance_products (id, name, covers, monthly_price, sort_order) VALUES ('auto', 'Assurance auto', ARRAY['car'], 35, 5);

-- 4. Outils internes ---------------------------------------------------------------------
CREATE FUNCTION public.credit_monthly(_principal integer, _rate numeric, _months integer) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _rate = 0 THEN CEIL(_principal::numeric / _months)::integer
    ELSE CEIL(_principal * (_rate / 1200.0) / (1 - power(1 + _rate / 1200.0, -_months)))::integer END
$$;

CREATE FUNCTION public.asset_value(_price integer, _dep numeric, _acquired timestamptz, _now timestamptz) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT floor(_price * power(1 - COALESCE(_dep, 10) / 100, GREATEST(0, extract(epoch FROM _now - _acquired) / 31557600)))::integer
$$;

-- Mensualités existantes du joueur (prêt personnel + crédits d'achat)
CREATE FUNCTION public.credit_monthly_burden(_cid uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT SUM(monthly) FROM public.loans WHERE character_id = _cid AND status = 'active'), 0)
       + COALESCE((SELECT SUM(monthly) FROM public.purchase_credits WHERE character_id = _cid AND status = 'active'), 0)
$$;

-- Règlement à la lecture : mensualités échues, impayés, reprise du bien
CREATE FUNCTION public.purchase_credit_settle(_cid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.purchase_credit_settings; bs public.bank_settings; cr public.purchase_credits; t timestamptz := public.game_now();
  today date := (public.game_now() AT TIME ZONE 'UTC')::date; n integer; interest integer; pp integer; asset record; value integer; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cid AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  PERFORM public.bank_settle(_cid);
  SELECT * INTO s FROM public.purchase_credit_settings WHERE id = 1;
  SELECT * INTO bs FROM public.bank_settings WHERE id = 1;
  FOR cr IN SELECT * FROM public.purchase_credits WHERE character_id = _cid AND status = 'active' ORDER BY created_at FOR UPDATE LOOP
    WHILE cr.status = 'active' AND cr.next_due <= t LOOP
      n := cr.paid_count + 1;
      interest := ROUND(cr.remaining * cr.rate / 1200.0)::integer;
      pp := LEAST(cr.remaining, GREATEST(0, cr.monthly - interest));
      IF n >= cr.months THEN pp := cr.remaining; END IF;
      IF public.bank_pay(_cid, 'pcredit:' || cr.id || ':' || n, pp + interest, 'Mensualité ' || n || '/' || cr.months || ' — ' || cr.label) THEN
        cr.remaining := cr.remaining - pp; cr.paid_count := n; cr.missed := 0;
        cr.next_due := cr.next_due + bs.month_days * interval '1 day';
        IF cr.remaining <= 0 THEN cr.status := 'repaid';
          PERFORM public.economy_notify(_cid, 'pcredit-done:' || cr.id, 'Crédit remboursé', cr.label || ' vous appartient entièrement.');
        END IF;
      ELSE
        INSERT INTO public.bank_ledger (character_id, operation_key, kind, amount, label)
        VALUES (_cid, 'pmiss:' || cr.id || ':' || today, 'score', -bs.score_missed, 'Mensualité de crédit impayée — ' || cr.label) ON CONFLICT DO NOTHING;
        IF FOUND THEN
          cr.missed := cr.missed + 1;
          UPDATE public.bank_profiles SET score = GREATEST(0, score - bs.score_missed) WHERE character_id = _cid;
          PERFORM public.economy_notify(_cid, 'pcredit-miss:' || cr.id || ':' || today, 'Mensualité de crédit impayée',
            'Solde insuffisant pour ' || cr.label || '. Nouvel essai demain. Après ' || s.seizure_after || ' jours d''impayés, le bien est repris.');
        END IF;
        EXIT;
      END IF;
    END LOOP;
    IF cr.status = 'active' AND cr.missed >= s.seizure_after THEN
      SELECT a.id, a.purchase_price, a.acquired_at, ec.config INTO asset FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id
        WHERE a.character_id = _cid AND a.catalog_id = cr.catalog_id FOR UPDATE OF a;
      value := CASE WHEN asset.id IS NULL THEN 0 ELSE floor(public.asset_value(asset.purchase_price, (asset.config->>'dep')::numeric, asset.acquired_at, t) * bs.seizure_percent / 100.0)::integer END;
      IF asset.id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.housing_leases WHERE character_id = _cid AND status = 'actif' AND property_id = cr.catalog_id) THEN
          PERFORM public.housing_close_lease(_cid, true);
        END IF;
        DELETE FROM public.personal_assets WHERE id = asset.id;
      END IF;
      IF value > cr.remaining THEN
        PERFORM public.economy_cash(_cid, 'pcredit-seize-rest:' || cr.id, value - cr.remaining, 'Reste après reprise — ' || cr.label, 'banque');
      END IF;
      cr.status := 'seized';
      PERFORM public.economy_notify(_cid, 'pcredit-seize:' || cr.id, 'Bien repris', cr.label || ' a été repris par l''organisme de crédit après plusieurs impayés.');
    END IF;
    UPDATE public.purchase_credits SET remaining = cr.remaining, paid_count = cr.paid_count, missed = cr.missed, next_due = cr.next_due,
      status = cr.status, closed_at = CASE WHEN cr.status <> 'active' THEN t END WHERE id = cr.id;
  END LOOP;
END $$;

-- 5. Actions du joueur --------------------------------------------------------------------
CREATE FUNCTION public.shop_buy_credit(_catalog_id text, _down_payment integer, _months integer, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; cat public.economy_catalog; s public.purchase_credit_settings; bs public.bank_settings; bp public.bank_profiles;
  cr public.purchase_credits; ref text; fees integer := 0; t timestamptz := public.game_now(); k text; r numeric; principal integer; monthly integer; income integer; BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO cr FROM public.purchase_credits WHERE character_id = cid AND request_key = _request_id::text;
  IF FOUND THEN RETURN jsonb_build_object('credit_id', cr.id, 'already', true); END IF;
  PERFORM public.purchase_credit_settle(cid);
  SELECT * INTO s FROM public.purchase_credit_settings WHERE id = 1;
  SELECT * INTO bs FROM public.bank_settings WHERE id = 1;
  SELECT * INTO bp FROM public.bank_profiles WHERE character_id = cid;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND COALESCE(config->>'shop','false') = 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  k := CASE WHEN cat.kind = 'vehicle' THEN 'auto' WHEN COALESCE(cat.config->>'realestate','false') = 'true' THEN 'immo' END;
  IF k IS NULL THEN RAISE EXCEPTION 'Le crédit concerne seulement les voitures et l''immobilier'; END IF;
  IF EXISTS (SELECT 1 FROM public.personal_assets WHERE character_id = cid AND catalog_id = cat.id) THEN RAISE EXCEPTION 'Vous possédez déjà ce produit'; END IF;
  IF c.age < 18 THEN RAISE EXCEPTION 'Crédit possible dès 18 ans'; END IF;
  IF c.age < COALESCE((cat.config->>'min_age')::integer, 16) THEN RAISE EXCEPTION 'Âge insuffisant'; END IF;
  IF cat.config ? 'license' AND COALESCE((c.progression->>(cat.config->>'license'))::integer, 0) < 1 THEN RAISE EXCEPTION 'Permis requis'; END IF;
  IF bp.blocked OR bp.score < bs.score_min THEN RAISE EXCEPTION 'Note bancaire trop basse pour un crédit'; END IF;
  IF k = 'auto' AND _months NOT BETWEEN s.auto_min_months AND s.auto_max_months THEN RAISE EXCEPTION 'Durée de % à % mois', s.auto_min_months, s.auto_max_months; END IF;
  IF k = 'immo' AND _months NOT BETWEEN s.immo_min_months AND s.immo_max_months THEN RAISE EXCEPTION 'Durée de % à % mois', s.immo_min_months, s.immo_max_months; END IF;
  IF _down_payment < CEIL(cat.price * s.min_down_percent / 100.0) THEN RAISE EXCEPTION 'Apport minimum : % crédits', CEIL(cat.price * s.min_down_percent / 100.0); END IF;
  IF _down_payment >= cat.price THEN RAISE EXCEPTION 'Apport égal au prix : achetez comptant'; END IF;
  IF k = 'immo' THEN fees := ceil(cat.price * 0.075)::integer; END IF;
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < _down_payment + fees THEN RAISE EXCEPTION 'Solde insuffisant pour l''apport'; END IF;
  r := CASE WHEN k = 'auto' THEN s.auto_rate ELSE s.immo_rate END;
  principal := cat.price - _down_payment;
  monthly := public.credit_monthly(principal, r, _months);
  income := public.bank_monthly_income(cid);
  IF income <= 0 THEN RAISE EXCEPTION 'Un emploi est nécessaire pour obtenir un crédit'; END IF;
  IF (public.credit_monthly_burden(cid) + monthly) * 100 > income * s.max_debt_percent THEN
    RAISE EXCEPTION 'Mensualités trop élevées : maximum % %% de vos revenus (% crédits par mois)', s.max_debt_percent, floor(income * s.max_debt_percent / 100.0)::integer - public.credit_monthly_burden(cid); END IF;
  ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
  PERFORM public.economy_cash(cid, 'shop:' || _request_id, -_down_payment, 'Apport — ' || (cat.config->>'brand') || ' ' || cat.name, 'achat',
    jsonb_build_object('catalog_id', cat.id, 'reference', ref, 'credit', principal));
  IF fees > 0 THEN
    PERFORM public.economy_cash(cid, 'shop-notary:' || _request_id, -fees, 'Frais de notaire — ' || cat.name, 'logement', jsonb_build_object('reference', ref));
  END IF;
  INSERT INTO public.personal_assets (character_id, catalog_id, purchase_price, next_maintenance)
  VALUES (cid, cat.id, cat.price, CASE WHEN cat.kind = 'vehicle' THEN t + COALESCE((cat.config->>'maintenance_days')::integer, 30) * interval '1 day' END);
  INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
  VALUES (cid, cat.id, cat.name || ' (à crédit)', cat.config->>'brand', cat.price + fees, _request_id, ref);
  INSERT INTO public.purchase_credits (character_id, request_key, catalog_id, kind, label, price, down_payment, principal, months, rate, monthly, remaining, next_due)
  VALUES (cid, _request_id::text, cat.id, k, cat.name, cat.price, _down_payment, principal, _months, r, monthly, principal, t + bs.month_days * interval '1 day')
  RETURNING * INTO cr;
  RETURN jsonb_build_object('credit_id', cr.id, 'already', false, 'monthly', monthly, 'reference', ref, 'fees', fees);
END $$;

CREATE FUNCTION public.shop_sell(_asset_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; s public.purchase_credit_settings; a public.personal_assets; cat public.economy_catalog; sale public.shop_sales; cr public.purchase_credits;
  t timestamptz := public.game_now(); value integer; amount integer; repaid integer := 0; realestate boolean; BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO sale FROM public.shop_sales WHERE character_id = cid AND request_id = _request_id;
  IF FOUND THEN RETURN jsonb_build_object('amount', sale.amount, 'already', true); END IF;
  PERFORM public.purchase_credit_settle(cid);
  SELECT * INTO s FROM public.purchase_credit_settings WHERE id = 1;
  SELECT * INTO a FROM public.personal_assets WHERE id = _asset_id AND character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bien introuvable dans votre patrimoine'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = a.catalog_id;
  IF COALESCE(cat.config->>'shop','false') <> 'true' THEN RAISE EXCEPTION 'Ce bien ne peut pas être revendu ici'; END IF;
  realestate := COALESCE(cat.config->>'realestate','false') = 'true';
  IF realestate AND EXISTS (SELECT 1 FROM public.housing_leases WHERE character_id = cid AND status = 'actif' AND property_id = cat.id) THEN
    RAISE EXCEPTION 'Vous habitez ce logement : déménagez avant de le vendre'; END IF;
  value := public.asset_value(a.purchase_price, (cat.config->>'dep')::numeric, a.acquired_at, t);
  amount := floor(value * (CASE WHEN realestate THEN s.realestate_resale_percent ELSE s.resale_percent END) / 100.0)::integer;
  SELECT * INTO cr FROM public.purchase_credits WHERE character_id = cid AND catalog_id = cat.id AND status = 'active' FOR UPDATE;
  IF FOUND THEN
    IF amount < cr.remaining THEN RAISE EXCEPTION 'La vente (% crédits) ne couvre pas le crédit restant (% crédits)', amount, cr.remaining; END IF;
    repaid := cr.remaining;
    UPDATE public.purchase_credits SET remaining = 0, status = 'sold', closed_at = t WHERE id = cr.id;
  END IF;
  DELETE FROM public.personal_assets WHERE id = a.id;
  INSERT INTO public.shop_sales (character_id, request_id, catalog_id, name, amount, credit_repaid) VALUES (cid, _request_id, cat.id, cat.name, amount, repaid) RETURNING * INTO sale;
  IF amount - repaid > 0 THEN
    PERFORM public.economy_cash(cid, 'shop-sell:' || _request_id, amount - repaid, 'Revente — ' || cat.name || CASE WHEN repaid > 0 THEN ' (crédit soldé)' ELSE '' END, 'achat');
  END IF;
  IF NOT realestate THEN
    INSERT INTO public.secondhand_listings (catalog_id, price, condition, origin)
    VALUES (cat.id, GREATEST(1, floor(amount * s.secondhand_markup / 100.0))::integer, CASE WHEN a.condition = 'Entretien nécessaire' THEN 'À entretenir' ELSE 'Bon état' END, 'reprise');
  END IF;
  RETURN jsonb_build_object('amount', amount, 'credit_repaid', repaid, 'already', false);
END $$;

CREATE FUNCTION public.secondhand_buy(_listing_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; l public.secondhand_listings; cat public.economy_catalog; ref text; t timestamptz := public.game_now(); BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO l FROM public.secondhand_listings WHERE buyer_id = cid AND request_id = _request_id;
  IF FOUND THEN RETURN jsonb_build_object('already', true); END IF;
  SELECT * INTO l FROM public.secondhand_listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND OR l.status <> 'open' THEN RAISE EXCEPTION 'Annonce déjà vendue'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = l.catalog_id;
  IF EXISTS (SELECT 1 FROM public.personal_assets WHERE character_id = cid AND catalog_id = cat.id) THEN RAISE EXCEPTION 'Vous possédez déjà ce produit'; END IF;
  IF c.age < COALESCE((cat.config->>'min_age')::integer, 16) THEN RAISE EXCEPTION 'Âge insuffisant'; END IF;
  IF cat.config ? 'license' AND COALESCE((c.progression->>(cat.config->>'license'))::integer, 0) < 1 THEN RAISE EXCEPTION 'Permis requis'; END IF;
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < l.price THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
  PERFORM public.economy_cash(cid, 'secondhand:' || _request_id, -l.price, 'Seconde main — ' || cat.name, 'achat', jsonb_build_object('catalog_id', cat.id, 'reference', ref));
  INSERT INTO public.personal_assets (character_id, catalog_id, purchase_price, condition, next_maintenance)
  VALUES (cid, cat.id, l.price, CASE WHEN l.condition = 'À entretenir' THEN 'Entretien nécessaire' ELSE 'Bon état' END,
    CASE WHEN cat.kind = 'vehicle' THEN t + COALESCE((cat.config->>'maintenance_days')::integer, 30) * interval '1 day' END);
  INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
  VALUES (cid, cat.id, cat.name || ' (seconde main)', COALESCE(cat.config->>'brand', ''), l.price, _request_id, ref);
  UPDATE public.secondhand_listings SET status = 'sold', buyer_id = cid, request_id = _request_id, sold_at = t WHERE id = l.id;
  RETURN jsonb_build_object('already', false, 'reference', ref);
END $$;

-- 6. État de la boutique (remplace la version 0077, mêmes champs + nouveaux) -----------------
CREATE OR REPLACE FUNCTION public.shop_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; t timestamptz; c public.characters; s public.purchase_credit_settings; income integer;
BEGIN
  cid := public.prepare_daily_life();
  PERFORM public.purchase_credit_settle(cid);
  t := public.game_now();
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.purchase_credit_settings WHERE id = 1;
  income := public.bank_monthly_income(cid);
  RETURN jsonb_build_object(
    'balance', COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0),
    'license', COALESCE((c.progression->>'Permis')::integer, 0) >= 1, 'age', c.age, 'city', c.city_id,
    'products', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ec.id, 'name', ec.name, 'price', ec.price, 'kind', ec.kind,
        'brand', ec.config->>'brand', 'section', ec.config->>'section', 'desc', ec.config->>'desc', 'dep', (ec.config->>'dep')::integer,
        'details', ec.config - 'shop' - 'desc' - 'brand' - 'section' - 'dep',
        'owned', EXISTS (SELECT 1 FROM public.personal_assets a WHERE a.character_id = cid AND a.catalog_id = ec.id),
        'sales', (SELECT count(*) FROM public.shop_orders so WHERE so.catalog_id = ec.id)) ORDER BY ec.sort_order)
      FROM public.economy_catalog ec WHERE COALESCE(ec.config->>'shop', 'false') = 'true'), '[]'),
    'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('reference', so.reference, 'name', so.name, 'brand', so.brand, 'price', so.price, 'at', so.ordered_at) ORDER BY so.ordered_at DESC)
      FROM public.shop_orders so WHERE so.character_id = cid), '[]'),
    'assets', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'catalog_id', a.catalog_id, 'name', ec.name, 'kind', ec.kind, 'brand', ec.config->>'brand',
        'price', a.purchase_price, 'acquired_at', a.acquired_at, 'condition', a.condition, 'next_maintenance', a.next_maintenance,
        'maintenance', (ec.config->>'maintenance')::integer, 'shop', COALESCE(ec.config->>'shop','false') = 'true',
        'realestate', COALESCE(ec.config->>'realestate','false') = 'true',
        'lived_in', EXISTS (SELECT 1 FROM public.housing_leases hl WHERE hl.character_id = cid AND hl.status = 'actif' AND hl.property_id = a.catalog_id),
        'credit_remaining', (SELECT pc.remaining FROM public.purchase_credits pc WHERE pc.character_id = cid AND pc.catalog_id = a.catalog_id AND pc.status = 'active'),
        'value', public.asset_value(a.purchase_price, (ec.config->>'dep')::numeric, a.acquired_at, t),
        'sell_price', floor(public.asset_value(a.purchase_price, (ec.config->>'dep')::numeric, a.acquired_at, t)
          * (CASE WHEN COALESCE(ec.config->>'realestate','false') = 'true' THEN s.realestate_resale_percent ELSE s.resale_percent END) / 100.0)::integer)
        ORDER BY a.purchase_price DESC)
      FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id WHERE a.character_id = cid), '[]'),
    'credit', jsonb_build_object('income', income, 'burden', public.credit_monthly_burden(cid),
      'max_monthly', GREATEST(0, floor(income * s.max_debt_percent / 100.0)::integer - public.credit_monthly_burden(cid)),
      'settings', to_jsonb(s) - 'id',
      'score', (SELECT score FROM public.bank_profiles WHERE character_id = cid),
      'list', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pc.id, 'label', pc.label, 'kind', pc.kind, 'price', pc.price, 'down_payment', pc.down_payment,
          'principal', pc.principal, 'months', pc.months, 'rate', pc.rate, 'monthly', pc.monthly, 'remaining', pc.remaining, 'paid_count', pc.paid_count,
          'missed', pc.missed, 'next_due', pc.next_due, 'status', pc.status) ORDER BY pc.status = 'active' DESC, pc.created_at DESC)
        FROM public.purchase_credits pc WHERE pc.character_id = cid), '[]')),
    'secondhand', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'catalog_id', l.catalog_id, 'name', ec.name, 'brand', ec.config->>'brand',
        'section', ec.config->>'section', 'kind', ec.kind, 'price', l.price, 'new_price', ec.price, 'condition', l.condition, 'origin', l.origin,
        'owned', EXISTS (SELECT 1 FROM public.personal_assets a WHERE a.character_id = cid AND a.catalog_id = l.catalog_id)) ORDER BY l.listed_at DESC, ec.sort_order)
      FROM public.secondhand_listings l JOIN public.economy_catalog ec ON ec.id = l.catalog_id WHERE l.status = 'open'), '[]'),
    'sales', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', ss.name, 'amount', ss.amount, 'credit_repaid', ss.credit_repaid, 'at', ss.sold_at) ORDER BY ss.sold_at DESC)
      FROM public.shop_sales ss WHERE ss.character_id = cid), '[]'));
END $$;

REVOKE ALL ON FUNCTION public.purchase_credit_settle(uuid), public.credit_monthly_burden(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_buy_credit(text, integer, integer, uuid), public.shop_sell(uuid, uuid), public.secondhand_buy(uuid, uuid) TO authenticated;

COMMIT;
