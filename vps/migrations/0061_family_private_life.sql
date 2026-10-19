-- CIVITAS – FAMILLE ET VIE PRIVÉE
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0061_family_private_life.sql
-- Couple (joueur qui accepte, ou habitant simulé très proche), PACS / mariage, séparation.
-- Logement partagé entre deux joueurs en couple : l'invité verse une part du loyer de l'hôte
--   (débitée chez l'invité à sa lecture, encaissée par l'hôte à sa lecture, comme les virements) ; le loyer existant est inchangé.
-- Enfants (naissance en couple ou adoption) : grandissent avec le temps du jeu, coût hebdomadaire partagé entre parents joueurs ;
--   un solde insuffisant n'est jamais débité : la semaine est notée « impayée » et le bien-être de l'enfant baisse.
-- Amis proches : un moment ensemble par jour de jeu redonne un peu d'énergie.
-- Les blocages entre joueurs (network_blocked) s'appliquent à toutes les demandes.
BEGIN;

CREATE TABLE public.family_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  min_age integer NOT NULL DEFAULT 18,
  npc_couple_score integer NOT NULL DEFAULT 70,     -- relation minimale avec un habitant simulé pour former un couple
  npc_friend_score integer NOT NULL DEFAULT 50,
  union_after_days integer NOT NULL DEFAULT 3,       -- jours de couple avant PACS / mariage
  request_hours integer NOT NULL DEFAULT 48,
  rent_share_pct integer NOT NULL DEFAULT 50,
  child_weekly_cost integer NOT NULL DEFAULT 40,
  child_days_per_year integer NOT NULL DEFAULT 7,    -- 1 an d'enfant = 7 jours de jeu
  child_max integer NOT NULL DEFAULT 3,
  adoption_min_age integer NOT NULL DEFAULT 26,
  friend_max integer NOT NULL DEFAULT 3,
  friend_energy integer NOT NULL DEFAULT 5
);
INSERT INTO public.family_settings (id) VALUES (1);

CREATE TABLE public.couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  a_id uuid NOT NULL REFERENCES public.characters(id),
  b_id uuid REFERENCES public.characters(id),
  npc_id uuid REFERENCES public.social_npcs(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','declined','expired','couple','ended')),
  union_kind text CHECK (union_kind IN ('pacs','mariage')),
  union_pending text CHECK (union_pending IN ('pacs','mariage')),   -- demande de PACS / mariage en attente (joueurs)
  union_requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  started_at timestamptz,
  union_at timestamptz,
  ended_at timestamptz,
  CHECK ((b_id IS NULL) <> (npc_id IS NULL)),
  CHECK (b_id IS NULL OR b_id <> a_id)
);
CREATE INDEX couples_a ON public.couples (a_id, status);
CREATE INDEX couples_b ON public.couples (b_id, status);

CREATE TABLE public.cohabitations (
  couple_id uuid PRIMARY KEY REFERENCES public.couples(id),
  host_id uuid NOT NULL REFERENCES public.characters(id),
  guest_id uuid NOT NULL REFERENCES public.characters(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','ended')),
  since timestamptz,
  settled_until date,                     -- dernier jour de jeu réglé par l'invité
  ended_at timestamptz
);

-- Sommes dues entre joueurs : débitées chez le payeur, encaissées une seule fois par le destinataire
CREATE TABLE public.family_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_key text NOT NULL UNIQUE,
  from_id uuid NOT NULL REFERENCES public.characters(id),
  to_id uuid NOT NULL REFERENCES public.characters(id),
  amount integer NOT NULL CHECK (amount > 0),
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  collected_at timestamptz
);

CREATE TABLE public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  first_name text NOT NULL,
  parent_a uuid NOT NULL REFERENCES public.characters(id),
  parent_b uuid REFERENCES public.characters(id),
  npc_parent uuid REFERENCES public.social_npcs(id),
  origin text NOT NULL CHECK (origin IN ('naissance','adoption')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','declined','home','adult')),
  born_at timestamptz,
  wellbeing integer NOT NULL DEFAULT 70 CHECK (wellbeing BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE INDEX children_a ON public.children (parent_a);
CREATE INDEX children_b ON public.children (parent_b);

-- Une ligne par parent joueur et par semaine de jeu : payée ou impayée, jamais deux fois
CREATE TABLE public.child_expenses (
  child_id uuid NOT NULL REFERENCES public.children(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  week integer NOT NULL,
  amount integer NOT NULL,
  paid boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (child_id, character_id, week)
);

CREATE TABLE public.close_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  a_id uuid NOT NULL REFERENCES public.characters(id),
  b_id uuid REFERENCES public.characters(id),
  npc_id uuid REFERENCES public.social_npcs(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','declined','active','ended')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  CHECK ((b_id IS NULL) <> (npc_id IS NULL)),
  CHECK (b_id IS NULL OR b_id <> a_id)
);
CREATE UNIQUE INDEX close_friends_pair ON public.close_friends (least(a_id, b_id), greatest(a_id, b_id)) WHERE b_id IS NOT NULL AND status IN ('pending','active');
CREATE UNIQUE INDEX close_friends_npc ON public.close_friends (a_id, npc_id) WHERE npc_id IS NOT NULL AND status = 'active';

-- Un moment entre amis par personnage et par jour de jeu
CREATE TABLE public.friend_hangouts (
  character_id uuid NOT NULL REFERENCES public.characters(id),
  day date NOT NULL,
  friend_id uuid NOT NULL REFERENCES public.close_friends(id),
  energy integer NOT NULL,
  PRIMARY KEY (character_id, day)
);

GRANT SELECT ON public.family_settings, public.couples, public.cohabitations, public.family_payments, public.children,
  public.child_expenses, public.close_friends, public.friend_hangouts TO authenticated;
GRANT ALL ON public.family_settings, public.couples, public.cohabitations, public.family_payments, public.children,
  public.child_expenses, public.close_friends, public.friend_hangouts TO service_role;
ALTER TABLE public.family_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohabitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_hangouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY family_settings_read ON public.family_settings FOR SELECT TO authenticated USING (true);
-- Vie privée : chacun ne voit que ce qui le concerne
CREATE POLICY couples_own ON public.couples FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (couples.a_id, couples.b_id) AND c.user_id = auth.uid()));
CREATE POLICY cohabitations_own ON public.cohabitations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (cohabitations.host_id, cohabitations.guest_id) AND c.user_id = auth.uid()));
CREATE POLICY family_payments_own ON public.family_payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (family_payments.from_id, family_payments.to_id) AND c.user_id = auth.uid()));
CREATE POLICY children_own ON public.children FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (children.parent_a, children.parent_b) AND c.user_id = auth.uid()));
CREATE POLICY child_expenses_own ON public.child_expenses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = child_expenses.character_id AND c.user_id = auth.uid()));
CREATE POLICY close_friends_own ON public.close_friends FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (close_friends.a_id, close_friends.b_id) AND c.user_id = auth.uid()));
CREATE POLICY friend_hangouts_own ON public.friend_hangouts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = friend_hangouts.character_id AND c.user_id = auth.uid()));

CREATE FUNCTION public.family_notify(_cid uuid, _title text, _body text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body) SELECT user_id, _title, _body FROM public.characters WHERE id = _cid
$$;

-- Couple actif (ou demande en attente) d'un personnage
CREATE FUNCTION public.family_active_couple(_cid uuid) RETURNS public.couples LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.couples WHERE status = 'couple' AND _cid IN (a_id, b_id) ORDER BY started_at DESC LIMIT 1
$$;

CREATE FUNCTION public.family_week(_at timestamptz) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT floor(EXTRACT(epoch FROM _at) / 604800)::integer
$$;

-- Règlements à la lecture, pour le joueur connecté uniquement (economy_cash n'agit que pour lui)
CREATE FUNCTION public.family_settle(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.family_settings; nowt timestamptz := public.game_now(); today date := public.game_now()::date;
        co public.cohabitations; ch public.children; pay public.family_payments; daily integer; d date; share integer;
        wk integer; parents integer; cost integer; ok boolean; BEGIN
  SELECT * INTO s FROM public.family_settings WHERE id = 1;
  -- 1. Encaisser ce que les autres m'ont versé
  FOR pay IN SELECT * FROM public.family_payments WHERE to_id = _cid AND collected_at IS NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LOOP
    PERFORM public.economy_cash(_cid, 'family-in:' || pay.id, pay.amount, pay.label, 'famille', jsonb_build_object('payment', pay.id));
    UPDATE public.family_payments SET collected_at = nowt WHERE id = pay.id;
  END LOOP;
  -- 2. Ma part du loyer quand je vis chez mon/ma partenaire (jour par jour, au plus 14 jours rattrapés)
  FOR co IN SELECT * FROM public.cohabitations WHERE guest_id = _cid AND status = 'active' FOR UPDATE LOOP
    SELECT ht.daily_cost INTO daily FROM public.character_housing h JOIN public.housing_types ht ON ht.id = h.type_id WHERE h.character_id = co.host_id;
    share := floor(COALESCE(daily, 0) * s.rent_share_pct / 100.0)::integer;
    d := GREATEST(COALESCE(co.settled_until, co.since::date - 1) + 1, today - 13);
    WHILE share > 0 AND d < today LOOP
      ok := (SELECT balance FROM public.accounts WHERE character_id = _cid) >= share;
      EXIT WHEN NOT ok;   -- solde insuffisant : on s'arrête, sans dette ni solde négatif ; on réessaiera plus tard
      IF public.economy_cash(_cid, 'cohab-out:' || co.couple_id || ':' || d, -share, 'Part du loyer du foyer', 'famille', jsonb_build_object('couple', co.couple_id)) THEN
        INSERT INTO public.family_payments (payment_key, from_id, to_id, amount, label)
        VALUES ('cohab:' || co.couple_id || ':' || d, _cid, co.host_id, share, 'Part du loyer versée par votre partenaire') ON CONFLICT DO NOTHING;
      END IF;
      UPDATE public.cohabitations SET settled_until = d WHERE couple_id = co.couple_id;
      d := d + 1;
    END LOOP;
  END LOOP;
  -- 3. Enfants : âge adulte, puis ma part du coût hebdomadaire des semaines écoulées (au plus 4 rattrapées)
  FOR ch IN SELECT * FROM public.children WHERE status = 'home' AND _cid IN (parent_a, parent_b) FOR UPDATE LOOP
    IF EXTRACT(epoch FROM nowt - ch.born_at) / 86400.0 / s.child_days_per_year >= 18 THEN
      UPDATE public.children SET status = 'adult' WHERE id = ch.id;
      PERFORM public.family_notify(_cid, 'Votre enfant est majeur', ch.first_name || ' a 18 ans et prend son envol.');
      CONTINUE;
    END IF;
    parents := CASE WHEN ch.parent_b IS NULL THEN 1 ELSE 2 END;
    cost := ceil(s.child_weekly_cost::numeric / parents)::integer;
    FOR wk IN GREATEST(public.family_week(ch.born_at) + 1, public.family_week(nowt) - 4) .. public.family_week(nowt) - 1 LOOP
      CONTINUE WHEN EXISTS (SELECT 1 FROM public.child_expenses WHERE child_id = ch.id AND character_id = _cid AND week = wk);
      ok := (SELECT balance FROM public.accounts WHERE character_id = _cid) >= cost;
      IF ok THEN
        PERFORM public.economy_cash(_cid, 'child:' || ch.id || ':' || wk, -cost, 'Dépenses pour ' || ch.first_name, 'famille', jsonb_build_object('child', ch.id));
      END IF;
      INSERT INTO public.child_expenses (child_id, character_id, week, amount, paid) VALUES (ch.id, _cid, wk, cost, ok);
      UPDATE public.children SET wellbeing = GREATEST(0, LEAST(100, wellbeing + CASE WHEN ok THEN 5 ELSE -10 END)) WHERE id = ch.id;
    END LOOP;
  END LOOP;
  -- 4. Demandes expirées
  UPDATE public.couples SET status = 'expired' WHERE status = 'pending' AND created_at < nowt - make_interval(hours => s.request_hours) AND _cid IN (a_id, b_id);
END $$;

CREATE FUNCTION public.family_person(_cid uuid, _npc uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _cid IS NOT NULL THEN public.network_card(_cid) || jsonb_build_object('player', true)
    ELSE (SELECT jsonb_build_object('id', n.id, 'name', n.first_name || ' ' || n.last_name, 'age', n.age, 'situation', n.profession, 'player', false)
          FROM public.social_npcs n WHERE n.id = _npc) END
$$;

CREATE FUNCTION public.family_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.family_settings; c public.characters; cp public.couples; BEGIN
  PERFORM public.family_settle(cid);
  SELECT * INTO s FROM public.family_settings WHERE id = 1;
  SELECT * INTO c FROM public.characters WHERE id = cid;
  cp := public.family_active_couple(cid);
  RETURN jsonb_build_object('me', cid, 'now', public.game_now(), 'age', c.age,
    'settings', to_jsonb(s) - 'id',
    'couple', CASE WHEN cp.id IS NULL THEN NULL ELSE jsonb_build_object('id', cp.id, 'union_kind', cp.union_kind, 'started_at', cp.started_at,
       'union_at', cp.union_at, 'union_pending', cp.union_pending, 'union_requested_by_me', cp.union_requested_by = cid,
       'partner', public.family_person(CASE WHEN cp.a_id = cid THEN cp.b_id ELSE cp.a_id END, cp.npc_id),
       'cohabitation', (SELECT jsonb_build_object('status', h.status, 'host_is_me', h.host_id = cid, 'since', h.since,
           'share', floor(COALESCE((SELECT ht.daily_cost FROM public.character_housing x JOIN public.housing_types ht ON ht.id = x.type_id WHERE x.character_id = h.host_id), 0) * s.rent_share_pct / 100.0))
         FROM public.cohabitations h WHERE h.couple_id = cp.id AND h.status IN ('pending','active'))) END,
    'requests', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'from', public.network_card(r.a_id)) ORDER BY r.created_at)
       FROM public.couples r WHERE r.b_id = cid AND r.status = 'pending'), '[]'::jsonb),
    'sent', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'to', public.network_card(r.b_id))) FROM public.couples r WHERE r.a_id = cid AND r.status = 'pending'), '[]'::jsonb),
    'children', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', k.id, 'first_name', k.first_name, 'origin', k.origin, 'status', k.status,
       'wellbeing', k.wellbeing, 'requested_by_me', k.parent_a = cid,
       'age', CASE WHEN k.born_at IS NULL THEN NULL ELSE floor(EXTRACT(epoch FROM public.game_now() - k.born_at) / 86400.0 / s.child_days_per_year) END,
       'unpaid_weeks', (SELECT count(*) FROM public.child_expenses e WHERE e.child_id = k.id AND e.character_id = cid AND NOT e.paid)) ORDER BY k.created_at)
       FROM public.children k WHERE cid IN (k.parent_a, k.parent_b) AND k.status IN ('pending','home','adult')), '[]'::jsonb),
    'friends', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', f.id, 'status', f.status, 'incoming', f.b_id = cid AND f.status = 'pending',
       'person', public.family_person(CASE WHEN f.a_id = cid THEN f.b_id ELSE f.a_id END, f.npc_id)) ORDER BY f.created_at)
       FROM public.close_friends f WHERE cid IN (f.a_id, f.b_id) AND f.status IN ('pending','active')), '[]'::jsonb),
    'hangout_today', EXISTS (SELECT 1 FROM public.friend_hangouts WHERE character_id = cid AND day = public.game_now()::date),
    -- Habitants simulés assez proches (relations privées existantes)
    'close_npcs', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'name', n.first_name || ' ' || n.last_name, 'age', n.age, 'score', r.score) ORDER BY r.score DESC)
       FROM public.social_relations r JOIN public.social_npcs n ON n.id = r.npc_id
       WHERE r.character_id = cid AND r.score >= s.npc_friend_score AND n.age >= 18), '[]'::jsonb));
END $$;

CREATE FUNCTION public.family_action(_command text, _input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; s public.family_settings; cp public.couples; other uuid; npc uuid;
        rid uuid := NULLIF(_input->>'request_id', '')::uuid; oid uuid; k public.children; f public.close_friends; nm text; gain integer; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.family_settings WHERE id = 1;
  PERFORM public.family_settle(cid);
  other := NULLIF(_input->>'character_id', '')::uuid; npc := NULLIF(_input->>'npc_id', '')::uuid;
  IF other IS NOT NULL THEN
    PERFORM 1 FROM public.characters WHERE id = other FOR UPDATE;
    IF NOT FOUND OR other = cid THEN RAISE EXCEPTION 'Joueur introuvable.'; END IF;
    IF public.network_blocked(cid, other) THEN RAISE EXCEPTION 'Interaction impossible avec ce joueur'; END IF;
  END IF;
  cp := public.family_active_couple(cid);

  IF _command = 'propose' THEN                         -- se mettre en couple
    SELECT id INTO oid FROM public.couples WHERE request_id = rid; IF oid IS NOT NULL THEN RETURN oid; END IF;
    IF c.age < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans.', s.min_age; END IF;
    IF cp.id IS NOT NULL THEN RAISE EXCEPTION 'Vous êtes déjà en couple.'; END IF;
    IF other IS NOT NULL THEN
      IF (SELECT age FROM public.characters WHERE id = other) < s.min_age THEN RAISE EXCEPTION 'Cette personne n''a pas l''âge requis.'; END IF;
      IF (public.family_active_couple(other)).id IS NOT NULL THEN RAISE EXCEPTION 'Cette personne est déjà en couple.'; END IF;
      IF EXISTS (SELECT 1 FROM public.couples WHERE status = 'pending' AND ((a_id = cid AND b_id = other) OR (a_id = other AND b_id = cid))) THEN RAISE EXCEPTION 'Une demande est déjà en attente.'; END IF;
      INSERT INTO public.couples (request_id, a_id, b_id) VALUES (rid, cid, other) RETURNING id INTO oid;
      PERFORM public.family_notify(other, 'Demande de couple', c.first_name || ' ' || c.last_name || ' souhaite former un couple avec vous.');
    ELSIF npc IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.social_relations r JOIN public.social_npcs n ON n.id = r.npc_id
                     WHERE r.character_id = cid AND r.npc_id = npc AND r.score >= s.npc_couple_score AND n.age >= 18) THEN
        RAISE EXCEPTION 'Il faut une relation d''au moins % avec cette personne.', s.npc_couple_score; END IF;
      IF EXISTS (SELECT 1 FROM public.couples WHERE npc_id = npc AND status = 'couple') THEN RAISE EXCEPTION 'Cette personne est déjà en couple.'; END IF;
      INSERT INTO public.couples (request_id, a_id, npc_id, status, started_at) VALUES (rid, cid, npc, 'couple', public.game_now()) RETURNING id INTO oid;
    ELSE RAISE EXCEPTION 'Choisissez une personne.'; END IF;
    RETURN oid;

  ELSIF _command = 'answer' THEN                       -- répondre à une demande de couple
    SELECT * INTO cp FROM public.couples WHERE id = (_input->>'couple_id')::uuid AND b_id = cid AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable ou expirée.'; END IF;
    IF (_input->>'accept')::boolean THEN
      IF (public.family_active_couple(cid)).id IS NOT NULL OR (public.family_active_couple(cp.a_id)).id IS NOT NULL THEN RAISE EXCEPTION 'L''un de vous est déjà en couple.'; END IF;
      UPDATE public.couples SET status = 'couple', started_at = public.game_now() WHERE id = cp.id;
      UPDATE public.couples SET status = 'declined' WHERE status = 'pending' AND id <> cp.id AND (a_id IN (cid, cp.a_id) OR b_id IN (cid, cp.a_id));
      PERFORM public.family_notify(cp.a_id, 'Vous êtes en couple', c.first_name || ' a accepté votre demande.');
    ELSE
      UPDATE public.couples SET status = 'declined' WHERE id = cp.id;
      PERFORM public.family_notify(cp.a_id, 'Demande déclinée', c.first_name || ' a décliné votre demande.');
    END IF;
    RETURN cp.id;

  ELSIF _command = 'union' THEN                        -- demander / accepter PACS ou mariage
    IF cp.id IS NULL THEN RAISE EXCEPTION 'Il faut être en couple.'; END IF;
    IF _input->>'kind' NOT IN ('pacs','mariage') THEN RAISE EXCEPTION 'Choix invalide.'; END IF;
    IF cp.union_kind = 'mariage' OR cp.union_kind = _input->>'kind' THEN RAISE EXCEPTION 'C''est déjà fait.'; END IF;
    IF public.game_now() < cp.started_at + make_interval(days => s.union_after_days) THEN RAISE EXCEPTION 'Possible après % jours de couple.', s.union_after_days; END IF;
    IF cp.npc_id IS NOT NULL OR (cp.union_pending = _input->>'kind' AND cp.union_requested_by <> cid) THEN
      UPDATE public.couples SET union_kind = _input->>'kind', union_at = public.game_now(), union_pending = NULL, union_requested_by = NULL WHERE id = cp.id;
      IF cp.npc_id IS NULL THEN PERFORM public.family_notify(cp.union_requested_by, CASE WHEN _input->>'kind' = 'pacs' THEN 'PACS signé' ELSE 'Mariage célébré' END, 'Félicitations !'); END IF;
    ELSE
      UPDATE public.couples SET union_pending = _input->>'kind', union_requested_by = cid WHERE id = cp.id;
      PERFORM public.family_notify(CASE WHEN cp.a_id = cid THEN cp.b_id ELSE cp.a_id END,
        CASE WHEN _input->>'kind' = 'pacs' THEN 'Proposition de PACS' ELSE 'Demande en mariage' END, c.first_name || ' vous fait une proposition.');
    END IF;
    RETURN cp.id;

  ELSIF _command = 'separate' THEN
    IF cp.id IS NULL THEN RAISE EXCEPTION 'Vous n''êtes pas en couple.'; END IF;
    UPDATE public.couples SET status = 'ended', ended_at = public.game_now(), union_pending = NULL WHERE id = cp.id;
    UPDATE public.cohabitations SET status = 'ended', ended_at = public.game_now() WHERE couple_id = cp.id AND status IN ('pending','active');
    IF cp.b_id IS NOT NULL THEN PERFORM public.family_notify(CASE WHEN cp.a_id = cid THEN cp.b_id ELSE cp.a_id END, 'Séparation', c.first_name || ' a mis fin à votre couple.'); END IF;
    RETURN cp.id;

  ELSIF _command = 'move_in' THEN                      -- proposer d'emménager chez son/sa partenaire (joueurs)
    IF cp.id IS NULL OR cp.b_id IS NULL THEN RAISE EXCEPTION 'Le logement partagé se fait entre deux joueurs en couple.'; END IF;
    other := CASE WHEN cp.a_id = cid THEN cp.b_id ELSE cp.a_id END;
    IF NOT EXISTS (SELECT 1 FROM public.character_housing WHERE character_id = other) THEN RAISE EXCEPTION 'Votre partenaire n''a pas de logement.'; END IF;
    INSERT INTO public.cohabitations (couple_id, host_id, guest_id) VALUES (cp.id, other, cid)
    ON CONFLICT (couple_id) DO UPDATE SET host_id = EXCLUDED.host_id, guest_id = EXCLUDED.guest_id, status = 'pending', since = NULL, settled_until = NULL, ended_at = NULL
      WHERE cohabitations.status = 'ended';
    PERFORM public.family_notify(other, 'Emménager ensemble ?', c.first_name || ' propose de venir vivre chez vous et de payer une part du loyer.');
    RETURN cp.id;

  ELSIF _command = 'host_answer' THEN
    IF cp.id IS NULL THEN RAISE EXCEPTION 'Vous n''êtes pas en couple.'; END IF;
    IF (_input->>'accept')::boolean THEN
      UPDATE public.cohabitations SET status = 'active', since = public.game_now(), settled_until = public.game_now()::date - 1
        WHERE couple_id = cp.id AND host_id = cid AND status = 'pending';
    ELSE
      UPDATE public.cohabitations SET status = 'ended', ended_at = public.game_now() WHERE couple_id = cp.id AND host_id = cid AND status = 'pending';
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'Aucune demande en attente.'; END IF;
    RETURN cp.id;

  ELSIF _command = 'move_out' THEN
    UPDATE public.cohabitations SET status = 'ended', ended_at = public.game_now() WHERE couple_id = cp.id AND status IN ('pending','active');
    IF NOT FOUND THEN RAISE EXCEPTION 'Vous ne vivez pas ensemble.'; END IF;
    RETURN cp.id;

  ELSIF _command IN ('child','adopt') THEN
    SELECT id INTO oid FROM public.children WHERE request_id = rid; IF oid IS NOT NULL THEN RETURN oid; END IF;
    nm := btrim(coalesce(_input->>'first_name', ''));
    IF char_length(nm) NOT BETWEEN 2 AND 30 OR nm !~ '^[A-Za-zÀ-ÖØ-öø-ÿ'' -]+$' THEN RAISE EXCEPTION 'Prénom : 2 à 30 lettres.'; END IF;
    IF NOT public.press_clean(nm) THEN RAISE EXCEPTION 'Prénom refusé par le filtre automatique.'; END IF;
    IF (SELECT count(*) FROM public.children WHERE cid IN (parent_a, parent_b) AND status IN ('pending','home')) >= s.child_max THEN
      RAISE EXCEPTION 'Maximum % enfants au foyer.', s.child_max; END IF;
    IF _command = 'child' THEN
      IF cp.id IS NULL THEN RAISE EXCEPTION 'Il faut être en couple pour avoir un enfant.'; END IF;
      IF c.age < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans.', s.min_age; END IF;
      IF cp.npc_id IS NOT NULL THEN
        INSERT INTO public.children (request_id, first_name, parent_a, npc_parent, origin, status, born_at)
        VALUES (rid, nm, cid, cp.npc_id, 'naissance', 'home', public.game_now()) RETURNING id INTO oid;
      ELSE
        INSERT INTO public.children (request_id, first_name, parent_a, parent_b, origin)
        VALUES (rid, nm, cid, CASE WHEN cp.a_id = cid THEN cp.b_id ELSE cp.a_id END, 'naissance') RETURNING id INTO oid;
        PERFORM public.family_notify(CASE WHEN cp.a_id = cid THEN cp.b_id ELSE cp.a_id END, 'Projet d''enfant', c.first_name || ' aimerait avoir un enfant avec vous : ' || nm || '.');
      END IF;
    ELSE
      IF c.age < s.adoption_min_age THEN RAISE EXCEPTION 'Il faut avoir % ans pour adopter.', s.adoption_min_age; END IF;
      IF cp.id IS NULL OR cp.b_id IS NULL THEN
        INSERT INTO public.children (request_id, first_name, parent_a, npc_parent, origin, status, born_at)
        VALUES (rid, nm, cid, cp.npc_id, 'adoption', 'home', public.game_now()) RETURNING id INTO oid;
      ELSE
        INSERT INTO public.children (request_id, first_name, parent_a, parent_b, origin)
        VALUES (rid, nm, cid, CASE WHEN cp.a_id = cid THEN cp.b_id ELSE cp.a_id END, 'adoption') RETURNING id INTO oid;
        PERFORM public.family_notify(CASE WHEN cp.a_id = cid THEN cp.b_id ELSE cp.a_id END, 'Projet d''adoption', c.first_name || ' aimerait adopter avec vous : ' || nm || '.');
      END IF;
    END IF;
    RETURN oid;

  ELSIF _command = 'child_answer' THEN
    SELECT * INTO k FROM public.children WHERE id = (_input->>'child_id')::uuid AND parent_b = cid AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Projet introuvable.'; END IF;
    UPDATE public.children SET status = CASE WHEN (_input->>'accept')::boolean THEN 'home' ELSE 'declined' END,
      born_at = CASE WHEN (_input->>'accept')::boolean THEN public.game_now() END WHERE id = k.id;
    PERFORM public.family_notify(k.parent_a, CASE WHEN (_input->>'accept')::boolean THEN 'Bienvenue ' || k.first_name || ' !' ELSE 'Projet décliné' END,
      CASE WHEN (_input->>'accept')::boolean THEN k.first_name || ' rejoint votre foyer.' ELSE 'Votre partenaire a décliné le projet.' END);
    RETURN k.id;

  ELSIF _command = 'friend' THEN
    IF (SELECT count(*) FROM public.close_friends WHERE cid IN (a_id, b_id) AND status IN ('pending','active')) >= s.friend_max THEN
      RAISE EXCEPTION 'Maximum % amis proches.', s.friend_max; END IF;
    IF other IS NOT NULL THEN
      INSERT INTO public.close_friends (a_id, b_id) VALUES (cid, other) RETURNING id INTO oid;
      PERFORM public.family_notify(other, 'Ami proche ?', c.first_name || ' ' || c.last_name || ' vous propose de devenir amis proches.');
    ELSIF npc IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.social_relations WHERE character_id = cid AND npc_id = npc AND score >= s.npc_friend_score) THEN
        RAISE EXCEPTION 'Il faut une relation d''au moins % avec cette personne.', s.npc_friend_score; END IF;
      INSERT INTO public.close_friends (a_id, npc_id, status) VALUES (cid, npc, 'active') RETURNING id INTO oid;
    ELSE RAISE EXCEPTION 'Choisissez une personne.'; END IF;
    RETURN oid;

  ELSIF _command = 'friend_answer' THEN
    UPDATE public.close_friends SET status = CASE WHEN (_input->>'accept')::boolean THEN 'active' ELSE 'declined' END
      WHERE id = (_input->>'friend_id')::uuid AND b_id = cid AND status = 'pending' RETURNING * INTO f;
    IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable.'; END IF;
    RETURN f.id;

  ELSIF _command = 'unfriend' THEN
    UPDATE public.close_friends SET status = 'ended' WHERE id = (_input->>'friend_id')::uuid AND cid IN (a_id, b_id) AND status IN ('pending','active') RETURNING * INTO f;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ami introuvable.'; END IF;
    RETURN f.id;

  ELSIF _command = 'hangout' THEN                      -- un moment ensemble par jour de jeu
    SELECT * INTO f FROM public.close_friends WHERE id = (_input->>'friend_id')::uuid AND cid IN (a_id, b_id) AND status = 'active';
    IF NOT FOUND THEN RAISE EXCEPTION 'Ami introuvable.'; END IF;
    IF EXISTS (SELECT 1 FROM public.friend_hangouts WHERE character_id = cid AND day = public.game_now()::date) THEN
      RAISE EXCEPTION 'Déjà un moment entre amis aujourd''hui.'; END IF;
    gain := LEAST(s.friend_energy, 100 - c.energy);
    INSERT INTO public.friend_hangouts (character_id, day, friend_id, energy) VALUES (cid, public.game_now()::date, f.id, gain);
    UPDATE public.characters SET energy = energy + gain WHERE id = cid;
    IF f.npc_id IS NOT NULL THEN
      UPDATE public.social_relations SET score = LEAST(100, score + 1), last_interaction = public.game_now() WHERE character_id = cid AND npc_id = f.npc_id;
    END IF;
    RETURN f.id;
  END IF;
  RAISE EXCEPTION 'Commande inconnue.';
END $$;

REVOKE ALL ON FUNCTION public.family_notify(uuid, text, text), public.family_active_couple(uuid), public.family_week(timestamptz),
  public.family_settle(uuid), public.family_person(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.family_state(), public.family_action(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_state(), public.family_action(text, jsonb) TO authenticated;

COMMIT;
