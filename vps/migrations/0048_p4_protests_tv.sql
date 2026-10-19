-- CIVITAS – P4 : MANIFESTATIONS ET JOURNAL TÉLÉVISÉ
-- Uniquement des ajouts. Tout ou rien.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0048_p4_protests_tv.sql
-- Ne modifie aucune fonction existante. Réutilise l'agenda (activités sociales), civic_news et award_political.
BEGIN;

-- 1. Réglages --------------------------------------------------------------------
CREATE TABLE public.protest_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  min_age integer NOT NULL DEFAULT 18,
  success_threshold integer NOT NULL DEFAULT 8 CHECK (success_threshold > 0),
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  energy_cost integer NOT NULL DEFAULT 15 CHECK (energy_cost >= 0),
  min_notice_hours integer NOT NULL DEFAULT 2,
  npc_join_percent integer NOT NULL DEFAULT 30 CHECK (npc_join_percent BETWEEN 0 AND 100),
  organizer_reputation integer NOT NULL DEFAULT 5,
  organizer_influence integer NOT NULL DEFAULT 3,
  participant_reputation integer NOT NULL DEFAULT 2,
  participant_influence integer NOT NULL DEFAULT 1,
  pressure_percent integer NOT NULL DEFAULT 5,
  interviews_per_broadcast integer NOT NULL DEFAULT 3,
  segments_per_broadcast integer NOT NULL DEFAULT 5
);
GRANT SELECT ON public.protest_settings TO authenticated;
GRANT ALL ON public.protest_settings TO service_role;
ALTER TABLE public.protest_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY protest_settings_read ON public.protest_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.protest_settings (id) VALUES (1);

-- 2. Manifestations --------------------------------------------------------------
CREATE TABLE public.protests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL REFERENCES public.cities(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  organizer_character_id uuid NOT NULL REFERENCES public.characters(id),
  cause text NOT NULL CHECK (char_length(cause) BETWEEN 5 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  consultation_id uuid REFERENCES public.consultations(id),
  option_id uuid REFERENCES public.consultation_options(id),
  decision_id uuid REFERENCES public.public_decisions(id),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','success','failed')),
  player_count integer NOT NULL DEFAULT 0,
  npc_count integer NOT NULL DEFAULT 0,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE INDEX protests_city_idx ON public.protests (city_id, starts_at DESC);
-- Registre des effets : une seule fois par manifestation et par nature
CREATE TABLE public.protest_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protest_id uuid NOT NULL REFERENCES public.protests(id),
  kind text NOT NULL CHECK (kind IN ('consultation_pressure','decision_contested')),
  consultation_id uuid REFERENCES public.consultations(id),
  option_id uuid REFERENCES public.consultation_options(id),
  decision_id uuid REFERENCES public.public_decisions(id),
  percent integer NOT NULL DEFAULT 0,
  world_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (protest_id, kind)
);
GRANT SELECT ON public.protests, public.protest_effects TO authenticated;
GRANT ALL ON public.protests, public.protest_effects TO service_role;
ALTER TABLE public.protests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protest_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY protests_read ON public.protests FOR SELECT TO authenticated USING (true);
CREATE POLICY protest_effects_read ON public.protest_effects FOR SELECT TO authenticated USING (true);

-- 3. Journal télévisé --------------------------------------------------------------
CREATE TABLE public.tv_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('local','national')),
  city_id text REFERENCES public.cities(id),
  broadcast_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  CHECK ((scope = 'local') = (city_id IS NOT NULL))
);
CREATE UNIQUE INDEX tv_broadcasts_unique ON public.tv_broadcasts (scope, COALESCE(city_id, ''), broadcast_date);
CREATE TABLE public.tv_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.tv_broadcasts(id),
  position integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('news','interview')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  news_id uuid REFERENCES public.news(id),
  interview_id uuid,
  UNIQUE (broadcast_id, position)
);
CREATE TABLE public.tv_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.tv_broadcasts(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  question text NOT NULL,
  answer text CHECK (answer IS NULL OR char_length(answer) BETWEEN 10 AND 280),
  answered_at timestamptz,
  deadline timestamptz NOT NULL,
  UNIQUE (broadcast_id, character_id)
);
GRANT SELECT ON public.tv_broadcasts, public.tv_segments, public.tv_interviews TO authenticated;
GRANT ALL ON public.tv_broadcasts, public.tv_segments, public.tv_interviews TO service_role;
ALTER TABLE public.tv_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY tv_broadcasts_read ON public.tv_broadcasts FOR SELECT TO authenticated USING (true);
CREATE POLICY tv_segments_read ON public.tv_segments FOR SELECT TO authenticated USING (true);
-- Invitations : visibles par l'invité ; les réponses publiées passent par les sujets du JT
CREATE POLICY tv_interviews_own ON public.tv_interviews FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = tv_interviews.character_id AND c.user_id = auth.uid()));

-- 4. Appeler à manifester -----------------------------------------------------------
CREATE FUNCTION public.call_protest(_cause text, _description text, _location_id uuid, _day_offset integer, _hour integer,
  _consultation_id uuid DEFAULT NULL, _option_id uuid DEFAULT NULL, _decision_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.protest_settings; t timestamptz := public.game_now();
  st timestamptz; pid uuid; aid uuid; l public.locations; BEGIN
  cid := public.social_actor();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.protest_settings WHERE id = 1;
  IF NOT s.enabled THEN RAISE EXCEPTION 'Manifestations désactivées'; END IF;
  IF c.age < s.min_age THEN RAISE EXCEPTION 'Il faut avoir 18 ans pour appeler à manifester'; END IF;
  _cause := btrim(COALESCE(_cause, '')); _description := btrim(COALESCE(_description, ''));
  IF char_length(_cause) NOT BETWEEN 5 AND 120 THEN RAISE EXCEPTION 'La cause doit faire entre 5 et 120 caractères'; END IF;
  IF char_length(_description) > 500 THEN RAISE EXCEPTION 'Description trop longue'; END IF;
  IF (_cause || ' ' || _description) ~* '(https?://|www\.)' THEN RAISE EXCEPTION 'Les liens ne sont pas autorisés'; END IF;
  IF _day_offset NOT BETWEEN 0 AND 6 OR _hour NOT BETWEEN 8 AND 20 THEN RAISE EXCEPTION 'Choisissez un jour dans la semaine, entre 8 h et 20 h'; END IF;
  SELECT l2.* INTO l FROM public.locations l2 JOIN public.districts d ON d.id = l2.district_id
    WHERE l2.id = _location_id AND l2.city_id = c.city_id AND l2.accessible AND d.available AND l2.kind IN ('place','parc','mairie');
  IF NOT FOUND THEN RAISE EXCEPTION 'Choisissez une place, un parc ou la mairie de votre ville'; END IF;
  st := (((t AT TIME ZONE 'UTC')::date + _day_offset) + make_time(_hour, 0, 0)) AT TIME ZONE 'UTC';
  IF st < t + s.min_notice_hours * interval '1 hour' THEN RAISE EXCEPTION 'Prévoyez au moins 2 heures à l''avance'; END IF;
  IF EXISTS (SELECT 1 FROM public.protests WHERE organizer_character_id = cid AND status = 'planned') THEN
    RAISE EXCEPTION 'Vous organisez déjà une manifestation'; END IF;
  IF _consultation_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.consultations WHERE id = _consultation_id AND city_id = c.city_id AND status = 'open' AND ends_at > st) THEN
      RAISE EXCEPTION 'Consultation introuvable ou terminée avant la manifestation'; END IF;
    IF _option_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.consultation_options WHERE id = _option_id AND consultation_id = _consultation_id) THEN
      RAISE EXCEPTION 'Choisissez l''option que vous défendez'; END IF;
  ELSE _option_id := NULL; END IF;
  IF _decision_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.public_decisions WHERE id = _decision_id AND city_id = c.city_id AND completed_at IS NULL) THEN
    RAISE EXCEPTION 'Décision introuvable ou déjà terminée'; END IF;
  INSERT INTO public.protests (city_id, location_id, organizer_character_id, cause, description, starts_at, ends_at, consultation_id, option_id, decision_id)
  VALUES (c.city_id, l.id, cid, _cause, _description, st, st + s.duration_minutes * interval '1 minute', _consultation_id, _option_id, _decision_id)
  RETURNING id INTO pid;
  aid := public.join_protest(pid);
  PERFORM public.civic_news('protest-call:' || pid, 'Appel à manifester : ' || _cause,
    c.first_name || ' ' || c.last_name || ' appelle à se rassembler à ' || l.name || ' le ' || to_char(st AT TIME ZONE 'UTC', 'DD/MM à HH24"h"') || '.' ||
    CASE WHEN _description <> '' THEN ' ' || _description ELSE '' END, c.city_id, l.id, NULL);
  RETURN pid;
END $$;

-- 5. Rejoindre une manifestation (activité sociale de l'agenda existant) -------------
CREATE FUNCTION public.join_protest(_protest uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; p public.protests; s public.protest_settings; aid uuid; BEGIN
  cid := public.social_actor();
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.protest_settings WHERE id = 1;
  SELECT * INTO p FROM public.protests WHERE id = _protest FOR UPDATE;
  IF NOT FOUND OR p.status <> 'planned' THEN RAISE EXCEPTION 'Manifestation introuvable ou terminée'; END IF;
  IF p.starts_at <= public.game_now() THEN RAISE EXCEPTION 'La manifestation a déjà commencé'; END IF;
  IF p.city_id <> c.city_id THEN RAISE EXCEPTION 'Manifestation réservée aux habitants de la ville'; END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND source_key = 'protest:' || p.id) THEN
    RAISE EXCEPTION 'Vous participez déjà'; END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND status IN ('planned','running') AND start_time < p.ends_at AND end_time > p.starts_at) THEN
    RAISE EXCEPTION 'Cette manifestation chevauche votre agenda'; END IF;
  INSERT INTO public.activities (character_id, type, title, start_time, end_time, location_id, energy_cost,
    social_relation_gain, social_reputation_gain, social_influence_gain, source_key)
  VALUES (cid, 'social', 'Manifestation : ' || p.cause, p.starts_at, p.ends_at, p.location_id, s.energy_cost,
    0, s.participant_reputation, s.participant_influence, 'protest:' || p.id)
  RETURNING id INTO aid;
  INSERT INTO public.social_participations (activity_id, character_id) VALUES (aid, cid);
  INSERT INTO public.notifications (user_id, title, body) VALUES (c.user_id, 'Manifestation dans l''agenda', p.cause);
  RETURN aid;
END $$;

-- 6. Bilan (calculé à la lecture, une seule fois) -------------------------------------
CREATE FUNCTION public.settle_protests(_city text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.protests; s public.protest_settings; players integer; npcs integer; ok boolean; org public.characters; lname text; BEGIN
  SELECT * INTO s FROM public.protest_settings WHERE id = 1;
  FOR p IN SELECT * FROM public.protests WHERE city_id = _city AND status = 'planned' AND ends_at <= public.game_now() FOR UPDATE SKIP LOCKED LOOP
    SELECT count(*) INTO players FROM public.activities WHERE source_key = 'protest:' || p.id AND status IN ('running','completed');
    SELECT count(*) INTO npcs FROM public.social_npcs n
      WHERE n.city_id = p.city_id AND abs(hashtext(n.id::text || p.id::text)) % 100 < s.npc_join_percent;
    ok := players + npcs >= s.success_threshold AND players >= 1;
    UPDATE public.protests SET status = CASE WHEN ok THEN 'success' ELSE 'failed' END, player_count = players, npc_count = npcs, settled_at = public.game_now() WHERE id = p.id;
    SELECT * INTO org FROM public.characters WHERE id = p.organizer_character_id;
    SELECT name INTO lname FROM public.locations WHERE id = p.location_id;
    IF ok THEN
      PERFORM public.award_political(org.id, 'protest-organizer:' || p.id, 'protest', s.organizer_reputation, s.organizer_influence, 2, 1, 'Manifestation réussie : ' || p.cause);
      IF p.option_id IS NOT NULL THEN
        INSERT INTO public.protest_effects (protest_id, kind, consultation_id, option_id, percent)
        VALUES (p.id, 'consultation_pressure', p.consultation_id, p.option_id, s.pressure_percent) ON CONFLICT DO NOTHING;
      END IF;
      IF p.decision_id IS NOT NULL THEN
        INSERT INTO public.protest_effects (protest_id, kind, decision_id) VALUES (p.id, 'decision_contested', p.decision_id) ON CONFLICT DO NOTHING;
      END IF;
      PERFORM public.civic_news('protest-result:' || p.id, 'Manifestation réussie : ' || p.cause,
        (players + npcs) || ' personnes se sont rassemblées à ' || lname || ' à l''appel de ' || org.first_name || ' ' || org.last_name || '.', p.city_id, p.location_id, NULL);
    ELSE
      PERFORM public.civic_news('protest-result:' || p.id, 'Faible mobilisation : ' || p.cause,
        'Seulement ' || (players + npcs) || ' personnes à ' || lname || '. Le rassemblement n''a pas pesé.', p.city_id, p.location_id, NULL);
    END IF;
    INSERT INTO public.notifications (user_id, title, body) VALUES (org.user_id,
      CASE WHEN ok THEN 'Manifestation réussie' ELSE 'Manifestation peu suivie' END, p.cause || ' : ' || (players + npcs) || ' participants');
  END LOOP;
END $$;

CREATE FUNCTION public.protests_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  PERFORM public.settle_protests(c.city_id);
  RETURN jsonb_build_object(
    'settings', (SELECT to_jsonb(s) FROM public.protest_settings s WHERE id = 1),
    'age', c.age, 'city_id', c.city_id, 'now', public.game_now(),
    'protests', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'cause', p.cause, 'description', p.description, 'starts_at', p.starts_at, 'ends_at', p.ends_at, 'status', p.status,
        'player_count', p.player_count, 'npc_count', p.npc_count,
        'registered', (SELECT count(*) FROM public.activities a WHERE a.source_key = 'protest:' || p.id AND a.status <> 'cancelled'),
        'joined', EXISTS (SELECT 1 FROM public.activities a WHERE a.source_key = 'protest:' || p.id AND a.character_id = cid AND a.status <> 'cancelled'),
        'mine', p.organizer_character_id = cid,
        'organizer', (SELECT ch.first_name || ' ' || ch.last_name FROM public.characters ch WHERE ch.id = p.organizer_character_id),
        'location', (SELECT jsonb_build_object('id', l.id, 'name', l.name) FROM public.locations l WHERE l.id = p.location_id),
        'consultation', (SELECT co.title FROM public.consultations co WHERE co.id = p.consultation_id),
        'option', (SELECT o.label FROM public.consultation_options o WHERE o.id = p.option_id),
        'decision', (SELECT d.title FROM public.public_decisions d WHERE d.id = p.decision_id),
        'effects', (SELECT COALESCE(jsonb_agg(e.kind), '[]'::jsonb) FROM public.protest_effects e WHERE e.protest_id = p.id)
      ) ORDER BY p.starts_at DESC) FROM (SELECT * FROM public.protests WHERE city_id = c.city_id ORDER BY starts_at DESC LIMIT 20) p), '[]'::jsonb),
    'consultations', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', co.id, 'title', co.title, 'ends_at', co.ends_at,
        'options', (SELECT jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label) ORDER BY o.sort_order) FROM public.consultation_options o WHERE o.consultation_id = co.id)))
      FROM public.consultations co WHERE co.city_id = c.city_id AND co.status = 'open' AND co.ends_at > public.game_now()), '[]'::jsonb),
    'decisions', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title))
      FROM (SELECT * FROM public.public_decisions WHERE city_id = c.city_id AND completed_at IS NULL ORDER BY decided_at DESC NULLS LAST LIMIT 15) d), '[]'::jsonb),
    'locations', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'kind', l.kind) ORDER BY l.name)
      FROM public.locations l JOIN public.districts d ON d.id = l.district_id
      WHERE l.city_id = c.city_id AND l.accessible AND d.available AND l.kind IN ('place','parc','mairie')), '[]'::jsonb)
  );
END $$;

-- 7. Journal télévisé (généré à la lecture, une fois par jour) ---------------------------
CREATE FUNCTION public.tv_build(_scope text, _city text, _day date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bid uuid; s public.protest_settings; pos integer := 0; n record; i record; top_title text; BEGIN
  SELECT id INTO bid FROM public.tv_broadcasts WHERE scope = _scope AND COALESCE(city_id, '') = COALESCE(_city, '') AND broadcast_date = _day;
  IF bid IS NOT NULL THEN RETURN bid; END IF;
  SELECT * INTO s FROM public.protest_settings WHERE id = 1;
  INSERT INTO public.tv_broadcasts (scope, city_id, broadcast_date) VALUES (_scope, _city, _day)
  ON CONFLICT DO NOTHING RETURNING id INTO bid;
  IF bid IS NULL THEN
    SELECT id INTO bid FROM public.tv_broadcasts WHERE scope = _scope AND COALESCE(city_id, '') = COALESCE(_city, '') AND broadcast_date = _day;
    RETURN bid;
  END IF;
  -- Interviews de la veille ayant reçu une réponse
  FOR i IN SELECT iv.*, ch.first_name, ch.last_name FROM public.tv_interviews iv
      JOIN public.tv_broadcasts b ON b.id = iv.broadcast_id JOIN public.characters ch ON ch.id = iv.character_id
      WHERE b.scope = _scope AND COALESCE(b.city_id, '') = COALESCE(_city, '') AND b.broadcast_date = _day - 1 AND iv.answer IS NOT NULL
      ORDER BY iv.answered_at LOOP
    pos := pos + 1;
    INSERT INTO public.tv_segments (broadcast_id, position, kind, title, body, interview_id)
    VALUES (bid, pos, 'interview', 'L''invité : ' || i.first_name || ' ' || i.last_name, '« ' || i.answer || ' »', i.id);
  END LOOP;
  -- Sujets : actualités des dernières 24 h
  FOR n IN SELECT id, title, COALESCE(summary, '') AS summary FROM public.news
      WHERE published_at > (_day::timestamp AT TIME ZONE 'UTC') - interval '1 day' AND published_at <= public.game_now()
        AND ((_scope = 'local' AND city_id = _city) OR (_scope = 'national' AND (scope = 'national' OR city_id IS NULL)))
      ORDER BY importance DESC NULLS LAST, published_at DESC LIMIT s.segments_per_broadcast LOOP
    pos := pos + 1; IF top_title IS NULL THEN top_title := n.title; END IF;
    INSERT INTO public.tv_segments (broadcast_id, position, kind, title, body, news_id) VALUES (bid, pos, 'news', n.title, n.summary, n.id);
  END LOOP;
  -- Invitations : joueurs les plus influents (ville, ou tout le pays pour le national)
  INSERT INTO public.tv_interviews (broadcast_id, character_id, question, deadline)
  SELECT bid, ch.id,
    CASE WHEN top_title IS NOT NULL THEN 'Votre réaction à « ' || left(top_title, 90) || ' » ?' ELSE 'Quel message adressez-vous aux habitants ?' END,
    public.game_now() + interval '1 day'
  FROM public.political_stats ps JOIN public.characters ch ON ch.id = ps.character_id
  WHERE ps.influence > 0 AND (_scope = 'national' OR ch.city_id = _city)
  ORDER BY ps.influence DESC, ps.reputation DESC LIMIT s.interviews_per_broadcast;
  INSERT INTO public.notifications (user_id, title, body)
  SELECT ch.user_id, 'Invitation au JT', 'Le JT ' || CASE WHEN _scope = 'national' THEN 'national' ELSE 'local' END || ' vous invite à réagir. Réponse attendue sous 1 jour.'
  FROM public.tv_interviews iv JOIN public.characters ch ON ch.id = iv.character_id WHERE iv.broadcast_id = bid;
  RETURN bid;
END $$;

CREATE FUNCTION public.tv_state(_city text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; d date := (public.game_now() AT TIME ZONE 'UTC')::date; lb uuid; nb uuid; city text; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  city := COALESCE(_city, c.city_id);
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE id = city) THEN RAISE EXCEPTION 'Ville inconnue'; END IF;
  PERFORM public.settle_protests(city);
  lb := public.tv_build('local', city, d);
  nb := public.tv_build('national', NULL, d);
  RETURN jsonb_build_object('date', d, 'city_id', city,
    'local', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', g.id, 'kind', g.kind, 'title', g.title, 'body', g.body, 'news_id', g.news_id) ORDER BY g.position), '[]'::jsonb) FROM public.tv_segments g WHERE g.broadcast_id = lb),
    'national', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', g.id, 'kind', g.kind, 'title', g.title, 'body', g.body, 'news_id', g.news_id) ORDER BY g.position), '[]'::jsonb) FROM public.tv_segments g WHERE g.broadcast_id = nb),
    'invitations', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', iv.id, 'question', iv.question, 'deadline', iv.deadline, 'answer', iv.answer, 'scope', b.scope) ORDER BY iv.deadline DESC), '[]'::jsonb)
      FROM public.tv_interviews iv JOIN public.tv_broadcasts b ON b.id = iv.broadcast_id
      WHERE iv.character_id = cid AND iv.deadline > public.game_now() - interval '1 day'));
END $$;

CREATE FUNCTION public.answer_tv_interview(_interview uuid, _answer text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; iv public.tv_interviews; BEGIN
  cid := public.social_actor();
  SELECT * INTO iv FROM public.tv_interviews WHERE id = _interview AND character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation introuvable'; END IF;
  IF iv.answer IS NOT NULL THEN RAISE EXCEPTION 'Vous avez déjà répondu'; END IF;
  IF iv.deadline < public.game_now() THEN RAISE EXCEPTION 'Le délai de réponse est dépassé'; END IF;
  _answer := btrim(COALESCE(_answer, ''));
  IF char_length(_answer) NOT BETWEEN 10 AND 280 THEN RAISE EXCEPTION 'Votre déclaration doit faire entre 10 et 280 caractères'; END IF;
  IF _answer ~* '(https?://|www\.)' THEN RAISE EXCEPTION 'Les liens ne sont pas autorisés'; END IF;
  UPDATE public.tv_interviews SET answer = _answer, answered_at = public.game_now() WHERE id = iv.id;
END $$;

REVOKE ALL ON FUNCTION public.settle_protests(text), public.tv_build(text, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.call_protest(text, text, uuid, integer, integer, uuid, uuid, uuid), public.join_protest(uuid),
  public.protests_state(), public.tv_state(text), public.answer_tv_interview(uuid, text) TO authenticated;

-- 8. Contrôles ------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT count(*) FROM public.protest_settings) <> 1 THEN RAISE EXCEPTION 'Réglages manquants'; END IF;
  IF (SELECT count(*) FROM public.protests) <> 0 THEN RAISE EXCEPTION 'Aucune manifestation attendue à l''installation'; END IF;
  IF (SELECT count(*) FROM public.events) < 81 THEN RAISE EXCEPTION 'Événements existants perdus'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.life_rules WHERE id = 'social' AND allowed_kinds && ARRAY['place','parc','mairie']) THEN
    RAISE EXCEPTION 'Règle d''activité sociale incompatible'; END IF;
  RAISE NOTICE 'P4 installé : manifestations et JT prêts';
END $$;

COMMIT;
