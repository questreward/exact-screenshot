-- 0097 — Transports du quotidien : abonnement, contrôles, assurance auto, contrôle technique, radars.
-- Touché :
--   * 5 nouvelles tables : transport_settings (montants réglables), transit_passes (abonnements mensuels),
--     transport_profiles (choix « voyager sans ticket », points perdus, reste à payer), transport_ledger (frais/amendes, clés uniques),
--     vehicle_inspections (contrôle technique par voiture).
--   * 2 déclencheurs ajoutés sur activities (aucune fonction existante remplacée) :
--     - avant un trajet en voiture : refusé si contrôle technique dépassé, frais auto impayés ou plus aucun point ;
--     - après un trajet : ticket remboursé si abonnement, contrôle possible si voyage sans ticket, radar possible en voiture.
--   * 6 fonctions joueur : transport_state, transit_buy_pass, transport_set_without_ticket, transport_inspect + 3 internes.
--   * Montants existants inchangés : ticket 2 € (déjà payé à chaque trajet) et frais d'usage voiture (carburant) restent tels quels.
-- Règles validées par Alex : abonnement 86 €/mois (moitié remboursée si emploi) ; sans ticket 1 chance sur 10 de contrôle, 50 € ;
--   assurance auto 60 €/mois (90 € les 3 premières années de permis), à partir du mois qui suit l'installation ;
--   contrôle technique 80 € tous les 2 ans (voiture bloquée si dépassé) ; radar 3 chances sur 100, 135 € et 1 point.
--   Jamais de solde négatif : ce qui ne peut être payé reste dû, prélevé plus tard, et bloque la voiture.
-- Installation : docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0097_daily_transport.sql
BEGIN;

CREATE TABLE public.transport_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  installed_at timestamptz NOT NULL DEFAULT public.game_now(),
  pass_price integer NOT NULL DEFAULT 86,
  employer_pct integer NOT NULL DEFAULT 50,
  control_one_in integer NOT NULL DEFAULT 10,
  fare_fine integer NOT NULL DEFAULT 50,
  insurance_month integer NOT NULL DEFAULT 60,
  insurance_young_month integer NOT NULL DEFAULT 90,
  young_years integer NOT NULL DEFAULT 3,
  inspection_price integer NOT NULL DEFAULT 80,
  inspection_years integer NOT NULL DEFAULT 2,
  radar_pct integer NOT NULL DEFAULT 3,
  radar_fine integer NOT NULL DEFAULT 135,
  radar_points integer NOT NULL DEFAULT 1,
  points_full integer NOT NULL DEFAULT 12,
  points_young integer NOT NULL DEFAULT 6,
  catchup_months integer NOT NULL DEFAULT 12
);
INSERT INTO public.transport_settings (id) VALUES (1);

CREATE TABLE public.transit_passes (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  month text NOT NULL,
  price integer NOT NULL,
  employer_refund integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, month)
);
CREATE TABLE public.transport_profiles (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  without_ticket boolean NOT NULL DEFAULT false,
  points_lost integer NOT NULL DEFAULT 0 CHECK (points_lost >= 0),
  debt integer NOT NULL DEFAULT 0 CHECK (debt >= 0),
  paid_total integer NOT NULL DEFAULT 0 CHECK (paid_total >= 0)
);
CREATE TABLE public.transport_ledger (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('abonnement','remboursement','controle','amende_transport','assurance','controle_technique','radar')),
  amount integer NOT NULL,
  label text NOT NULL,
  unpaid integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, key)
);
CREATE TABLE public.vehicle_inspections (
  asset_id uuid PRIMARY KEY REFERENCES public.personal_assets(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  last_at timestamptz,
  due_at timestamptz NOT NULL
);

GRANT SELECT ON public.transport_settings, public.transit_passes, public.transport_profiles, public.transport_ledger, public.vehicle_inspections TO authenticated;
GRANT ALL ON public.transport_settings, public.transit_passes, public.transport_profiles, public.transport_ledger, public.vehicle_inspections TO service_role;
ALTER TABLE public.transport_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_settings_read ON public.transport_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY transit_passes_owner ON public.transit_passes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY transport_profiles_owner ON public.transport_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY transport_ledger_owner ON public.transport_ledger FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY vehicle_inspections_owner ON public.vehicle_inspections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE FUNCTION public.transport_balance(_cid uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT balance FROM public.accounts WHERE character_id = _cid ORDER BY created_at LIMIT 1), 0) $$;

-- Frais ou amende (une seule fois par clé) : payé si possible, sinon ajouté au reste à payer.
CREATE FUNCTION public.transport_charge(_cid uuid, _key text, _kind text, _amount integer, _label text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pay int; BEGIN
  INSERT INTO public.transport_profiles (character_id) VALUES (_cid) ON CONFLICT DO NOTHING;
  IF EXISTS (SELECT 1 FROM public.transport_ledger WHERE character_id = _cid AND key = _key) THEN RETURN; END IF;
  pay := least(_amount, greatest(public.transport_balance(_cid), 0));
  INSERT INTO public.transport_ledger (character_id, key, kind, amount, label, unpaid) VALUES (_cid, _key, _kind, _amount, _label, _amount - pay);
  IF pay > 0 THEN PERFORM public.economy_cash(_cid, 'transport:' || _key, -pay, _label, 'transport', '{}'::jsonb); END IF;
  IF _amount > pay THEN UPDATE public.transport_profiles SET debt = debt + (_amount - pay) WHERE character_id = _cid; END IF;
END $$;

-- Règlement idempotent : assurance des mois échus, contrôles techniques à suivre, paiement du reste dû.
CREATE FUNCTION public.transport_settle(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.transport_settings; p public.transport_profiles; now_m date; m date; lic timestamptz; price int; pay int; BEGIN
  SELECT * INTO s FROM public.transport_settings WHERE id = 1;
  INSERT INTO public.transport_profiles (character_id) VALUES (_cid) ON CONFLICT DO NOTHING;
  SELECT * INTO p FROM public.transport_profiles WHERE character_id = _cid FOR UPDATE;
  INSERT INTO public.vehicle_inspections (asset_id, character_id, due_at)
    SELECT a.id, _cid, greatest(a.acquired_at, s.installed_at) + s.inspection_years * interval '1 year'
    FROM public.personal_assets a JOIN public.economy_catalog e ON e.id = a.catalog_id
    WHERE a.character_id = _cid AND e.kind = 'vehicle' ON CONFLICT DO NOTHING;
  SELECT license_at INTO lic FROM public.driving_licenses WHERE character_id = _cid;
  now_m := date_trunc('month', public.game_now() AT TIME ZONE 'UTC')::date;
  m := greatest((date_trunc('month', s.installed_at AT TIME ZONE 'UTC') + interval '1 month')::date, (now_m - s.catchup_months * interval '1 month')::date);
  WHILE m <= now_m LOOP
    IF EXISTS (SELECT 1 FROM public.personal_assets a JOIN public.economy_catalog e ON e.id = a.catalog_id
               WHERE a.character_id = _cid AND e.kind = 'vehicle' AND a.acquired_at < (m + interval '1 month')) THEN
      price := CASE WHEN lic IS NOT NULL AND lic > m - s.young_years * interval '1 year' THEN s.insurance_young_month ELSE s.insurance_month END;
      PERFORM public.transport_charge(_cid, 'assurance:' || to_char(m, 'YYYY-MM'), 'assurance', price, 'Assurance auto — ' || to_char(m, 'MM/YYYY'));
    END IF;
    m := (m + interval '1 month')::date;
  END LOOP;
  SELECT * INTO p FROM public.transport_profiles WHERE character_id = _cid;
  pay := least(p.debt, greatest(public.transport_balance(_cid), 0));
  IF pay > 0 THEN
    PERFORM public.economy_cash(_cid, 'transport:pay:' || p.paid_total, -pay, 'Transports — règlement du reste dû', 'transport', '{}'::jsonb);
    UPDATE public.transport_profiles SET debt = debt - pay, paid_total = paid_total + pay WHERE character_id = _cid;
  END IF;
END $$;

-- Avant un trajet en voiture : contrôle technique, frais auto et points.
CREATE FUNCTION public.transport_check_car_trip() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.transport_settings; p public.transport_profiles; lic timestamptz; BEGIN
  IF NEW.type <> 'economy' OR COALESCE(NEW.economy_payload->>'action', '') <> 'travel' THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.transport_settings WHERE id = 1;
  PERFORM public.transport_settle(NEW.character_id);
  SELECT * INTO p FROM public.transport_profiles WHERE character_id = NEW.character_id;
  IF p.debt > 0 THEN RAISE EXCEPTION 'Voiture bloquée : réglez d''abord vos frais auto ou amendes (% €).', p.debt; END IF;
  IF EXISTS (SELECT 1 FROM public.vehicle_inspections v JOIN public.personal_assets a ON a.id = v.asset_id
             WHERE a.character_id = NEW.character_id AND a.catalog_id = NEW.economy_payload->>'catalog_id' AND v.due_at <= public.game_now()) THEN
    RAISE EXCEPTION 'Voiture bloquée : contrôle technique à faire (page Transports).'; END IF;
  SELECT license_at INTO lic FROM public.driving_licenses WHERE character_id = NEW.character_id;
  IF lic IS NOT NULL AND p.points_lost >= (CASE WHEN lic > public.game_now() - s.young_years * interval '1 year' THEN s.points_young ELSE s.points_full END) THEN
    RAISE EXCEPTION 'Permis invalide : plus aucun point.'; END IF;
  RETURN NEW;
END $$;

-- Après un trajet : abonnement, voyage sans ticket (contrôle), radar.
CREATE FUNCTION public.transport_after_trip() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.transport_settings; p public.transport_profiles; BEGIN
  SELECT * INTO s FROM public.transport_settings WHERE id = 1;
  IF NEW.type = 'transport' AND NEW.status = 'running' AND COALESCE(NEW.money_cost, 0) > 0 THEN
    INSERT INTO public.transport_profiles (character_id) VALUES (NEW.character_id) ON CONFLICT DO NOTHING;
    SELECT * INTO p FROM public.transport_profiles WHERE character_id = NEW.character_id;
    IF EXISTS (SELECT 1 FROM public.transit_passes WHERE character_id = NEW.character_id AND month = to_char(NEW.start_time AT TIME ZONE 'UTC', 'YYYY-MM')) THEN
      PERFORM public.economy_cash(NEW.character_id, 'transport:pass-ride:' || NEW.id, NEW.money_cost, 'Trajet couvert par l''abonnement', 'transport', '{}'::jsonb);
    ELSIF p.without_ticket THEN
      PERFORM public.economy_cash(NEW.character_id, 'transport:no-ticket:' || NEW.id, NEW.money_cost, 'Trajet sans ticket', 'transport', '{}'::jsonb);
      IF abs(hashtext(NEW.id::text || ':controle')) % s.control_one_in = 0 THEN
        PERFORM public.transport_charge(NEW.character_id, 'controle:' || NEW.id, 'amende_transport', s.fare_fine, 'Contrôle : voyage sans titre de transport');
      END IF;
    END IF;
  ELSIF NEW.type = 'economy' AND COALESCE(NEW.economy_payload->>'action', '') = 'travel' THEN
    IF abs(hashtext(NEW.id::text || ':radar')) % 100 < s.radar_pct THEN
      PERFORM public.transport_charge(NEW.character_id, 'radar:' || NEW.id, 'radar', s.radar_fine, 'Avis de contravention : excès de vitesse (radar)');
      UPDATE public.transport_profiles SET points_lost = points_lost + s.radar_points WHERE character_id = NEW.character_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER transport_check_car_trip BEFORE INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.transport_check_car_trip();
CREATE TRIGGER transport_after_trip AFTER INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.transport_after_trip();

CREATE FUNCTION public.transport_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); cur text := to_char(public.game_now() AT TIME ZONE 'UTC', 'YYYY-MM'); BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  PERFORM public.transport_settle(cid);
  RETURN jsonb_build_object('now', public.game_now(), 'month', cur, 'balance', public.transport_balance(cid),
    'employed', EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid),
    'settings', (SELECT to_jsonb(s) - 'id' FROM public.transport_settings s),
    'profile', (SELECT to_jsonb(p) - 'character_id' FROM public.transport_profiles p WHERE p.character_id = cid),
    'license_at', (SELECT license_at FROM public.driving_licenses WHERE character_id = cid),
    'pass', (SELECT to_jsonb(x) - 'character_id' FROM public.transit_passes x WHERE x.character_id = cid AND x.month = cur),
    'cars', COALESCE((SELECT jsonb_agg(jsonb_build_object('asset_id', a.id, 'name', e.name, 'due_at', v.due_at, 'last_at', v.last_at) ORDER BY e.name)
      FROM public.personal_assets a JOIN public.economy_catalog e ON e.id = a.catalog_id JOIN public.vehicle_inspections v ON v.asset_id = a.id
      WHERE a.character_id = cid), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(to_jsonb(x) - 'character_id' ORDER BY x.created_at DESC)
      FROM (SELECT * FROM public.transport_ledger WHERE character_id = cid ORDER BY created_at DESC LIMIT 20) x), '[]'::jsonb));
END $$;

CREATE FUNCTION public.transit_buy_pass() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.transport_settings; cur text := to_char(public.game_now() AT TIME ZONE 'UTC', 'YYYY-MM'); refund int := 0; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.transport_settings WHERE id = 1;
  IF EXISTS (SELECT 1 FROM public.transit_passes WHERE character_id = cid AND month = cur) THEN RETURN public.transport_state(); END IF;
  IF public.transport_balance(cid) < s.pass_price THEN RAISE EXCEPTION 'Solde insuffisant (% €).', s.pass_price; END IF;
  IF EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid) THEN refund := round(s.pass_price * s.employer_pct / 100.0)::int; END IF;
  INSERT INTO public.transit_passes (character_id, month, price, employer_refund) VALUES (cid, cur, s.pass_price, refund);
  INSERT INTO public.transport_ledger (character_id, key, kind, amount, label) VALUES (cid, 'abonnement:' || cur, 'abonnement', s.pass_price, 'Abonnement mensuel ' || cur);
  PERFORM public.economy_cash(cid, 'transport:abonnement:' || cur, -s.pass_price, 'Abonnement transports — ' || cur, 'transport', '{}'::jsonb);
  IF refund > 0 THEN
    INSERT INTO public.transport_ledger (character_id, key, kind, amount, label) VALUES (cid, 'remboursement:' || cur, 'remboursement', refund, 'Prise en charge employeur 50 %');
    PERFORM public.economy_cash(cid, 'transport:employeur:' || cur, refund, 'Remboursement employeur — abonnement ' || cur, 'transport', '{}'::jsonb);
  END IF;
  RETURN public.transport_state();
END $$;

CREATE FUNCTION public.transport_set_without_ticket(_on boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  INSERT INTO public.transport_profiles (character_id) VALUES (cid) ON CONFLICT DO NOTHING;
  UPDATE public.transport_profiles SET without_ticket = COALESCE(_on, false) WHERE character_id = cid;
  RETURN public.transport_state();
END $$;

CREATE FUNCTION public.transport_inspect(_asset uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.transport_settings; v public.vehicle_inspections; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  PERFORM public.transport_settle(cid);
  SELECT * INTO s FROM public.transport_settings WHERE id = 1;
  SELECT * INTO v FROM public.vehicle_inspections WHERE asset_id = _asset AND character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Voiture introuvable.'; END IF;
  IF v.due_at > public.game_now() + interval '60 days' THEN RAISE EXCEPTION 'Contrôle technique possible dans les 2 mois avant l''échéance.'; END IF;
  IF public.transport_balance(cid) < s.inspection_price THEN RAISE EXCEPTION 'Solde insuffisant (% €).', s.inspection_price; END IF;
  PERFORM public.transport_charge(cid, 'ct:' || _asset || ':' || v.due_at::date, 'controle_technique', s.inspection_price, 'Contrôle technique');
  UPDATE public.vehicle_inspections SET last_at = public.game_now(), due_at = public.game_now() + s.inspection_years * interval '1 year' WHERE asset_id = _asset;
  RETURN public.transport_state();
END $$;

REVOKE ALL ON FUNCTION public.transport_balance(uuid), public.transport_charge(uuid, text, text, integer, text), public.transport_settle(uuid),
  public.transport_check_car_trip(), public.transport_after_trip() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transport_balance(uuid), public.transport_charge(uuid, text, text, integer, text), public.transport_settle(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.transport_state(), public.transit_buy_pass(), public.transport_set_without_ticket(boolean), public.transport_inspect(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transport_state(), public.transit_buy_pass(), public.transport_set_without_ticket(boolean), public.transport_inspect(uuid) TO authenticated, service_role;

COMMIT;
