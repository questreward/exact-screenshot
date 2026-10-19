-- CIVITAS – PÉTITIONS ET RÉFÉRENDUMS
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0059_petitions_referendums.sql
-- Pétition de ville : seuil en % des habitants -> référendum local -> si « oui », la mairie doit répondre.
-- Pétition nationale : seuil en % de la population française -> inscrite à l'ordre du jour de l'Assemblée.
-- Les signatures des habitants simulés sont calculées à la lecture (déterministes), jamais stockées.
BEGIN;

CREATE TABLE public.petition_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  city_pct numeric NOT NULL DEFAULT 5,              -- % des habitants de la ville
  national_pct numeric NOT NULL DEFAULT 0.15,       -- % de la population française (~100 000)
  national_population integer NOT NULL DEFAULT 68000000,
  signing_days integer NOT NULL DEFAULT 7,
  referendum_days integer NOT NULL DEFAULT 2,
  council_days integer NOT NULL DEFAULT 3,
  player_weight_pct numeric NOT NULL DEFAULT 2,     -- poids d'une signature / d'un vote joueur, en % du seuil / de l'électorat
  min_age integer NOT NULL DEFAULT 16,
  refusal_reputation integer NOT NULL DEFAULT -5,
  title_max integer NOT NULL DEFAULT 120,
  body_max integer NOT NULL DEFAULT 1000
);
INSERT INTO public.petition_settings (id) VALUES (1);

CREATE TABLE public.petitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  scope text NOT NULL CHECK (scope IN ('city','national')),
  city_id text REFERENCES public.cities(id),
  author_id uuid NOT NULL REFERENCES public.characters(id),
  title text NOT NULL,
  body text NOT NULL,
  threshold integer NOT NULL CHECK (threshold > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','expired','referendum','rejected','council','accepted','refused','assembly')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  ends_at timestamptz NOT NULL,
  referendum_ends_at timestamptz,
  council_ends_at timestamptz,
  final_signatures integer,
  yes_pct numeric,
  decided_at timestamptz,
  council_note text,
  CHECK ((scope = 'city') = (city_id IS NOT NULL))
);
CREATE INDEX petitions_city ON public.petitions (city_id, created_at DESC);
CREATE INDEX petitions_open ON public.petitions (status, ends_at);
CREATE UNIQUE INDEX petitions_one_open_per_author ON public.petitions (author_id) WHERE status = 'open';

CREATE TABLE public.petition_signatures (
  petition_id uuid NOT NULL REFERENCES public.petitions(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  signed_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (petition_id, character_id)
);
CREATE TABLE public.referendum_ballots (
  petition_id uuid NOT NULL REFERENCES public.petitions(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  yes boolean NOT NULL,
  voted_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (petition_id, character_id)
);

GRANT SELECT ON public.petition_settings, public.petitions, public.petition_signatures, public.referendum_ballots TO authenticated;
GRANT ALL ON public.petition_settings, public.petitions, public.petition_signatures, public.referendum_ballots TO service_role;
ALTER TABLE public.petition_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petition_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referendum_ballots ENABLE ROW LEVEL SECURITY;
CREATE POLICY petition_settings_read ON public.petition_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY petitions_read ON public.petitions FOR SELECT TO authenticated USING (true);
-- Signatures et bulletins : chacun ne voit que les siens (vote secret)
CREATE POLICY petition_signatures_own ON public.petition_signatures FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = petition_signatures.character_id AND c.user_id = auth.uid()));
CREATE POLICY referendum_ballots_own ON public.referendum_ballots FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = referendum_ballots.character_id AND c.user_id = auth.uid()));

-- Bruit déterministe 0..1 à partir d'une clé
CREATE FUNCTION public.petition_hash(_key text) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT ((hashtext(_key)::bigint & 2147483647) % 10000) / 10000.0
$$;

-- Signatures totales à l'instant _at : habitants simulés (rythme propre à chaque pétition) + joueurs pondérés
CREATE FUNCTION public.petition_signatures_at(_p public.petitions, _at timestamptz) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT LEAST(_p.threshold * 3, (
    _p.threshold * (public.petition_hash(_p.id::text || ':rate') * 0.2)
      * GREATEST(0, EXTRACT(epoch FROM (LEAST(_at, _p.ends_at) - _p.created_at)) / 86400.0)
    + _p.threshold * s.player_weight_pct / 100.0
      * (SELECT count(*) FROM public.petition_signatures g WHERE g.petition_id = _p.id AND g.signed_at <= _at)
  )::integer)
  FROM public.petition_settings s WHERE s.id = 1
$$;

CREATE FUNCTION public.petition_notify(_cid uuid, _title text, _body text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body) SELECT user_id, _title, _body FROM public.characters WHERE id = _cid
$$;

-- Maire joueur en exercice (NULL si le maire est un personnage simulé)
CREATE FUNCTION public.petition_mayor(_city text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.character_id FROM public.municipal_mandates m JOIN public.candidacies k ON k.id = m.candidacy_id
  WHERE m.city_id = _city AND m.status = 'active' AND m.starts_at <= public.game_now() AND m.ends_at > public.game_now()
    AND k.character_id IS NOT NULL
  ORDER BY m.starts_at DESC LIMIT 1
$$;

-- Perte de réputation du maire, sans jamais passer sous zéro, une seule fois par pétition
CREATE FUNCTION public.petition_penalize(_cid uuid, _petition uuid, _label text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE loss integer; BEGIN
  SELECT LEAST(abs(s.refusal_reputation), COALESCE((SELECT reputation FROM public.political_stats WHERE character_id = _cid), 0))
    INTO loss FROM public.petition_settings s WHERE s.id = 1;
  PERFORM public.award_political(_cid, 'petition-refuse:' || _petition, 'petition', -loss, 0, 0, 0, _label);
END $$;

-- Avancement des pétitions (réglé à la lecture, une seule fois grâce aux verrous de ligne)
CREATE FUNCTION public.petition_refresh() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.petition_settings; p public.petitions; nowt timestamptz := public.game_now(); sig integer; yes numeric;
        votes_yes integer; votes_no integer; mayor uuid; BEGIN
  SELECT * INTO s FROM public.petition_settings WHERE id = 1;
  FOR p IN SELECT * FROM public.petitions WHERE status IN ('open','referendum','council') ORDER BY created_at FOR UPDATE SKIP LOCKED LOOP
    IF p.status = 'open' THEN
      sig := public.petition_signatures_at(p, nowt);
      IF sig >= p.threshold THEN
        IF p.scope = 'national' THEN
          UPDATE public.petitions SET status = 'assembly', final_signatures = sig, decided_at = nowt WHERE id = p.id;
          PERFORM public.petition_notify(p.author_id, 'Pétition nationale réussie', 'Votre pétition « ' || p.title || ' » est inscrite à l''ordre du jour de l''Assemblée.');
        ELSE
          UPDATE public.petitions SET status = 'referendum', final_signatures = sig,
            referendum_ends_at = nowt + make_interval(days => s.referendum_days) WHERE id = p.id;
          PERFORM public.petition_notify(p.author_id, 'Référendum déclenché', 'Votre pétition « ' || p.title || ' » a atteint son seuil : la ville vote.');
        END IF;
      ELSIF nowt >= p.ends_at THEN
        UPDATE public.petitions SET status = 'expired', final_signatures = sig, decided_at = nowt WHERE id = p.id;
        PERFORM public.petition_notify(p.author_id, 'Pétition close', 'Votre pétition « ' || p.title || ' » n''a pas atteint son seuil.');
      END IF;
    ELSIF p.status = 'referendum' AND nowt >= p.referendum_ends_at THEN
      SELECT count(*) FILTER (WHERE yes), count(*) FILTER (WHERE NOT yes) INTO votes_yes, votes_no FROM public.referendum_ballots WHERE petition_id = p.id;
      -- Habitants simulés : entre 35 % et 65 % de oui ; chaque vote joueur pèse player_weight_pct points (plafonné)
      yes := 35 + public.petition_hash(p.id::text || ':yes') * 30 + LEAST(30, s.player_weight_pct * (votes_yes - votes_no));
      yes := GREATEST(0, LEAST(100, round(yes, 1)));
      IF yes > 50 THEN
        mayor := public.petition_mayor(p.city_id);
        IF mayor IS NULL THEN
          -- Maire simulé : il accepte une fois sur deux, de façon déterministe
          UPDATE public.petitions SET yes_pct = yes, decided_at = nowt,
            status = CASE WHEN public.petition_hash(p.id::text || ':mayor') < 0.5 THEN 'accepted' ELSE 'refused' END,
            council_note = 'Réponse du maire (personnage simulé).' WHERE id = p.id;
        ELSE
          UPDATE public.petitions SET yes_pct = yes, status = 'council', council_ends_at = nowt + make_interval(days => s.council_days) WHERE id = p.id;
          PERFORM public.petition_notify(mayor, 'Référendum gagné : à vous de répondre', 'Les habitants ont voté oui à « ' || p.title || ' ». Le conseil doit trancher.');
        END IF;
        PERFORM public.petition_notify(p.author_id, 'Le oui l''emporte', '« ' || p.title || ' » : ' || yes || ' % de oui.');
      ELSE
        UPDATE public.petitions SET yes_pct = yes, status = 'rejected', decided_at = nowt WHERE id = p.id;
        PERFORM public.petition_notify(p.author_id, 'Le non l''emporte', '« ' || p.title || ' » : ' || yes || ' % de oui seulement.');
      END IF;
    ELSIF p.status = 'council' AND nowt >= p.council_ends_at THEN
      -- Silence de la mairie = refus, avec la même perte de réputation pour le maire
      mayor := public.petition_mayor(p.city_id);
      UPDATE public.petitions SET status = 'refused', decided_at = nowt, council_note = 'Aucune réponse de la mairie dans le délai.' WHERE id = p.id;
      IF mayor IS NOT NULL THEN
        PERFORM public.petition_penalize(mayor, p.id, 'Référendum ignoré : ' || p.title);
      END IF;
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION public.petition_card(_p public.petitions, _cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', _p.id, 'scope', _p.scope, 'city_id', _p.city_id, 'title', _p.title, 'body', _p.body,
    'author', (SELECT first_name || ' ' || last_name FROM public.characters WHERE id = _p.author_id), 'mine', _p.author_id = _cid,
    'threshold', _p.threshold, 'signatures', COALESCE(_p.final_signatures, public.petition_signatures_at(_p, public.game_now())),
    'status', _p.status, 'created_at', _p.created_at, 'ends_at', _p.ends_at, 'referendum_ends_at', _p.referendum_ends_at,
    'council_ends_at', _p.council_ends_at, 'yes_pct', _p.yes_pct, 'council_note', _p.council_note,
    'signed', EXISTS (SELECT 1 FROM public.petition_signatures WHERE petition_id = _p.id AND character_id = _cid),
    'voted', (SELECT yes FROM public.referendum_ballots WHERE petition_id = _p.id AND character_id = _cid))
$$;

CREATE FUNCTION public.petition_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); city text; s public.petition_settings; BEGIN
  PERFORM public.petition_refresh();
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.petition_settings WHERE id = 1;
  RETURN jsonb_build_object('now', public.game_now(), 'city_id', city,
    'city_name', (SELECT name FROM public.cities WHERE id = city),
    'mayor', public.petition_mayor(city) = cid,
    'settings', jsonb_build_object('city_pct', s.city_pct, 'national_pct', s.national_pct, 'signing_days', s.signing_days,
       'referendum_days', s.referendum_days, 'council_days', s.council_days, 'title_max', s.title_max, 'body_max', s.body_max, 'min_age', s.min_age),
    'can_create', NOT EXISTS (SELECT 1 FROM public.petitions WHERE author_id = cid AND status = 'open'),
    'city', COALESCE((SELECT jsonb_agg(public.petition_card(p, cid) ORDER BY p.created_at DESC) FROM (
       SELECT * FROM public.petitions WHERE scope = 'city' AND city_id = city ORDER BY created_at DESC LIMIT 40) p), '[]'::jsonb),
    'national', COALESCE((SELECT jsonb_agg(public.petition_card(p, cid) ORDER BY p.created_at DESC) FROM (
       SELECT * FROM public.petitions WHERE scope = 'national' ORDER BY created_at DESC LIMIT 40) p), '[]'::jsonb));
END $$;

CREATE FUNCTION public.petition_action(_command text, _input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; s public.petition_settings; p public.petitions; pid uuid;
        title text; body text; scope text; thr integer; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.petition_settings WHERE id = 1;
  PERFORM public.petition_refresh();
  IF _command = 'create' THEN
    SELECT id INTO pid FROM public.petitions WHERE request_id = (_input->>'request_id')::uuid;
    IF pid IS NOT NULL THEN RETURN pid; END IF;
    IF c.age < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans pour lancer une pétition.', s.min_age; END IF;
    scope := _input->>'scope'; title := btrim(coalesce(_input->>'title', '')); body := btrim(coalesce(_input->>'body', ''));
    IF scope NOT IN ('city','national') THEN RAISE EXCEPTION 'Portée invalide.'; END IF;
    IF char_length(title) NOT BETWEEN 10 AND s.title_max THEN RAISE EXCEPTION 'Titre : 10 à % caractères.', s.title_max; END IF;
    IF char_length(body) NOT BETWEEN 30 AND s.body_max THEN RAISE EXCEPTION 'Texte : 30 à % caractères.', s.body_max; END IF;
    IF NOT public.press_clean(title || ' ' || body) THEN RAISE EXCEPTION 'Pétition refusée par le filtre automatique : langage interdit.'; END IF;
    IF EXISTS (SELECT 1 FROM public.petitions WHERE author_id = cid AND status = 'open') THEN RAISE EXCEPTION 'Vous avez déjà une pétition en cours.'; END IF;
    IF scope = 'city' THEN
      SELECT GREATEST(10, ceil(population * s.city_pct / 100.0))::integer INTO thr FROM public.cities WHERE id = c.city_id;
    ELSE
      thr := ceil(s.national_population * s.national_pct / 100.0)::integer;
    END IF;
    INSERT INTO public.petitions (request_id, scope, city_id, author_id, title, body, threshold, ends_at)
    VALUES ((_input->>'request_id')::uuid, scope, CASE WHEN scope = 'city' THEN c.city_id END, cid, title, body, thr,
            public.game_now() + make_interval(days => s.signing_days)) RETURNING id INTO pid;
    INSERT INTO public.petition_signatures (petition_id, character_id) VALUES (pid, cid);
    RETURN pid;
  END IF;

  SELECT * INTO p FROM public.petitions WHERE id = (_input->>'petition_id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pétition introuvable.'; END IF;
  IF p.scope = 'city' AND p.city_id <> c.city_id THEN RAISE EXCEPTION 'Cette pétition concerne une autre ville.'; END IF;

  IF _command = 'sign' THEN
    IF p.status <> 'open' THEN RAISE EXCEPTION 'Les signatures sont closes.'; END IF;
    IF c.age < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans pour signer.', s.min_age; END IF;
    INSERT INTO public.petition_signatures (petition_id, character_id) VALUES (p.id, cid) ON CONFLICT DO NOTHING;
    PERFORM public.petition_refresh();
  ELSIF _command = 'vote' THEN
    IF p.status <> 'referendum' OR public.game_now() >= p.referendum_ends_at THEN RAISE EXCEPTION 'Le référendum n''est pas ouvert.'; END IF;
    IF c.age < 18 THEN RAISE EXCEPTION 'Il faut avoir 18 ans pour voter.'; END IF;
    IF EXISTS (SELECT 1 FROM public.referendum_ballots WHERE petition_id = p.id AND character_id = cid) THEN RAISE EXCEPTION 'Vous avez déjà voté.'; END IF;
    INSERT INTO public.referendum_ballots (petition_id, character_id, yes) VALUES (p.id, cid, (_input->>'yes')::boolean);
  ELSIF _command = 'council' THEN
    IF p.status <> 'council' THEN RAISE EXCEPTION 'Aucune réponse attendue pour cette pétition.'; END IF;
    IF public.petition_mayor(p.city_id) IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Seul le maire en exercice peut répondre.'; END IF;
    IF char_length(btrim(coalesce(_input->>'note', ''))) > 500 THEN RAISE EXCEPTION 'Réponse : 500 caractères maximum.'; END IF;
    IF NOT public.press_clean(coalesce(_input->>'note', '')) THEN RAISE EXCEPTION 'Réponse refusée par le filtre automatique.'; END IF;
    UPDATE public.petitions SET status = CASE WHEN (_input->>'accept')::boolean THEN 'accepted' ELSE 'refused' END,
      decided_at = public.game_now(), council_note = NULLIF(btrim(coalesce(_input->>'note', '')), '') WHERE id = p.id;
    IF NOT (_input->>'accept')::boolean THEN
      PERFORM public.petition_penalize(cid, p.id, 'Référendum refusé : ' || p.title);
    END IF;
    PERFORM public.petition_notify(p.author_id, 'Réponse de la mairie',
      '« ' || p.title || ' » : ' || CASE WHEN (_input->>'accept')::boolean THEN 'acceptée.' ELSE 'refusée.' END);
  ELSE
    RAISE EXCEPTION 'Commande inconnue.';
  END IF;
  RETURN p.id;
END $$;

REVOKE ALL ON FUNCTION public.petition_hash(text), public.petition_signatures_at(public.petitions, timestamptz), public.petition_notify(uuid, text, text),
  public.petition_mayor(text), public.petition_refresh(), public.petition_penalize(uuid, uuid, text), public.petition_card(public.petitions, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.petition_state(), public.petition_action(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.petition_state(), public.petition_action(text, jsonb) TO authenticated;

COMMIT;
