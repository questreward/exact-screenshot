-- CIVITAS – P6 : PROFILS VISIBLES ET RÉSEAU ENTRE JOUEURS
-- Uniquement des ajouts. Tout ou rien. Aucune fonction existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0053_p6_player_network.sql
-- Le profil public n'expose jamais l'argent, l'agenda, la position exacte ni les votes.
BEGIN;

CREATE TABLE public.network_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  bio_max integer NOT NULL DEFAULT 280,
  message_max integer NOT NULL DEFAULT 500,
  directory_limit integer NOT NULL DEFAULT 50,
  pending_max integer NOT NULL DEFAULT 20
);
CREATE TABLE public.player_bios (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  bio text NOT NULL DEFAULT '',
  listed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.player_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.characters(id),
  addressee_id uuid NOT NULL REFERENCES public.characters(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','removed')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  responded_at timestamptz,
  CHECK (requester_id <> addressee_id)
);
CREATE UNIQUE INDEX player_contacts_pair ON public.player_contacts (least(requester_id, addressee_id), greatest(requester_id, addressee_id)) WHERE status IN ('pending','accepted');
CREATE TABLE public.player_follows (
  follower_id uuid NOT NULL REFERENCES public.characters(id),
  followed_id uuid NOT NULL REFERENCES public.characters(id),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
CREATE TABLE public.player_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  a_id uuid NOT NULL REFERENCES public.characters(id),
  b_id uuid NOT NULL REFERENCES public.characters(id),
  last_at timestamptz NOT NULL DEFAULT public.game_now(),
  CHECK (a_id < b_id),
  UNIQUE (a_id, b_id)
);
CREATE TABLE public.player_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.player_threads(id),
  sender_id uuid NOT NULL REFERENCES public.characters(id),
  request_key text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT public.game_now(),
  read_at timestamptz,
  UNIQUE (sender_id, request_key)
);
CREATE INDEX player_messages_thread ON public.player_messages (thread_id, sent_at);

GRANT SELECT ON public.network_settings, public.player_bios, public.player_contacts, public.player_follows, public.player_threads, public.player_messages TO authenticated;
GRANT ALL ON public.network_settings, public.player_bios, public.player_contacts, public.player_follows, public.player_threads, public.player_messages TO service_role;
ALTER TABLE public.network_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_bios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY network_settings_read ON public.network_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY player_bios_own ON public.player_bios FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = player_bios.character_id AND c.user_id = auth.uid()));
CREATE POLICY player_contacts_own ON public.player_contacts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (player_contacts.requester_id, player_contacts.addressee_id) AND c.user_id = auth.uid()));
CREATE POLICY player_follows_own ON public.player_follows FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = player_follows.follower_id AND c.user_id = auth.uid()));
CREATE POLICY player_threads_own ON public.player_threads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (player_threads.a_id, player_threads.b_id) AND c.user_id = auth.uid()));
CREATE POLICY player_messages_own ON public.player_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.player_threads t JOIN public.characters c ON c.id IN (t.a_id, t.b_id) WHERE t.id = player_messages.thread_id AND c.user_id = auth.uid()));
INSERT INTO public.network_settings (id) VALUES (1);

-- Outils internes ---------------------------------------------------------------------
CREATE FUNCTION public.network_is_contact(_a uuid, _b uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.player_contacts WHERE status = 'accepted'
    AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a)))
$$;

CREATE FUNCTION public.network_notify(_cid uuid, _title text, _body text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body) SELECT user_id, _title, _body FROM public.characters WHERE id = _cid
$$;

-- Résumé public (annuaire, joueurs sur place, contacts)
CREATE FUNCTION public.network_card(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', c.id, 'name', c.first_name || ' ' || c.last_name, 'age', c.age,
    'city', (SELECT name FROM public.cities WHERE id = c.city_id), 'situation', c.situation,
    'reputation', COALESCE((SELECT reputation FROM public.social_stats WHERE character_id = c.id), 0),
    'appearance', c.appearance)
  FROM public.characters c WHERE c.id = _cid
$$;

-- Profil public complet, vu par _viewer
CREATE FUNCTION public.network_profile(_viewer uuid, _cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.network_card(c.id) || jsonb_build_object(
    'bio', COALESCE((SELECT bio FROM public.player_bios WHERE character_id = c.id), ''),
    'influence', COALESCE((SELECT influence FROM public.social_stats WHERE character_id = c.id), 0),
    'political_reputation', COALESCE((SELECT reputation FROM public.political_stats WHERE character_id = c.id), 0),
    'job', (SELECT j.title FROM public.employments e JOIN public.jobs j ON j.id = e.job_id WHERE e.character_id = c.id),
    'organizations', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'kind', o.kind, 'role', m.role) ORDER BY m.joined_at)
        FROM public.memberships m JOIN public.organizations o ON o.id = m.organization_id WHERE m.character_id = c.id AND m.status = 'active'), '[]'::jsonb),
    'mandate', (SELECT jsonb_build_object('function', mm.function, 'city', ci.name) FROM public.municipal_mandates mm
        JOIN public.candidacies ca ON ca.id = mm.candidacy_id JOIN public.cities ci ON ci.id = mm.city_id
        WHERE ca.character_id = c.id AND mm.closed_at IS NULL AND mm.ends_at > public.game_now() ORDER BY mm.starts_at DESC LIMIT 1),
    'business', (SELECT jsonb_build_object('name', b.name, 'sector', s.label) FROM public.businesses b JOIN public.business_sectors s ON s.id = b.sector_id
        WHERE b.owner_id = c.id AND b.status = 'active'),
    'followers', (SELECT count(*) FROM public.player_follows WHERE followed_id = c.id),
    'contacts_count', (SELECT count(*) FROM public.player_contacts WHERE status = 'accepted' AND c.id IN (requester_id, addressee_id)),
    'is_me', c.id = _viewer,
    'following', EXISTS (SELECT 1 FROM public.player_follows WHERE follower_id = _viewer AND followed_id = c.id),
    'contact', (SELECT jsonb_build_object('id', pc.id, 'status', pc.status, 'incoming', pc.addressee_id = _viewer) FROM public.player_contacts pc
        WHERE pc.status IN ('pending','accepted') AND least(pc.requester_id, pc.addressee_id) = least(_viewer, c.id)
          AND greatest(pc.requester_id, pc.addressee_id) = greatest(_viewer, c.id) LIMIT 1))
  FROM public.characters c WHERE c.id = _cid
$$;

-- Lecture --------------------------------------------------------------------------------
CREATE FUNCTION public.player_directory(_query text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; q text := btrim(coalesce(_query, '')); lim integer; loc uuid; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT directory_limit INTO lim FROM public.network_settings WHERE id = 1;
  SELECT location_id INTO loc FROM public.character_positions WHERE character_id = cid;
  RETURN jsonb_build_object(
    'city', (SELECT name FROM public.cities WHERE id = c.city_id),
    'players', COALESCE((SELECT jsonb_agg(public.network_card(x.id) ORDER BY x.last_name, x.first_name) FROM (
        SELECT o.* FROM public.characters o LEFT JOIN public.player_bios pb ON pb.character_id = o.id
        WHERE o.id <> cid AND o.city_id = c.city_id AND COALESCE(pb.listed, true)
          AND (q = '' OR (o.first_name || ' ' || o.last_name) ILIKE '%' || replace(replace(q, '%', ''), '_', '') || '%')
        ORDER BY o.last_name, o.first_name LIMIT lim) x), '[]'::jsonb),
    'here', COALESCE((SELECT jsonb_agg(public.network_card(p.character_id)) FROM public.character_positions p
        WHERE p.location_id = loc AND p.character_id <> cid), '[]'::jsonb)
  );
END $$;

CREATE FUNCTION public.player_profile(_target uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _target) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  RETURN public.network_profile(cid, _target);
END $$;

CREATE FUNCTION public.network_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  RETURN jsonb_build_object(
    'me', cid,
    'settings', (SELECT to_jsonb(s) FROM public.network_settings s WHERE id = 1),
    'bio', COALESCE((SELECT jsonb_build_object('bio', bio, 'listed', listed) FROM public.player_bios WHERE character_id = cid), jsonb_build_object('bio', '', 'listed', true)),
    'contacts', COALESCE((SELECT jsonb_agg(public.network_card(CASE WHEN pc.requester_id = cid THEN pc.addressee_id ELSE pc.requester_id END) || jsonb_build_object('contact_id', pc.id))
        FROM public.player_contacts pc WHERE pc.status = 'accepted' AND cid IN (pc.requester_id, pc.addressee_id)), '[]'::jsonb),
    'incoming', COALESCE((SELECT jsonb_agg(public.network_card(pc.requester_id) || jsonb_build_object('contact_id', pc.id) ORDER BY pc.created_at DESC)
        FROM public.player_contacts pc WHERE pc.status = 'pending' AND pc.addressee_id = cid), '[]'::jsonb),
    'outgoing', COALESCE((SELECT jsonb_agg(public.network_card(pc.addressee_id) || jsonb_build_object('contact_id', pc.id) ORDER BY pc.created_at DESC)
        FROM public.player_contacts pc WHERE pc.status = 'pending' AND pc.requester_id = cid), '[]'::jsonb),
    'following', COALESCE((SELECT jsonb_agg(public.network_card(f.followed_id) ORDER BY f.created_at DESC) FROM public.player_follows f WHERE f.follower_id = cid), '[]'::jsonb),
    'followers', (SELECT count(*) FROM public.player_follows WHERE followed_id = cid),
    'threads', COALESCE((SELECT jsonb_agg(x ORDER BY x.last_at DESC) FROM (
        SELECT t.id, t.last_at, public.network_card(CASE WHEN t.a_id = cid THEN t.b_id ELSE t.a_id END) AS other,
          (SELECT body FROM public.player_messages m WHERE m.thread_id = t.id ORDER BY sent_at DESC LIMIT 1) AS last_body,
          (SELECT count(*) FROM public.player_messages m WHERE m.thread_id = t.id AND m.sender_id <> cid AND m.read_at IS NULL) AS unread
        FROM public.player_threads t WHERE cid IN (t.a_id, t.b_id)) x), '[]'::jsonb)
  );
END $$;

CREATE FUNCTION public.read_player_thread(_other uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; tid uuid; BEGIN
  cid := public.social_actor();
  SELECT id INTO tid FROM public.player_threads WHERE a_id = least(cid, _other) AND b_id = greatest(cid, _other);
  IF tid IS NOT NULL THEN
    UPDATE public.player_messages SET read_at = public.game_now() WHERE thread_id = tid AND sender_id <> cid AND read_at IS NULL;
  END IF;
  RETURN jsonb_build_object(
    'other', public.network_card(_other),
    'can_write', public.network_is_contact(cid, _other),
    'messages', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'mine', m.sender_id = cid, 'body', m.body, 'sent_at', m.sent_at) ORDER BY m.sent_at)
        FROM (SELECT * FROM public.player_messages WHERE thread_id = tid ORDER BY sent_at DESC LIMIT 100) m), '[]'::jsonb));
END $$;

-- Actions ----------------------------------------------------------------------------------
CREATE FUNCTION public.set_player_bio(_bio text, _listed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; mx integer; BEGIN
  cid := public.social_actor();
  SELECT bio_max INTO mx FROM public.network_settings WHERE id = 1;
  IF length(coalesce(_bio, '')) > mx THEN RAISE EXCEPTION 'Présentation limitée à % caractères', mx; END IF;
  INSERT INTO public.player_bios (character_id, bio, listed) VALUES (cid, btrim(coalesce(_bio, '')), coalesce(_listed, true))
  ON CONFLICT (character_id) DO UPDATE SET bio = EXCLUDED.bio, listed = EXCLUDED.listed, updated_at = public.game_now();
END $$;

CREATE FUNCTION public.request_contact(_target uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; rid uuid; mx integer; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  IF _target = cid OR NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _target) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  IF EXISTS (SELECT 1 FROM public.player_contacts WHERE status IN ('pending','accepted') AND least(requester_id, addressee_id) = least(cid, _target) AND greatest(requester_id, addressee_id) = greatest(cid, _target)) THEN
    RAISE EXCEPTION 'Demande déjà envoyée ou contact existant'; END IF;
  SELECT pending_max INTO mx FROM public.network_settings WHERE id = 1;
  IF (SELECT count(*) FROM public.player_contacts WHERE requester_id = cid AND status = 'pending') >= mx THEN RAISE EXCEPTION 'Trop de demandes en attente (% maximum)', mx; END IF;
  INSERT INTO public.player_contacts (requester_id, addressee_id) VALUES (cid, _target) RETURNING id INTO rid;
  PERFORM public.network_notify(_target, 'Demande de contact', c.first_name || ' ' || c.last_name || ' souhaite vous ajouter à ses contacts.');
  RETURN rid;
END $$;

CREATE FUNCTION public.respond_contact(_request uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; r public.player_contacts; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO r FROM public.player_contacts WHERE id = _request AND addressee_id = cid AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  UPDATE public.player_contacts SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END, responded_at = public.game_now() WHERE id = r.id;
  IF _accept THEN PERFORM public.network_notify(r.requester_id, 'Contact accepté', c.first_name || ' ' || c.last_name || ' a accepté votre demande.'); END IF;
END $$;

CREATE FUNCTION public.cancel_contact(_contact uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  UPDATE public.player_contacts SET status = 'removed', responded_at = public.game_now()
  WHERE id = _contact AND status IN ('pending','accepted') AND cid IN (requester_id, addressee_id)
    AND (status = 'accepted' OR requester_id = cid);
  IF NOT FOUND THEN RAISE EXCEPTION 'Contact introuvable'; END IF;
END $$;

CREATE FUNCTION public.follow_player(_target uuid, _on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  IF _target = cid OR NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _target) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  IF _on THEN
    INSERT INTO public.player_follows (follower_id, followed_id) VALUES (cid, _target) ON CONFLICT DO NOTHING;
    IF FOUND THEN PERFORM public.network_notify(_target, 'Nouvel abonné', c.first_name || ' ' || c.last_name || ' vous suit.'); END IF;
  ELSE DELETE FROM public.player_follows WHERE follower_id = cid AND followed_id = _target; END IF;
END $$;

CREATE FUNCTION public.send_player_message(_target uuid, _body text, _request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; tid uuid; mid uuid; mx integer; b text := btrim(coalesce(_body, '')); BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT id INTO mid FROM public.player_messages WHERE sender_id = cid AND request_key = _request_id::text;
  IF mid IS NOT NULL THEN RETURN mid; END IF;
  IF NOT public.network_is_contact(cid, _target) THEN RAISE EXCEPTION 'Messages réservés à vos contacts'; END IF;
  SELECT message_max INTO mx FROM public.network_settings WHERE id = 1;
  IF length(b) < 1 OR length(b) > mx THEN RAISE EXCEPTION 'Message entre 1 et % caractères', mx; END IF;
  INSERT INTO public.player_threads (a_id, b_id) VALUES (least(cid, _target), greatest(cid, _target)) ON CONFLICT (a_id, b_id) DO UPDATE SET last_at = public.game_now()
  RETURNING id INTO tid;
  INSERT INTO public.player_messages (thread_id, sender_id, request_key, body) VALUES (tid, cid, _request_id::text, b) RETURNING id INTO mid;
  PERFORM public.network_notify(_target, 'Message de ' || c.first_name, left(b, 80));
  RETURN mid;
END $$;

REVOKE ALL ON FUNCTION public.network_is_contact(uuid,uuid), public.network_notify(uuid,text,text), public.network_card(uuid), public.network_profile(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.player_directory(text), public.player_profile(uuid), public.network_state(), public.read_player_thread(uuid), public.set_player_bio(text,boolean),
  public.request_contact(uuid), public.respond_contact(uuid,boolean), public.cancel_contact(uuid), public.follow_player(uuid,boolean), public.send_player_message(uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_directory(text), public.player_profile(uuid), public.network_state(), public.read_player_thread(uuid), public.set_player_bio(text,boolean),
  public.request_contact(uuid), public.respond_contact(uuid,boolean), public.cancel_contact(uuid), public.follow_player(uuid,boolean), public.send_player_message(uuid,text,uuid) TO authenticated;

DO $$ BEGIN
  IF to_regclass('public.businesses') IS NULL THEN RAISE EXCEPTION 'P5c doit être installé avant P6'; END IF;
  IF (SELECT count(*) FROM public.player_contacts) <> 0 THEN RAISE EXCEPTION 'Aucun contact attendu'; END IF;
  IF (SELECT count(*) FROM public.events) < 81 THEN RAISE EXCEPTION 'Événements existants perdus'; END IF;
  RAISE NOTICE 'P6 installé : profils publics, contacts, abonnements et messages entre joueurs prêts';
END $$;

COMMIT;
