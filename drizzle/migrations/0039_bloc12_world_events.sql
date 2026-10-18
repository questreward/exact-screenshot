-- ============================================================
-- BLOC 12 — Monde vivant et événements (PROPOSITION, NON APPLIQUÉE)
-- Aucun DROP, aucun DELETE, aucun UPDATE de données existantes.
-- ============================================================

-- 1. Extension de events : colonnes facultatives, vides pour les 39 lignes existantes
ALTER TABLE public.events
  ADD COLUMN ends_at timestamptz,
  ADD COLUMN duration_kind text CHECK (duration_kind IN ('instantane','temporaire','recurrent','permanent')),
  ADD COLUMN template_id text,
  ADD COLUMN character_id uuid REFERENCES public.characters(id),
  ADD COLUMN game_category text,
  ADD COLUMN interactive boolean NOT NULL DEFAULT false,
  ADD COLUMN reason text;
CREATE INDEX events_character_idx ON public.events (character_id) WHERE character_id IS NOT NULL;
CREATE INDEX events_city_start_idx ON public.events (city_id, starts_at);

-- 2. Réglage de l'Agenda : nouveau type d'activité (ajout d'une ligne, aucune modification)
INSERT INTO public.life_rules (id, title, duration_minutes, energy_cost, energy_gain, money_cost, progression_gain, allowed_kinds)
VALUES ('world_event', 'Événement', 60, 10, 0, 0, 0,
  ARRAY['administration','banque','cafe','commerce','entreprise','gare','logement','mairie','parc','place','station','universite'])
ON CONFLICT (id) DO NOTHING;

-- 3. Catalogue configurable des modèles d'événements
CREATE TABLE public.world_event_templates (
  id text PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('local','national','personal')),
  category text NOT NULL CHECK (category IN ('Vie quotidienne','Travail','Études','Logement','Social','Économie','Citoyenneté','Politique','Ville','Transport','Actualités')),
  title text NOT NULL,
  description text NOT NULL,
  reason text,
  news_category text,
  location_kind text,
  organization_kinds text[],
  cities text[],
  probability integer NOT NULL DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  recurrence text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','weekly','monthly')),
  recurrence_day integer,
  start_hour integer NOT NULL DEFAULT 18 CHECK (start_hour BETWEEN 0 AND 23),
  duration_minutes integer NOT NULL DEFAULT 120 CHECK (duration_minutes BETWEEN 0 AND 10080),
  duration_kind text NOT NULL DEFAULT 'temporaire' CHECK (duration_kind IN ('instantane','temporaire','recurrent','permanent')),
  importance integer NOT NULL DEFAULT 50 CHECK (importance BETWEEN 0 AND 100),
  min_age integer NOT NULL DEFAULT 16,
  max_age integer NOT NULL DEFAULT 30,
  paths text[],
  requires_job boolean NOT NULL DEFAULT false,
  forbids_job boolean NOT NULL DEFAULT false,
  requires_student boolean NOT NULL DEFAULT false,
  requires_membership_kinds text[],
  skill_name text,
  skill_min integer NOT NULL DEFAULT 0,
  interactive boolean NOT NULL DEFAULT false,
  energy_cost integer NOT NULL DEFAULT 10 CHECK (energy_cost BETWEEN 0 AND 100),
  success_rate integer NOT NULL DEFAULT 100 CHECK (success_rate BETWEEN 0 AND 100),
  success_skill_bonus integer NOT NULL DEFAULT 5 CHECK (success_skill_bonus BETWEEN 0 AND 20),
  reward_money integer NOT NULL DEFAULT 0 CHECK (reward_money BETWEEN 0 AND 50),
  reward_skill text,
  reward_skill_amount integer NOT NULL DEFAULT 0 CHECK (reward_skill_amount BETWEEN 0 AND 5),
  reward_relation integer NOT NULL DEFAULT 0 CHECK (reward_relation BETWEEN 0 AND 10),
  reward_reputation integer NOT NULL DEFAULT 0 CHECK (reward_reputation BETWEEN 0 AND 10),
  reward_civic integer NOT NULL DEFAULT 0 CHECK (reward_civic BETWEEN 0 AND 10),
  reward_political_reputation integer NOT NULL DEFAULT 0 CHECK (reward_political_reputation BETWEEN 0 AND 10),
  reward_political_influence integer NOT NULL DEFAULT 0 CHECK (reward_political_influence BETWEEN 0 AND 10),
  publish_news boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.world_event_templates TO authenticated;
GRANT ALL ON public.world_event_templates TO service_role;
ALTER TABLE public.world_event_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "world event templates read" ON public.world_event_templates FOR SELECT TO authenticated USING (true);

-- 4. Réglages généraux (une ligne)
CREATE TABLE public.world_event_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  max_personal_per_day integer NOT NULL DEFAULT 1 CHECK (max_personal_per_day BETWEEN 0 AND 5),
  max_notifications_per_day integer NOT NULL DEFAULT 3 CHECK (max_notifications_per_day BETWEEN 0 AND 10),
  max_events_per_city_day integer NOT NULL DEFAULT 2 CHECK (max_events_per_city_day BETWEEN 0 AND 10),
  horizon_days integer NOT NULL DEFAULT 7 CHECK (horizon_days BETWEEN 1 AND 14),
  max_reward_money integer NOT NULL DEFAULT 50 CHECK (max_reward_money BETWEEN 0 AND 50)
);
GRANT SELECT ON public.world_event_settings TO authenticated;
GRANT ALL ON public.world_event_settings TO service_role;
ALTER TABLE public.world_event_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "world event settings read" ON public.world_event_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.world_event_settings (id) VALUES (1);

-- 5. Marqueur de génération (une ligne par ville et par jour ; borne le nombre d'enregistrements)
CREATE TABLE public.world_event_generation (
  city_key text NOT NULL,
  day date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (city_key, day)
);
GRANT ALL ON public.world_event_generation TO service_role;
ALTER TABLE public.world_event_generation ENABLE ROW LEVEL SECURITY;

-- 6. Participations (unique par événement et personnage)
CREATE TABLE public.world_event_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  choice text NOT NULL CHECK (choice IN ('participer','ignorer')),
  status text NOT NULL CHECK (status IN ('inscrit','reussi','echoue','absent','ignore')),
  activity_id uuid REFERENCES public.activities(id),
  roll integer CHECK (roll BETWEEN 0 AND 99),
  outcome jsonb,
  created_at timestamptz NOT NULL,
  settled_at timestamptz,
  UNIQUE (event_id, character_id)
);
GRANT SELECT ON public.world_event_participations TO authenticated;
GRANT ALL ON public.world_event_participations TO service_role;
ALTER TABLE public.world_event_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own world event participations" ON public.world_event_participations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- 7. Registre des conséquences (clé unique par effet)
CREATE TABLE public.world_event_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  event_id uuid REFERENCES public.events(id),
  effect_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('argent','competence','relation','reputation','civique','politique','notification')),
  amount integer,
  game_day date NOT NULL,
  applied_at timestamptz NOT NULL,
  UNIQUE (character_id, effect_key)
);
GRANT SELECT ON public.world_event_effects TO authenticated;
GRANT ALL ON public.world_event_effects TO service_role;
ALTER TABLE public.world_event_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own world event effects" ON public.world_event_effects FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- 8. Modèles par défaut (configurables)
INSERT INTO public.world_event_templates (id, scope, category, title, description, reason, news_category, location_kind, organization_kinds, probability, recurrence, recurrence_day, start_hour, duration_minutes, duration_kind, importance, min_age, max_age, paths, requires_job, forbids_job, requires_student, requires_membership_kinds, skill_name, skill_min, interactive, energy_cost, success_rate, reward_money, reward_skill, reward_skill_amount, reward_relation, reward_reputation, reward_civic, reward_political_reputation, reward_political_influence, publish_news) VALUES
('weekly-market','local','Vie quotidienne','Marché hebdomadaire','Les commerçants installent leurs étals sur la place.','Un rendez-vous régulier de votre ville.',NULL,'place',NULL,100,'weekly',6,9,240,'recurrent',30,16,30,NULL,false,false,false,NULL,NULL,0,true,5,100,0,NULL,0,0,1,0,0,0,false),
('street-works','local','Transport','Travaux de voirie','Des travaux rallongent certains trajets près de la gare. Les déplacements restent possibles.','Vos trajets peuvent être un peu plus longs.','Transport','gare',NULL,15,'none',NULL,7,600,'temporaire',60,16,30,NULL,false,false,false,NULL,NULL,0,false,0,100,0,NULL,0,0,0,0,0,0,true),
('culture-night','local','Ville','Soirée culturelle','Concerts et expositions animent le centre-ville.','Un événement ouvert à tous les habitants.','Culture','place','{culture}',20,'none',NULL,19,180,'temporaire',55,16,30,NULL,false,false,false,NULL,NULL,0,true,10,100,0,NULL,0,2,2,0,0,0,true),
('student-forum','local','Études','Forum étudiant','Associations et filières présentent leurs projets au campus.','Réservé aux personnes en formation.','Éducation','universite','{student}',20,'none',NULL,14,180,'temporaire',50,16,30,NULL,false,false,true,NULL,NULL,0,true,10,100,0,NULL,1,2,1,0,0,0,false),
('citizen-meeting','local','Citoyenneté','Réunion citoyenne','La mairie invite les habitants à échanger sur les projets du quartier.','Votre avis compte pour votre ville.','Vie locale','mairie','{citizen}',100,'monthly',15,18,120,'recurrent',60,16,30,NULL,false,false,false,NULL,NULL,0,true,10,100,0,NULL,0,1,0,3,0,0,true),
('political-debate','local','Politique','Débat public','Des organisations politiques fictives débattent des priorités locales.','Pour les membres d''un parti ou d''un mouvement.','Politique','mairie','{party,movement}',15,'none',NULL,19,120,'temporaire',55,16,30,NULL,false,false,false,'{party,movement}',NULL,0,true,10,100,0,NULL,0,1,0,0,2,1,false),
('local-promo','local','Économie','Promotions dans les commerces','Plusieurs commerces annoncent des remises temporaires.','Une animation économique locale.','Économie','commerce',NULL,15,'none',NULL,10,480,'temporaire',35,16,30,NULL,false,false,false,NULL,NULL,0,false,0,100,0,NULL,0,0,0,0,0,0,false),
('national-campaign','national','Actualités','Grande campagne nationale de solidarité','Les villes de CIVITAS lancent une campagne fictive de solidarité.','Un événement commun à toutes les villes.','Société',NULL,NULL,10,'none',NULL,8,1440,'temporaire',70,16,30,NULL,false,false,false,NULL,NULL,0,false,0,100,0,NULL,0,0,0,0,0,0,true),
('job-replacement','personal','Travail','Remplacement ponctuel','Votre employeur vous propose un remplacement rémunéré.','Proposé car vous avez un emploi.',NULL,'entreprise',NULL,35,'none',NULL,17,60,'instantane',50,18,30,NULL,true,false,false,NULL,NULL,0,true,15,100,40,NULL,0,0,0,0,0,0,false),
('job-opportunity','personal','Travail','Atelier de recrutement','Un employeur organise un atelier d''accueil pour les jeunes actifs.','Proposé car vous cherchez un emploi.',NULL,'entreprise',NULL,30,'none',NULL,16,60,'instantane',45,18,30,'{young_worker,early_career}',false,true,false,NULL,NULL,0,true,10,100,0,'Communication',1,0,0,0,0,0,false),
('study-workshop','personal','Études','Atelier de méthodologie','Votre campus propose un atelier pour progresser.','Proposé car vous êtes en formation.',NULL,'universite',NULL,35,'none',NULL,15,60,'instantane',45,16,30,NULL,false,false,true,NULL,NULL,0,true,10,70,0,'Méthode',1,0,0,0,0,0,false),
('association-invite','personal','Social','Invitation d''une association','Une association de votre ville vous invite à une rencontre.','Une occasion de rencontrer des habitants.',NULL,'cafe',NULL,30,'none',NULL,18,60,'instantane',40,16,30,NULL,false,false,false,NULL,NULL,0,true,10,100,0,NULL,0,3,2,0,0,0,false),
('admin-reminder','personal','Logement','Point sur vos démarches','Un conseiller vous rappelle de vérifier vos démarches en cours.','Un rappel pour vos démarches.',NULL,'administration',NULL,15,'none',NULL,11,60,'instantane',35,18,30,NULL,false,false,false,NULL,NULL,0,false,0,100,0,NULL,0,0,0,0,0,0,false);

-- 9. Fonctions internes (non exécutables par les joueurs)
CREATE FUNCTION public.world_event_roll(_seed text) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$ SELECT abs(hashtext(_seed)) % 100 $$;

CREATE FUNCTION public.world_event_eligible(_t public.world_event_templates, _c public.characters) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT _c.age BETWEEN _t.min_age AND _t.max_age
  AND (_t.paths IS NULL OR _c.path_id = ANY (_t.paths))
  AND (NOT _t.requires_job OR EXISTS (SELECT 1 FROM public.employments WHERE character_id = _c.id))
  AND (NOT _t.forbids_job OR NOT EXISTS (SELECT 1 FROM public.employments WHERE character_id = _c.id))
  AND (NOT _t.requires_student OR EXISTS (SELECT 1 FROM public.study_enrollments WHERE character_id = _c.id))
  AND (_t.requires_membership_kinds IS NULL OR EXISTS (SELECT 1 FROM public.memberships m JOIN public.organizations o ON o.id = m.organization_id
        WHERE m.character_id = _c.id AND m.status = 'active' AND o.kind = ANY (_t.requires_membership_kinds)))
  AND (_t.skill_name IS NULL OR COALESCE((_c.progression->>_t.skill_name)::integer, 0) >= _t.skill_min) $$;

CREATE FUNCTION public.world_event_notify(_cid uuid, _event uuid, _key text, _title text, _body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE day date := (public.game_now() AT TIME ZONE 'UTC')::date; cap integer; BEGIN
  SELECT max_notifications_per_day INTO cap FROM public.world_event_settings WHERE id = 1;
  IF (SELECT count(*) FROM public.world_event_effects WHERE character_id = _cid AND kind = 'notification' AND game_day = day) >= cap THEN RETURN; END IF;
  INSERT INTO public.world_event_effects (character_id, event_id, effect_key, kind, game_day, applied_at)
  VALUES (_cid, _event, 'notify:' || _key, 'notification', day, public.game_now()) ON CONFLICT DO NOTHING;
  IF FOUND THEN PERFORM public.economy_notify(_cid, 'wevent:' || _key, _title, _body); END IF;
END $$;

-- Génération contrôlée et déterministe sur l'horizon, une fois par ville et par jour
CREATE FUNCTION public.world_events_generate(_city text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE s public.world_event_settings; ci public.cities; t public.world_event_templates; d date; today date := (public.game_now() AT TIME ZONE 'UTC')::date;
  taken integer; lid uuid; oid uuid; st timestamptz; made integer := 0; BEGIN
  SELECT * INTO s FROM public.world_event_settings WHERE id = 1;
  IF NOT s.enabled THEN RETURN 0; END IF;
  SELECT * INTO ci FROM public.cities WHERE id = _city AND available; IF NOT FOUND THEN RETURN 0; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('world-events:' || _city));
  FOR d IN SELECT generate_series(today - s.horizon_days, today + s.horizon_days, interval '1 day')::date LOOP
    IF EXISTS (SELECT 1 FROM public.world_event_generation WHERE city_key = _city AND day = d) THEN CONTINUE; END IF;
    taken := 0;
    FOR t IN SELECT * FROM public.world_event_templates WHERE active AND scope = 'local' AND (cities IS NULL OR _city = ANY (cities))
             ORDER BY public.world_event_roll(id || ':' || _city || ':' || d || ':order') LOOP
      EXIT WHEN taken >= s.max_events_per_city_day;
      IF t.recurrence = 'weekly' AND extract(isodow FROM d) <> t.recurrence_day THEN CONTINUE; END IF;
      IF t.recurrence = 'monthly' AND extract(day FROM d) <> t.recurrence_day THEN CONTINUE; END IF;
      IF t.recurrence = 'none' AND public.world_event_roll(t.id || ':' || _city || ':' || d) >= t.probability THEN CONTINUE; END IF;
      SELECT id INTO lid FROM public.locations WHERE city_id = _city AND kind = t.location_kind AND accessible AND district_id IS NOT NULL
        ORDER BY public.world_event_roll(id::text || d) LIMIT 1;
      oid := NULL;
      IF t.organization_kinds IS NOT NULL THEN SELECT id INTO oid FROM public.organizations WHERE city_id = _city AND status = 'active' AND kind = ANY (t.organization_kinds) ORDER BY name LIMIT 1; END IF;
      st := (d::timestamp + make_interval(hours => t.start_hour)) AT TIME ZONE 'UTC';
      INSERT INTO public.events (title, description, city_id, starts_at, ends_at, scope, region, category, importance, status, location_id, organization_id,
        source_id, event_key, target_kind, template_id, game_category, interactive, reason, duration_kind)
      VALUES (t.title || ' — ' || ci.name, t.description, _city, st, st + make_interval(mins => t.duration_minutes), 'local', ci.region,
        COALESCE(t.news_category, t.category), t.importance, 'scheduled', lid, oid,
        CASE WHEN t.publish_news THEN CASE WHEN _city = 'lyon' THEN 'journal-lyon' WHEN _city = 'lille' THEN 'tribune-nord' ELSE 'civitas-matin' END END,
        'wev:' || t.id || ':' || _city || ':' || d, CASE WHEN t.interactive THEN 'participation' WHEN lid IS NOT NULL THEN 'location' ELSE 'city' END,
        t.id, t.category, t.interactive, t.reason, t.duration_kind)
      ON CONFLICT (event_key) DO NOTHING;
      taken := taken + 1; made := made + 1;
    END LOOP;
    INSERT INTO public.world_event_generation (city_key, day) VALUES (_city, d) ON CONFLICT DO NOTHING;
  END LOOP;
  -- Événements nationaux : une fois par jour pour toutes les villes
  PERFORM pg_advisory_xact_lock(hashtext('world-events:national'));
  FOR d IN SELECT generate_series(today - s.horizon_days, today + s.horizon_days, interval '1 day')::date LOOP
    IF EXISTS (SELECT 1 FROM public.world_event_generation WHERE city_key = '*' AND day = d) THEN CONTINUE; END IF;
    FOR t IN SELECT * FROM public.world_event_templates WHERE active AND scope = 'national' LOOP
      IF public.world_event_roll(t.id || ':national:' || d) >= t.probability THEN CONTINUE; END IF;
      st := (d::timestamp + make_interval(hours => t.start_hour)) AT TIME ZONE 'UTC';
      INSERT INTO public.events (title, description, starts_at, ends_at, scope, category, importance, status, source_id, event_key, target_kind,
        template_id, game_category, interactive, reason, duration_kind)
      VALUES (t.title, t.description, st, st + make_interval(mins => t.duration_minutes), 'national', COALESCE(t.news_category, t.category), t.importance,
        'scheduled', CASE WHEN t.publish_news THEN 'france-direct' END, 'wev:' || t.id || ':national:' || d, 'general', t.id, t.category, false, t.reason, t.duration_kind)
      ON CONFLICT (event_key) DO NOTHING;
      made := made + 1;
    END LOOP;
    INSERT INTO public.world_event_generation (city_key, day) VALUES ('*', d) ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN made;
END $$;

-- Événement personnel du jour (au plus max_personal_per_day, compatible avec le profil réel)
CREATE FUNCTION public.world_events_personal(_cid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE s public.world_event_settings; c public.characters; pos public.character_positions; t public.world_event_templates; lid uuid; eid uuid;
  now_t timestamptz := public.game_now(); day date := (public.game_now() AT TIME ZONE 'UTC')::date; st timestamptz; BEGIN
  SELECT * INTO s FROM public.world_event_settings WHERE id = 1;
  IF NOT s.enabled OR s.max_personal_per_day < 1 THEN RETURN; END IF;
  SELECT * INTO c FROM public.characters WHERE id = _cid; SELECT * INTO pos FROM public.character_positions WHERE character_id = _cid;
  IF (SELECT count(*) FROM public.events WHERE character_id = _cid AND (starts_at AT TIME ZONE 'UTC')::date = day) >= s.max_personal_per_day THEN RETURN; END IF;
  FOR t IN SELECT * FROM public.world_event_templates WHERE active AND scope = 'personal'
           ORDER BY public.world_event_roll(id || ':' || _cid || ':' || day || ':order') LOOP
    IF NOT public.world_event_eligible(t, c) THEN CONTINUE; END IF;
    IF public.world_event_roll(t.id || ':' || _cid || ':' || day) >= t.probability THEN CONTINUE; END IF;
    st := GREATEST((day::timestamp + make_interval(hours => t.start_hour)) AT TIME ZONE 'UTC', date_trunc('hour', now_t) + interval '2 hours');
    IF (st AT TIME ZONE 'UTC')::date <> day THEN CONTINUE; END IF;
    SELECT id INTO lid FROM public.locations WHERE city_id = pos.city_id AND kind = t.location_kind AND accessible AND district_id IS NOT NULL ORDER BY name LIMIT 1;
    IF t.requires_job THEN SELECT j.location_id INTO lid FROM public.jobs j JOIN public.employments e ON e.job_id = j.id WHERE e.character_id = _cid; END IF;
    IF t.requires_student THEN SELECT location_id INTO lid FROM public.study_enrollments WHERE character_id = _cid; END IF;
    INSERT INTO public.events (title, description, city_id, starts_at, ends_at, scope, category, importance, status, location_id, event_key, target_kind,
      template_id, character_id, game_category, interactive, reason, duration_kind)
    VALUES (t.title, t.description, pos.city_id, st, st + make_interval(mins => t.duration_minutes), 'local', t.category, t.importance, 'scheduled', lid,
      'wevp:' || _cid || ':' || day, 'participation', t.id, _cid, t.category, t.interactive, t.reason, t.duration_kind)
    ON CONFLICT (event_key) DO NOTHING RETURNING id INTO eid;
    IF eid IS NOT NULL THEN PERFORM public.world_event_notify(_cid, eid, 'personal:' || eid, 'Un événement vous concerne', t.title); END IF;
    RETURN;
  END LOOP;
END $$;

-- Application d'un effet, une seule fois
CREATE FUNCTION public.world_event_effect(_cid uuid, _event uuid, _kind text, _amount integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN false; END IF;
  INSERT INTO public.world_event_effects (character_id, event_id, effect_key, kind, amount, game_day, applied_at)
  VALUES (_cid, _event, _kind || ':' || _event, _kind, _amount, (public.game_now() AT TIME ZONE 'UTC')::date, public.game_now()) ON CONFLICT DO NOTHING;
  RETURN FOUND;
END $$;

-- Règlement : présence / absence, résultat figé, récompenses uniques
CREATE FUNCTION public.world_events_settle(_cid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE p public.world_event_participations; e public.events; t public.world_event_templates; a public.activities; c public.characters;
  s public.world_event_settings; lvl integer; ok boolean; n public.social_npcs; now_t timestamptz := public.game_now(); BEGIN
  SELECT * INTO s FROM public.world_event_settings WHERE id = 1;
  FOR p IN SELECT * FROM public.world_event_participations WHERE character_id = _cid AND status = 'inscrit' ORDER BY created_at FOR UPDATE LOOP
    SELECT * INTO a FROM public.activities WHERE id = p.activity_id;
    IF a.status IN ('planned','running') AND a.end_time > now_t THEN CONTINUE; END IF;
    SELECT * INTO e FROM public.events WHERE id = p.event_id; SELECT * INTO t FROM public.world_event_templates WHERE id = e.template_id;
    IF a.status IS DISTINCT FROM 'completed' THEN
      UPDATE public.world_event_participations SET status = 'absent', settled_at = now_t, outcome = jsonb_build_object('result','absent') WHERE id = p.id;
      CONTINUE;
    END IF;
    SELECT * INTO c FROM public.characters WHERE id = _cid;
    lvl := CASE WHEN t.reward_skill IS NULL THEN 0 ELSE COALESCE((c.progression->>t.reward_skill)::integer, 0) END;
    ok := p.roll < LEAST(100, t.success_rate + lvl * t.success_skill_bonus);
    UPDATE public.world_event_participations SET status = CASE WHEN ok THEN 'reussi' ELSE 'echoue' END, settled_at = now_t,
      outcome = jsonb_build_object('result', CASE WHEN ok THEN 'reussi' ELSE 'echoue' END, 'roll', p.roll, 'threshold', LEAST(100, t.success_rate + lvl * t.success_skill_bonus))
      WHERE id = p.id;
    IF ok THEN
      IF public.world_event_effect(_cid, e.id, 'argent', LEAST(t.reward_money, s.max_reward_money)) THEN
        PERFORM public.economy_cash(_cid, 'wevent:' || e.id, LEAST(t.reward_money, s.max_reward_money), 'Événement — ' || e.title, 'evenement'); END IF;
      IF t.reward_skill IS NOT NULL AND public.world_event_effect(_cid, e.id, 'competence', t.reward_skill_amount) THEN
        UPDATE public.characters SET progression = jsonb_set(COALESCE(progression, '{}'::jsonb), ARRAY[t.reward_skill],
          to_jsonb(COALESCE((progression->>t.reward_skill)::integer, 0) + t.reward_skill_amount)), updated_at = now() WHERE id = _cid; END IF;
      IF public.world_event_effect(_cid, e.id, 'reputation', t.reward_reputation) THEN
        INSERT INTO public.social_stats (character_id, reputation, influence) VALUES (_cid, t.reward_reputation, 0)
        ON CONFLICT (character_id) DO UPDATE SET reputation = public.social_stats.reputation + EXCLUDED.reputation; END IF;
      IF public.world_event_effect(_cid, e.id, 'civique', t.reward_civic) THEN
        PERFORM public.award_civic(_cid, 'wevent:' || e.id, 'evenement', t.reward_civic); END IF;
      IF public.world_event_effect(_cid, e.id, 'politique', t.reward_political_reputation + t.reward_political_influence) THEN
        PERFORM public.award_political(_cid, 'wevent:' || e.id, 'evenement', t.reward_political_reputation, t.reward_political_influence, 0, 0, e.title); END IF;
      IF e.organization_id IS NOT NULL AND public.world_event_effect(_cid, e.id, 'relation', t.reward_relation) THEN
        FOR n IN SELECT * FROM public.social_npcs WHERE organization_id = e.organization_id ORDER BY first_name LIMIT 1 LOOP
          INSERT INTO public.social_relations (character_id, npc_id, score, met_at, last_interaction) VALUES (_cid, n.id, LEAST(100, t.reward_relation), now_t, now_t)
          ON CONFLICT (character_id, npc_id) DO UPDATE SET score = LEAST(100, public.social_relations.score + t.reward_relation), last_interaction = now_t;
        END LOOP; END IF;
    END IF;
    PERFORM public.world_event_notify(_cid, e.id, 'result:' || e.id, 'Événement terminé',
      e.title || CASE WHEN ok THEN ' : participation réussie.' ELSE ' : résultat insuffisant cette fois.' END);
  END LOOP;
  -- Rappel la veille pour les événements où le joueur est inscrit
  FOR e IN SELECT ev.* FROM public.events ev JOIN public.world_event_participations wp ON wp.event_id = ev.id
           WHERE wp.character_id = _cid AND wp.status = 'inscrit' AND ev.starts_at > now_t AND ev.starts_at <= now_t + interval '24 hours' LOOP
    PERFORM public.world_event_notify(_cid, e.id, 'remind:' || e.id, 'Un événement commence bientôt', e.title);
  END LOOP;
END $$;

-- 10. Fonctions appelées par le joueur
CREATE FUNCTION public.world_events_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE cid uuid; c public.characters; pos public.character_positions; s public.world_event_settings; now_t timestamptz; r jsonb; BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO pos FROM public.character_positions WHERE character_id = cid;
  SELECT * INTO s FROM public.world_event_settings WHERE id = 1; now_t := public.game_now();
  PERFORM public.world_events_generate(pos.city_id);
  PERFORM public.world_events_personal(cid);
  PERFORM public.world_events_settle(cid);
  SELECT jsonb_build_object('now', now_t, 'enabled', s.enabled, 'city_id', pos.city_id, 'events', COALESCE(jsonb_agg(x ORDER BY x->>'starts_at'), '[]'::jsonb)) INTO r FROM (
    SELECT jsonb_build_object('id', e.id, 'title', e.title, 'description', e.description, 'category', COALESCE(e.game_category, 'Actualités'),
      'press_category', e.category, 'city_id', e.city_id, 'scope', e.scope, 'location_id', e.location_id, 'location_name', l.name, 'district_id', l.district_id,
      'starts_at', e.starts_at, 'ends_at', e.ends_at, 'importance', e.importance, 'interactive', e.interactive, 'personal', e.character_id IS NOT NULL,
      'reason', e.reason, 'duration_kind', e.duration_kind, 'news_id', nw.id,
      'phase', CASE WHEN e.starts_at > now_t THEN 'a_venir' WHEN e.ends_at IS NOT NULL AND e.ends_at <= now_t THEN 'termine' ELSE 'en_cours' END,
      'participation', (SELECT jsonb_build_object('choice', p.choice, 'status', p.status, 'outcome', p.outcome, 'activity_id', p.activity_id)
                        FROM public.world_event_participations p WHERE p.event_id = e.id AND p.character_id = cid),
      'conflict', (SELECT a.title FROM public.activities a WHERE a.character_id = cid AND a.status IN ('planned','running') AND e.interactive
                   AND a.source_key IS DISTINCT FROM 'wevent:' || e.id AND a.start_time < e.starts_at + interval '60 minutes' AND a.end_time > e.starts_at LIMIT 1),
      'reward', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('money', LEAST(t.reward_money, s.max_reward_money), 'skill', t.reward_skill,
        'skill_amount', t.reward_skill_amount, 'relation', t.reward_relation, 'reputation', t.reward_reputation, 'civic', t.reward_civic,
        'political', t.reward_political_reputation + t.reward_political_influence, 'energy', t.energy_cost, 'success_rate', t.success_rate) END,
      'eligible', t.id IS NULL OR public.world_event_eligible(t, c)) AS x
    FROM public.events e
    LEFT JOIN public.locations l ON l.id = e.location_id
    LEFT JOIN public.world_event_templates t ON t.id = e.template_id
    LEFT JOIN public.news nw ON nw.event_id = e.id
    WHERE (e.character_id = cid OR (e.character_id IS NULL AND (e.city_id = pos.city_id OR e.scope <> 'local')))
      AND e.status <> 'cancelled'
      AND (e.template_id IS NOT NULL OR (e.status = 'published' AND e.starts_at <= now_t))
      AND e.starts_at BETWEEN now_t - make_interval(days => s.horizon_days) AND now_t + make_interval(days => s.horizon_days)
  ) q;
  RETURN r;
END $$;

CREATE FUNCTION public.world_event_action(_event_id uuid, _choice text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE cid uuid; c public.characters; pos public.character_positions; e public.events; t public.world_event_templates; now_t timestamptz;
  pid uuid; aid uuid; clash text; BEGIN
  IF _choice NOT IN ('participer','ignorer') THEN RAISE EXCEPTION 'Choix inconnu'; END IF;
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO pos FROM public.character_positions WHERE character_id = cid; now_t := public.game_now();
  SELECT * INTO e FROM public.events WHERE id = _event_id AND template_id IS NOT NULL AND status <> 'cancelled';
  IF NOT FOUND OR (e.character_id IS NOT NULL AND e.character_id <> cid) OR (e.character_id IS NULL AND e.scope = 'local' AND e.city_id IS DISTINCT FROM pos.city_id) THEN
    RAISE EXCEPTION 'Événement introuvable'; END IF;
  IF EXISTS (SELECT 1 FROM public.world_event_participations WHERE event_id = e.id AND character_id = cid) THEN RAISE EXCEPTION 'Choix déjà enregistré pour cet événement'; END IF;
  IF (e.ends_at IS NOT NULL AND e.ends_at <= now_t) OR now_t > e.starts_at + interval '30 minutes' THEN RAISE EXCEPTION 'Cet événement est terminé'; END IF;
  SELECT * INTO t FROM public.world_event_templates WHERE id = e.template_id;
  IF _choice = 'ignorer' THEN
    INSERT INTO public.world_event_participations (event_id, character_id, choice, status, created_at, settled_at)
    VALUES (e.id, cid, 'ignorer', 'ignore', now_t, now_t) ON CONFLICT DO NOTHING RETURNING id INTO pid;
    IF pid IS NULL THEN RAISE EXCEPTION 'Choix déjà enregistré pour cet événement'; END IF;
    RETURN jsonb_build_object('status', 'ignore');
  END IF;
  IF NOT e.interactive THEN RAISE EXCEPTION 'Aucune participation possible pour cet événement'; END IF;
  IF NOT public.world_event_eligible(t, c) THEN RAISE EXCEPTION 'Cet événement ne correspond pas à votre situation'; END IF;
  IF e.location_id IS NULL THEN RAISE EXCEPTION 'Lieu indisponible'; END IF;
  SELECT title INTO clash FROM public.activities WHERE character_id = cid AND status IN ('planned','running')
    AND start_time < GREATEST(e.starts_at, now_t) + interval '60 minutes' AND end_time > GREATEST(e.starts_at, now_t) LIMIT 1;
  IF clash IS NOT NULL THEN RAISE EXCEPTION 'Conflit avec votre agenda : %', clash; END IF;
  INSERT INTO public.world_event_participations (event_id, character_id, choice, status, roll, created_at)
  VALUES (e.id, cid, 'participer', 'inscrit', public.world_event_roll(e.id::text || ':' || cid::text), now_t) ON CONFLICT DO NOTHING RETURNING id INTO pid;
  IF pid IS NULL THEN RAISE EXCEPTION 'Choix déjà enregistré pour cet événement'; END IF;
  INSERT INTO public.activities (character_id, type, title, start_time, end_time, location_id, energy_cost, energy_gain, money_cost, reward, progression_gain, status, source_key)
  VALUES (cid, 'world_event', e.title, GREATEST(e.starts_at, now_t), GREATEST(e.starts_at, now_t) + interval '60 minutes', e.location_id, t.energy_cost, 0, 0, 0, 0, 'planned', 'wevent:' || e.id)
  RETURNING id INTO aid;
  UPDATE public.world_event_participations SET activity_id = aid WHERE id = pid;
  PERFORM public.world_event_notify(cid, e.id, 'registered:' || e.id, 'Participation enregistrée', e.title || ' a été ajouté à votre agenda.');
  RETURN jsonb_build_object('status', 'inscrit', 'activity_id', aid);
END $$;

-- 11. Droits : seules les deux fonctions joueur sont exécutables
REVOKE ALL ON FUNCTION public.world_event_roll(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.world_event_eligible(public.world_event_templates, public.characters) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.world_event_notify(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.world_events_generate(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.world_events_personal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.world_event_effect(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.world_events_settle(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.world_events_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.world_event_action(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.world_events_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.world_event_action(uuid, text) TO authenticated;
