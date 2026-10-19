-- CIVITAS – GRANDE EXTENSION, PRIORITÉ 2 / VAGUE A : SONDAGES, DÉBATS PUBLICS, CV CITOYEN (« Mon parcours »)
-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée, aucune donnée existante touchée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0073_polls_forums_cv.sql
-- Sondages : lancés par un responsable d'organisation, un journaliste (carte de presse) ou un élu. Opinion des joueurs,
--   opinion simulée des habitants (calcul fixe, reproductible) et résultats électoraux restent séparés.
--   Un sondage ne modifie jamais un vote. Filtres seulement quand il y a assez de réponses ; petits groupes masqués.
-- Débats publics : sujet (loi, projet, crise, élection, économie), positions, réponses, questions, soutien/critique.
--   Aucune récompense, aucune IA ne désigne qui a raison. Blocages respectés.
-- Mon parcours : recalculé à la lecture depuis les données réelles (rien de stocké).
BEGIN;

CREATE TABLE public.poll_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  duration_hours integer NOT NULL DEFAULT 72,
  per_day integer NOT NULL DEFAULT 1,
  min_answers_filters integer NOT NULL DEFAULT 5,
  min_group integer NOT NULL DEFAULT 3,
  simulated_sample integer NOT NULL DEFAULT 1000
);
INSERT INTO public.poll_settings (id) VALUES (1);
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL REFERENCES public.cities(id),
  author_id uuid NOT NULL REFERENCES public.characters(id),
  sponsor_kind text NOT NULL CHECK (sponsor_kind IN ('organisation','media','institution')),
  sponsor_label text NOT NULL,
  question text NOT NULL CHECK (char_length(question) BETWEEN 10 AND 200),
  options text[] NOT NULL CHECK (array_length(options, 1) BETWEEN 2 AND 4),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  ends_at timestamptz NOT NULL
);
CREATE TABLE public.poll_answers (
  poll_id uuid NOT NULL REFERENCES public.polls(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  option_idx integer NOT NULL CHECK (option_idx BETWEEN 0 AND 3),
  age_band text NOT NULL, situation text NOT NULL, district text NOT NULL, family text NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (poll_id, character_id)
);

CREATE TABLE public.forum_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  duration_hours integer NOT NULL DEFAULT 96,
  forums_per_day integer NOT NULL DEFAULT 1,
  posts_per_day integer NOT NULL DEFAULT 12
);
INSERT INTO public.forum_settings (id) VALUES (1);
CREATE TABLE public.public_forums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL REFERENCES public.cities(id),
  author_id uuid NOT NULL REFERENCES public.characters(id),
  topic_kind text NOT NULL CHECK (topic_kind IN ('loi','projet','crise','election','economie')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 10 AND 140),
  context text CHECK (char_length(context) <= 600),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  closes_at timestamptz NOT NULL
);
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id uuid NOT NULL REFERENCES public.public_forums(id),
  author_id uuid NOT NULL REFERENCES public.characters(id),
  kind text NOT NULL CHECK (kind IN ('position','reponse','question')),
  parent_id uuid REFERENCES public.forum_posts(id),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 600),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.forum_reactions (
  post_id uuid NOT NULL REFERENCES public.forum_posts(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  kind text NOT NULL CHECK (kind IN ('soutien','critique')),
  PRIMARY KEY (post_id, character_id)
);

GRANT SELECT ON public.poll_settings, public.forum_settings TO authenticated;
GRANT ALL ON public.poll_settings, public.polls, public.poll_answers, public.forum_settings, public.public_forums,
  public.forum_posts, public.forum_reactions TO service_role;
ALTER TABLE public.poll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Poll settings readable" ON public.poll_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Forum settings readable" ON public.forum_settings FOR SELECT TO authenticated USING (true);
-- Pas d'autre politique : lecture et écriture uniquement par les fonctions ci-dessous (réponses individuelles jamais exposées).

-- Qui peut lancer un sondage, et sous quel nom (interne).
CREATE FUNCTION public.poll_sponsors(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('kind', 'organisation', 'label', o.name) s FROM public.memberships m JOIN public.organizations o ON o.id = m.organization_id
      WHERE m.character_id = _cid AND m.status = 'active' AND m.role IN ('founder','manager') AND o.status = 'active'
    UNION ALL SELECT jsonb_build_object('kind', 'media', 'label', p.outlet) FROM public.press_cards p WHERE p.character_id = _cid
    UNION ALL SELECT jsonb_build_object('kind', 'institution', 'label', 'Mairie de ' || ci.name) FROM public.municipal_mandates m
      JOIN public.candidacies k ON k.id = m.candidacy_id JOIN public.cities ci ON ci.id = m.city_id
      WHERE k.character_id = _cid AND m.status = 'active') x;
$$;

-- Profil anonyme d'un répondant, figé au moment de la réponse (interne).
CREATE FUNCTION public.poll_profile(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'age_band', CASE WHEN c.age < 18 THEN '16–17 ans' WHEN c.age < 22 THEN '18–21 ans' WHEN c.age < 26 THEN '22–25 ans' ELSE '26 ans et +' END,
    'situation', CASE WHEN EXISTS (SELECT 1 FROM public.employments e WHERE e.character_id = c.id AND e.status = 'active') THEN 'En emploi'
                      WHEN EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = c.id AND b.status = 'active') THEN 'Chef d''entreprise'
                      WHEN EXISTS (SELECT 1 FROM public.study_enrollments s WHERE s.character_id = c.id) THEN 'En études' ELSE 'Autre situation' END,
    'district', COALESCE((SELECT d.name FROM public.character_housing h JOIN public.locations l ON l.id = h.location_id
                          JOIN public.districts d ON d.id = l.district_id WHERE h.character_id = c.id), 'Non précisé'),
    'family', COALESCE((SELECT initcap(p.family) FROM public.character_orientation o JOIN public.real_parties p ON p.code = o.party_code
                        WHERE o.character_id = c.id), 'Sans parti'))
  FROM public.characters c WHERE c.id = _cid;
$$;

-- Opinion simulée des habitants : calcul fixe à partir du sondage (reproductible, jamais un vote).
CREATE FUNCTION public.poll_simulated(_poll public.polls) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH w AS (SELECT i - 1 AS idx, 20 + abs(hashtext(_poll.id::text || ':' || i)) % 60 AS weight
             FROM generate_series(1, array_length(_poll.options, 1)) i),
  t AS (SELECT sum(weight) total FROM w)
  SELECT jsonb_agg(round(100.0 * weight / total)::int ORDER BY idx) FROM w, t;
$$;

CREATE FUNCTION public.poll_results(_poll public.polls, _me uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.poll_settings; n integer; filters jsonb := NULL; BEGIN
  SELECT * INTO s FROM public.poll_settings WHERE id = 1;
  SELECT count(*) INTO n FROM public.poll_answers WHERE poll_id = _poll.id;
  IF n >= s.min_answers_filters THEN
    SELECT jsonb_object_agg(dim, groups) INTO filters FROM (
      SELECT dim, jsonb_agg(jsonb_build_object('group', grp, 'count', cnt,
          'counts', CASE WHEN cnt >= s.min_group THEN counts END) ORDER BY grp) groups
      FROM (
        SELECT dim, grp, count(*) cnt,
          (SELECT jsonb_agg(c ORDER BY i) FROM (SELECT i, count(*) FILTER (WHERE a2.option_idx = i) c
             FROM generate_series(0, array_length(_poll.options, 1) - 1) i
             LEFT JOIN public.poll_answers a2 ON a2.poll_id = _poll.id AND
               CASE dim WHEN 'age' THEN a2.age_band WHEN 'situation' THEN a2.situation WHEN 'quartier' THEN a2.district ELSE a2.family END = grp
             GROUP BY i) z) counts
        FROM (SELECT 'age' dim, age_band grp FROM public.poll_answers WHERE poll_id = _poll.id
              UNION ALL SELECT 'situation', situation FROM public.poll_answers WHERE poll_id = _poll.id
              UNION ALL SELECT 'quartier', district FROM public.poll_answers WHERE poll_id = _poll.id
              UNION ALL SELECT 'affiliation', family FROM public.poll_answers WHERE poll_id = _poll.id) a
        GROUP BY dim, grp) g
      GROUP BY dim) f;
  END IF;
  RETURN jsonb_build_object(
    'players', (SELECT jsonb_agg((SELECT count(*) FROM public.poll_answers WHERE poll_id = _poll.id AND option_idx = i) ORDER BY i)
                FROM generate_series(0, array_length(_poll.options, 1) - 1) i),
    'total', n, 'simulated', public.poll_simulated(_poll), 'simulated_sample', s.simulated_sample,
    'filters', filters, 'min_answers_filters', s.min_answers_filters,
    'my_answer', (SELECT option_idx FROM public.poll_answers WHERE poll_id = _poll.id AND character_id = _me));
END $$;

CREATE FUNCTION public.polls_state() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); city text; BEGIN
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  RETURN jsonb_build_object('now', public.game_now(), 'sponsors', public.poll_sponsors(cid),
    'settings', (SELECT to_jsonb(s) FROM public.poll_settings s WHERE id = 1),
    'polls', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'question', p.question, 'options', to_jsonb(p.options),
        'sponsor_kind', p.sponsor_kind, 'sponsor_label', p.sponsor_label, 'created_at', p.created_at, 'ends_at', p.ends_at,
        'open', p.ends_at > public.game_now(), 'mine', p.author_id = cid, 'results', public.poll_results(p, cid)) ORDER BY p.created_at DESC)
      FROM (SELECT * FROM public.polls WHERE city_id = city ORDER BY created_at DESC LIMIT 30) p), '[]'::jsonb));
END $$;

CREATE FUNCTION public.poll_action(_command text, _input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.poll_settings; p public.polls; sp jsonb; opts text[]; prof jsonb; idx integer; BEGIN
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.poll_settings WHERE id = 1;
  IF _command = 'create' THEN
    SELECT x INTO sp FROM jsonb_array_elements(public.poll_sponsors(cid)) x
      WHERE x->>'kind' = _input->>'sponsor_kind' AND x->>'label' = _input->>'sponsor_label' LIMIT 1;
    IF sp IS NULL THEN RAISE EXCEPTION 'Seuls un responsable d''organisation, un journaliste ou un élu peuvent lancer un sondage'; END IF;
    IF (SELECT count(*) FROM public.polls WHERE author_id = cid AND created_at > public.game_now() - interval '1 day') >= s.per_day THEN
      RAISE EXCEPTION 'Un sondage par jour au maximum'; END IF;
    SELECT array_agg(btrim(o)) INTO opts FROM jsonb_array_elements_text(_input->'options') o WHERE char_length(btrim(o)) BETWEEN 1 AND 60;
    IF opts IS NULL OR array_length(opts, 1) <> jsonb_array_length(_input->'options') OR array_length(opts, 1) NOT BETWEEN 2 AND 4 THEN
      RAISE EXCEPTION 'Il faut 2 à 4 réponses de 60 caractères maximum'; END IF;
    INSERT INTO public.polls (city_id, author_id, sponsor_kind, sponsor_label, question, options, ends_at)
      SELECT c.city_id, cid, sp->>'kind', sp->>'label', btrim(_input->>'question'), opts, public.game_now() + make_interval(hours => s.duration_hours)
      FROM public.characters c WHERE c.id = cid RETURNING * INTO p;
    RETURN jsonb_build_object('id', p.id);
  ELSIF _command = 'answer' THEN
    SELECT * INTO p FROM public.polls WHERE id = (_input->>'poll_id')::uuid;
    IF NOT FOUND OR p.city_id <> (SELECT city_id FROM public.characters WHERE id = cid) THEN RAISE EXCEPTION 'Sondage introuvable'; END IF;
    IF p.ends_at <= public.game_now() THEN RAISE EXCEPTION 'Ce sondage est terminé'; END IF;
    idx := (_input->>'option')::int;
    IF idx IS NULL OR idx < 0 OR idx >= array_length(p.options, 1) THEN RAISE EXCEPTION 'Réponse invalide'; END IF;
    prof := public.poll_profile(cid);
    INSERT INTO public.poll_answers (poll_id, character_id, option_idx, age_band, situation, district, family)
      VALUES (p.id, cid, idx, prof->>'age_band', prof->>'situation', prof->>'district', prof->>'family')
      ON CONFLICT (poll_id, character_id) DO NOTHING;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tu as déjà répondu à ce sondage'; END IF;
    RETURN '{}';
  END IF;
  RAISE EXCEPTION 'Action inconnue';
END $$;

-- Débats publics.
CREATE FUNCTION public.forums_state(_forum uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); city text; BEGIN
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  RETURN jsonb_build_object('now', public.game_now(), 'settings', (SELECT to_jsonb(s) FROM public.forum_settings s WHERE id = 1),
    'forums', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', f.id, 'topic_kind', f.topic_kind, 'title', f.title, 'context', f.context,
        'created_at', f.created_at, 'closes_at', f.closes_at, 'open', f.closes_at > public.game_now(), 'mine', f.author_id = cid,
        'author', CASE WHEN public.network_blocked(cid, f.author_id) THEN 'Joueur masqué' ELSE (SELECT first_name || ' ' || last_name FROM public.characters WHERE id = f.author_id) END,
        'posts', (SELECT count(*) FROM public.forum_posts WHERE forum_id = f.id)) ORDER BY f.created_at DESC)
      FROM (SELECT * FROM public.public_forums WHERE city_id = city ORDER BY created_at DESC LIMIT 40) f), '[]'::jsonb),
    'posts', CASE WHEN _forum IS NULL THEN NULL ELSE COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'kind', p.kind, 'parent_id', p.parent_id,
        'body', p.body, 'created_at', p.created_at, 'mine', p.author_id = cid, 'author_id', p.author_id,
        'author', (SELECT first_name || ' ' || last_name FROM public.characters WHERE id = p.author_id),
        'soutiens', (SELECT count(*) FROM public.forum_reactions r WHERE r.post_id = p.id AND r.kind = 'soutien'),
        'critiques', (SELECT count(*) FROM public.forum_reactions r WHERE r.post_id = p.id AND r.kind = 'critique'),
        'my_reaction', (SELECT kind FROM public.forum_reactions r WHERE r.post_id = p.id AND r.character_id = cid)) ORDER BY p.created_at)
      FROM public.forum_posts p JOIN public.public_forums f ON f.id = p.forum_id
      WHERE p.forum_id = _forum AND f.city_id = city AND NOT public.network_blocked(cid, p.author_id)), '[]'::jsonb) END);
END $$;

CREATE FUNCTION public.forum_action(_command text, _input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.forum_settings; f public.public_forums; par public.forum_posts; k text; id uuid; BEGIN
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.forum_settings WHERE id = 1;
  IF _command = 'create' THEN
    IF (_input->>'topic_kind') NOT IN ('loi','projet','crise','election','economie') THEN RAISE EXCEPTION 'Sujet invalide'; END IF;
    IF (SELECT count(*) FROM public.public_forums WHERE author_id = cid AND created_at > public.game_now() - interval '1 day') >= s.forums_per_day THEN
      RAISE EXCEPTION 'Un nouveau débat par jour au maximum'; END IF;
    INSERT INTO public.public_forums (city_id, author_id, topic_kind, title, context, closes_at)
      SELECT c.city_id, cid, _input->>'topic_kind', btrim(_input->>'title'), NULLIF(btrim(COALESCE(_input->>'context', '')), ''),
        public.game_now() + make_interval(hours => s.duration_hours) FROM public.characters c WHERE c.id = cid RETURNING public_forums.id INTO id;
    RETURN jsonb_build_object('id', id);
  ELSIF _command = 'post' THEN
    SELECT * INTO f FROM public.public_forums WHERE public_forums.id = (_input->>'forum_id')::uuid;
    IF NOT FOUND OR f.city_id <> (SELECT city_id FROM public.characters WHERE characters.id = cid) THEN RAISE EXCEPTION 'Débat introuvable'; END IF;
    IF f.closes_at <= public.game_now() THEN RAISE EXCEPTION 'Ce débat est clos'; END IF;
    k := _input->>'kind';
    IF k NOT IN ('position','reponse','question') THEN RAISE EXCEPTION 'Type d''intervention invalide'; END IF;
    IF k = 'reponse' THEN
      SELECT * INTO par FROM public.forum_posts WHERE forum_posts.id = (_input->>'parent_id')::uuid AND forum_id = f.id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Intervention introuvable'; END IF;
      IF public.network_blocked(cid, par.author_id) THEN RAISE EXCEPTION 'Action impossible'; END IF;
    END IF;
    IF (SELECT count(*) FROM public.forum_posts WHERE author_id = cid AND created_at > public.game_now() - interval '1 day') >= s.posts_per_day THEN
      RAISE EXCEPTION 'Limite d''interventions atteinte pour aujourd''hui'; END IF;
    INSERT INTO public.forum_posts (forum_id, author_id, kind, parent_id, body)
      VALUES (f.id, cid, k, CASE WHEN k = 'reponse' THEN par.id END, btrim(_input->>'body')) RETURNING forum_posts.id INTO id;
    RETURN jsonb_build_object('id', id);
  ELSIF _command = 'react' THEN
    SELECT * INTO par FROM public.forum_posts WHERE forum_posts.id = (_input->>'post_id')::uuid;
    IF NOT FOUND OR par.author_id = cid OR public.network_blocked(cid, par.author_id) THEN RAISE EXCEPTION 'Action impossible'; END IF;
    SELECT * INTO f FROM public.public_forums WHERE public_forums.id = par.forum_id;
    IF f.city_id <> (SELECT city_id FROM public.characters WHERE characters.id = cid) OR f.closes_at <= public.game_now() THEN RAISE EXCEPTION 'Ce débat est clos'; END IF;
    k := _input->>'kind';
    IF k IS NULL OR k = '' THEN DELETE FROM public.forum_reactions WHERE post_id = par.id AND character_id = cid; RETURN '{}'; END IF;
    IF k NOT IN ('soutien','critique') THEN RAISE EXCEPTION 'Réaction invalide'; END IF;
    INSERT INTO public.forum_reactions VALUES (par.id, cid, k) ON CONFLICT (post_id, character_id) DO UPDATE SET kind = EXCLUDED.kind;
    RETURN '{}';
  END IF;
  RAISE EXCEPTION 'Action inconnue';
END $$;

-- CV citoyen « Mon parcours » (privé, recalculé à la lecture).
CREATE FUNCTION public.citizen_cv() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  RETURN jsonb_build_object(
    'identity', (SELECT jsonb_build_object('name', first_name || ' ' || last_name, 'age', age, 'city', (SELECT name FROM public.cities WHERE id = city_id))
                 FROM public.characters WHERE id = cid),
    'studies', COALESCE((SELECT jsonb_agg(jsonb_build_object('title', f.name, 'since', s.enrolled_at, 'semester', s.semester, 'progress', s.progress))
                 FROM public.study_enrollments s JOIN public.study_fields f ON f.id = s.field_id WHERE s.character_id = cid), '[]'::jsonb),
    'jobs', COALESCE((SELECT jsonb_agg(jsonb_build_object('title', j.title, 'since', e.started_at, 'active', e.status = 'active', 'level', e.promotion_level,
                   'employer', COALESCE((SELECT name FROM public.organizations WHERE id = j.organization_id), 'Employeur fictif')) ORDER BY e.started_at DESC)
                 FROM public.employments e JOIN public.jobs j ON j.id = e.job_id WHERE e.character_id = cid), '[]'::jsonb),
    'businesses', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'since', created_at, 'status', status) ORDER BY created_at DESC)
                 FROM public.businesses WHERE owner_id = cid), '[]'::jsonb),
    'organizations', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', o.name, 'kind', o.kind, 'role', m.role, 'since', m.joined_at,
                   'until', m.left_at, 'active', m.status = 'active') ORDER BY m.joined_at DESC)
                 FROM public.memberships m JOIN public.organizations o ON o.id = m.organization_id WHERE m.character_id = cid), '[]'::jsonb),
    'unions', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', u.name, 'since', um.joined_at, 'until', um.left_at))
                 FROM public.union_members um JOIN public.unions u ON u.id = um.union_id WHERE um.character_id = cid), '[]'::jsonb),
    'mandates', COALESCE((SELECT jsonb_agg(jsonb_build_object('function', m.function, 'city', (SELECT name FROM public.cities WHERE id = m.city_id),
                   'since', m.starts_at, 'until', m.ends_at, 'active', m.status = 'active') ORDER BY m.starts_at DESC)
                 FROM public.municipal_mandates m JOIN public.candidacies k ON k.id = m.candidacy_id WHERE k.character_id = cid), '[]'::jsonb),
    'projects', COALESCE((SELECT jsonb_agg(jsonb_build_object('title', title, 'status', status, 'at', created_at) ORDER BY created_at DESC)
                 FROM public.citizen_projects WHERE author_id = cid), '[]'::jsonb),
    'distinctions', COALESCE((SELECT jsonb_agg(d ORDER BY d->>'at' DESC) FROM (
        SELECT jsonb_build_object('title', 'Victoire au débat « ' || topic || ' »', 'at', voting_ends_at) d FROM public.debates WHERE status = 'done' AND winner_id = cid
        UNION ALL SELECT jsonb_build_object('title', 'Pétition adoptée : « ' || title || ' »', 'at', decided_at) FROM public.petitions WHERE author_id = cid AND status = 'accepted'
        UNION ALL SELECT jsonb_build_object('title', 'Projet réalisé : « ' || title || ' »', 'at', works_end) FROM public.citizen_projects WHERE author_id = cid AND status = 'termine'
      ) x), '[]'::jsonb),
    'engagements', jsonb_build_object(
        'petitions', (SELECT count(*) FROM public.petition_signatures WHERE character_id = cid),
        'project_supports', (SELECT count(*) FROM public.citizen_project_supports WHERE character_id = cid),
        'protests', (SELECT count(*) FROM public.protests WHERE organizer_character_id = cid),
        'forum_posts', (SELECT count(*) FROM public.forum_posts WHERE author_id = cid),
        'polls_answered', (SELECT count(*) FROM public.poll_answers WHERE character_id = cid)),
    'skills', public.life_top_skills(cid));
END $$;

REVOKE ALL ON FUNCTION public.poll_sponsors(uuid), public.poll_profile(uuid), public.poll_simulated(public.polls),
  public.poll_results(public.polls, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.polls_state(), public.poll_action(text, jsonb), public.forums_state(uuid),
  public.forum_action(text, jsonb), public.citizen_cv() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.polls_state(), public.poll_action(text, jsonb), public.forums_state(uuid),
  public.forum_action(text, jsonb), public.citizen_cv() TO authenticated;

COMMIT;
