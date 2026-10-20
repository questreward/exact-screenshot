-- 0101 — Usure des véhicules et réparations au garage.
-- Touché :
--   * 3 nouvelles tables : vehicle_wear_settings (réglages), vehicle_wear (état 0–100 % par voiture possédée),
--     vehicle_wear_log (chaque usure/réparation/panne, clé unique = jamais compté deux fois).
--   * 3 déclencheurs ajoutés (aucun remplacé) : avant un trajet en ville (refus à 0 %), après un trajet en ville (−1 %, −2 % si flashé),
--     avant/après un trajet entre villes (refus à 0 % ; à l'arrivée −4 %, −2 % si flashé, panne possible sous 40 %).
--   * Fonctions : vehicle_wear_row (interne), vehicle_wear_apply (interne), vehicle_wear_state, vehicle_repair.
--   * Réutilise sans les modifier : service_pay (garage d'un joueur en priorité, sinon garage fictif, caisse de l'entreprise),
--     transport_charge (dépanneuse : dette si solde insuffisant, jamais de solde négatif), economy_cash.
-- Règles validées par Alex : neuf 100 %, occasion 75 % ; −1 % en ville, −4 % entre villes, −2 % si flashé ;
--   sous 40 % : 10 % de panne entre villes (dépanneuse 120 €) ; 0 % = immobilisée ;
--   réparation = 1,5 % du prix d'achat par tranche de 10 % réparée (tarif du garage joueur appliqué).
-- Installation : docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0101_vehicle_wear.sql
BEGIN;

-- Seule modification d'existant : le journal des transports accepte le nouveau type « depannage ».
ALTER TABLE public.transport_ledger DROP CONSTRAINT transport_ledger_kind_check;
ALTER TABLE public.transport_ledger ADD CONSTRAINT transport_ledger_kind_check
  CHECK (kind IN ('abonnement','remboursement','controle','amende_transport','assurance','controle_technique','radar','depannage'));

CREATE TABLE public.vehicle_wear_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  used_start integer NOT NULL DEFAULT 75,
  city_trip integer NOT NULL DEFAULT 1,
  intercity_trip integer NOT NULL DEFAULT 4,
  flash_extra integer NOT NULL DEFAULT 2,
  breakdown_below integer NOT NULL DEFAULT 40,
  breakdown_pct integer NOT NULL DEFAULT 10,
  tow_price integer NOT NULL DEFAULT 120,
  repair_permille_per_10 integer NOT NULL DEFAULT 15
);
INSERT INTO public.vehicle_wear_settings DEFAULT VALUES;

CREATE TABLE public.vehicle_wear (
  asset_id uuid PRIMARY KEY REFERENCES public.personal_assets(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  condition_pct integer NOT NULL CHECK (condition_pct BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vehicle_wear_log (
  key text PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.personal_assets(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('usure','panne','reparation')),
  delta integer NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
GRANT SELECT ON public.vehicle_wear_settings, public.vehicle_wear, public.vehicle_wear_log TO authenticated;
GRANT ALL ON public.vehicle_wear_settings, public.vehicle_wear, public.vehicle_wear_log TO service_role;
ALTER TABLE public.vehicle_wear_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_wear ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_wear_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wear settings read" ON public.vehicle_wear_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "own wear read" ON public.vehicle_wear FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY "own wear log read" ON public.vehicle_wear_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- Interne : état de la voiture (créé à la première lecture : neuve 100 %, occasion 75 %), verrouillé.
CREATE FUNCTION public.vehicle_wear_row(_cid uuid, _catalog text) RETURNS public.vehicle_wear LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.personal_assets; e public.economy_catalog; w public.vehicle_wear; s public.vehicle_wear_settings;
BEGIN
  SELECT * INTO a FROM public.personal_assets WHERE character_id = _cid AND catalog_id = _catalog;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO e FROM public.economy_catalog WHERE id = _catalog;
  IF e.kind <> 'vehicle' THEN RETURN NULL; END IF;
  SELECT * INTO s FROM public.vehicle_wear_settings WHERE id = 1;
  INSERT INTO public.vehicle_wear (asset_id, character_id, condition_pct)
  VALUES (a.id, _cid, CASE WHEN e.config->>'condition' = 'occasion' THEN s.used_start ELSE 100 END) ON CONFLICT DO NOTHING;
  SELECT * INTO w FROM public.vehicle_wear WHERE asset_id = a.id FOR UPDATE;
  RETURN w;
END $$;

-- Interne : applique une usure une seule fois (clé unique), jamais sous 0.
CREATE FUNCTION public.vehicle_wear_apply(_cid uuid, _catalog text, _key text, _delta integer, _label text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.vehicle_wear; nv integer;
BEGIN
  w := public.vehicle_wear_row(_cid, _catalog);
  IF w.asset_id IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.vehicle_wear_log WHERE key = _key) THEN RETURN w.condition_pct; END IF;
  nv := GREATEST(0, w.condition_pct - _delta);
  INSERT INTO public.vehicle_wear_log (key, asset_id, character_id, kind, delta, label) VALUES (_key, w.asset_id, _cid, 'usure', nv - w.condition_pct, _label);
  UPDATE public.vehicle_wear SET condition_pct = nv, updated_at = now() WHERE asset_id = w.asset_id;
  IF nv = 0 THEN
    PERFORM public.economy_notify(_cid, 'wear-zero:' || _key, 'Voiture immobilisée', 'Votre voiture est à 0 % : passez au garage (page Transports).');
  END IF;
  RETURN nv;
END $$;

-- Refus de partir avec une voiture à 0 %.
CREATE FUNCTION public.vehicle_wear_guard_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.vehicle_wear;
BEGIN
  IF NEW.type <> 'economy' OR COALESCE(NEW.economy_payload->>'action', '') <> 'travel' THEN RETURN NEW; END IF;
  w := public.vehicle_wear_row(NEW.character_id, NEW.economy_payload->>'catalog_id');
  IF w.asset_id IS NOT NULL AND w.condition_pct <= 0 THEN RAISE EXCEPTION 'Voiture immobilisée (0 %%) : réparez-la au garage.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vehicle_wear_guard_activity BEFORE INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.vehicle_wear_guard_activity();

-- Trajet en ville : −1 %, −2 % de plus si le radar habituel a flashé (même tirage que 0097).
CREATE FUNCTION public.vehicle_wear_city_trip() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.vehicle_wear_settings; ts public.transport_settings; flashed boolean;
BEGIN
  IF NEW.type <> 'economy' OR COALESCE(NEW.economy_payload->>'action', '') <> 'travel' THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.vehicle_wear_settings WHERE id = 1;
  SELECT * INTO ts FROM public.transport_settings WHERE id = 1;
  flashed := abs(hashtext(NEW.id::text || ':radar')) % 100 < ts.radar_pct;
  PERFORM public.vehicle_wear_apply(NEW.character_id, NEW.economy_payload->>'catalog_id', 'wear:city:' || NEW.id,
    s.city_trip + CASE WHEN flashed THEN s.flash_extra ELSE 0 END, 'Trajet en ville' || CASE WHEN flashed THEN ' (flashé)' ELSE '' END);
  RETURN NEW;
END $$;
CREATE TRIGGER vehicle_wear_city_trip AFTER INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.vehicle_wear_city_trip();

-- Trajet entre villes : refus à 0 % au départ.
CREATE FUNCTION public.vehicle_wear_guard_drive() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.vehicle_wear;
BEGIN
  w := public.vehicle_wear_row(NEW.character_id, NEW.catalog_id);
  IF w.asset_id IS NOT NULL AND w.condition_pct <= 0 THEN RAISE EXCEPTION 'Voiture immobilisée (0 %%) : réparez-la au garage.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vehicle_wear_guard_drive BEFORE INSERT ON public.drive_trips FOR EACH ROW EXECUTE FUNCTION public.vehicle_wear_guard_drive();

-- À l'arrivée (trajet réglé une fois) : −4 %, −2 % si flashé ; sous 40 %, 10 % de panne → dépanneuse.
CREATE FUNCTION public.vehicle_wear_drive_settled() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.vehicle_wear_settings; w public.vehicle_wear; before integer;
BEGIN
  IF NOT NEW.settled OR OLD.settled THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.vehicle_wear_settings WHERE id = 1;
  w := public.vehicle_wear_row(NEW.character_id, NEW.catalog_id);
  IF w.asset_id IS NULL THEN RETURN NEW; END IF;
  before := w.condition_pct;
  PERFORM public.vehicle_wear_apply(NEW.character_id, NEW.catalog_id, 'wear:drive:' || NEW.activity_id,
    s.intercity_trip + CASE WHEN NEW.flashes > 0 THEN s.flash_extra ELSE 0 END,
    'Trajet ' || NEW.from_city || ' → ' || NEW.to_city || CASE WHEN NEW.flashes > 0 THEN ' (flashé)' ELSE '' END);
  IF before < s.breakdown_below AND abs(hashtext(NEW.activity_id::text || ':panne')) % 100 < s.breakdown_pct
     AND NOT EXISTS (SELECT 1 FROM public.vehicle_wear_log WHERE key = 'panne:' || NEW.activity_id) THEN
    INSERT INTO public.vehicle_wear_log (key, asset_id, character_id, kind, delta, amount, label)
    VALUES ('panne:' || NEW.activity_id, w.asset_id, NEW.character_id, 'panne', 0, s.tow_price, 'Panne sur la route : dépanneuse');
    PERFORM public.transport_charge(NEW.character_id, 'tow:' || NEW.activity_id, 'depannage', s.tow_price, 'Dépanneuse après une panne');
    PERFORM public.economy_notify(NEW.character_id, 'panne:' || NEW.activity_id, 'Panne sur la route',
      'Votre voiture usée est tombée en panne. Dépanneuse : ' || s.tow_price || ' €. Pensez au garage.');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vehicle_wear_drive_settled AFTER UPDATE OF settled ON public.drive_trips FOR EACH ROW EXECUTE FUNCTION public.vehicle_wear_drive_settled();

-- Prix de référence d'une réparation complète (garage fictif).
CREATE FUNCTION public.vehicle_repair_ref(_price integer, _cond integer) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _cond >= 100 THEN 0
    ELSE ceil((100 - _cond) / 10.0)::int * GREATEST(1, round(_price * (SELECT repair_permille_per_10 FROM public.vehicle_wear_settings WHERE id = 1) / 1000.0)::int) END
$$;

CREATE FUNCTION public.vehicle_wear_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); city text; r record;
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  FOR r IN SELECT a.catalog_id FROM public.personal_assets a JOIN public.economy_catalog e ON e.id = a.catalog_id WHERE a.character_id = cid AND e.kind = 'vehicle' LOOP
    PERFORM public.vehicle_wear_row(cid, r.catalog_id);
  END LOOP;
  RETURN jsonb_build_object(
    'settings', (SELECT to_jsonb(s) - 'id' FROM public.vehicle_wear_settings s),
    'cars', COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog_id', a.catalog_id, 'name', e.name, 'condition_pct', w.condition_pct,
        'repair_ref', public.vehicle_repair_ref(a.purchase_price, w.condition_pct)) ORDER BY e.name)
      FROM public.vehicle_wear w JOIN public.personal_assets a ON a.id = w.asset_id JOIN public.economy_catalog e ON e.id = a.catalog_id
      WHERE w.character_id = cid), '[]'::jsonb),
    'garages', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'percent', public.service_percent(b.id),
        'rating', public.service_rating(b.id)) ORDER BY public.service_percent(b.id), b.name)
      FROM public.businesses b WHERE b.sector_id = 'garage' AND b.status = 'active' AND b.city_id = city AND b.owner_id <> cid), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('kind', l.kind, 'delta', l.delta, 'amount', l.amount, 'label', l.label, 'at', l.created_at) ORDER BY l.created_at DESC)
      FROM (SELECT * FROM public.vehicle_wear_log WHERE character_id = cid ORDER BY created_at DESC LIMIT 20) l), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.vehicle_wear_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vehicle_wear_state() TO authenticated;

-- Réparation complète : garage d'un joueur (son tarif, argent dans sa caisse) ou garage fictif (_business NULL).
CREATE FUNCTION public.vehicle_repair(_catalog text, _business uuid, _request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); w public.vehicle_wear; a public.personal_assets; e public.economy_catalog; ref integer; amount integer; k text := 'repair:' || _request;
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.vehicle_wear_log WHERE vehicle_wear_log.key = k) THEN RETURN public.vehicle_wear_state(); END IF;
  w := public.vehicle_wear_row(cid, _catalog);
  IF w.asset_id IS NULL THEN RAISE EXCEPTION 'Véhicule introuvable.'; END IF;
  IF w.condition_pct >= 100 THEN RAISE EXCEPTION 'Cette voiture est déjà en parfait état.'; END IF;
  SELECT * INTO a FROM public.personal_assets WHERE id = w.asset_id;
  SELECT * INTO e FROM public.economy_catalog WHERE id = _catalog;
  ref := public.vehicle_repair_ref(a.purchase_price, w.condition_pct);
  amount := public.service_pay(cid, _business, 'garage', ref, k, 'Réparation — ' || e.name, 'transport');
  INSERT INTO public.vehicle_wear_log (key, asset_id, character_id, kind, delta, amount, label)
  VALUES (k, w.asset_id, cid, 'reparation', 100 - w.condition_pct, amount, 'Réparation au garage');
  UPDATE public.vehicle_wear SET condition_pct = 100, updated_at = now() WHERE asset_id = w.asset_id;
  RETURN public.vehicle_wear_state();
END $$;
REVOKE ALL ON FUNCTION public.vehicle_repair(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vehicle_repair(text, uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.vehicle_wear_row(uuid, text), public.vehicle_wear_apply(uuid, text, text, integer, text) FROM PUBLIC, anon, authenticated;

COMMIT;
