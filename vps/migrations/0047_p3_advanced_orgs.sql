-- CIVITAS – P3 : ORGANISATIONS AVANCÉES (fondées par les joueurs)
-- Uniquement des ajouts. Tout ou rien.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0047_p3_advanced_orgs.sql
-- Ne touche ni aux organisations fictives existantes, ni aux élections en cours, ni à l'horloge.
BEGIN;

-- 1. Réglages --------------------------------------------------------------------
CREATE TABLE public.org_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  founding_fee integer NOT NULL DEFAULT 200 CHECK (founding_fee >= 0),
  party_min_age integer NOT NULL DEFAULT 18,
  other_min_age integer NOT NULL DEFAULT 16,
  player_weekly_dues integer NOT NULL DEFAULT 5 CHECK (player_weekly_dues >= 0),
  npc_weekly_dues integer NOT NULL DEFAULT 2 CHECK (npc_weekly_dues >= 0),
  event_cost integer NOT NULL DEFAULT 30 CHECK (event_cost >= 0),
  event_income_per_participant integer NOT NULL DEFAULT 3 CHECK (event_income_per_participant >= 0),
  npc_joins_per_week integer NOT NULL DEFAULT 2 CHECK (npc_joins_per_week >= 0),
  level_established integer NOT NULL DEFAULT 30,
  level_influential integer NOT NULL DEFAULT 80
);
GRANT SELECT ON public.org_settings TO authenticated;
GRANT ALL ON public.org_settings TO service_role;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_settings_read ON public.org_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.org_settings (id) VALUES (1);

-- 2. Organisations créées par les joueurs (colonnes ajoutées, facultatives) ----------
ALTER TABLE public.organizations ADD COLUMN founder_character_id uuid REFERENCES public.characters(id);
ALTER TABLE public.organizations ADD COLUMN player_created boolean NOT NULL DEFAULT false;

-- 3. Caisse et registre (séparés de l'argent personnel) ------------------------------
CREATE TABLE public.org_treasuries (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0)
);
CREATE TABLE public.org_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  operation_key text NOT NULL,
  amount integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('dues_player','dues_npc','donation','event_income','event_cost')),
  label text NOT NULL,
  character_id uuid REFERENCES public.characters(id),
  world_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (organization_id, operation_key)
);
CREATE TABLE public.org_npc_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  npc_id uuid NOT NULL REFERENCES public.social_npcs(id),
  joined_at timestamptz NOT NULL DEFAULT public.game_now(),
  join_key text NOT NULL,
  PRIMARY KEY (organization_id, npc_id),
  UNIQUE (organization_id, join_key)
);
GRANT SELECT ON public.org_treasuries, public.org_ledger, public.org_npc_members TO authenticated;
GRANT ALL ON public.org_treasuries, public.org_ledger, public.org_npc_members TO service_role;
ALTER TABLE public.org_treasuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_npc_members ENABLE ROW LEVEL SECURITY;
-- Caisse et historique : visibles par les membres actifs seulement
CREATE POLICY org_treasuries_members ON public.org_treasuries FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memberships m JOIN public.characters c ON c.id = m.character_id
          WHERE m.organization_id = org_treasuries.organization_id AND m.status = 'active' AND c.user_id = auth.uid()));
CREATE POLICY org_ledger_members ON public.org_ledger FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memberships m JOIN public.characters c ON c.id = m.character_id
          WHERE m.organization_id = org_ledger.organization_id AND m.status = 'active' AND c.user_id = auth.uid()));
CREATE POLICY org_npc_members_read ON public.org_npc_members FOR SELECT TO authenticated USING (true);

-- Écriture unique dans la caisse (clé unique, jamais de solde négatif)
CREATE FUNCTION public.org_credit(_org uuid, _key text, _amount integer, _kind text, _label text, _cid uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lid uuid; BEGIN
  INSERT INTO public.org_ledger (organization_id, operation_key, amount, kind, label, character_id)
  VALUES (_org, _key, _amount, _kind, _label, _cid) ON CONFLICT (organization_id, operation_key) DO NOTHING RETURNING id INTO lid;
  IF lid IS NULL THEN RETURN false; END IF;
  UPDATE public.org_treasuries SET balance = balance + _amount WHERE organization_id = _org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caisse introuvable'; END IF;
  RETURN true;
END $$;

-- 4. Le fondateur ne peut pas quitter son organisation --------------------------------
CREATE FUNCTION public.guard_org_founder() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role = 'founder' AND (NEW.status <> 'active' OR NEW.role <> 'founder') THEN
    RAISE EXCEPTION 'Le fondateur ne peut pas quitter son organisation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER memberships_guard_founder BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.guard_org_founder();

-- 5. Fonder une organisation ------------------------------------------------------------
CREATE FUNCTION public.found_organization(_kind text, _name text, _symbol text, _description text, _location_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.org_settings; oid uuid; okind text; nm text := btrim(coalesce(_name, '')); BEGIN
  cid := public.social_actor();
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.org_settings WHERE id = 1;
  IF NOT s.enabled THEN RAISE EXCEPTION 'Création momentanément indisponible'; END IF;
  okind := CASE _kind WHEN 'association' THEN 'citizen' WHEN 'movement' THEN 'movement' WHEN 'party' THEN 'party' END;
  IF okind IS NULL THEN RAISE EXCEPTION 'Type d''organisation inconnu'; END IF;
  IF c.age < CASE WHEN okind = 'party' THEN s.party_min_age ELSE s.other_min_age END THEN RAISE EXCEPTION 'Âge minimum non atteint'; END IF;
  IF length(nm) < 3 OR length(nm) > 60 THEN RAISE EXCEPTION 'Le nom doit faire entre 3 et 60 caractères'; END IF;
  IF length(coalesce(_description, '')) > 500 THEN RAISE EXCEPTION 'Description trop longue'; END IF;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE lower(name) = lower(nm)) THEN RAISE EXCEPTION 'Ce nom est déjà pris'; END IF;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE founder_character_id = cid AND kind = okind) THEN RAISE EXCEPTION 'Vous avez déjà fondé une organisation de ce type'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations l JOIN public.districts d ON d.id = l.district_id
                 WHERE l.id = _location_id AND l.city_id = c.city_id AND l.accessible AND d.available) THEN RAISE EXCEPTION 'Siège invalide'; END IF;
  IF okind = 'party' AND EXISTS (SELECT 1 FROM public.memberships m JOIN public.organizations o ON o.id = m.organization_id
                                 WHERE m.character_id = cid AND m.status = 'active' AND o.kind = 'party') THEN
    RAISE EXCEPTION 'Quittez votre parti actuel avant d''en fonder un'; END IF;
  -- Frais de dépôt, une seule fois (clé unique)
  IF NOT public.economy_cash(cid, 'org_found:' || okind, -s.founding_fee, 'Frais de dépôt : ' || nm, 'organisation', jsonb_build_object('kind', okind)) THEN
    RAISE EXCEPTION 'Frais déjà réglés pour ce type'; END IF;
  INSERT INTO public.organizations (name, kind, city_id, description, location_id, status, visibility, symbol, scope, founder_character_id, player_created, created_at)
  VALUES (nm, okind, c.city_id, coalesce(_description, ''), _location_id, 'active', 'public', left(coalesce(_symbol, ''), 4), 'local', cid, true, public.game_now())
  RETURNING id INTO oid;
  INSERT INTO public.org_treasuries (organization_id) VALUES (oid);
  INSERT INTO public.memberships (character_id, organization_id, role, status, joined_at) VALUES (cid, oid, 'founder', 'active', public.game_now());
  INSERT INTO public.membership_history (character_id, organization_id, action, occurred_at) VALUES (cid, oid, 'joined', public.game_now());
  IF okind IN ('party', 'movement') THEN
    INSERT INTO public.political_profiles (organization_id, ideology, slogan) VALUES (oid,
      '{"ecologie":50,"europe":50,"institutions":50,"libertes":50,"marche":50,"securite":50,"services_publics":50,"territoires":50}', '');
    INSERT INTO public.political_branches (organization_id, city_id, location_id, kind) VALUES (oid, c.city_id, _location_id, 'siege');
  END IF;
  INSERT INTO public.notifications (user_id, title, body) VALUES (c.user_id, 'Organisation fondée', nm);
  RETURN oid;
END $$;

-- 6. Don vers la caisse (définitif) ---------------------------------------------------
CREATE FUNCTION public.donate_to_organization(_org uuid, _amount integer, _request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; o public.organizations; BEGIN
  cid := public.social_actor();
  SELECT * INTO o FROM public.organizations WHERE id = _org AND player_created AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Organisation introuvable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.memberships WHERE character_id = cid AND organization_id = _org AND status = 'active') THEN RAISE EXCEPTION 'Réservé aux membres'; END IF;
  IF _amount IS NULL OR _amount < 1 OR _amount > 100000 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF public.economy_cash(cid, 'org_don:' || _request_id, -_amount, 'Don à ' || o.name, 'organisation', jsonb_build_object('org', _org)) THEN
    PERFORM public.org_credit(_org, 'don:' || _request_id, _amount, 'donation', 'Don', cid);
  END IF;
END $$;

-- 7. Rôles (le fondateur nomme les responsables) --------------------------------------
CREATE FUNCTION public.set_member_role(_org uuid, _character uuid, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  IF _role NOT IN ('manager', 'member') THEN RAISE EXCEPTION 'Rôle inconnu'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.memberships WHERE character_id = cid AND organization_id = _org AND role = 'founder' AND status = 'active') THEN RAISE EXCEPTION 'Réservé au fondateur'; END IF;
  UPDATE public.memberships SET role = _role WHERE organization_id = _org AND character_id = _character AND status = 'active' AND role <> 'founder';
  IF NOT FOUND THEN RAISE EXCEPTION 'Membre introuvable'; END IF;
END $$;

-- 8. Organiser un événement (payé par la caisse, réutilise l'agenda existant) ----------
CREATE FUNCTION public.create_org_event(_org uuid, _title text, _location_id uuid, _start_hour integer, _request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; o public.organizations; s public.org_settings; eid uuid; tr public.org_treasuries; BEGIN
  cid := public.social_actor();
  SELECT * INTO s FROM public.org_settings WHERE id = 1;
  SELECT * INTO o FROM public.organizations WHERE id = _org AND player_created AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Organisation introuvable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.memberships WHERE character_id = cid AND organization_id = _org AND role IN ('founder','manager') AND status = 'active') THEN RAISE EXCEPTION 'Réservé au fondateur et aux responsables'; END IF;
  IF length(btrim(coalesce(_title,''))) < 3 OR length(_title) > 80 THEN RAISE EXCEPTION 'Titre invalide'; END IF;
  IF _start_hour IS NULL OR _start_hour < 8 OR _start_hour > 21 THEN RAISE EXCEPTION 'Heure entre 8 h et 21 h'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = _location_id AND city_id = o.city_id AND accessible) THEN RAISE EXCEPTION 'Lieu invalide'; END IF;
  IF EXISTS (SELECT 1 FROM public.org_ledger WHERE organization_id = _org AND operation_key = 'event_cost:' || _request_id) THEN RAISE EXCEPTION 'Déjà créé'; END IF;
  SELECT * INTO tr FROM public.org_treasuries WHERE organization_id = _org FOR UPDATE;
  IF tr.balance < s.event_cost THEN RAISE EXCEPTION 'Caisse insuffisante (% crédits nécessaires)', s.event_cost; END IF;
  INSERT INTO public.organization_events (organization_id, title, description, location_id, start_hour, duration_minutes, energy_cost, relation_gain, reputation_gain, influence_gain)
  VALUES (_org, btrim(_title), 'Organisé par ' || o.name, _location_id, _start_hour, 60, 10, 3, 3, 1) RETURNING id INTO eid;
  PERFORM public.org_credit(_org, 'event_cost:' || _request_id, -s.event_cost, 'event_cost', 'Événement : ' || btrim(_title), cid);
  RETURN eid;
END $$;

-- Chaque participation à un événement d'une organisation joueur rapporte à sa caisse et à sa réputation
CREATE FUNCTION public.org_event_participation_income() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.organizations; s public.org_settings; BEGIN
  SELECT o2.* INTO o FROM public.organization_events e JOIN public.organizations o2 ON o2.id = e.organization_id WHERE e.id = NEW.event_id;
  IF o.id IS NULL OR NOT o.player_created THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.org_settings WHERE id = 1;
  IF public.org_credit(o.id, 'event_income:' || NEW.activity_id, s.event_income_per_participant, 'event_income', 'Participation à un événement', NEW.character_id) THEN
    UPDATE public.organizations SET reputation = least(100, reputation + 2), influence = least(100, influence + 1) WHERE id = o.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER social_participations_org_income AFTER INSERT ON public.social_participations FOR EACH ROW EXECUTE FUNCTION public.org_event_participation_income();

-- 9. Règlement à la lecture : cotisations hebdomadaires et adhésions fictives ----------
CREATE FUNCTION public.settle_organization(_org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.organizations; s public.org_settings; cid uuid; c public.characters; acc public.accounts;
  wk text := to_char(public.game_now() AT TIME ZONE 'UTC', 'IYYY-IW'); n integer; target integer; nid uuid; npcs integer; BEGIN
  SELECT * INTO o FROM public.organizations WHERE id = _org AND player_created AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO s FROM public.org_settings WHERE id = 1;
  -- Cotisation de l'habitant fictif membre : versée par la simulation, une fois par semaine
  SELECT count(*) INTO npcs FROM public.org_npc_members WHERE organization_id = _org;
  IF npcs > 0 THEN PERFORM public.org_credit(_org, 'dues_npc:' || wk, npcs * s.npc_weekly_dues, 'dues_npc', 'Cotisations des habitants (' || npcs || ')', NULL); END IF;
  -- Cotisation du joueur qui consulte, s'il est membre et en a les moyens (sinon rien n'est dû)
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  IF cid IS NOT NULL AND s.player_weekly_dues > 0 AND EXISTS (SELECT 1 FROM public.memberships WHERE character_id = cid AND organization_id = _org AND status = 'active')
     AND NOT EXISTS (SELECT 1 FROM public.org_ledger WHERE organization_id = _org AND operation_key = 'dues:' || cid || ':' || wk) THEN
    SELECT * INTO acc FROM public.accounts WHERE character_id = cid;
    IF acc.balance >= s.player_weekly_dues AND public.economy_cash(cid, 'org_dues:' || _org || ':' || wk, -s.player_weekly_dues, 'Cotisation : ' || o.name, 'organisation', jsonb_build_object('org', _org)) THEN
      PERFORM public.org_credit(_org, 'dues:' || cid || ':' || wk, s.player_weekly_dues, 'dues_player', 'Cotisation', cid);
    END IF;
  END IF;
  -- Adhésions fictives : au plus N par semaine, selon la réputation
  SELECT count(*) INTO n FROM public.org_npc_members WHERE organization_id = _org AND join_key LIKE wk || ':%';
  target := least(s.npc_joins_per_week, 1 + o.reputation / 25);
  WHILE n < target LOOP
    SELECT sn.id INTO nid FROM public.social_npcs sn
      WHERE sn.city_id = o.city_id AND NOT EXISTS (SELECT 1 FROM public.org_npc_members x WHERE x.organization_id = _org AND x.npc_id = sn.id)
      ORDER BY hashtext(sn.id::text || _org::text) LIMIT 1;
    EXIT WHEN nid IS NULL;
    INSERT INTO public.org_npc_members (organization_id, npc_id, join_key) VALUES (_org, nid, wk || ':' || n) ON CONFLICT DO NOTHING;
    UPDATE public.organizations SET reputation = least(100, reputation + 1) WHERE id = _org;
    n := n + 1;
  END LOOP;
END $$;

-- 10. Lecture d'une organisation joueur ------------------------------------------------
CREATE FUNCTION public.org_state(_org uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; o public.organizations; s public.org_settings; me public.memberships; res jsonb; BEGIN
  PERFORM public.settle_organization(_org);
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  SELECT * INTO o FROM public.organizations WHERE id = _org AND player_created;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organisation introuvable'; END IF;
  SELECT * INTO s FROM public.org_settings WHERE id = 1;
  SELECT * INTO me FROM public.memberships WHERE character_id = cid AND organization_id = _org AND status = 'active';
  res := jsonb_build_object(
    'organization', to_jsonb(o) - 'founder_character_id',
    'level', CASE WHEN o.reputation >= s.level_influential THEN 'Influente' WHEN o.reputation >= s.level_established THEN 'Établie' ELSE 'Naissante' END,
    'my_role', me.role,
    'settings', jsonb_build_object('event_cost', s.event_cost, 'player_weekly_dues', s.player_weekly_dues),
    'members', coalesce((SELECT jsonb_agg(jsonb_build_object('character_id', m.character_id, 'name', ch.first_name || ' ' || ch.last_name, 'role', m.role) ORDER BY m.joined_at)
                FROM public.memberships m JOIN public.characters ch ON ch.id = m.character_id WHERE m.organization_id = _org AND m.status = 'active'), '[]'::jsonb),
    'npc_members', coalesce((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'name', n.first_name || ' ' || n.last_name, 'profession', n.profession) ORDER BY x.joined_at)
                FROM public.org_npc_members x JOIN public.social_npcs n ON n.id = x.npc_id WHERE x.organization_id = _org), '[]'::jsonb),
    'events', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'start_hour', e.start_hour, 'location_id', e.location_id)) FROM public.organization_events e WHERE e.organization_id = _org AND e.status = 'active'), '[]'::jsonb));
  IF me.id IS NOT NULL THEN
    res := res || jsonb_build_object(
      'balance', (SELECT balance FROM public.org_treasuries WHERE organization_id = _org),
      'ledger', coalesce((SELECT jsonb_agg(jsonb_build_object('amount', l.amount, 'kind', l.kind, 'label', l.label, 'world_at', l.world_at) ORDER BY l.world_at DESC)
                 FROM (SELECT * FROM public.org_ledger WHERE organization_id = _org ORDER BY world_at DESC LIMIT 30) l), '[]'::jsonb));
  END IF;
  RETURN res;
END $$;

-- Droits d'exécution
REVOKE ALL ON FUNCTION public.org_credit(uuid,text,integer,text,text,uuid), public.settle_organization(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.found_organization(text,text,text,text,uuid), public.donate_to_organization(uuid,integer,uuid),
  public.set_member_role(uuid,uuid,text), public.create_org_event(uuid,text,uuid,integer,uuid), public.org_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.found_organization(text,text,text,text,uuid), public.donate_to_organization(uuid,integer,uuid),
  public.set_member_role(uuid,uuid,text), public.create_org_event(uuid,text,uuid,integer,uuid), public.org_state(uuid) TO authenticated;

-- 11. Contrôles ------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.organizations WHERE player_created) THEN RAISE EXCEPTION 'Contrôle : aucune organisation joueur attendue à l''installation'; END IF;
  IF (SELECT count(*) FROM public.events) < 81 THEN RAISE EXCEPTION 'Contrôle : événements modifiés'; END IF;
  IF (SELECT count(*) FROM public.org_settings) <> 1 THEN RAISE EXCEPTION 'Contrôle : réglages'; END IF;
END $$;

COMMIT;
