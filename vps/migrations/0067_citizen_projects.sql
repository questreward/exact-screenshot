-- CIVITAS – PROJETS CITOYENS
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée. Nécessite 0066 (conséquences différées).
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0067_citizen_projects.sql
-- Parcours : idée (problème, objectif, quartier, coût estimé) → soutiens (joueurs + habitants simulés, mobilisation quotidienne,
--   dons symboliques dans une cagnotte séparée) → examen par la mairie (maire joueur : accepter / financer en partie / reporter / refuser ;
--   sinon décision simulée à partir du score) → travaux → bilan. Un projet reporté peut être modifié (coût réduit) puis resoumis.
-- L'argent personnel donné reste dans la cagnotte du projet (jamais versé au budget municipal ni reversé) : budget municipal et argent
--   personnel restent séparés. Le budget municipal finance les travaux via le moteur de conséquences (registre unique).
-- Conséquences programmées : budget (immédiat), indicateurs de la ville à la fin des travaux puis à +30 jours, réputation du porteur,
--   actualités. Refuser un projet très soutenu coûte de la réputation politique au maire joueur.
BEGIN;

CREATE TABLE public.citizen_project_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  min_age integer NOT NULL DEFAULT 16,
  max_active integer NOT NULL DEFAULT 2,           -- projets en cours par porteur
  support_days integer NOT NULL DEFAULT 4,
  review_days integer NOT NULL DEFAULT 3,          -- délai laissé au maire joueur
  postpone_days integer NOT NULL DEFAULT 7,
  player_weight integer NOT NULL DEFAULT 6,        -- points de soutien par joueur
  mobilize_points integer NOT NULL DEFAULT 4,
  mobilize_energy integer NOT NULL DEFAULT 15,
  donation_step integer NOT NULL DEFAULT 50,       -- 1 point par tranche de dons
  approve_score integer NOT NULL DEFAULT 70,
  partial_score integer NOT NULL DEFAULT 50,
  postpone_score integer NOT NULL DEFAULT 35,
  author_reputation integer NOT NULL DEFAULT 5,
  supporter_reputation integer NOT NULL DEFAULT 1,
  refusal_political integer NOT NULL DEFAULT 3,
  followup_days integer NOT NULL DEFAULT 30
);
INSERT INTO public.citizen_project_settings (id) VALUES (1);

CREATE TABLE public.citizen_project_types (
  id text PRIMARY KEY,
  label text NOT NULL,
  indicator text NOT NULL,
  min_cost bigint NOT NULL,
  max_cost bigint NOT NULL,
  work_days integer NOT NULL,
  effect integer NOT NULL,          -- gain d'indicateur à la fin des travaux
  followup integer NOT NULL         -- gain supplémentaire à long terme
);
INSERT INTO public.citizen_project_types VALUES
  ('parc','Rénovation d''un parc','environment',40000,150000,5,3,2),
  ('sport','Équipement sportif','services',80000,300000,8,3,2),
  ('velo','Piste cyclable','transport',60000,250000,6,3,3),
  ('bibliotheque','Bibliothèque','culture',100000,300000,8,4,2),
  ('ecole','Amélioration d''une école','services',50000,200000,6,3,2),
  ('culture','Événement culturel','culture',10000,60000,2,2,1),
  ('commerces','Aide aux commerces','commerce',30000,150000,3,3,1),
  ('environnement','Projet environnemental','environment',30000,200000,6,3,3),
  ('transports','Amélioration des transports','transport',80000,300000,8,3,3),
  ('securite','Sécurité d''un quartier','safety',30000,150000,4,3,2);

CREATE TABLE public.citizen_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  author_id uuid NOT NULL REFERENCES public.characters(id),
  city_id text NOT NULL REFERENCES public.cities(id),
  district_id text REFERENCES public.districts(id),
  type_id text NOT NULL REFERENCES public.citizen_project_types(id),
  title text NOT NULL,
  problem text NOT NULL,
  goal text NOT NULL,
  cost bigint NOT NULL CHECK (cost > 0),
  status text NOT NULL DEFAULT 'soutiens' CHECK (status IN ('soutiens','examen','reporte','travaux','termine','refuse','echoue')),
  sim_base integer NOT NULL,                  -- soutien simulé des habitants (déterministe)
  mobilization integer NOT NULL DEFAULT 0,
  score integer,
  decision text CHECK (decision IN ('accepte','partiel','reporte','refuse')),
  decided_by text CHECK (decided_by IN ('maire','simulation')),
  funded bigint NOT NULL DEFAULT 0,
  funding_pct integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  stage_at timestamptz NOT NULL DEFAULT public.game_now(),   -- début de l'étape en cours
  works_end timestamptz,
  closed_at timestamptz
);
CREATE INDEX citizen_projects_city ON public.citizen_projects (city_id, status);
CREATE INDEX citizen_projects_author ON public.citizen_projects (author_id);

CREATE TABLE public.citizen_project_supports (
  project_id uuid NOT NULL REFERENCES public.citizen_projects(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (project_id, character_id)
);

CREATE TABLE public.citizen_project_mobilizations (
  project_id uuid NOT NULL REFERENCES public.citizen_projects(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  day date NOT NULL,
  PRIMARY KEY (project_id, character_id, day)
);

-- Cagnotte du projet : dons personnels, conservés séparément (jamais reversés)
CREATE TABLE public.citizen_project_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES public.citizen_projects(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  amount integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);

CREATE TABLE public.citizen_project_log (
  id bigserial PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.citizen_projects(id),
  at timestamptz NOT NULL DEFAULT public.game_now(),
  step text NOT NULL,
  message text NOT NULL
);

GRANT SELECT ON public.citizen_project_settings, public.citizen_project_types, public.citizen_projects, public.citizen_project_supports,
  public.citizen_project_mobilizations, public.citizen_project_donations, public.citizen_project_log TO authenticated;
GRANT ALL ON public.citizen_project_settings, public.citizen_project_types, public.citizen_projects, public.citizen_project_supports,
  public.citizen_project_mobilizations, public.citizen_project_donations, public.citizen_project_log TO service_role;
GRANT USAGE ON SEQUENCE public.citizen_project_log_id_seq TO service_role;
ALTER TABLE public.citizen_project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_project_supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_project_mobilizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_project_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_project_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY cps_read ON public.citizen_project_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY cpt_read ON public.citizen_project_types FOR SELECT TO authenticated USING (true);
CREATE POLICY cp_read ON public.citizen_projects FOR SELECT TO authenticated USING (true);          -- projets publics
CREATE POLICY cpl_read ON public.citizen_project_log FOR SELECT TO authenticated USING (true);
CREATE POLICY cpsu_own ON public.citizen_project_supports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = citizen_project_supports.character_id AND c.user_id = auth.uid()));
CREATE POLICY cpm_own ON public.citizen_project_mobilizations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = citizen_project_mobilizations.character_id AND c.user_id = auth.uid()));
CREATE POLICY cpd_own ON public.citizen_project_donations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = citizen_project_donations.character_id AND c.user_id = auth.uid()));

CREATE FUNCTION public.cproject_notify(_cid uuid, _title text, _body text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body) SELECT user_id, _title, _body FROM public.characters WHERE id = _cid
$$;

CREATE FUNCTION public.cproject_score(_p uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT LEAST(100, p.sim_base + p.mobilization
    + (SELECT count(*) FROM public.citizen_project_supports WHERE project_id = p.id)::integer * s.player_weight
    + LEAST(10, (SELECT COALESCE(sum(amount), 0) FROM public.citizen_project_donations WHERE project_id = p.id)::integer / s.donation_step))
  FROM public.citizen_projects p, public.citizen_project_settings s WHERE p.id = _p AND s.id = 1
$$;

-- Appliquer une décision (maire joueur ou simulation)
CREATE FUNCTION public.cproject_decide(_p uuid, _decision text, _by text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.citizen_projects; s public.citizen_project_settings; t public.citizen_project_types; sc integer; pct integer; bal bigint;
        mayor uuid; nowt timestamptz := public.game_now(); BEGIN
  SELECT * INTO p FROM public.citizen_projects WHERE id = _p FOR UPDATE;
  IF p.status <> 'examen' THEN RETURN; END IF;
  SELECT * INTO s FROM public.citizen_project_settings WHERE id = 1;
  SELECT * INTO t FROM public.citizen_project_types WHERE id = p.type_id;
  sc := public.cproject_score(p.id);
  pct := CASE _decision WHEN 'accepte' THEN 100 WHEN 'partiel' THEN 50 ELSE 0 END;
  IF pct > 0 THEN
    SELECT balance INTO bal FROM public.municipal_treasuries WHERE city_id = p.city_id;
    IF COALESCE(bal, 0) < p.cost * pct / 100 THEN _decision := 'reporte'; pct := 0; END IF;   -- budget insuffisant : report
  END IF;
  mayor := public.petition_mayor(p.city_id);
  IF _decision IN ('accepte','partiel') THEN
    UPDATE public.citizen_projects SET status = 'travaux', decision = _decision, decided_by = _by, score = sc, funding_pct = pct,
      funded = p.cost * pct / 100, stage_at = nowt, works_end = nowt + make_interval(days => t.work_days) WHERE id = p.id;
    PERFORM public.schedule_effect('cproject:' || p.id || ':v' || p.version || ':budget', 'projet', p.id, p.city_id, nowt, 'treasury',
      'Financement du projet citoyen « ' || p.title || ' »', NULL, 0, -(p.cost * pct / 100));
    PERFORM public.schedule_effect('cproject:' || p.id || ':works', 'projet', p.id, p.city_id, nowt + make_interval(days => t.work_days), 'indicator',
      'Fin des travaux : « ' || p.title || ' »', t.indicator, GREATEST(1, t.effect * pct / 100));
    PERFORM public.schedule_effect('cproject:' || p.id || ':works-sat', 'projet', p.id, p.city_id, nowt + make_interval(days => t.work_days), 'indicator',
      'Les habitants apprécient « ' || p.title || ' »', 'satisfaction', 1);
    PERFORM public.schedule_effect('cproject:' || p.id || ':long', 'projet', p.id, p.city_id, nowt + make_interval(days => t.work_days + s.followup_days), 'indicator',
      'Effet durable de « ' || p.title || ' »', t.indicator, GREATEST(0, t.followup * pct / 100));
    PERFORM public.schedule_effect('cproject:' || p.id || ':author', 'projet', p.id, p.city_id, nowt + make_interval(days => t.work_days), 'reputation',
      'Projet citoyen mené à bien', NULL, CASE WHEN pct = 100 THEN s.author_reputation ELSE (s.author_reputation + 1) / 2 END, 0, p.author_id);
    PERFORM public.schedule_effect('cproject:' || p.id || ':news-done', 'projet', p.id, p.city_id, nowt + make_interval(days => t.work_days), 'news',
      'Projet citoyen inauguré : ' || p.title, NULL, 0, 0, NULL,
      'Porté par un habitant, le projet « ' || p.title || ' » est terminé' || CASE WHEN pct < 100 THEN ', dans une version réduite faute de financement complet.' ELSE '.' END);
    PERFORM public.civic_news('cproject-ok:' || p.id || ':v' || p.version, 'La mairie ' || CASE WHEN pct = 100 THEN 'finance' ELSE 'finance en partie' END || ' le projet « ' || p.title || ' »',
      'Coût pris en charge : ' || (p.cost * pct / 100) || ' €. Travaux prévus pendant ' || t.work_days || ' jours.', p.city_id, NULL, NULL);
    INSERT INTO public.citizen_project_log (project_id, step, message) VALUES (p.id, 'decision',
      CASE WHEN pct = 100 THEN 'Projet accepté et financé.' ELSE 'Projet financé à 50 % : version réduite.' END || CASE WHEN _by = 'simulation' THEN ' (décision du conseil municipal)' ELSE ' (décision du maire)' END);
    PERFORM public.cproject_notify(p.author_id, 'Projet accepté', '« ' || p.title || ' » ' || CASE WHEN pct = 100 THEN 'est financé.' ELSE 'est financé à 50 %.' END);
  ELSIF _decision = 'reporte' THEN
    UPDATE public.citizen_projects SET status = 'reporte', decision = 'reporte', decided_by = _by, score = sc, stage_at = nowt WHERE id = p.id;
    INSERT INTO public.citizen_project_log (project_id, step, message) VALUES (p.id, 'decision', 'Projet reporté. Vous pouvez le modifier puis le présenter de nouveau.');
    PERFORM public.cproject_notify(p.author_id, 'Projet reporté', '« ' || p.title || ' » est reporté. Réduisez son coût ou renforcez les soutiens.');
  ELSE
    UPDATE public.citizen_projects SET status = 'refuse', decision = 'refuse', decided_by = _by, score = sc, stage_at = nowt, closed_at = nowt WHERE id = p.id;
    INSERT INTO public.citizen_project_log (project_id, step, message) VALUES (p.id, 'decision', 'Projet refusé.');
    PERFORM public.cproject_notify(p.author_id, 'Projet refusé', '« ' || p.title || ' » a été refusé.');
    IF _by = 'maire' AND mayor IS NOT NULL AND sc >= s.approve_score THEN    -- refuser un projet très soutenu a un coût politique
      PERFORM public.schedule_effect('cproject:' || p.id || ':refusal', 'projet', p.id, p.city_id, nowt, 'political',
        'Refus d''un projet citoyen très soutenu', NULL, -s.refusal_political, 0, mayor);
      PERFORM public.civic_news('cproject-refused:' || p.id, 'Le maire refuse un projet citoyen populaire',
        'Le projet « ' || p.title || ' » était soutenu à ' || sc || ' %. Ses partisans dénoncent la décision.', p.city_id, NULL, NULL);
    END IF;
  END IF;
END $$;

-- Avancement des projets d'une ville (réglé à la lecture)
CREATE FUNCTION public.cproject_refresh(_city text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.citizen_projects; s public.citizen_project_settings; sc integer; mayor uuid; nowt timestamptz := public.game_now(); m record; BEGIN
  SELECT * INTO s FROM public.citizen_project_settings WHERE id = 1;
  PERFORM pg_advisory_xact_lock(hashtextextended('cproject:' || _city, 0));
  mayor := public.petition_mayor(_city);
  FOR p IN SELECT * FROM public.citizen_projects WHERE city_id = _city AND status IN ('soutiens','examen','travaux') ORDER BY created_at FOR UPDATE LOOP
    IF p.status = 'soutiens' AND p.stage_at + make_interval(days => s.support_days) <= nowt THEN
      sc := public.cproject_score(p.id);
      IF sc < s.postpone_score THEN
        UPDATE public.citizen_projects SET status = 'echoue', score = sc, closed_at = nowt WHERE id = p.id;
        INSERT INTO public.citizen_project_log (project_id, step, message) VALUES (p.id, 'soutiens', 'Pas assez de soutiens (' || sc || ' %). Le projet s''arrête.');
        PERFORM public.cproject_notify(p.author_id, 'Projet sans soutien suffisant', '« ' || p.title || ' » n''a réuni que ' || sc || ' % de soutien.');
        CONTINUE;
      END IF;
      UPDATE public.citizen_projects SET status = 'examen', score = sc, stage_at = p.stage_at + make_interval(days => s.support_days) WHERE id = p.id;
      p.status := 'examen'; p.stage_at := p.stage_at + make_interval(days => s.support_days);
      INSERT INTO public.citizen_project_log (project_id, step, message) VALUES (p.id, 'examen', 'Projet présenté à la mairie avec ' || sc || ' % de soutien.');
      IF mayor IS NOT NULL THEN PERFORM public.cproject_notify(mayor, 'Projet citoyen à examiner', '« ' || p.title || ' » attend votre décision.'); END IF;
    END IF;
    IF p.status = 'examen' AND (mayor IS NULL OR p.stage_at + make_interval(days => s.review_days) <= nowt) THEN
      sc := public.cproject_score(p.id);
      PERFORM public.cproject_decide(p.id, CASE WHEN sc >= s.approve_score THEN 'accepte' WHEN sc >= s.partial_score THEN 'partiel'
        WHEN sc >= s.postpone_score THEN 'reporte' ELSE 'refuse' END, 'simulation');
    END IF;
    IF p.status = 'travaux' AND p.works_end <= nowt THEN
      UPDATE public.citizen_projects SET status = 'termine', closed_at = p.works_end WHERE id = p.id;
      INSERT INTO public.citizen_project_log (project_id, step, message) VALUES (p.id, 'bilan', 'Travaux terminés. Effets durables attendus dans ' || s.followup_days || ' jours.');
      FOR m IN SELECT character_id FROM public.citizen_project_supports WHERE project_id = p.id AND character_id <> p.author_id LOOP
        PERFORM public.schedule_effect('cproject:' || p.id || ':sup:' || m.character_id, 'projet', p.id, p.city_id, nowt, 'reputation',
          'Soutien à un projet citoyen réussi', NULL, s.supporter_reputation, 0, m.character_id);
      END LOOP;
    END IF;
  END LOOP;
  PERFORM public.apply_due_effects(_city);
END $$;

CREATE FUNCTION public.cproject_state(_city text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; city text; s public.citizen_project_settings; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  city := COALESCE(_city, c.city_id);
  PERFORM public.cproject_refresh(city);
  SELECT * INTO s FROM public.citizen_project_settings WHERE id = 1;
  RETURN jsonb_build_object('me', cid, 'now', public.game_now(), 'city', city, 'my_city', c.city_id, 'age', c.age,
    'is_mayor', public.petition_mayor(city) = cid,
    'settings', to_jsonb(s) - 'id',
    'treasury', (SELECT balance FROM public.municipal_treasuries WHERE city_id = city),
    'types', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.label) FROM public.citizen_project_types t),
    'districts', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name) ORDER BY d.sort_order, d.name) FROM public.districts d WHERE d.city_id = city), '[]'::jsonb),
    'projects', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'problem', p.problem, 'goal', p.goal, 'type_id', p.type_id,
        'district', (SELECT name FROM public.districts WHERE id = p.district_id), 'cost', p.cost, 'status', p.status, 'decision', p.decision,
        'decided_by', p.decided_by, 'funding_pct', p.funding_pct, 'score', public.cproject_score(p.id), 'version', p.version,
        'author', public.network_card(p.author_id), 'mine', p.author_id = cid, 'stage_at', p.stage_at, 'works_end', p.works_end, 'created_at', p.created_at,
        'supporters', (SELECT count(*) FROM public.citizen_project_supports x WHERE x.project_id = p.id),
        'donations', (SELECT COALESCE(sum(amount), 0) FROM public.citizen_project_donations x WHERE x.project_id = p.id),
        'i_support', EXISTS (SELECT 1 FROM public.citizen_project_supports x WHERE x.project_id = p.id AND x.character_id = cid),
        'mobilized_today', EXISTS (SELECT 1 FROM public.citizen_project_mobilizations x WHERE x.project_id = p.id AND x.character_id = cid AND x.day = public.game_now()::date),
        'log', (SELECT jsonb_agg(jsonb_build_object('at', l.at, 'step', l.step, 'message', l.message) ORDER BY l.at, l.id) FROM public.citizen_project_log l WHERE l.project_id = p.id),
        'effects', (SELECT jsonb_agg(jsonb_build_object('label', e.label, 'kind', e.kind, 'indicator', e.indicator, 'delta', e.delta, 'amount', e.amount,
            'due_at', e.due_at, 'applied', e.applied_at IS NOT NULL) ORDER BY e.due_at) FROM public.scheduled_effects e
            WHERE e.source_kind = 'projet' AND e.source_id = p.id AND e.kind IN ('indicator','treasury'))
      ) ORDER BY (p.status IN ('termine','refuse','echoue')), p.created_at DESC)
      FROM (SELECT * FROM public.citizen_projects WHERE city_id = city ORDER BY (status IN ('termine','refuse','echoue')), created_at DESC LIMIT 40) p), '[]'::jsonb));
END $$;

CREATE FUNCTION public.cproject_action(_command text, _input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; s public.citizen_project_settings; t public.citizen_project_types; p public.citizen_projects;
        rid uuid := NULLIF(_input->>'request_id', '')::uuid; oid uuid; ttl text; pb text; gl text; v_cost bigint; amt integer; today date := public.game_now()::date; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO s FROM public.citizen_project_settings WHERE id = 1;

  IF _command = 'create' THEN
    IF rid IS NULL THEN RAISE EXCEPTION 'Demande invalide.'; END IF;
    SELECT id INTO oid FROM public.citizen_projects WHERE request_id = rid; IF oid IS NOT NULL THEN RETURN oid; END IF;
    IF c.age < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans.', s.min_age; END IF;
    SELECT * INTO t FROM public.citizen_project_types WHERE id = _input->>'type_id';
    IF NOT FOUND THEN RAISE EXCEPTION 'Type de projet invalide.'; END IF;
    ttl := btrim(coalesce(_input->>'title', '')); pb := btrim(coalesce(_input->>'problem', '')); gl := btrim(coalesce(_input->>'goal', ''));
    IF char_length(ttl) NOT BETWEEN 5 AND 80 THEN RAISE EXCEPTION 'Titre : 5 à 80 caractères.'; END IF;
    IF char_length(pb) NOT BETWEEN 15 AND 500 THEN RAISE EXCEPTION 'Problème : 15 à 500 caractères.'; END IF;
    IF char_length(gl) NOT BETWEEN 10 AND 300 THEN RAISE EXCEPTION 'Objectif : 10 à 300 caractères.'; END IF;
    IF NOT public.press_clean(ttl || ' ' || pb || ' ' || gl) THEN RAISE EXCEPTION 'Texte refusé par le filtre automatique.'; END IF;
    v_cost := (_input->>'cost')::bigint;
    IF v_cost IS NULL OR v_cost < t.min_cost OR v_cost > t.max_cost THEN RAISE EXCEPTION 'Coût entre % et % €.', t.min_cost, t.max_cost; END IF;
    IF _input->>'district_id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.districts WHERE id = _input->>'district_id' AND city_id = c.city_id) THEN
      RAISE EXCEPTION 'Quartier invalide.'; END IF;
    IF (SELECT count(*) FROM public.citizen_projects WHERE author_id = cid AND status IN ('soutiens','examen','reporte','travaux')) >= s.max_active THEN
      RAISE EXCEPTION 'Maximum % projets en cours.', s.max_active; END IF;
    -- Soutien simulé : plus le projet est cher par rapport à sa catégorie, plus il est difficile à faire adopter
    INSERT INTO public.citizen_projects (request_id, author_id, city_id, district_id, type_id, title, problem, goal, cost, sim_base)
    VALUES (rid, cid, c.city_id, NULLIF(_input->>'district_id', ''), t.id, ttl, pb, gl, v_cost,
      20 + abs(hashtext(rid::text)) % 25 + (10 * (t.max_cost - v_cost) / GREATEST(1, t.max_cost - t.min_cost))::integer) RETURNING id INTO oid;
    INSERT INTO public.citizen_project_supports (project_id, character_id) VALUES (oid, cid);
    INSERT INTO public.citizen_project_log (project_id, step, message) VALUES (oid, 'creation', 'Projet créé. Collecte de soutiens pendant ' || s.support_days || ' jours.');
    PERFORM public.civic_news('cproject-new:' || oid, 'Nouveau projet citoyen : ' || ttl, pb, c.city_id, NULL, NULL);
    RETURN oid;
  END IF;

  SELECT * INTO p FROM public.citizen_projects WHERE id = (_input->>'project_id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Projet introuvable.'; END IF;
  PERFORM public.cproject_refresh(p.city_id);
  SELECT * INTO p FROM public.citizen_projects WHERE id = p.id;

  IF _command = 'support' THEN
    IF p.status <> 'soutiens' THEN RAISE EXCEPTION 'La collecte de soutiens est terminée.'; END IF;
    IF c.city_id <> p.city_id THEN RAISE EXCEPTION 'Réservé aux habitants de la ville.'; END IF;
    IF c.age < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans.', s.min_age; END IF;
    INSERT INTO public.citizen_project_supports (project_id, character_id) VALUES (p.id, cid) ON CONFLICT DO NOTHING;
    RETURN p.id;

  ELSIF _command = 'mobilize' THEN              -- présenter le projet / organiser une mobilisation, une fois par jour
    IF p.status NOT IN ('soutiens','examen') THEN RAISE EXCEPTION 'Mobilisation possible pendant la collecte ou l''examen.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.citizen_project_supports WHERE project_id = p.id AND character_id = cid) THEN RAISE EXCEPTION 'Soutenez d''abord le projet.'; END IF;
    IF EXISTS (SELECT 1 FROM public.citizen_project_mobilizations WHERE project_id = p.id AND day = today AND character_id = cid) THEN
      RAISE EXCEPTION 'Déjà mobilisé aujourd''hui.'; END IF;
    IF c.energy < s.mobilize_energy THEN RAISE EXCEPTION 'Pas assez d''énergie (% nécessaires).', s.mobilize_energy; END IF;
    INSERT INTO public.citizen_project_mobilizations (project_id, character_id, day) VALUES (p.id, cid, today);
    UPDATE public.characters SET energy = energy - s.mobilize_energy WHERE id = cid;
    UPDATE public.citizen_projects SET mobilization = LEAST(30, mobilization + s.mobilize_points) WHERE id = p.id;
    RETURN p.id;

  ELSIF _command = 'donate' THEN
    IF rid IS NULL THEN RAISE EXCEPTION 'Demande invalide.'; END IF;
    IF EXISTS (SELECT 1 FROM public.citizen_project_donations WHERE request_id = rid) THEN RETURN p.id; END IF;
    IF p.status NOT IN ('soutiens','examen','reporte') THEN RAISE EXCEPTION 'Les dons sont fermés.'; END IF;
    amt := (_input->>'amount')::integer;
    IF amt IS NULL OR amt NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Don entre 5 et 500 crédits.'; END IF;
    IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid ORDER BY created_at LIMIT 1), 0) < amt THEN RAISE EXCEPTION 'Solde insuffisant.'; END IF;
    INSERT INTO public.citizen_project_donations (request_id, project_id, character_id, amount) VALUES (rid, p.id, cid, amt);
    PERFORM public.economy_cash(cid, 'cproject-don:' || rid, -amt, 'Don au projet « ' || p.title || ' »', 'dons', jsonb_build_object('project', p.id));
    RETURN p.id;

  ELSIF _command = 'amend' THEN                 -- modifier un projet reporté puis le représenter
    IF p.author_id <> cid THEN RAISE EXCEPTION 'Seul le porteur peut modifier le projet.'; END IF;
    IF p.status <> 'reporte' THEN RAISE EXCEPTION 'Seul un projet reporté peut être modifié.'; END IF;
    SELECT * INTO t FROM public.citizen_project_types WHERE id = p.type_id;
    v_cost := (_input->>'cost')::bigint;
    IF v_cost IS NULL OR v_cost < t.min_cost OR v_cost > p.cost THEN RAISE EXCEPTION 'Nouveau coût entre % et % €.', t.min_cost, p.cost; END IF;
    gl := btrim(coalesce(_input->>'goal', p.goal));
    IF char_length(gl) NOT BETWEEN 10 AND 300 OR NOT public.press_clean(gl) THEN RAISE EXCEPTION 'Objectif invalide.'; END IF;
    UPDATE public.citizen_projects SET cost = v_cost, goal = gl, status = 'soutiens', version = version + 1, decision = NULL, decided_by = NULL,
      sim_base = LEAST(60, sim_base + (10 * (p.cost - v_cost) / GREATEST(1, p.cost))::integer), stage_at = public.game_now() WHERE id = p.id;
    INSERT INTO public.citizen_project_log (project_id, step, message) VALUES (p.id, 'modification', 'Projet modifié (coût : ' || v_cost || ' €). Nouvelle collecte de soutiens.');
    RETURN p.id;

  ELSIF _command = 'decide' THEN                -- maire joueur
    IF public.petition_mayor(p.city_id) IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Réservé au maire de la ville.'; END IF;
    IF p.status <> 'examen' THEN RAISE EXCEPTION 'Ce projet n''attend pas de décision.'; END IF;
    IF coalesce(_input->>'decision', '') NOT IN ('accepte','partiel','reporte','refuse') THEN RAISE EXCEPTION 'Décision invalide.'; END IF;
    PERFORM public.cproject_decide(p.id, _input->>'decision', 'maire');
    PERFORM public.apply_due_effects(p.city_id);
    RETURN p.id;
  END IF;
  RAISE EXCEPTION 'Commande inconnue.';
END $$;

REVOKE ALL ON FUNCTION public.cproject_notify(uuid, text, text), public.cproject_score(uuid), public.cproject_decide(uuid, text, text),
  public.cproject_refresh(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cproject_state(text), public.cproject_action(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cproject_state(text), public.cproject_action(text, jsonb) TO authenticated;

COMMIT;
