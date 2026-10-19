-- CIVITAS – DÉBATS ENTRE JOUEURS
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0060_player_debates.sql
-- Tout joueur défie un autre joueur sur un sujet. 3 manches écrites (ouverture, réponse, conclusion),
-- puis le public vote (joueurs + public simulé). Le vainqueur gagne de la réputation politique et,
-- s'il est candidat validé à une élection municipale en cours, un petit bonus de soutien (une seule fois par débat).
BEGIN;

CREATE TABLE public.debate_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  min_age integer NOT NULL DEFAULT 16,
  invite_hours integer NOT NULL DEFAULT 24,
  turn_hours integer NOT NULL DEFAULT 24,
  voting_hours integer NOT NULL DEFAULT 24,
  rounds integer NOT NULL DEFAULT 3,
  topic_max integer NOT NULL DEFAULT 120,
  turn_max integer NOT NULL DEFAULT 800,
  player_vote_weight integer NOT NULL DEFAULT 5,      -- un vote joueur = 5 voix du public simulé
  npc_audience integer NOT NULL DEFAULT 100,           -- taille du public simulé
  win_reputation integer NOT NULL DEFAULT 4,
  win_influence integer NOT NULL DEFAULT 2,
  campaign_support integer NOT NULL DEFAULT 2,
  open_max integer NOT NULL DEFAULT 3                  -- débats en cours maximum par joueur
);
INSERT INTO public.debate_settings (id) VALUES (1);

CREATE TABLE public.debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  challenger_id uuid NOT NULL REFERENCES public.characters(id),
  opponent_id uuid NOT NULL REFERENCES public.characters(id),
  topic text NOT NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','declined','expired','running','voting','done')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  invite_ends_at timestamptz NOT NULL,
  round integer NOT NULL DEFAULT 1,
  turn_ends_at timestamptz,
  voting_ends_at timestamptz,
  winner_id uuid REFERENCES public.characters(id),
  forfeit boolean NOT NULL DEFAULT false,
  votes_challenger integer,
  votes_opponent integer,
  CHECK (challenger_id <> opponent_id)
);
CREATE INDEX debates_recent ON public.debates (created_at DESC);
CREATE INDEX debates_players ON public.debates (challenger_id, opponent_id);

CREATE TABLE public.debate_turns (
  debate_id uuid NOT NULL REFERENCES public.debates(id),
  round integer NOT NULL,
  character_id uuid NOT NULL REFERENCES public.characters(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (debate_id, round, character_id)
);
CREATE TABLE public.debate_votes (
  debate_id uuid NOT NULL REFERENCES public.debates(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  for_id uuid NOT NULL REFERENCES public.characters(id),
  voted_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (debate_id, character_id)
);
-- Bonus de campagne : une seule fois par débat
CREATE TABLE public.debate_rewards (
  debate_id uuid PRIMARY KEY REFERENCES public.debates(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  candidacy_id uuid,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);

GRANT SELECT ON public.debate_settings, public.debates, public.debate_turns, public.debate_votes, public.debate_rewards TO authenticated;
GRANT ALL ON public.debate_settings, public.debates, public.debate_turns, public.debate_votes, public.debate_rewards TO service_role;
ALTER TABLE public.debate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY debate_settings_read ON public.debate_settings FOR SELECT TO authenticated USING (true);
-- Les débats sont publics ; les votes et récompenses ne sont visibles que par leur propriétaire
CREATE POLICY debates_read ON public.debates FOR SELECT TO authenticated USING (true);
CREATE POLICY debate_turns_read ON public.debate_turns FOR SELECT TO authenticated USING (true);
CREATE POLICY debate_votes_own ON public.debate_votes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = debate_votes.character_id AND c.user_id = auth.uid()));
CREATE POLICY debate_rewards_own ON public.debate_rewards FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = debate_rewards.character_id AND c.user_id = auth.uid()));

CREATE FUNCTION public.debate_hash(_key text) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT ((hashtext(_key)::bigint & 2147483647) % 10000) / 10000.0
$$;

CREATE FUNCTION public.debate_notify(_cid uuid, _title text, _body text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body) SELECT user_id, _title, _body FROM public.characters WHERE id = _cid
$$;

-- Récompense du vainqueur (réputation via award_political, bonus de campagne municipal unique)
CREATE FUNCTION public.debate_reward(_d public.debates) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.debate_settings; cand uuid; BEGIN
  IF _d.winner_id IS NULL THEN RETURN; END IF;
  SELECT * INTO s FROM public.debate_settings WHERE id = 1;
  PERFORM public.award_political(_d.winner_id, 'debate-win:' || _d.id, 'debate', s.win_reputation, s.win_influence, 1, 1, 'Débat gagné : ' || _d.topic);
  SELECT k.id INTO cand FROM public.candidacies k JOIN public.elections e ON e.id = k.election_id
    WHERE k.character_id = _d.winner_id AND k.status = 'validated' AND e.status IN ('candidacies','campaign','vote')
    ORDER BY e.starts_at DESC LIMIT 1;
  INSERT INTO public.debate_rewards (debate_id, character_id, candidacy_id) VALUES (_d.id, _d.winner_id, cand) ON CONFLICT DO NOTHING;
  IF FOUND AND cand IS NOT NULL THEN
    UPDATE public.candidacies SET support = LEAST(100, support + s.campaign_support),
      campaign_reputation = LEAST(100, campaign_reputation + s.campaign_support) WHERE id = cand;
  END IF;
  PERFORM public.debate_notify(_d.winner_id, 'Débat gagné', 'Vous avez remporté le débat « ' || _d.topic || ' ».');
  PERFORM public.debate_notify(CASE WHEN _d.winner_id = _d.challenger_id THEN _d.opponent_id ELSE _d.challenger_id END,
    'Débat perdu', 'Le public a tranché pour votre adversaire : « ' || _d.topic || ' ».');
END $$;

-- Avancement (réglé à la lecture ; verrous de ligne pour n'agir qu'une fois)
CREATE FUNCTION public.debate_refresh() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.debate_settings; d public.debates; nowt timestamptz := public.game_now(); a_done boolean; b_done boolean;
        pa integer; pb integer; npc_a integer; va integer; vb integer; w uuid; BEGIN
  SELECT * INTO s FROM public.debate_settings WHERE id = 1;
  FOR d IN SELECT * FROM public.debates WHERE status IN ('invited','running','voting') ORDER BY created_at FOR UPDATE SKIP LOCKED LOOP
    IF d.status = 'invited' AND nowt >= d.invite_ends_at THEN
      UPDATE public.debates SET status = 'expired' WHERE id = d.id;
      PERFORM public.debate_notify(d.challenger_id, 'Défi sans réponse', 'Votre défi « ' || d.topic || ' » a expiré.');
    ELSIF d.status = 'running' THEN
      a_done := EXISTS (SELECT 1 FROM public.debate_turns WHERE debate_id = d.id AND round = d.round AND character_id = d.challenger_id);
      b_done := EXISTS (SELECT 1 FROM public.debate_turns WHERE debate_id = d.id AND round = d.round AND character_id = d.opponent_id);
      IF a_done AND b_done THEN
        IF d.round >= s.rounds THEN
          UPDATE public.debates SET status = 'voting', voting_ends_at = nowt + make_interval(hours => s.voting_hours) WHERE id = d.id;
        ELSE
          UPDATE public.debates SET round = d.round + 1, turn_ends_at = nowt + make_interval(hours => s.turn_hours) WHERE id = d.id;
        END IF;
      ELSIF nowt >= d.turn_ends_at THEN
        -- Forfait : celui qui n'a pas écrit perd ; si aucun n'a écrit, pas de vainqueur
        w := CASE WHEN a_done THEN d.challenger_id WHEN b_done THEN d.opponent_id END;
        UPDATE public.debates SET status = 'done', forfeit = true, winner_id = w WHERE id = d.id RETURNING * INTO d;
        PERFORM public.debate_reward(d);
      END IF;
    ELSIF d.status = 'voting' AND nowt >= d.voting_ends_at THEN
      SELECT count(*) FILTER (WHERE for_id = d.challenger_id), count(*) FILTER (WHERE for_id = d.opponent_id) INTO pa, pb
        FROM public.debate_votes WHERE debate_id = d.id;
      npc_a := round(s.npc_audience * (0.35 + public.debate_hash(d.id::text || ':public') * 0.30))::integer;
      va := npc_a + pa * s.player_vote_weight;
      vb := (s.npc_audience - npc_a) + pb * s.player_vote_weight;
      w := CASE WHEN va > vb THEN d.challenger_id WHEN vb > va THEN d.opponent_id
                WHEN public.debate_hash(d.id::text || ':tie') < 0.5 THEN d.challenger_id ELSE d.opponent_id END;
      UPDATE public.debates SET status = 'done', votes_challenger = va, votes_opponent = vb, winner_id = w WHERE id = d.id RETURNING * INTO d;
      PERFORM public.debate_reward(d);
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION public.debate_card(_d public.debates, _cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', _d.id, 'topic', _d.topic, 'status', _d.status, 'round', _d.round,
    'created_at', _d.created_at, 'invite_ends_at', _d.invite_ends_at, 'turn_ends_at', _d.turn_ends_at, 'voting_ends_at', _d.voting_ends_at,
    'challenger', public.network_card(_d.challenger_id), 'opponent', public.network_card(_d.opponent_id),
    'winner_id', _d.winner_id, 'forfeit', _d.forfeit, 'votes_challenger', _d.votes_challenger, 'votes_opponent', _d.votes_opponent,
    'role', CASE WHEN _d.challenger_id = _cid THEN 'challenger' WHEN _d.opponent_id = _cid THEN 'opponent' ELSE 'public' END,
    'my_vote', (SELECT for_id FROM public.debate_votes WHERE debate_id = _d.id AND character_id = _cid),
    'turns', COALESCE((SELECT jsonb_agg(jsonb_build_object('round', t.round, 'character_id', t.character_id, 'body', t.body, 'created_at', t.created_at) ORDER BY t.round, t.created_at)
      FROM public.debate_turns t WHERE t.debate_id = _d.id
        -- Pendant une manche, l'argument de l'adversaire reste caché jusqu'à ce que les deux aient écrit
        AND (t.round < _d.round OR _d.status <> 'running' OR t.character_id = _cid)), '[]'::jsonb))
$$;

CREATE FUNCTION public.debate_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.debate_settings; BEGIN
  PERFORM public.debate_refresh();
  SELECT * INTO s FROM public.debate_settings WHERE id = 1;
  RETURN jsonb_build_object('me', cid, 'now', public.game_now(),
    'settings', jsonb_build_object('rounds', s.rounds, 'topic_max', s.topic_max, 'turn_max', s.turn_max, 'turn_hours', s.turn_hours,
      'voting_hours', s.voting_hours, 'invite_hours', s.invite_hours, 'win_reputation', s.win_reputation, 'campaign_support', s.campaign_support),
    'mine', COALESCE((SELECT jsonb_agg(public.debate_card(d, cid) ORDER BY d.created_at DESC) FROM (
      SELECT * FROM public.debates WHERE cid IN (challenger_id, opponent_id) ORDER BY created_at DESC LIMIT 30) d), '[]'::jsonb),
    'public', COALESCE((SELECT jsonb_agg(public.debate_card(d, cid) ORDER BY d.created_at DESC) FROM (
      SELECT * FROM public.debates WHERE status IN ('running','voting','done') AND cid NOT IN (challenger_id, opponent_id)
      ORDER BY (status = 'voting') DESC, created_at DESC LIMIT 30) d), '[]'::jsonb));
END $$;

CREATE FUNCTION public.debate_action(_command text, _input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; s public.debate_settings; d public.debates; did uuid; topic text; body text; target uuid; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.debate_settings WHERE id = 1;
  PERFORM public.debate_refresh();
  IF _command = 'challenge' THEN
    SELECT id INTO did FROM public.debates WHERE request_id = (_input->>'request_id')::uuid;
    IF did IS NOT NULL THEN RETURN did; END IF;
    target := (_input->>'opponent_id')::uuid; topic := btrim(coalesce(_input->>'topic', ''));
    IF c.age < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans pour débattre.', s.min_age; END IF;
    IF target IS NULL OR target = cid OR NOT EXISTS (SELECT 1 FROM public.characters WHERE id = target AND user_id IS NOT NULL) THEN RAISE EXCEPTION 'Adversaire introuvable.'; END IF;
    IF (SELECT age FROM public.characters WHERE id = target) < s.min_age THEN RAISE EXCEPTION 'Votre adversaire est trop jeune pour débattre.'; END IF;
    IF char_length(topic) NOT BETWEEN 10 AND s.topic_max THEN RAISE EXCEPTION 'Sujet : 10 à % caractères.', s.topic_max; END IF;
    IF NOT public.press_clean(topic) THEN RAISE EXCEPTION 'Sujet refusé par le filtre automatique : langage interdit.'; END IF;
    IF (SELECT count(*) FROM public.debates WHERE cid IN (challenger_id, opponent_id) AND status IN ('invited','running')) >= s.open_max THEN
      RAISE EXCEPTION 'Maximum % débats en cours à la fois.', s.open_max; END IF;
    INSERT INTO public.debates (request_id, challenger_id, opponent_id, topic, invite_ends_at)
    VALUES ((_input->>'request_id')::uuid, cid, target, topic, public.game_now() + make_interval(hours => s.invite_hours)) RETURNING id INTO did;
    PERFORM public.debate_notify(target, 'Défi de débat', c.first_name || ' ' || c.last_name || ' vous défie : « ' || topic || ' ».');
    RETURN did;
  END IF;

  SELECT * INTO d FROM public.debates WHERE id = (_input->>'debate_id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Débat introuvable.'; END IF;

  IF _command = 'respond' THEN
    IF d.opponent_id <> cid THEN RAISE EXCEPTION 'Ce défi ne vous est pas adressé.'; END IF;
    IF d.status <> 'invited' THEN RAISE EXCEPTION 'Ce défi n''attend plus de réponse.'; END IF;
    IF (_input->>'accept')::boolean THEN
      UPDATE public.debates SET status = 'running', round = 1, turn_ends_at = public.game_now() + make_interval(hours => s.turn_hours) WHERE id = d.id;
      PERFORM public.debate_notify(d.challenger_id, 'Défi accepté', 'Le débat « ' || d.topic || ' » commence : écrivez votre ouverture.');
    ELSE
      UPDATE public.debates SET status = 'declined' WHERE id = d.id;
      PERFORM public.debate_notify(d.challenger_id, 'Défi refusé', 'Votre défi « ' || d.topic || ' » a été refusé.');
    END IF;
  ELSIF _command = 'turn' THEN
    IF cid NOT IN (d.challenger_id, d.opponent_id) THEN RAISE EXCEPTION 'Vous ne participez pas à ce débat.'; END IF;
    IF d.status <> 'running' OR public.game_now() >= d.turn_ends_at THEN RAISE EXCEPTION 'Ce n''est plus le moment d''écrire.'; END IF;
    body := btrim(coalesce(_input->>'body', ''));
    IF char_length(body) NOT BETWEEN 30 AND s.turn_max THEN RAISE EXCEPTION 'Argument : 30 à % caractères.', s.turn_max; END IF;
    IF NOT public.press_clean(body) THEN RAISE EXCEPTION 'Argument refusé par le filtre automatique : langage interdit.'; END IF;
    IF EXISTS (SELECT 1 FROM public.debate_turns WHERE debate_id = d.id AND round = d.round AND character_id = cid) THEN RAISE EXCEPTION 'Vous avez déjà écrit pour cette manche.'; END IF;
    INSERT INTO public.debate_turns (debate_id, round, character_id, body) VALUES (d.id, d.round, cid, body);
    PERFORM public.debate_refresh();
  ELSIF _command = 'vote' THEN
    IF d.status <> 'voting' OR public.game_now() >= d.voting_ends_at THEN RAISE EXCEPTION 'Le vote n''est pas ouvert.'; END IF;
    IF cid IN (d.challenger_id, d.opponent_id) THEN RAISE EXCEPTION 'Les débatteurs ne votent pas.'; END IF;
    IF (_input->>'for_id')::uuid NOT IN (d.challenger_id, d.opponent_id) THEN RAISE EXCEPTION 'Choix invalide.'; END IF;
    IF EXISTS (SELECT 1 FROM public.debate_votes WHERE debate_id = d.id AND character_id = cid) THEN RAISE EXCEPTION 'Vous avez déjà voté.'; END IF;
    INSERT INTO public.debate_votes (debate_id, character_id, for_id) VALUES (d.id, cid, (_input->>'for_id')::uuid);
  ELSE
    RAISE EXCEPTION 'Commande inconnue.';
  END IF;
  RETURN d.id;
END $$;

REVOKE ALL ON FUNCTION public.debate_hash(text), public.debate_notify(uuid, text, text), public.debate_reward(public.debates),
  public.debate_refresh(), public.debate_card(public.debates, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debate_state(), public.debate_action(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.debate_state(), public.debate_action(text, jsonb) TO authenticated;

COMMIT;
