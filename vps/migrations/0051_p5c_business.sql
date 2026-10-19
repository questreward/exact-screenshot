-- CIVITAS – P5c : ENTREPRISES DES JOUEURS
-- Uniquement des ajouts. Tout ou rien. Aucune fonction existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0051_p5c_business.sql
-- Nécessite P5a/P5b. L'argent de l'entreprise reste dans sa propre caisse ;
-- l'argent personnel ne bouge que par economy_cash (apport, salaires encaissés, fermeture).
BEGIN;

-- 1. Réglages et secteurs -------------------------------------------------------------
CREATE TABLE public.business_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  min_age integer NOT NULL DEFAULT 18,
  founding_fee integer NOT NULL DEFAULT 300,
  max_owner_salary integer NOT NULL DEFAULT 400,
  min_player_salary integer NOT NULL DEFAULT 50,
  max_player_salary integer NOT NULL DEFAULT 400,
  shift_minutes integer NOT NULL DEFAULT 120,
  shift_energy integer NOT NULL DEFAULT 20,
  max_weeks_back integer NOT NULL DEFAULT 4,
  fail_strikes integer NOT NULL DEFAULT 3
);
CREATE TABLE public.business_sectors (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  location_kind text NOT NULL,
  min_capital integer NOT NULL,
  base_revenue integer NOT NULL,
  per_worker integer NOT NULL,
  per_shift integer NOT NULL,
  weekly_rent integer NOT NULL,
  npc_wage integer NOT NULL,
  max_npc integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.business_settings, public.business_sectors TO authenticated;
GRANT ALL ON public.business_settings, public.business_sectors TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_settings_read ON public.business_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY business_sectors_read ON public.business_sectors FOR SELECT TO authenticated USING (true);

INSERT INTO public.business_settings (id) VALUES (1);
INSERT INTO public.business_sectors (id, label, description, location_kind, min_capital, base_revenue, per_worker, per_shift, weekly_rent, npc_wage, max_npc, sort_order) VALUES
  ('commerce', 'Commerce', 'Une boutique de quartier : vêtements, épicerie fine, librairie…', 'commerce', 1000, 250, 120, 60, 150, 90, 5, 1),
  ('restauration', 'Restauration', 'Un café ou un petit restaurant.', 'cafe', 1500, 300, 140, 70, 200, 100, 6, 2),
  ('services', 'Services', 'Conseil, ménage, aide administrative…', 'entreprise', 1000, 200, 150, 80, 120, 110, 5, 3),
  ('artisanat', 'Artisanat', 'Réparations, menuiserie, couture…', 'commerce', 800, 180, 130, 90, 100, 95, 4, 4),
  ('numerique', 'Numérique', 'Sites web, applications, création de contenus.', 'entreprise', 2000, 150, 180, 100, 130, 140, 5, 5);

-- 2. Entreprises, caisse, personnel ----------------------------------------------------
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.characters(id),
  request_key text NOT NULL,
  name text NOT NULL,
  sector_id text NOT NULL REFERENCES public.business_sectors(id),
  city_id text NOT NULL REFERENCES public.cities(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','failed')),
  owner_salary integer NOT NULL DEFAULT 0 CHECK (owner_salary >= 0),
  settled_week integer NOT NULL,
  strikes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  closed_at timestamptz,
  UNIQUE (owner_id, request_key)
);
CREATE UNIQUE INDEX businesses_name_unique ON public.businesses (lower(name)) WHERE status = 'active';
CREATE UNIQUE INDEX businesses_one_active_per_owner ON public.businesses (owner_id) WHERE status = 'active';
CREATE TABLE public.business_treasuries (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id),
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0)
);
CREATE TABLE public.business_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  operation_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('capital','deposit','revenue','rent','npc_wage','player_salary','owner_salary','closing')),
  amount integer NOT NULL,
  label text NOT NULL,
  world_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (business_id, operation_key)
);
CREATE TABLE public.business_weeks (
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  week integer NOT NULL,
  revenue integer NOT NULL,
  costs integer NOT NULL,
  workers integer NOT NULL,
  shifts integer NOT NULL,
  PRIMARY KEY (business_id, week)
);
CREATE TABLE public.business_npc_staff (
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  npc_id uuid NOT NULL REFERENCES public.social_npcs(id),
  hired_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (business_id, npc_id)
);
CREATE UNIQUE INDEX business_npc_one_job ON public.business_npc_staff (npc_id);
CREATE TABLE public.business_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  title text NOT NULL,
  weekly_salary integer NOT NULL CHECK (weekly_salary > 0),
  open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.business_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  title text NOT NULL,
  weekly_salary integer NOT NULL CHECK (weekly_salary > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','left')),
  hired_at timestamptz NOT NULL DEFAULT public.game_now(),
  left_at timestamptz
);
CREATE UNIQUE INDEX business_employees_one_active ON public.business_employees (character_id) WHERE status = 'active';
CREATE TABLE public.business_payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  pay_key text NOT NULL UNIQUE,
  amount integer NOT NULL CHECK (amount > 0),
  label text NOT NULL,
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due','paid')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  paid_at timestamptz
);
CREATE TABLE public.business_work_log (
  activity_id uuid PRIMARY KEY REFERENCES public.activities(id),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  week integer NOT NULL
);
GRANT SELECT ON public.businesses, public.business_treasuries, public.business_ledger, public.business_weeks, public.business_npc_staff,
  public.business_offers, public.business_employees, public.business_payroll, public.business_work_log TO authenticated;
GRANT ALL ON public.businesses, public.business_treasuries, public.business_ledger, public.business_weeks, public.business_npc_staff,
  public.business_offers, public.business_employees, public.business_payroll, public.business_work_log TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_treasuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_npc_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_work_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY businesses_own ON public.businesses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = businesses.owner_id AND c.user_id = auth.uid()));
CREATE POLICY business_treasuries_own ON public.business_treasuries FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE b.id = business_treasuries.business_id AND c.user_id = auth.uid()));
CREATE POLICY business_ledger_own ON public.business_ledger FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE b.id = business_ledger.business_id AND c.user_id = auth.uid()));
CREATE POLICY business_weeks_own ON public.business_weeks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE b.id = business_weeks.business_id AND c.user_id = auth.uid()));
CREATE POLICY business_npc_staff_own ON public.business_npc_staff FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE b.id = business_npc_staff.business_id AND c.user_id = auth.uid()));
CREATE POLICY business_offers_own ON public.business_offers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE b.id = business_offers.business_id AND c.user_id = auth.uid()));
CREATE POLICY business_employees_own ON public.business_employees FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = business_employees.character_id AND c.user_id = auth.uid()));
CREATE POLICY business_payroll_own ON public.business_payroll FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = business_payroll.character_id AND c.user_id = auth.uid()));
CREATE POLICY business_work_log_own ON public.business_work_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = business_work_log.character_id AND c.user_id = auth.uid()));

-- Activité d'agenda « Travailler dans l'entreprise » (moteur agenda/énergie existant)
INSERT INTO public.life_rules (id, title, duration_minutes, energy_cost, energy_gain, money_cost, progression_gain, allowed_kinds)
VALUES ('business', 'Travailler dans mon entreprise', 120, 20, 0, 0, 0, ARRAY['commerce','cafe','entreprise'])
ON CONFLICT (id) DO NOTHING;

-- 3. Outils internes -------------------------------------------------------------------
CREATE FUNCTION public.business_move(_biz uuid, _key text, _amount integer, _kind text, _label text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal integer; BEGIN
  IF EXISTS (SELECT 1 FROM public.business_ledger WHERE business_id = _biz AND operation_key = _key) THEN RETURN false; END IF;
  SELECT balance INTO bal FROM public.business_treasuries WHERE business_id = _biz FOR UPDATE;
  IF bal + _amount < 0 THEN RETURN false; END IF;
  INSERT INTO public.business_ledger (business_id, operation_key, kind, amount, label) VALUES (_biz, _key, _kind, _amount, _label);
  UPDATE public.business_treasuries SET balance = balance + _amount WHERE business_id = _biz;
  RETURN true;
END $$;

CREATE FUNCTION public.business_release(_biz uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.business_npc_staff WHERE business_id = _biz;
  UPDATE public.business_offers SET open = false WHERE business_id = _biz;
  UPDATE public.business_employees SET status = 'left', left_at = public.game_now() WHERE business_id = _biz AND status = 'active';
END $$;

-- Règlement des semaines terminées (appelé par le patron ou un salarié, à la lecture)
CREATE FUNCTION public.business_settle(_biz uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.business_settings; b public.businesses; sec public.business_sectors; cur integer; w integer;
  npcs integer; players integer; workers integer; shifts integer; factor numeric; maxpop integer; pop integer;
  rev integer; costs integer; emp record; ok boolean; short boolean; BEGIN
  SELECT * INTO s FROM public.business_settings WHERE id = 1;
  SELECT * INTO b FROM public.businesses WHERE id = _biz FOR UPDATE;
  IF NOT FOUND OR b.status <> 'active' OR NOT s.enabled THEN RETURN; END IF;
  SELECT * INTO sec FROM public.business_sectors WHERE id = b.sector_id;
  cur := floor(extract(epoch FROM public.game_now()) / 604800)::integer;
  SELECT max(population) INTO maxpop FROM public.cities;
  SELECT population INTO pop FROM public.cities WHERE id = b.city_id;
  factor := 0.8 + 0.4 * COALESCE(pop, 0)::numeric / GREATEST(COALESCE(maxpop, 1), 1);
  w := GREATEST(b.settled_week + 1, cur - s.max_weeks_back);
  WHILE w <= cur - 1 LOOP
    SELECT count(*) INTO npcs FROM public.business_npc_staff WHERE business_id = _biz;
    SELECT count(*) INTO players FROM public.business_employees WHERE business_id = _biz AND status = 'active';
    workers := 1 + npcs + players;
    SELECT count(*) INTO shifts FROM public.business_work_log WHERE business_id = _biz AND week = w;
    rev := round((sec.base_revenue + sec.per_worker * workers + sec.per_shift * shifts) * factor
                 * (85 + abs(hashtext(_biz::text || ':' || w)) % 31) / 100.0);
    costs := 0; short := false;
    PERFORM public.business_move(_biz, 'revenue:' || w, rev, 'revenue', 'Chiffre d''affaires de la semaine');
    -- Loyer : on prend ce qu'il reste si la caisse ne suffit pas
    IF public.business_move(_biz, 'rent:' || w, -sec.weekly_rent, 'rent', 'Loyer du local') THEN costs := costs + sec.weekly_rent;
    ELSE short := true;
      PERFORM public.business_move(_biz, 'rent:' || w, -(SELECT balance FROM public.business_treasuries WHERE business_id = _biz), 'rent', 'Loyer du local (partiel)');
    END IF;
    -- Salariés fictifs : départ si non payés
    IF npcs > 0 THEN
      IF public.business_move(_biz, 'npc:' || w, -(npcs * sec.npc_wage), 'npc_wage', 'Salaires des employés (' || npcs || ')') THEN costs := costs + npcs * sec.npc_wage;
      ELSE short := true; DELETE FROM public.business_npc_staff WHERE business_id = _biz;
        PERFORM public.economy_notify(b.owner_id, 'biz-npc-left:' || _biz || ':' || w, 'Employés partis', 'Caisse insuffisante : vos employés n''ont pas été payés et ont quitté ' || b.name || '.');
      END IF;
    END IF;
    -- Salariés joueurs : la paie est réservée puis encaissée par le salarié
    FOR emp IN SELECT * FROM public.business_employees WHERE business_id = _biz AND status = 'active' ORDER BY hired_at LOOP
      ok := public.business_move(_biz, 'pay:' || emp.id || ':' || w, -emp.weekly_salary, 'player_salary', 'Salaire — ' || emp.title);
      IF ok THEN costs := costs + emp.weekly_salary;
        INSERT INTO public.business_payroll (business_id, character_id, pay_key, amount, label)
        VALUES (_biz, emp.character_id, 'pay:' || emp.id || ':' || w, emp.weekly_salary, 'Salaire — ' || b.name) ON CONFLICT DO NOTHING;
      ELSE short := true;
        PERFORM public.economy_notify(emp.character_id, 'biz-unpaid:' || emp.id || ':' || w, 'Salaire non versé', b.name || ' n''a pas pu vous payer cette semaine.');
      END IF;
    END LOOP;
    -- Salaire du dirigeant, payé en dernier
    IF b.owner_salary > 0 THEN
      IF public.business_move(_biz, 'owner:' || w, -b.owner_salary, 'owner_salary', 'Salaire du dirigeant') THEN
        costs := costs + b.owner_salary;
        INSERT INTO public.business_payroll (business_id, character_id, pay_key, amount, label)
        VALUES (_biz, b.owner_id, 'owner:' || _biz || ':' || w, b.owner_salary, 'Salaire de dirigeant — ' || b.name) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    INSERT INTO public.business_weeks (business_id, week, revenue, costs, workers, shifts) VALUES (_biz, w, rev, costs, workers, shifts) ON CONFLICT DO NOTHING;
    IF short THEN b.strikes := b.strikes + 1; ELSIF rev >= costs THEN b.strikes := 0; END IF;
    IF b.strikes >= s.fail_strikes THEN
      UPDATE public.businesses SET status = 'failed', strikes = b.strikes, settled_week = w, closed_at = public.game_now() WHERE id = _biz;
      PERFORM public.business_release(_biz);
      PERFORM public.economy_notify(b.owner_id, 'biz-failed:' || _biz, 'Faillite', b.name || ' a fait faillite après ' || s.fail_strikes || ' semaines sans pouvoir payer ses charges.');
      RETURN;
    END IF;
    w := w + 1;
  END LOOP;
  UPDATE public.businesses SET settled_week = GREATEST(settled_week, cur - 1), strikes = b.strikes WHERE id = _biz;
END $$;

-- Encaissement des salaires dus au joueur connecté
CREATE FUNCTION public.business_collect(_cid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cid AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  FOR p IN SELECT * FROM public.business_payroll WHERE character_id = _cid AND status = 'due' ORDER BY created_at FOR UPDATE LOOP
    PERFORM public.economy_cash(_cid, 'bizpay:' || p.pay_key, p.amount, p.label, 'travail', jsonb_build_object('business', p.business_id));
    UPDATE public.business_payroll SET status = 'paid', paid_at = public.game_now() WHERE id = p.id;
  END LOOP;
END $$;

CREATE FUNCTION public.business_actor_sync(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bid uuid; BEGIN
  FOR bid IN SELECT id FROM public.businesses WHERE owner_id = _cid AND status = 'active'
             UNION SELECT business_id FROM public.business_employees WHERE character_id = _cid AND status = 'active' LOOP
    PERFORM public.business_settle(bid);
  END LOOP;
  PERFORM public.business_collect(_cid);
END $$;

-- Chaque service terminé compte pour la semaine de l'entreprise
CREATE FUNCTION public.business_shift_completed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'business' AND OLD.status = 'running' AND NEW.status = 'completed' AND NEW.source_key LIKE 'business:%' THEN
    INSERT INTO public.business_work_log (activity_id, business_id, character_id, week)
    VALUES (NEW.id, split_part(NEW.source_key, ':', 2)::uuid, NEW.character_id, floor(extract(epoch FROM NEW.start_time) / 604800)::integer)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER business_shift_completed AFTER UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.business_shift_completed();

-- 4. Actions du joueur -----------------------------------------------------------------
CREATE FUNCTION public.business_owned(_cid uuid, _biz uuid) RETURNS public.businesses LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.businesses; BEGIN
  SELECT * INTO b FROM public.businesses WHERE id = _biz AND owner_id = _cid AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entreprise introuvable'; END IF;
  PERFORM public.business_settle(_biz);
  SELECT * INTO b FROM public.businesses WHERE id = _biz;
  IF b.status <> 'active' THEN RAISE EXCEPTION 'Entreprise fermée'; END IF;
  RETURN b;
END $$;

CREATE FUNCTION public.found_business(_name text, _sector text, _capital integer, _request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.business_settings; sec public.business_sectors; nm text := btrim(coalesce(_name, '')); loc uuid; bid uuid; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT id INTO bid FROM public.businesses WHERE owner_id = cid AND request_key = _request_id::text;
  IF bid IS NOT NULL THEN RETURN bid; END IF;
  SELECT * INTO s FROM public.business_settings WHERE id = 1;
  IF NOT s.enabled THEN RAISE EXCEPTION 'Création d''entreprise indisponible'; END IF;
  IF c.age < s.min_age THEN RAISE EXCEPTION 'Création d''entreprise possible dès % ans', s.min_age; END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = cid AND status = 'active') THEN RAISE EXCEPTION 'Vous dirigez déjà une entreprise'; END IF;
  IF length(nm) < 3 OR length(nm) > 60 THEN RAISE EXCEPTION 'Nom entre 3 et 60 caractères'; END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE lower(name) = lower(nm) AND status = 'active') THEN RAISE EXCEPTION 'Ce nom est déjà pris'; END IF;
  SELECT * INTO sec FROM public.business_sectors WHERE id = _sector;
  IF NOT FOUND THEN RAISE EXCEPTION 'Secteur inconnu'; END IF;
  IF _capital IS NULL OR _capital < sec.min_capital THEN RAISE EXCEPTION 'Capital minimum : % crédits', sec.min_capital; END IF;
  SELECT id INTO loc FROM public.locations WHERE city_id = c.city_id AND kind = sec.location_kind AND accessible AND district_id IS NOT NULL ORDER BY id LIMIT 1;
  IF loc IS NULL THEN RAISE EXCEPTION 'Aucun local disponible dans votre ville pour ce secteur'; END IF;
  INSERT INTO public.businesses (owner_id, request_key, name, sector_id, city_id, location_id, settled_week)
  VALUES (cid, _request_id::text, nm, sec.id, c.city_id, loc, floor(extract(epoch FROM public.game_now()) / 604800)::integer - 1)
  RETURNING id INTO bid;
  INSERT INTO public.business_treasuries (business_id, balance) VALUES (bid, 0);
  PERFORM public.economy_cash(cid, 'biz-found:' || bid, -(s.founding_fee + _capital), 'Création de ' || nm || ' (frais + capital)', 'entreprise', jsonb_build_object('business', bid));
  PERFORM public.business_move(bid, 'capital', _capital, 'capital', 'Capital de départ');
  PERFORM public.economy_notify(cid, 'biz-start:' || bid, 'Entreprise créée', nm || ' est ouverte. Premier bilan à la fin de la semaine de jeu.');
  RETURN bid;
END $$;

CREATE FUNCTION public.business_deposit(_biz uuid, _amount integer, _request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; b public.businesses; BEGIN
  cid := public.social_actor(); b := public.business_owned(cid, _biz);
  IF _amount IS NULL OR _amount < 1 OR _amount > 100000 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF public.economy_cash(cid, 'biz-dep:' || _request_id, -_amount, 'Apport à ' || b.name, 'entreprise', jsonb_build_object('business', _biz)) THEN
    PERFORM public.business_move(_biz, 'deposit:' || _request_id, _amount, 'deposit', 'Apport du dirigeant');
  END IF;
END $$;

CREATE FUNCTION public.business_set_owner_salary(_biz uuid, _amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; b public.businesses; s public.business_settings; BEGIN
  cid := public.social_actor(); b := public.business_owned(cid, _biz);
  SELECT * INTO s FROM public.business_settings WHERE id = 1;
  IF _amount IS NULL OR _amount < 0 OR _amount > s.max_owner_salary THEN RAISE EXCEPTION 'Salaire entre 0 et % crédits par semaine', s.max_owner_salary; END IF;
  UPDATE public.businesses SET owner_salary = _amount WHERE id = _biz;
END $$;

CREATE FUNCTION public.business_hire_npc(_biz uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; b public.businesses; sec public.business_sectors; nid uuid; BEGIN
  cid := public.social_actor(); b := public.business_owned(cid, _biz);
  SELECT * INTO sec FROM public.business_sectors WHERE id = b.sector_id;
  IF (SELECT count(*) FROM public.business_npc_staff WHERE business_id = _biz) >= sec.max_npc THEN RAISE EXCEPTION 'Équipe complète (% employés maximum)', sec.max_npc; END IF;
  SELECT n.id INTO nid FROM public.social_npcs n
    WHERE n.city_id = b.city_id AND NOT EXISTS (SELECT 1 FROM public.business_npc_staff x WHERE x.npc_id = n.id)
    ORDER BY hashtext(n.id::text || _biz::text) LIMIT 1;
  IF nid IS NULL THEN RAISE EXCEPTION 'Aucun habitant disponible pour le moment'; END IF;
  INSERT INTO public.business_npc_staff (business_id, npc_id) VALUES (_biz, nid);
  RETURN nid;
END $$;

CREATE FUNCTION public.business_fire_npc(_biz uuid, _npc uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; b public.businesses; BEGIN
  cid := public.social_actor(); b := public.business_owned(cid, _biz);
  DELETE FROM public.business_npc_staff WHERE business_id = _biz AND npc_id = _npc;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employé introuvable'; END IF;
END $$;

CREATE FUNCTION public.business_open_offer(_biz uuid, _title text, _salary integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; b public.businesses; s public.business_settings; oid uuid; BEGIN
  cid := public.social_actor(); b := public.business_owned(cid, _biz);
  SELECT * INTO s FROM public.business_settings WHERE id = 1;
  IF length(btrim(coalesce(_title, ''))) < 3 OR length(_title) > 60 THEN RAISE EXCEPTION 'Intitulé entre 3 et 60 caractères'; END IF;
  IF _salary IS NULL OR _salary < s.min_player_salary OR _salary > s.max_player_salary THEN
    RAISE EXCEPTION 'Salaire entre % et % crédits par semaine', s.min_player_salary, s.max_player_salary; END IF;
  IF (SELECT count(*) FROM public.business_offers WHERE business_id = _biz AND open) >= 3 THEN RAISE EXCEPTION '3 offres ouvertes au maximum'; END IF;
  INSERT INTO public.business_offers (business_id, title, weekly_salary) VALUES (_biz, btrim(_title), _salary) RETURNING id INTO oid;
  RETURN oid;
END $$;

CREATE FUNCTION public.business_close_offer(_offer uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  UPDATE public.business_offers o SET open = false FROM public.businesses b
  WHERE o.id = _offer AND b.id = o.business_id AND b.owner_id = cid AND o.open;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre introuvable'; END IF;
END $$;

CREATE FUNCTION public.business_join(_offer uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; o public.business_offers; b public.businesses; eid uuid; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO o FROM public.business_offers WHERE id = _offer AND open FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre fermée'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = o.business_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Entreprise fermée'; END IF;
  IF b.owner_id = cid THEN RAISE EXCEPTION 'Vous dirigez déjà cette entreprise'; END IF;
  IF b.city_id <> c.city_id THEN RAISE EXCEPTION 'Offre réservée aux habitants de la ville'; END IF;
  IF c.age < 16 THEN RAISE EXCEPTION 'Possible dès 16 ans'; END IF;
  IF EXISTS (SELECT 1 FROM public.business_employees WHERE character_id = cid AND status = 'active') THEN RAISE EXCEPTION 'Vous travaillez déjà dans une entreprise de joueur'; END IF;
  INSERT INTO public.business_employees (business_id, character_id, title, weekly_salary) VALUES (b.id, cid, o.title, o.weekly_salary) RETURNING id INTO eid;
  UPDATE public.business_offers SET open = false WHERE id = o.id;
  PERFORM public.economy_notify(b.owner_id, 'biz-hired:' || eid, 'Nouvelle recrue', c.first_name || ' rejoint ' || b.name || ' (' || o.title || ').');
  RETURN eid;
END $$;

CREATE FUNCTION public.business_leave(_employee uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; e public.business_employees; b public.businesses; BEGIN
  cid := public.social_actor();
  SELECT * INTO e FROM public.business_employees WHERE id = _employee AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrat introuvable'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = e.business_id;
  IF e.character_id <> cid AND b.owner_id <> cid THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  PERFORM public.business_settle(b.id);
  UPDATE public.business_employees SET status = 'left', left_at = public.game_now() WHERE id = e.id;
  IF b.owner_id = cid THEN PERFORM public.economy_notify(e.character_id, 'biz-fired:' || e.id, 'Fin de contrat', b.name || ' a mis fin à votre contrat.');
  ELSE PERFORM public.economy_notify(b.owner_id, 'biz-quit:' || e.id, 'Démission', 'Un salarié a quitté ' || b.name || '.'); END IF;
END $$;

CREATE FUNCTION public.business_work(_biz uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; b public.businesses; s public.business_settings; t timestamptz := public.game_now(); aid uuid; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO b FROM public.businesses WHERE id = _biz AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Entreprise introuvable'; END IF;
  IF b.owner_id <> cid AND NOT EXISTS (SELECT 1 FROM public.business_employees WHERE business_id = _biz AND character_id = cid AND status = 'active') THEN
    RAISE EXCEPTION 'Réservé au dirigeant et aux salariés'; END IF;
  IF b.city_id <> c.city_id OR NOT EXISTS (SELECT 1 FROM public.character_positions WHERE character_id = cid AND city_id = b.city_id) THEN
    RAISE EXCEPTION 'Rendez-vous d''abord dans la ville de l''entreprise'; END IF;
  SELECT * INTO s FROM public.business_settings WHERE id = 1;
  IF c.energy < s.shift_energy THEN RAISE EXCEPTION 'Énergie insuffisante (% nécessaires)', s.shift_energy; END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND status IN ('planned','running') AND start_time < t + s.shift_minutes * interval '1 minute' AND end_time > t) THEN
    RAISE EXCEPTION 'Votre agenda est déjà occupé sur ce créneau'; END IF;
  INSERT INTO public.activities (character_id, type, title, start_time, end_time, location_id, energy_cost, status, source_key)
  VALUES (cid, 'business', 'Travail — ' || b.name, t, t + s.shift_minutes * interval '1 minute', b.location_id, s.shift_energy, 'running',
          'business:' || b.id || ':' || gen_random_uuid())
  RETURNING id INTO aid;
  UPDATE public.characters SET energy = energy - s.shift_energy, updated_at = now() WHERE id = cid;
  RETURN aid;
END $$;

CREATE FUNCTION public.business_close(_biz uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; b public.businesses; bal integer; BEGIN
  cid := public.social_actor(); b := public.business_owned(cid, _biz);
  SELECT balance INTO bal FROM public.business_treasuries WHERE business_id = _biz FOR UPDATE;
  IF bal > 0 THEN
    PERFORM public.business_move(_biz, 'closing', -bal, 'closing', 'Fermeture : solde rendu au dirigeant');
    PERFORM public.economy_cash(cid, 'biz-close:' || _biz, bal, 'Fermeture de ' || b.name, 'entreprise', jsonb_build_object('business', _biz));
  END IF;
  UPDATE public.businesses SET status = 'closed', closed_at = public.game_now() WHERE id = _biz;
  PERFORM public.business_release(_biz);
END $$;

CREATE FUNCTION public.business_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; b public.businesses; cur integer; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  PERFORM public.business_actor_sync(cid);
  cur := floor(extract(epoch FROM public.game_now()) / 604800)::integer;
  SELECT * INTO b FROM public.businesses WHERE owner_id = cid AND status = 'active';
  RETURN jsonb_build_object(
    'now', public.game_now(), 'age', c.age, 'balance', (SELECT balance FROM public.accounts WHERE character_id = cid),
    'settings', (SELECT to_jsonb(s) FROM public.business_settings s WHERE id = 1),
    'sectors', (SELECT jsonb_agg(to_jsonb(x) ORDER BY x.sort_order) FROM public.business_sectors x),
    'business', CASE WHEN b.id IS NULL THEN NULL ELSE to_jsonb(b) || jsonb_build_object(
      'sector', (SELECT to_jsonb(x) FROM public.business_sectors x WHERE x.id = b.sector_id),
      'city_name', (SELECT name FROM public.cities WHERE id = b.city_id),
      'location_name', (SELECT name FROM public.locations WHERE id = b.location_id),
      'treasury', (SELECT balance FROM public.business_treasuries WHERE business_id = b.id),
      'shifts_this_week', (SELECT count(*) FROM public.business_work_log WHERE business_id = b.id AND week = cur),
      'npc_staff', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'name', n.first_name || ' ' || n.last_name, 'profession', n.profession) ORDER BY x.hired_at)
                    FROM public.business_npc_staff x JOIN public.social_npcs n ON n.id = x.npc_id WHERE x.business_id = b.id), '[]'::jsonb),
      'employees', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'name', ch.first_name || ' ' || ch.last_name, 'title', e.title, 'weekly_salary', e.weekly_salary) ORDER BY e.hired_at)
                    FROM public.business_employees e JOIN public.characters ch ON ch.id = e.character_id WHERE e.business_id = b.id AND e.status = 'active'), '[]'::jsonb),
      'offers', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.created_at) FROM public.business_offers o WHERE o.business_id = b.id AND o.open), '[]'::jsonb),
      'weeks', COALESCE((SELECT jsonb_agg(to_jsonb(w) ORDER BY w.week DESC) FROM (SELECT * FROM public.business_weeks WHERE business_id = b.id ORDER BY week DESC LIMIT 6) w), '[]'::jsonb)
    ) END,
    'last_closed', (SELECT jsonb_build_object('name', x.name, 'status', x.status, 'closed_at', x.closed_at) FROM public.businesses x
                    WHERE x.owner_id = cid AND x.status <> 'active' ORDER BY x.closed_at DESC NULLS LAST LIMIT 1),
    'job', (SELECT jsonb_build_object('id', e.id, 'business_id', bb.id, 'business_name', bb.name, 'title', e.title, 'weekly_salary', e.weekly_salary,
                   'shifts_this_week', (SELECT count(*) FROM public.business_work_log l WHERE l.business_id = bb.id AND l.character_id = cid AND l.week = cur))
            FROM public.business_employees e JOIN public.businesses bb ON bb.id = e.business_id WHERE e.character_id = cid AND e.status = 'active'),
    'offers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'title', o.title, 'weekly_salary', o.weekly_salary, 'business_name', bb.name, 'sector', sx.label) ORDER BY o.created_at DESC)
            FROM public.business_offers o JOIN public.businesses bb ON bb.id = o.business_id JOIN public.business_sectors sx ON sx.id = bb.sector_id
            WHERE o.open AND bb.status = 'active' AND bb.city_id = c.city_id AND bb.owner_id <> cid), '[]'::jsonb),
    'pay_history', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', p.label, 'amount', p.amount, 'paid_at', p.paid_at) ORDER BY p.paid_at DESC)
            FROM (SELECT * FROM public.business_payroll WHERE character_id = cid AND status = 'paid' ORDER BY paid_at DESC LIMIT 8) p), '[]'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.business_move(uuid,text,integer,text,text), public.business_release(uuid), public.business_settle(uuid),
  public.business_collect(uuid), public.business_actor_sync(uuid), public.business_owned(uuid,uuid), public.business_shift_completed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.found_business(text,text,integer,uuid), public.business_deposit(uuid,integer,uuid), public.business_set_owner_salary(uuid,integer),
  public.business_hire_npc(uuid), public.business_fire_npc(uuid,uuid), public.business_open_offer(uuid,text,integer), public.business_close_offer(uuid),
  public.business_join(uuid), public.business_leave(uuid), public.business_work(uuid), public.business_close(uuid), public.business_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.found_business(text,text,integer,uuid), public.business_deposit(uuid,integer,uuid), public.business_set_owner_salary(uuid,integer),
  public.business_hire_npc(uuid), public.business_fire_npc(uuid,uuid), public.business_open_offer(uuid,text,integer), public.business_close_offer(uuid),
  public.business_join(uuid), public.business_leave(uuid), public.business_work(uuid), public.business_close(uuid), public.business_state() TO authenticated;

-- 5. Contrôles -------------------------------------------------------------------------
DO $$ BEGIN
  IF to_regprocedure('public.bank_pay(uuid,text,integer,text)') IS NULL THEN RAISE EXCEPTION 'P5a (banque) doit être installé avant P5c'; END IF;
  IF to_regclass('public.insurance_contracts') IS NULL THEN RAISE EXCEPTION 'P5b (assurances) doit être installé avant P5c'; END IF;
  IF (SELECT count(*) FROM public.business_sectors) <> 5 THEN RAISE EXCEPTION 'Secteurs incomplets'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.life_rules WHERE id = 'business') THEN RAISE EXCEPTION 'Activité agenda manquante'; END IF;
  IF EXISTS (SELECT 1 FROM public.business_sectors x WHERE NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.kind = x.location_kind AND l.accessible)) THEN
    RAISE EXCEPTION 'Un secteur n''a aucun local dans le monde'; END IF;
  IF (SELECT count(*) FROM public.events) < 81 THEN RAISE EXCEPTION 'Événements existants perdus'; END IF;
  RAISE NOTICE 'P5c installé : entreprises des joueurs prêtes';
END $$;

COMMIT;
