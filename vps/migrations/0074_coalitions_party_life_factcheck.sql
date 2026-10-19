-- CIVITAS – GRANDE EXTENSION, PRIORITÉ 2 / VAGUE B : COALITIONS, VIE INTERNE DES PARTIS, VÉRIFICATION DES FAITS
-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0074_coalitions_party_life_factcheck.sql
-- Seule écriture sur une donnée existante : la réputation d'une organisation (organizations.reputation, bornée 0–100)
--   lorsqu'un accord de coalition est rompu (−) ou respecté jusqu'au bout (+). Une seule fois par accord et par
--   organisation grâce à un registre à clé unique (coalition_effects). Aucun argent, aucun vote électoral modifié.
-- Vie interne : votes réservés aux membres actifs (un bulletin, secret), résultats calculés à la clôture, à la lecture.
-- Vérification des faits : calculée uniquement à partir des données du serveur (indicateurs, historique, budget).
BEGIN;

CREATE TABLE public.coalition_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  respect_days integer NOT NULL DEFAULT 30,
  break_penalty integer NOT NULL DEFAULT 10,
  respect_bonus integer NOT NULL DEFAULT 3,
  vote_hours integer NOT NULL DEFAULT 48
);
INSERT INTO public.coalition_settings (id) VALUES (1);

CREATE TABLE public.coalitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL REFERENCES public.cities(id),
  proposer_org uuid NOT NULL REFERENCES public.organizations(id),
  partner_org uuid NOT NULL REFERENCES public.organizations(id),
  proposed_by uuid NOT NULL REFERENCES public.characters(id),
  concessions text NOT NULL CHECK (char_length(concessions) BETWEEN 10 AND 600),
  responsibilities text NOT NULL CHECK (char_length(responsibilities) BETWEEN 5 AND 400),
  budget_support boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'proposee' CHECK (status IN ('proposee','refusee','active','rompue','respectee')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  decided_at timestamptz,
  ended_at timestamptz,
  broken_by uuid REFERENCES public.organizations(id),
  CHECK (proposer_org <> partner_org)
);
CREATE UNIQUE INDEX coalitions_one_open ON public.coalitions (LEAST(proposer_org, partner_org), GREATEST(proposer_org, partner_org))
  WHERE status IN ('proposee','active');
CREATE TABLE public.coalition_effects (
  coalition_id uuid NOT NULL REFERENCES public.coalitions(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  kind text NOT NULL CHECK (kind IN ('rupture','respect')),
  delta integer NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (coalition_id, organization_id)
);

CREATE TABLE public.org_internal (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  president_id uuid REFERENCES public.characters(id),
  program text CHECK (char_length(program) <= 1200),
  updated_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.org_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  created_by uuid NOT NULL REFERENCES public.characters(id),
  kind text NOT NULL CHECK (kind IN ('president','motion','programme','alliance','congres')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 140),
  body text CHECK (char_length(body) <= 1200),
  candidates uuid[],                 -- élection du président : membres candidats
  coalition_id uuid REFERENCES public.coalitions(id),
  opens_at timestamptz NOT NULL DEFAULT public.game_now(),
  closes_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert','adopte','rejete','elu','sans_resultat')),
  result jsonb
);
CREATE TABLE public.org_vote_ballots (
  vote_id uuid NOT NULL REFERENCES public.org_votes(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  choice text NOT NULL,
  cast_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (vote_id, character_id)
);

CREATE TABLE public.fact_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL REFERENCES public.cities(id),
  author_id uuid NOT NULL REFERENCES public.characters(id),
  claim text NOT NULL,
  kind text NOT NULL,
  params jsonb NOT NULL,
  data jsonb NOT NULL,
  calculation text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('vrai','plutot_vrai','trompeur','faux','invérifiable')),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);

GRANT SELECT ON public.coalition_settings TO authenticated;
GRANT ALL ON public.coalition_settings, public.coalitions, public.coalition_effects, public.org_internal, public.org_votes,
  public.org_vote_ballots, public.fact_checks TO service_role;
ALTER TABLE public.coalition_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coalitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coalition_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_vote_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coalition settings readable" ON public.coalition_settings FOR SELECT TO authenticated USING (true);
-- Pas d'autre politique : accès uniquement par les fonctions ci-dessous (bulletins jamais exposés).

-- Organisations politiques que le joueur dirige (interne).
CREATE FUNCTION public.org_led(_cid uuid) RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.organization_id FROM public.memberships m JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.character_id = _cid AND m.status = 'active' AND m.role IN ('founder','manager') AND o.status = 'active' AND o.kind IN ('party','movement');
$$;

-- Règlement à la lecture : votes clos et accords arrivés à terme (interne, idempotent).
CREATE FUNCTION public.party_life_settle(_city text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.org_votes; c public.coalitions; s public.coalition_settings; tally jsonb; top text; topn int; second int; total int; BEGIN
  SELECT * INTO s FROM public.coalition_settings WHERE id = 1;
  FOR v IN SELECT ov.* FROM public.org_votes ov JOIN public.organizations o ON o.id = ov.organization_id
           WHERE ov.status = 'ouvert' AND ov.closes_at <= public.game_now() AND o.city_id IS NOT DISTINCT FROM _city FOR UPDATE OF ov LOOP
    SELECT COALESCE(jsonb_object_agg(choice, n), '{}'::jsonb), COALESCE(sum(n), 0) INTO tally, total
      FROM (SELECT choice, count(*) n FROM public.org_vote_ballots WHERE vote_id = v.id GROUP BY choice) t;
    SELECT choice, n INTO top, topn FROM (SELECT choice, count(*) n FROM public.org_vote_ballots WHERE vote_id = v.id GROUP BY choice) t ORDER BY n DESC LIMIT 1;
    SELECT n INTO second FROM (SELECT count(*) n FROM public.org_vote_ballots WHERE vote_id = v.id GROUP BY choice ORDER BY count(*) DESC OFFSET 1 LIMIT 1) t;
    IF total = 0 OR (second IS NOT NULL AND second = topn) THEN
      UPDATE public.org_votes SET status = 'sans_resultat', result = jsonb_build_object('tally', tally, 'total', total) WHERE id = v.id;
    ELSIF v.kind = 'president' THEN
      UPDATE public.org_votes SET status = 'elu', result = jsonb_build_object('tally', tally, 'total', total, 'winner', top) WHERE id = v.id;
      INSERT INTO public.org_internal (organization_id, president_id) VALUES (v.organization_id, top::uuid)
        ON CONFLICT (organization_id) DO UPDATE SET president_id = EXCLUDED.president_id, updated_at = public.game_now();
    ELSE
      UPDATE public.org_votes SET status = CASE WHEN top = 'pour' THEN 'adopte' ELSE 'rejete' END,
        result = jsonb_build_object('tally', tally, 'total', total) WHERE id = v.id;
      IF v.kind = 'programme' AND top = 'pour' THEN
        INSERT INTO public.org_internal (organization_id, program) VALUES (v.organization_id, v.body)
          ON CONFLICT (organization_id) DO UPDATE SET program = EXCLUDED.program, updated_at = public.game_now();
      END IF;
    END IF;
    second := NULL; top := NULL; topn := NULL;
  END LOOP;
  FOR c IN SELECT * FROM public.coalitions WHERE city_id = _city AND status = 'active'
           AND decided_at + make_interval(days => s.respect_days) <= public.game_now() FOR UPDATE LOOP
    UPDATE public.coalitions SET status = 'respectee', ended_at = public.game_now() WHERE id = c.id;
    INSERT INTO public.coalition_effects (coalition_id, organization_id, kind, delta)
      VALUES (c.id, c.proposer_org, 'respect', s.respect_bonus), (c.id, c.partner_org, 'respect', s.respect_bonus) ON CONFLICT DO NOTHING;
    UPDATE public.organizations SET reputation = LEAST(100, reputation + s.respect_bonus)
      WHERE id IN (SELECT organization_id FROM public.coalition_effects WHERE coalition_id = c.id AND kind = 'respect' AND applied_at = public.game_now());
  END LOOP;
END $$;

CREATE FUNCTION public.party_life_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); city text; mandate uuid; BEGIN
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  PERFORM public.party_life_settle(city);
  SELECT id INTO mandate FROM public.municipal_mandates WHERE city_id = city ORDER BY starts_at DESC LIMIT 1;
  RETURN jsonb_build_object('now', public.game_now(), 'settings', (SELECT to_jsonb(s) FROM public.coalition_settings s WHERE id = 1),
    'led', COALESCE((SELECT jsonb_agg(id) FROM public.org_led(cid) id), '[]'::jsonb),
    'council', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', g.name, 'seats', g.seats, 'majority', g.majority, 'organization_id', g.organization_id) ORDER BY g.seats DESC)
        FROM public.municipal_council_groups g WHERE g.mandate_id = mandate), '[]'::jsonb),
    'parties', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'kind', o.kind, 'reputation', o.reputation,
        'seats', COALESCE((SELECT sum(g.seats) FROM public.municipal_council_groups g WHERE g.mandate_id = mandate AND g.organization_id = o.id), 0)) ORDER BY o.name)
        FROM public.organizations o WHERE o.city_id = city AND o.status = 'active' AND o.kind IN ('party','movement')), '[]'::jsonb),
    'coalitions', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'status', c.status, 'concessions', c.concessions, 'responsibilities', c.responsibilities,
        'budget_support', c.budget_support, 'created_at', c.created_at, 'decided_at', c.decided_at, 'ended_at', c.ended_at,
        'proposer', jsonb_build_object('id', c.proposer_org, 'name', (SELECT name FROM public.organizations WHERE id = c.proposer_org)),
        'partner', jsonb_build_object('id', c.partner_org, 'name', (SELECT name FROM public.organizations WHERE id = c.partner_org)),
        'broken_by', (SELECT name FROM public.organizations WHERE id = c.broken_by)) ORDER BY c.created_at DESC)
        FROM public.coalitions c WHERE c.city_id = city), '[]'::jsonb),
    'my_orgs', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'role', m.role,
        'president', (SELECT first_name || ' ' || last_name FROM public.characters WHERE id = (SELECT president_id FROM public.org_internal WHERE organization_id = o.id)),
        'program', (SELECT program FROM public.org_internal WHERE organization_id = o.id),
        'members', (SELECT jsonb_agg(jsonb_build_object('id', mm.character_id, 'name', ch.first_name || ' ' || ch.last_name) ORDER BY ch.first_name)
                    FROM public.memberships mm JOIN public.characters ch ON ch.id = mm.character_id WHERE mm.organization_id = o.id AND mm.status = 'active'),
        'votes', (SELECT jsonb_agg(jsonb_build_object('id', v.id, 'kind', v.kind, 'title', v.title, 'body', v.body, 'closes_at', v.closes_at, 'status', v.status,
            'result', v.result, 'coalition_id', v.coalition_id,
            'candidates', (SELECT jsonb_agg(jsonb_build_object('id', ch.id, 'name', ch.first_name || ' ' || ch.last_name)) FROM public.characters ch WHERE ch.id = ANY (v.candidates)),
            'voted', EXISTS (SELECT 1 FROM public.org_vote_ballots b WHERE b.vote_id = v.id AND b.character_id = cid),
            'ballots', (SELECT count(*) FROM public.org_vote_ballots b WHERE b.vote_id = v.id)) ORDER BY v.opens_at DESC)
            FROM public.org_votes v WHERE v.organization_id = o.id)) ORDER BY o.name)
        FROM public.memberships m JOIN public.organizations o ON o.id = m.organization_id
        WHERE m.character_id = cid AND m.status = 'active' AND o.status = 'active' AND o.kind IN ('party','movement')), '[]'::jsonb));
END $$;

CREATE FUNCTION public.party_life_action(_command text, _input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); city text; s public.coalition_settings; c public.coalitions; v public.org_votes;
  mine uuid; partner public.organizations; cands uuid[]; new_id uuid; k text; BEGIN
  PERFORM 1 FROM public.characters WHERE characters.id = cid FOR UPDATE;
  SELECT city_id INTO city FROM public.characters WHERE characters.id = cid;
  SELECT * INTO s FROM public.coalition_settings WHERE coalition_settings.id = 1;
  PERFORM public.party_life_settle(city);
  IF _command = 'propose' THEN
    mine := (_input->>'org_id')::uuid;
    IF mine IS NULL OR mine NOT IN (SELECT public.org_led(cid)) THEN RAISE EXCEPTION 'Seul un dirigeant du parti peut proposer un accord'; END IF;
    SELECT * INTO partner FROM public.organizations WHERE organizations.id = (_input->>'partner_id')::uuid;
    IF NOT FOUND OR partner.id = mine OR partner.status <> 'active' OR partner.kind NOT IN ('party','movement') OR partner.city_id IS DISTINCT FROM city THEN
      RAISE EXCEPTION 'Partenaire invalide'; END IF;
    BEGIN
      INSERT INTO public.coalitions (city_id, proposer_org, partner_org, proposed_by, concessions, responsibilities, budget_support)
        VALUES (city, mine, partner.id, cid, btrim(_input->>'concessions'), btrim(_input->>'responsibilities'), COALESCE((_input->>'budget_support')::boolean, false))
        RETURNING coalitions.id INTO new_id;
    EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Un accord est déjà en cours entre ces deux organisations'; END;
    RETURN jsonb_build_object('id', new_id);
  ELSIF _command IN ('accept','refuse','break') THEN
    SELECT * INTO c FROM public.coalitions WHERE coalitions.id = (_input->>'coalition_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Accord introuvable'; END IF;
    IF _command IN ('accept','refuse') THEN
      IF c.status <> 'proposee' OR c.partner_org NOT IN (SELECT public.org_led(cid)) THEN RAISE EXCEPTION 'Action impossible'; END IF;
      UPDATE public.coalitions SET status = CASE WHEN _command = 'accept' THEN 'active' ELSE 'refusee' END, decided_at = public.game_now() WHERE coalitions.id = c.id;
      RETURN '{}';
    END IF;
    IF c.status <> 'active' THEN RAISE EXCEPTION 'Cet accord n''est pas en cours'; END IF;
    SELECT x INTO mine FROM public.org_led(cid) x WHERE x IN (c.proposer_org, c.partner_org) LIMIT 1;
    IF mine IS NULL THEN RAISE EXCEPTION 'Seul un dirigeant d''un des partis peut rompre l''accord'; END IF;
    UPDATE public.coalitions SET status = 'rompue', ended_at = public.game_now(), broken_by = mine WHERE coalitions.id = c.id;
    INSERT INTO public.coalition_effects (coalition_id, organization_id, kind, delta) VALUES (c.id, mine, 'rupture', -s.break_penalty)
      ON CONFLICT DO NOTHING;
    IF FOUND THEN UPDATE public.organizations SET reputation = GREATEST(0, reputation - s.break_penalty) WHERE organizations.id = mine; END IF;
    RETURN '{}';
  ELSIF _command = 'open_vote' THEN
    mine := (_input->>'org_id')::uuid;
    IF mine IS NULL OR mine NOT IN (SELECT public.org_led(cid)) THEN RAISE EXCEPTION 'Seul un dirigeant peut organiser un vote'; END IF;
    k := _input->>'kind';
    IF k NOT IN ('president','motion','programme','alliance','congres') THEN RAISE EXCEPTION 'Type de vote invalide'; END IF;
    IF (SELECT count(*) FROM public.org_votes WHERE organization_id = mine AND status = 'ouvert') >= 3 THEN RAISE EXCEPTION 'Trois votes sont déjà ouverts'; END IF;
    IF k = 'president' THEN
      SELECT array_agg(DISTINCT x::uuid) INTO cands FROM jsonb_array_elements_text(_input->'candidates') x;
      IF cands IS NULL OR array_length(cands, 1) < 1 OR array_length(cands, 1) > 6 OR EXISTS (SELECT 1 FROM unnest(cands) u WHERE NOT EXISTS (
          SELECT 1 FROM public.memberships m WHERE m.organization_id = mine AND m.character_id = u AND m.status = 'active')) THEN
        RAISE EXCEPTION 'Les candidats doivent être des membres actifs (1 à 6)'; END IF;
    END IF;
    IF k = 'programme' AND char_length(btrim(COALESCE(_input->>'body', ''))) < 20 THEN RAISE EXCEPTION 'Le programme doit faire au moins 20 caractères'; END IF;
    IF k = 'alliance' AND NOT EXISTS (SELECT 1 FROM public.coalitions WHERE coalitions.id = (_input->>'coalition_id')::uuid AND mine IN (proposer_org, partner_org)) THEN
      RAISE EXCEPTION 'Choisis un accord qui concerne ton organisation'; END IF;
    INSERT INTO public.org_votes (organization_id, created_by, kind, title, body, candidates, coalition_id, closes_at)
      VALUES (mine, cid, k, btrim(_input->>'title'), NULLIF(btrim(COALESCE(_input->>'body', '')), ''), cands,
        CASE WHEN k = 'alliance' THEN (_input->>'coalition_id')::uuid END, public.game_now() + make_interval(hours => s.vote_hours))
      RETURNING org_votes.id INTO new_id;
    RETURN jsonb_build_object('id', new_id);
  ELSIF _command = 'ballot' THEN
    SELECT * INTO v FROM public.org_votes WHERE org_votes.id = (_input->>'vote_id')::uuid;
    IF NOT FOUND OR v.status <> 'ouvert' OR v.closes_at <= public.game_now() THEN RAISE EXCEPTION 'Ce vote est clos'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = v.organization_id AND character_id = cid AND status = 'active') THEN
      RAISE EXCEPTION 'Réservé aux membres'; END IF;
    k := _input->>'choice';
    IF (v.kind = 'president' AND NOT (k ~ '^[0-9a-f-]{36}$' AND k::uuid = ANY (v.candidates))) OR (v.kind <> 'president' AND k NOT IN ('pour','contre','abstention')) THEN
      RAISE EXCEPTION 'Choix invalide'; END IF;
    INSERT INTO public.org_vote_ballots (vote_id, character_id, choice) VALUES (v.id, cid, k) ON CONFLICT DO NOTHING;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tu as déjà voté'; END IF;
    RETURN '{}';
  END IF;
  RAISE EXCEPTION 'Action inconnue';
END $$;

-- Vérification des faits : affirmation structurée → données → calcul → conclusion.
CREATE FUNCTION public.fact_check_state() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); city text; BEGIN
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  RETURN jsonb_build_object(
    'indicators', COALESCE((SELECT jsonb_agg(indicator ORDER BY indicator) FROM public.city_indicators WHERE city_id = city), '[]'::jsonb),
    'checks', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', f.id, 'claim', f.claim, 'data', f.data, 'calculation', f.calculation,
        'verdict', f.verdict, 'created_at', f.created_at, 'mine', f.author_id = cid,
        'author', (SELECT first_name || ' ' || last_name FROM public.characters WHERE id = f.author_id)) ORDER BY f.created_at DESC)
      FROM (SELECT * FROM public.fact_checks WHERE city_id = city ORDER BY created_at DESC LIMIT 40) f), '[]'::jsonb));
END $$;

CREATE FUNCTION public.fact_check(_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); city text; k text := _input->>'kind'; ind text := _input->>'indicator'; dir text := _input->>'direction';
  amount numeric; days integer; cur numeric; past numeric; actual numeric; verdict text; calc text; claim text; data jsonb; bal numeric; r public.fact_checks; BEGIN
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  IF (SELECT count(*) FROM public.fact_checks WHERE author_id = cid AND created_at > public.game_now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'Cinq vérifications par jour au maximum'; END IF;
  BEGIN amount := (_input->>'amount')::numeric; days := COALESCE((_input->>'days')::int, 30);
  EXCEPTION WHEN others THEN RAISE EXCEPTION 'Valeur invalide'; END;
  IF amount IS NULL OR amount < 0 OR amount > 100000000 OR days NOT BETWEEN 1 AND 365 OR dir NOT IN ('hausse','baisse','au_dessus','en_dessous') THEN
    RAISE EXCEPTION 'Affirmation incomplète'; END IF;
  IF k = 'evolution' THEN
    IF dir NOT IN ('hausse','baisse') OR amount > 100 THEN RAISE EXCEPTION 'Affirmation incomplète'; END IF;
    SELECT value INTO cur FROM public.city_indicators WHERE city_id = city AND indicator = ind;
    IF NOT FOUND THEN RAISE EXCEPTION 'Indicateur inconnu'; END IF;
    SELECT before_value INTO past FROM public.indicator_history WHERE city_id = city AND indicator = ind
      AND occurred_at >= public.game_now() - make_interval(days => days) ORDER BY occurred_at LIMIT 1;
    claim := format('L''indicateur « %s » a %s de %s points en %s jours.', ind, CASE dir WHEN 'hausse' THEN 'augmenté' ELSE 'baissé' END, amount, days);
    IF past IS NULL AND NOT EXISTS (SELECT 1 FROM public.indicator_history WHERE city_id = city AND indicator = ind) THEN
      verdict := 'invérifiable'; calc := 'Aucun historique enregistré pour cet indicateur : impossible de comparer.';
      data := jsonb_build_object('actuel', cur);
    ELSE
      past := COALESCE(past, cur); actual := cur - past;
      data := jsonb_build_object('il_y_a', past, 'actuel', cur, 'evolution_reelle', actual);
      calc := format('%s − %s = %s points (annoncé : %s%s).', cur, past, actual, CASE dir WHEN 'hausse' THEN '+' ELSE '−' END, amount);
      amount := CASE dir WHEN 'hausse' THEN amount ELSE -amount END;
      verdict := CASE WHEN abs(actual - amount) <= 1 THEN 'vrai' WHEN abs(actual - amount) <= 3 AND sign(actual) = sign(amount) THEN 'plutot_vrai'
                      WHEN actual = 0 OR sign(actual) = sign(amount) THEN 'trompeur' ELSE 'faux' END;
      IF actual = 0 AND amount = 0 THEN verdict := 'vrai'; END IF;
    END IF;
  ELSIF k = 'niveau' THEN
    IF dir NOT IN ('au_dessus','en_dessous') OR amount > 100 THEN RAISE EXCEPTION 'Affirmation incomplète'; END IF;
    SELECT value INTO cur FROM public.city_indicators WHERE city_id = city AND indicator = ind;
    IF NOT FOUND THEN RAISE EXCEPTION 'Indicateur inconnu'; END IF;
    claim := format('L''indicateur « %s » est %s de %s.', ind, CASE dir WHEN 'au_dessus' THEN 'au-dessus' ELSE 'en dessous' END, amount);
    data := jsonb_build_object('actuel', cur, 'seuil', amount);
    calc := format('Valeur actuelle %s, seuil annoncé %s, écart %s.', cur, amount, cur - amount);
    verdict := CASE WHEN (dir = 'au_dessus' AND cur > amount) OR (dir = 'en_dessous' AND cur < amount) THEN
                      CASE WHEN abs(cur - amount) <= 2 THEN 'plutot_vrai' ELSE 'vrai' END
                    WHEN abs(cur - amount) <= 2 THEN 'trompeur' ELSE 'faux' END;
  ELSIF k = 'budget' THEN
    IF dir NOT IN ('au_dessus','en_dessous') THEN RAISE EXCEPTION 'Affirmation incomplète'; END IF;
    SELECT balance INTO bal FROM public.municipal_treasuries WHERE city_id = city;
    claim := format('La caisse de la ville est %s de %s €.', CASE dir WHEN 'au_dessus' THEN 'au-dessus' ELSE 'en dessous' END, amount);
    IF bal IS NULL THEN verdict := 'invérifiable'; calc := 'La ville n''a pas encore de budget enregistré.'; data := '{}'::jsonb;
    ELSE
      data := jsonb_build_object('solde', bal, 'seuil', amount);
      calc := format('Solde %s €, seuil annoncé %s €, écart %s €.', bal, amount, bal - amount);
      verdict := CASE WHEN (dir = 'au_dessus' AND bal > amount) OR (dir = 'en_dessous' AND bal < amount) THEN
                        CASE WHEN abs(bal - amount) <= greatest(abs(amount) * 0.05, 1) THEN 'plutot_vrai' ELSE 'vrai' END
                      WHEN abs(bal - amount) <= greatest(abs(amount) * 0.05, 1) THEN 'trompeur' ELSE 'faux' END;
    END IF;
  ELSE RAISE EXCEPTION 'Type d''affirmation inconnu';
  END IF;
  INSERT INTO public.fact_checks (city_id, author_id, claim, kind, params, data, calculation, verdict)
    VALUES (city, cid, claim, k, jsonb_build_object('indicator', ind, 'direction', dir, 'amount', amount, 'days', days), data, calc, verdict) RETURNING * INTO r;
  RETURN jsonb_build_object('id', r.id, 'claim', r.claim, 'data', r.data, 'calculation', r.calculation, 'verdict', r.verdict);
END $$;

REVOKE ALL ON FUNCTION public.org_led(uuid), public.party_life_settle(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.party_life_state(), public.party_life_action(text, jsonb), public.fact_check_state(), public.fact_check(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.party_life_state(), public.party_life_action(text, jsonb), public.fact_check_state(), public.fact_check(jsonb) TO authenticated;

COMMIT;
