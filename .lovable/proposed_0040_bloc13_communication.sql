-- =====================================================================
-- Bloc 13 — Messages, Réseau social Civi, Monde (PROPOSITION, NON APPLIQUÉE)
-- Purement additif : aucune table/colonne/fonction existante modifiée,
-- aucune ligne existante mise à jour ou supprimée.
-- =====================================================================

-- ---------- 1. Réglages (config, une seule ligne) ----------
CREATE TABLE public.communication_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  daily_post_limit integer NOT NULL DEFAULT 3 CHECK (daily_post_limit BETWEEN 0 AND 10),
  reputation_per_post integer NOT NULL DEFAULT 1 CHECK (reputation_per_post BETWEEN 0 AND 3),
  daily_like_reward_limit integer NOT NULL DEFAULT 0,          -- les « j'aime » ne rapportent rien
  invite_offer_min_score integer NOT NULL DEFAULT 40,
  feed_window_days integer NOT NULL DEFAULT 7
);
INSERT INTO public.communication_settings (id) VALUES (1);

-- ---------- 2. Modèles (config, lecture seule pour les joueurs) ----------
CREATE TABLE public.message_templates (
  id text PRIMARY KEY,
  trigger_kind text NOT NULL CHECK (trigger_kind IN ('meet','invite_offer','reminder','membership','election_win')),
  body text NOT NULL,                       -- {npc} {player} {place} {org} remplacés côté serveur
  replies jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{id,label,body}] 3 réponses fermées
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE public.social_post_templates (
  id text PRIMARY KEY,
  category text NOT NULL,
  body text NOT NULL,                       -- {city} {place} remplacés côté serveur
  active boolean NOT NULL DEFAULT true
);

INSERT INTO public.message_templates (id, trigger_kind, body, replies) VALUES
('meet_1','meet','Ravi(e) de t''avoir rencontré(e), {player} ! On se recroise bientôt ?',
 '[{"id":"warm","label":"Avec plaisir !","body":"Avec plaisir, à bientôt !"},{"id":"neutral","label":"Pourquoi pas","body":"Pourquoi pas, on verra."},{"id":"busy","label":"Je suis occupé(e)","body":"Je suis assez occupé(e) en ce moment."}]'),
('invite_offer_1','invite_offer','Ça te dirait qu''on se voie à {place} ?',
 '[{"id":"accept","label":"Proposer un rendez-vous","body":"Bonne idée, je passe te voir."},{"id":"later","label":"Plus tard","body":"Plus tard, si tu veux bien."},{"id":"no","label":"Pas cette fois","body":"Pas cette fois, désolé(e)."}]'),
('reminder_1','reminder','Petit rappel pour notre rendez-vous à {place} !',
 '[{"id":"ok","label":"J''y serai","body":"J''y serai !"},{"id":"thanks","label":"Merci du rappel","body":"Merci du rappel."},{"id":"late","label":"Je serai un peu en retard","body":"Je serai peut-être un peu en retard."}]'),
('membership_1','membership','Bienvenue chez {org}, {player} ! Content(e) de te compter parmi nous.',
 '[{"id":"thanks","label":"Merci !","body":"Merci pour l''accueil !"},{"id":"help","label":"Comment aider ?","body":"Comment puis-je aider ?"},{"id":"later","label":"À bientôt","body":"À bientôt !"}]'),
('election_win_1','election_win','Félicitations pour ton élection, {player} ! Toute la ville compte sur toi.',
 '[{"id":"thanks","label":"Merci beaucoup","body":"Merci beaucoup !"},{"id":"work","label":"Au travail !","body":"Le travail commence maintenant."},{"id":"together","label":"Ensemble","body":"On va y arriver ensemble."}]');

INSERT INTO public.social_post_templates (id, category, body) VALUES
('city_love','Ville','Belle journée à {city} aujourd''hui !'),
('event_going','Événement','Qui vient à l''événement de ce soir à {city} ?'),
('work_day','Travail','Grosse journée de travail, mais motivé(e) !'),
('study_day','Études','Révisions en cours… courage à tous les étudiants de {city} !'),
('civic','Citoyenneté','Participer à la vie de {city}, ça compte. Pensez aux consultations !'),
('news_share','Actualités','À lire : ce qui se passe en ce moment à {city}.');

-- ---------- 3. Messages privés ----------
CREATE TABLE public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  npc_id uuid NOT NULL REFERENCES public.social_npcs(id),
  last_message_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (character_id, npc_id)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('npc','player')),
  template_id text REFERENCES public.message_templates(id),
  body text NOT NULL,
  source_key text NOT NULL,                 -- fait source ou 'reply:<message id>'
  location_id uuid REFERENCES public.locations(id),
  sent_at timestamptz NOT NULL DEFAULT public.game_now(),
  read_at timestamptz,
  replied_with text,                        -- id de la réponse choisie (messages PNJ)
  UNIQUE (character_id, source_key)         -- anti-doublon serveur
);
CREATE INDEX messages_thread_idx ON public.messages (thread_id, sent_at);
CREATE INDEX messages_unread_idx ON public.messages (character_id) WHERE read_at IS NULL AND sender = 'npc';

-- ---------- 4. Réseau social Civi ----------
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_kind text NOT NULL CHECK (author_kind IN ('npc','media','organization','mairie','player')),
  author_label text NOT NULL,
  character_id uuid REFERENCES public.characters(id) ON DELETE CASCADE, -- seulement pour 'player'
  npc_id uuid REFERENCES public.social_npcs(id),
  organization_id uuid REFERENCES public.organizations(id),
  city_id text REFERENCES public.cities(id),
  news_id uuid REFERENCES public.news(id),
  event_id uuid REFERENCES public.events(id),
  template_id text REFERENCES public.social_post_templates(id),
  body text NOT NULL,
  source_key text NOT NULL UNIQUE,          -- 'news:<id>' / 'event:<id>' / 'player:<cid>:<date>:<n>'
  posted_at timestamptz NOT NULL DEFAULT public.game_now(),
  CHECK ((author_kind = 'player') = (character_id IS NOT NULL))
);
CREATE INDEX social_posts_feed_idx ON public.social_posts (city_id, posted_at DESC);
CREATE INDEX social_posts_player_idx ON public.social_posts (character_id, posted_at DESC) WHERE character_id IS NOT NULL;

CREATE TABLE public.social_post_reactions (
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('like','share')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (post_id, character_id, kind)
);

-- ---------- 5. Permissions et RLS : lecture seule, jamais d'écriture directe ----------
GRANT SELECT ON public.communication_settings, public.message_templates, public.social_post_templates TO authenticated;
GRANT SELECT ON public.message_threads, public.messages, public.social_posts, public.social_post_reactions TO authenticated;
GRANT ALL ON public.communication_settings, public.message_templates, public.social_post_templates,
  public.message_threads, public.messages, public.social_posts, public.social_post_reactions TO service_role;

ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read settings" ON public.communication_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "read message templates" ON public.message_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "read post templates" ON public.social_post_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "own threads" ON public.message_threads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY "own messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
-- Publications fictives visibles de tous ; publications d'un joueur visibles par lui seul.
CREATE POLICY "fictional or own posts" ON public.social_posts FOR SELECT TO authenticated
  USING (character_id IS NULL OR EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY "own reactions" ON public.social_post_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
-- Aucune politique INSERT/UPDATE/DELETE : toute écriture passe par les fonctions ci-dessous.

-- ---------- 6. Fonctions serveur (SECURITY DEFINER) ----------

-- 6a. Dépôt idempotent d'un message PNJ (interne)
CREATE FUNCTION public.comm_push(_cid uuid, _npc uuid, _key text, _tpl text, _place uuid, _org text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE th uuid; c public.characters; n public.social_npcs; t public.message_templates; b text; mid uuid; BEGIN
  SELECT * INTO t FROM public.message_templates WHERE id = _tpl AND active; IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO c FROM public.characters WHERE id = _cid; SELECT * INTO n FROM public.social_npcs WHERE id = _npc;
  IF n.id IS NULL THEN RETURN; END IF;
  INSERT INTO public.message_threads (character_id, npc_id) VALUES (_cid, _npc) ON CONFLICT (character_id, npc_id) DO NOTHING;
  SELECT id INTO th FROM public.message_threads WHERE character_id = _cid AND npc_id = _npc;
  b := replace(replace(replace(replace(t.body, '{player}', c.first_name), '{npc}', n.first_name),
       '{place}', coalesce((SELECT name FROM public.locations WHERE id = _place), 'notre lieu habituel')), '{org}', coalesce(_org, ''));
  INSERT INTO public.messages (thread_id, character_id, sender, template_id, body, source_key, location_id)
  VALUES (th, _cid, 'npc', t.id, b, _key, coalesce(_place, n.location_id))
  ON CONFLICT (character_id, source_key) DO NOTHING RETURNING id INTO mid;
  IF mid IS NOT NULL THEN
    UPDATE public.message_threads SET last_message_at = public.game_now() WHERE id = th;
    PERFORM public.economy_notify(_cid, 'msg:' || _key, 'Nouveau message', n.first_name || ' vous a écrit');  -- notification unique, registre existant
  END IF; END $$;

-- 6b. Génération à partir des faits du jeu (idempotente, rattrapage à la lecture)
CREATE FUNCTION public.comm_generate(_cid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.communication_settings; r record; BEGIN
  SELECT * INTO s FROM public.communication_settings WHERE id = 1; IF NOT coalesce(s.enabled, false) THEN RETURN; END IF;
  -- Rencontre
  FOR r IN SELECT npc_id FROM public.social_relations WHERE character_id = _cid AND status = 'active' LOOP
    PERFORM public.comm_push(_cid, r.npc_id, 'meet:' || r.npc_id, 'meet_1', NULL, NULL); END LOOP;
  -- Proposition de rendez-vous quand la relation atteint le seuil
  FOR r IN SELECT sr.npc_id, n.location_id FROM public.social_relations sr JOIN public.social_npcs n ON n.id = sr.npc_id
           WHERE sr.character_id = _cid AND sr.status = 'active' AND sr.score >= s.invite_offer_min_score LOOP
    PERFORM public.comm_push(_cid, r.npc_id, 'invite_offer:' || r.npc_id, 'invite_offer_1', r.location_id, NULL); END LOOP;
  -- Rappel d'un rendez-vous social planifié (Agenda existant)
  FOR r IN SELECT a.id, a.social_npc_id, a.location_id FROM public.activities a
           WHERE a.character_id = _cid AND a.type = 'social' AND a.status = 'planned' AND a.social_npc_id IS NOT NULL LOOP
    PERFORM public.comm_push(_cid, r.social_npc_id, 'reminder:' || r.id, 'reminder_1', r.location_id, NULL); END LOOP;
  -- Adhésion : message d'un membre fictif de l'organisation
  FOR r IN SELECT m.id, o.name, (SELECT n.id FROM public.social_npcs n WHERE n.organization_id = m.organization_id ORDER BY n.influence DESC, n.id LIMIT 1) AS npc
           FROM public.memberships m JOIN public.organizations o ON o.id = m.organization_id
           WHERE m.character_id = _cid AND m.status = 'active' LOOP
    IF r.npc IS NOT NULL THEN PERFORM public.comm_push(_cid, r.npc, 'membership:' || r.id, 'membership_1', NULL, r.name); END IF; END LOOP;
  -- Élection gagnée : message du contact le plus proche
  FOR r IN SELECT ca.id, (SELECT npc_id FROM public.social_relations WHERE character_id = _cid ORDER BY score DESC, npc_id LIMIT 1) AS npc
           FROM public.candidacies ca JOIN public.election_results er ON er.candidacy_id = ca.id AND er.rank = 1
           WHERE ca.character_id = _cid LOOP
    IF r.npc IS NOT NULL THEN PERFORM public.comm_push(_cid, r.npc, 'election_win:' || r.id, 'election_win_1', NULL, NULL); END IF; END LOOP;
END $$;

-- 6c. Fil Civi : publications fictives issues des actualités/événements existants (idempotent)
CREATE FUNCTION public.civi_refresh(_city text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.communication_settings; BEGIN
  SELECT * INTO s FROM public.communication_settings WHERE id = 1; IF NOT coalesce(s.enabled, false) THEN RETURN; END IF;
  INSERT INTO public.social_posts (author_kind, author_label, city_id, news_id, organization_id, body, source_key, posted_at)
  SELECT CASE WHEN n.organization_id IS NOT NULL THEN 'organization' ELSE 'media' END,
         coalesce(o.name, ns.name, n.author), n.city_id, n.id, n.organization_id,
         left(coalesce(nullif(n.summary, ''), n.title), 240), 'news:' || n.id, n.published_at
  FROM public.news n LEFT JOIN public.organizations o ON o.id = n.organization_id LEFT JOIN public.news_sources ns ON ns.id = n.source_id
  WHERE n.status = 'published' AND n.published_at <= public.game_now()
    AND n.published_at > public.game_now() - s.feed_window_days * interval '1 day'
    AND (n.city_id IS NULL OR n.city_id = _city)
  ON CONFLICT (source_key) DO NOTHING;
  -- Événements généraux (jamais les événements personnels : character_id IS NULL)
  INSERT INTO public.social_posts (author_kind, author_label, city_id, event_id, body, source_key, posted_at)
  SELECT 'mairie', 'Mairie de ' || ci.name, e.city_id, e.id, left(e.title || ' — ' || e.description, 240), 'event:' || e.id,
         LEAST(e.starts_at, public.game_now())
  FROM public.events e JOIN public.cities ci ON ci.id = e.city_id
  WHERE e.character_id IS NULL AND e.city_id = _city AND e.status <> 'cancelled'
    AND e.starts_at <= public.game_now() + interval '1 day'
    AND e.starts_at > public.game_now() - s.feed_window_days * interval '1 day'
  ON CONFLICT (source_key) DO NOTHING;
END $$;

-- 6d. État lu par l'interface (génère puis renvoie uniquement les données du personnage)
CREATE FUNCTION public.communication_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; city text; s public.communication_settings; d date := (public.game_now() AT TIME ZONE 'UTC')::date; BEGIN
  cid := public.social_actor();                      -- verrou + règlement de la journée (fonction existante)
  SELECT coalesce(p.city_id, c.city_id) INTO city FROM public.characters c LEFT JOIN public.character_positions p ON p.character_id = c.id WHERE c.id = cid;
  PERFORM public.comm_generate(cid); PERFORM public.civi_refresh(city);
  SELECT * INTO s FROM public.communication_settings WHERE id = 1;
  RETURN jsonb_build_object(
    'unread', (SELECT count(*) FROM public.messages WHERE character_id = cid AND sender = 'npc' AND read_at IS NULL),
    'posts_today', (SELECT count(*) FROM public.economy_operations WHERE character_id = cid AND operation_key LIKE 'civi:post:' || d || ':%'),
    'daily_post_limit', s.daily_post_limit, 'enabled', s.enabled, 'city_id', city);
END $$;

-- 6e. Lire une conversation (marque comme lu)
CREATE FUNCTION public.read_message_thread(_thread uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  IF NOT EXISTS (SELECT 1 FROM public.message_threads WHERE id = _thread AND character_id = cid) THEN RAISE EXCEPTION 'Conversation introuvable'; END IF;
  UPDATE public.messages SET read_at = public.game_now() WHERE thread_id = _thread AND character_id = cid AND read_at IS NULL;
END $$;

-- 6f. Répondre (réponse fermée). Aucun effet de relation ici : les effets passent
--     uniquement par social_interact (bouton « Proposer un rendez-vous » côté interface).
CREATE FUNCTION public.reply_message(_message uuid, _reply text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; m public.messages; rep jsonb; nid uuid; BEGIN
  cid := public.social_actor();
  SELECT * INTO m FROM public.messages WHERE id = _message AND character_id = cid AND sender = 'npc' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message introuvable'; END IF;
  IF m.replied_with IS NOT NULL THEN RAISE EXCEPTION 'Vous avez déjà répondu à ce message'; END IF;
  SELECT x INTO rep FROM public.message_templates t, jsonb_array_elements(t.replies) x WHERE t.id = m.template_id AND x->>'id' = _reply;
  IF rep IS NULL THEN RAISE EXCEPTION 'Réponse inconnue'; END IF;
  UPDATE public.messages SET replied_with = _reply, read_at = coalesce(read_at, public.game_now()) WHERE id = m.id;
  INSERT INTO public.messages (thread_id, character_id, sender, body, source_key)
  VALUES (m.thread_id, cid, 'player', rep->>'body', 'reply:' || m.id)
  ON CONFLICT (character_id, source_key) DO NOTHING RETURNING id INTO nid;
  UPDATE public.message_threads SET last_message_at = public.game_now() WHERE id = m.thread_id;
  RETURN nid;
END $$;

-- 6g. Publier sur Civi (modèle uniquement) — récompense plafonnée via social_stats,
--     registre anti-doublon = economy_operations (registre existant, clé unique).
CREATE FUNCTION public.civi_post(_template text, _request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.communication_settings; t public.social_post_templates; city text;
        d date := (public.game_now() AT TIME ZONE 'UTC')::date; n integer; pid uuid; BEGIN
  cid := public.social_actor();
  SELECT * INTO s FROM public.communication_settings WHERE id = 1; IF NOT s.enabled THEN RAISE EXCEPTION 'Civi est momentanément indisponible'; END IF;
  SELECT * INTO t FROM public.social_post_templates WHERE id = _template AND active; IF NOT FOUND THEN RAISE EXCEPTION 'Modèle inconnu'; END IF;
  -- Même requête rejouée (double clic, recharge) : renvoie la publication existante
  SELECT id INTO pid FROM public.social_posts WHERE character_id = cid AND source_key LIKE 'player:' || cid || ':req:' || _request_id;
  IF pid IS NOT NULL THEN RETURN pid; END IF;
  SELECT count(*) INTO n FROM public.economy_operations WHERE character_id = cid AND operation_key LIKE 'civi:post:' || d || ':%';
  IF n >= s.daily_post_limit THEN RAISE EXCEPTION 'Limite de publications atteinte pour aujourd''hui'; END IF;
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT coalesce(p.city_id, c.city_id) INTO city FROM public.character_positions p WHERE p.character_id = cid;
  city := coalesce(city, c.city_id);
  INSERT INTO public.social_posts (author_kind, author_label, character_id, city_id, template_id, body, source_key)
  VALUES ('player', c.first_name || ' ' || c.last_name, cid, city, t.id,
          replace(replace(t.body, '{city}', (SELECT name FROM public.cities WHERE id = city)), '{place}', ''),
          'player:' || cid || ':req:' || _request_id)
  RETURNING id INTO pid;
  INSERT INTO public.economy_operations (character_id, operation_key, kind, amount, status, payload)
  VALUES (cid, 'civi:post:' || d || ':' || (n + 1), 'social_reward', 0, 'success', jsonb_build_object('post_id', pid, 'reputation', s.reputation_per_post));
  UPDATE public.social_stats SET reputation = reputation + s.reputation_per_post WHERE character_id = cid;
  RETURN pid;
END $$;

-- 6h. Réagir (j'aime / partager) — sans récompense, une seule fois par publication
CREATE FUNCTION public.civi_react(_post uuid, _kind text, _on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  IF _kind NOT IN ('like','share') THEN RAISE EXCEPTION 'Réaction inconnue'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = _post AND (p.character_id IS NULL OR p.character_id = cid)) THEN RAISE EXCEPTION 'Publication introuvable'; END IF;
  IF _on THEN INSERT INTO public.social_post_reactions (post_id, character_id, kind) VALUES (_post, cid, _kind) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.social_post_reactions WHERE post_id = _post AND character_id = cid AND kind = _kind; END IF;
END $$;

-- 6i. Monde : tableau de bord en lecture seule (aucune écriture)
CREATE FUNCTION public.world_overview()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'now', public.game_now(),
    'season', (SELECT season FROM public.world_state WHERE id = 1),
    'cities', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', ci.id, 'name', ci.name,
        'weather', (SELECT to_jsonb(w) - 'city_id' FROM public.city_weather w WHERE w.city_id = ci.id LIMIT 1),
        'indicators', (SELECT jsonb_object_agg(i.indicator, i.value) FROM public.city_indicators i WHERE i.city_id = ci.id),
        'mayor', (SELECT coalesce(ca.display_name, '') FROM public.municipal_mandates mm JOIN public.candidacies ca ON ca.id = mm.candidacy_id
                  WHERE mm.city_id = ci.id AND mm.status = 'active' LIMIT 1)
      ) ORDER BY ci.name), '[]'::jsonb) FROM public.cities ci),
    'national_events', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at) ORDER BY e.starts_at DESC), '[]'::jsonb)
        FROM (SELECT * FROM public.events WHERE character_id IS NULL AND scope = 'national'
              AND starts_at <= public.game_now() AND coalesce(ends_at, starts_at + interval '1 day') > public.game_now() LIMIT 10) e),
    'headlines', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'title', n.title, 'city_id', n.city_id)), '[]'::jsonb)
        FROM (SELECT * FROM public.news WHERE status = 'published' AND published_at <= public.game_now() ORDER BY importance DESC, published_at DESC LIMIT 5) n)
  ) $$;

-- ---------- 7. Droits d'exécution ----------
REVOKE ALL ON FUNCTION public.comm_push(uuid,uuid,text,text,uuid,text), public.comm_generate(uuid), public.civi_refresh(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.communication_state(), public.read_message_thread(uuid), public.reply_message(uuid,text),
  public.civi_post(text,uuid), public.civi_react(uuid,text,boolean), public.world_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.communication_state(), public.read_message_thread(uuid), public.reply_message(uuid,text),
  public.civi_post(text,uuid), public.civi_react(uuid,text,boolean), public.world_overview() TO authenticated;
