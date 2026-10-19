-- CIVITAS – GRANDE EXTENSION, PRIORITÉ 3 / VAGUE A : ÉVOLUTION PROFESSIONNELLE + ENTRETIENS D'EMBAUCHE
-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0075_career_interviews.sql
-- Entretien : CV (calculé) → candidature → 3 questions → décision immédiate → embauche.
--   Score fixe côté serveur : réponses (36) + compétence du poste (20) + expérience (20) + études (15) + situation (9).
--   Réussite = embauche ; si le joueur avait déjà un emploi, c'est un changement d'entreprise.
-- Promotions : niveaux 2 à 4 après la première promotion existante (inchangée). Augmentation via salary_bonus.
-- Licenciement : seulement si aucune vacation travaillée pendant 14 jours de jeu. Une seule fois par emploi.
-- Chômage : après un licenciement uniquement, 57 % du salaire, versé par semaine, 26 semaines maximum,
--   via economy_cash (clé unique, jamais de doublon), s'arrête à la reprise d'un emploi.
-- Données existantes touchées : employments / characters.situation / job_applications / career_history,
--   uniquement lors d'une embauche, d'une promotion ou d'un licenciement du joueur concerné.
BEGIN;

CREATE TABLE public.career_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  pass_score integer NOT NULL DEFAULT 50,
  interviews_per_day integer NOT NULL DEFAULT 3,
  max_level integer NOT NULL DEFAULT 4,
  layoff_days integer NOT NULL DEFAULT 14,
  unemployment_rate numeric NOT NULL DEFAULT 0.57,
  unemployment_weeks integer NOT NULL DEFAULT 26
);
INSERT INTO public.career_settings (id) VALUES (1);

CREATE TABLE public.interview_questions (
  id text PRIMARY KEY,
  question text NOT NULL,
  answers text[] NOT NULL CHECK (array_length(answers, 1) = 3),
  qualities integer[] NOT NULL CHECK (array_length(qualities, 1) = 3)
);
INSERT INTO public.interview_questions VALUES
('motivation','Pourquoi voulez-vous ce poste ?',ARRAY['Je connais votre activité et je veux y progresser.','Il faut bien travailler.','J''ai vu de la lumière.'],ARRAY[2,1,0]),
('defaut','Quel est votre principal défaut ?',ARRAY['Je n''en ai aucun.','Je suis parfois trop direct, j''apprends à nuancer.','Je suis souvent en retard.'],ARRAY[0,2,1]),
('conflit','Un collègue n''est pas d''accord avec vous. Que faites-vous ?',ARRAY['J''attends que ça passe.','J''écoute ses arguments et on cherche une solution.','J''en parle directement au chef.'],ARRAY[1,2,0]),
('pression','Comment gérez-vous une journée chargée ?',ARRAY['Je fais une liste des priorités.','Je fais au mieux.','Je stresse beaucoup.'],ARRAY[2,1,0]),
('avenir','Où vous voyez-vous dans 5 ans ?',ARRAY['Aucune idée.','À votre place !','Avec plus de responsabilités, ici si possible.'],ARRAY[0,1,2]),
('erreur','Parlez d''une erreur que vous avez faite.',ARRAY['Je ne fais pas d''erreurs.','J''ai raté une échéance ; depuis, je m''organise mieux.','C''était la faute de quelqu''un d''autre.'],ARRAY[0,2,0]),
('equipe','Préférez-vous travailler seul ou en équipe ?',ARRAY['Les deux, selon la tâche.','Seul, c''est plus simple.','En équipe, pour ne pas tout faire.'],ARRAY[2,1,0]),
('salaire','Quelles sont vos attentes de salaire ?',ARRAY['Le plus possible.','Le salaire affiché me convient, à revoir selon mes résultats.','Je ne sais pas.'],ARRAY[0,2,1]);

CREATE TABLE public.job_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  question_ids text[] NOT NULL,
  answers integer[],
  score integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert','réussi','échoué')),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE INDEX job_interviews_char ON public.job_interviews (character_id, created_at DESC);
CREATE UNIQUE INDEX job_interviews_one_open ON public.job_interviews (character_id) WHERE status = 'ouvert';

CREATE TABLE public.career_ledger (
  character_id uuid NOT NULL REFERENCES public.characters(id),
  key text NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, key)
);

GRANT SELECT ON public.career_settings, public.interview_questions TO authenticated;
GRANT SELECT ON public.job_interviews, public.career_ledger TO authenticated;
GRANT ALL ON public.career_settings, public.interview_questions, public.job_interviews, public.career_ledger TO service_role;
ALTER TABLE public.career_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lecture réglages carrière" ON public.career_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "lecture questions" ON public.interview_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "mes entretiens" ON public.job_interviews FOR SELECT TO authenticated
  USING (character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));
CREATE POLICY "mon registre carrière" ON public.career_ledger FOR SELECT TO authenticated
  USING (character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));

-- Profil chiffré servant au score (hors réponses)
CREATE FUNCTION public.career_profile_score(_cid uuid, _job uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.characters; j public.jobs; lvl integer; sk integer; ex integer; st integer; si integer; prog integer; trainings integer;
BEGIN
  SELECT * INTO c FROM public.characters WHERE id = _cid;
  SELECT * INTO j FROM public.jobs WHERE id = _job;
  lvl := COALESCE((c.progression->>NULLIF(j.required_skill,''))::integer, 0);
  sk := CASE WHEN j.skill_min = 0 THEN 15 ELSE LEAST(20, (20 * lvl) / j.skill_min) END;
  ex := LEAST(20, 4 * (SELECT count(*) FROM public.career_history WHERE character_id = _cid AND kind IN ('départ','licenciement','promotion','embauche','changement'))
              + COALESCE((SELECT progress / 25 FROM public.employments WHERE character_id = _cid), 0));
  prog := COALESCE((SELECT progress FROM public.study_enrollments WHERE character_id = _cid), 0);
  trainings := (SELECT count(*) FROM public.career_history WHERE character_id = _cid AND kind = 'formation');
  st := LEAST(15, CASE WHEN prog >= 100 THEN 12 WHEN prog > 0 THEN 6 ELSE 0 END + 3 * trainings);
  si := CASE WHEN EXISTS (SELECT 1 FROM public.employments WHERE character_id = _cid) THEN 4 ELSE 9 END;
  RETURN jsonb_build_object('competence', sk, 'experience', ex, 'etudes', st, 'situation', si, 'total', sk + ex + st + si);
END $$;

CREATE FUNCTION public.career_job_eligible(_c public.characters, _j public.jobs) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _j.id IS NULL OR _j.city_id IS DISTINCT FROM _c.city_id OR _j.location_id IS NULL THEN 'Offre inaccessible'
    WHEN _c.path_id NOT IN ('young_worker','early_career') AND COALESCE(_c.progression->>'career_active','false') <> 'true' THEN 'Réservé aux parcours professionnels'
    WHEN _c.age < _j.min_age THEN 'Âge minimum non atteint'
    WHEN _j.economy_skill IS NOT NULL AND COALESCE((_c.progression->>_j.economy_skill)::integer, 0) < _j.economy_level THEN 'Formation requise : ' || _j.economy_skill || ' niveau ' || _j.economy_level
    WHEN EXISTS (SELECT 1 FROM public.employments WHERE character_id = _c.id AND job_id = _j.id) THEN 'C''est déjà votre emploi'
    ELSE NULL END
$$;

-- Règlement à la lecture : licenciement pour absence prolongée, allocations chômage hebdomadaires
CREATE FUNCTION public.settle_career(_cid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.career_settings; emp public.employments; j public.jobs; t timestamptz := public.game_now();
  lay public.career_ledger; w integer; amount integer; wk_start timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cid AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT * INTO s FROM public.career_settings WHERE id = 1;
  SELECT * INTO emp FROM public.employments WHERE character_id = _cid FOR UPDATE;
  IF FOUND AND emp.started_at < t - s.layoff_days * interval '1 day'
     AND NOT EXISTS (SELECT 1 FROM public.activities WHERE character_id = _cid AND type = 'work' AND status IN ('running','completed')
                     AND end_time > t - s.layoff_days * interval '1 day')
     AND NOT EXISTS (SELECT 1 FROM public.activities WHERE character_id = _cid AND type = 'work' AND status = 'running') THEN
    SELECT * INTO j FROM public.jobs WHERE id = emp.job_id;
    INSERT INTO public.career_ledger (character_id, key, kind, payload)
    VALUES (_cid, 'licenciement:' || emp.job_id || ':' || emp.started_at, 'licenciement',
            jsonb_build_object('job', j.title, 'salary', j.salary + emp.salary_bonus, 'at', t))
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      INSERT INTO public.career_history (character_id, kind, label) VALUES (_cid, 'licenciement', j.title);
      UPDATE public.activities SET status = 'cancelled' WHERE character_id = _cid AND type = 'work' AND status = 'planned';
      DELETE FROM public.employments WHERE character_id = _cid;
      UPDATE public.characters SET situation = 'En recherche d’emploi' WHERE id = _cid;
      PERFORM public.economy_notify(_cid, 'career:licenciement:' || emp.job_id || ':' || emp.started_at, 'Licenciement',
        'Sans vacation depuis ' || s.layoff_days || ' jours, vous avez été licencié de « ' || j.title || ' ». Vous touchez l''allocation chômage.');
    END IF;
  END IF;

  -- Chômage : dernier licenciement, tant que sans emploi
  SELECT * INTO lay FROM public.career_ledger WHERE character_id = _cid AND kind = 'licenciement' ORDER BY created_at DESC LIMIT 1;
  IF FOUND AND NOT EXISTS (SELECT 1 FROM public.employments WHERE character_id = _cid) THEN
    amount := floor((lay.payload->>'salary')::integer * s.unemployment_rate / 4.33)::integer;
    FOR w IN 1..s.unemployment_weeks LOOP
      wk_start := lay.created_at + w * interval '7 days';
      EXIT WHEN wk_start > t;
      IF amount > 0 AND NOT EXISTS (SELECT 1 FROM public.career_history WHERE character_id = _cid AND kind IN ('embauche','changement') AND occurred_at > lay.created_at AND occurred_at < wk_start) THEN
        INSERT INTO public.career_ledger (character_id, key, kind, payload)
        VALUES (_cid, 'chomage:' || lay.key || ':' || w, 'chomage', jsonb_build_object('week', w, 'amount', amount))
        ON CONFLICT DO NOTHING;
        IF FOUND THEN
          PERFORM public.economy_cash(_cid, 'career:chomage:' || lay.key || ':' || w, amount, 'Allocation chômage — semaine ' || w, 'aide');
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;

CREATE FUNCTION public.career_action(_command text, _input jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; j public.jobs; s public.career_settings; iv public.job_interviews; t timestamptz := public.game_now();
  err text; qids text[]; ans integer[]; pts integer := 0; i integer; q public.interview_questions; prof jsonb; total integer;
  emp public.employments; old public.jobs; need_prog integer; need_skill integer; skill text; eco public.economy_settings; newlvl integer;
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  PERFORM public.settle_career(cid);
  SELECT * INTO s FROM public.career_settings WHERE id = 1;

  IF _command = 'interview_start' THEN
    SELECT * INTO j FROM public.jobs WHERE id = (_input->>'job_id')::uuid;
    err := public.career_job_eligible(c, j); IF err IS NOT NULL THEN RAISE EXCEPTION '%', err; END IF;
    IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND status = 'running') THEN RAISE EXCEPTION 'Terminez votre activité'; END IF;
    IF (SELECT count(*) FROM public.job_interviews WHERE character_id = cid AND created_at > t - interval '1 day') >= s.interviews_per_day THEN
      RAISE EXCEPTION 'Maximum % entretiens par jour', s.interviews_per_day; END IF;
    IF EXISTS (SELECT 1 FROM public.job_interviews WHERE character_id = cid AND job_id = j.id AND created_at > t - interval '1 day') THEN
      RAISE EXCEPTION 'Un seul entretien par jour pour cette offre'; END IF;
    UPDATE public.job_interviews SET status = 'échoué', score = 0, details = '{"abandon":true}' WHERE character_id = cid AND status = 'ouvert';
    SELECT array_agg(id ORDER BY md5(id || cid::text || j.id::text || (t AT TIME ZONE 'UTC')::date::text)) INTO qids FROM public.interview_questions;
    INSERT INTO public.job_interviews (character_id, job_id, question_ids) VALUES (cid, j.id, qids[1:3]) RETURNING * INTO iv;
    RETURN jsonb_build_object('interview_id', iv.id);

  ELSIF _command = 'interview_answer' THEN
    SELECT * INTO iv FROM public.job_interviews WHERE id = (_input->>'interview_id')::uuid AND character_id = cid AND status = 'ouvert' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Entretien introuvable ou terminé'; END IF;
    IF jsonb_typeof(_input->'answers') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Répondez aux 3 questions'; END IF;
    SELECT array_agg(x::integer) INTO ans FROM jsonb_array_elements_text(_input->'answers') x;
    IF array_length(ans, 1) IS DISTINCT FROM 3 THEN RAISE EXCEPTION 'Répondez aux 3 questions'; END IF;
    FOR i IN 1..3 LOOP
      IF ans[i] NOT BETWEEN 0 AND 2 THEN RAISE EXCEPTION 'Réponse invalide'; END IF;
      SELECT * INTO q FROM public.interview_questions WHERE id = iv.question_ids[i];
      pts := pts + q.qualities[ans[i] + 1];
    END LOOP;
    SELECT * INTO j FROM public.jobs WHERE id = iv.job_id;
    err := public.career_job_eligible(c, j);
    prof := public.career_profile_score(cid, j.id) || jsonb_build_object('reponses', pts * 6);
    total := (prof->>'total')::integer + pts * 6;
    IF err IS NOT NULL OR total < s.pass_score THEN
      UPDATE public.job_interviews SET answers = ans, score = total, details = prof || jsonb_build_object('motif', COALESCE(err, 'Score insuffisant')), status = 'échoué' WHERE id = iv.id;
      RETURN jsonb_build_object('status', 'échoué', 'score', total, 'details', prof, 'motif', COALESCE(err, 'Score insuffisant'));
    END IF;
    IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND type = 'work' AND status = 'running') THEN RAISE EXCEPTION 'Terminez votre vacation'; END IF;
    SELECT * INTO emp FROM public.employments WHERE character_id = cid FOR UPDATE;
    IF FOUND THEN
      SELECT * INTO old FROM public.jobs WHERE id = emp.job_id;
      INSERT INTO public.career_history (character_id, kind, label) VALUES (cid, 'départ', old.title);
      UPDATE public.activities SET status = 'cancelled' WHERE character_id = cid AND type = 'work' AND status = 'planned';
      DELETE FROM public.employments WHERE character_id = cid;
    END IF;
    INSERT INTO public.job_applications (character_id, job_id, applied_at, response_at, status) VALUES (cid, j.id, t, t, 'accepted');
    INSERT INTO public.employments (character_id, job_id, started_at) VALUES (cid, j.id, t);
    INSERT INTO public.career_history (character_id, kind, label) VALUES (cid, CASE WHEN old.id IS NULL THEN 'embauche' ELSE 'changement' END, j.title);
    UPDATE public.characters SET situation = j.title WHERE id = cid;
    UPDATE public.job_interviews SET answers = ans, score = total, details = prof, status = 'réussi' WHERE id = iv.id;
    RETURN jsonb_build_object('status', 'réussi', 'score', total, 'details', prof, 'changement', old.id IS NOT NULL);

  ELSIF _command = 'promote' THEN
    SELECT * INTO emp FROM public.employments WHERE character_id = cid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Aucun emploi'; END IF;
    IF emp.promotion_level < 1 THEN RAISE EXCEPTION 'Obtenez d''abord votre première promotion (page Patrimoine)'; END IF;
    IF emp.promotion_level >= s.max_level THEN RAISE EXCEPTION 'Niveau maximum atteint'; END IF;
    SELECT * INTO eco FROM public.economy_settings WHERE id = 1;
    newlvl := emp.promotion_level + 1;
    need_prog := eco.promotion_progress * newlvl; need_skill := eco.promotion_level + emp.promotion_level; skill := eco.promotion_skill;
    IF emp.progress < need_prog OR COALESCE((c.progression->>skill)::integer, 0) < need_skill THEN
      RAISE EXCEPTION 'Promotion : % points d''expérience et % niveau % requis', need_prog, skill, need_skill; END IF;
    SELECT * INTO j FROM public.jobs WHERE id = emp.job_id;
    UPDATE public.employments SET promotion_level = newlvl, salary_bonus = eco.promotion_raise * newlvl WHERE character_id = cid;
    UPDATE public.activities SET reward = (j.salary + eco.promotion_raise * newlvl) / (SELECT paid_shifts_month FROM public.life_settings WHERE id = 1)
      WHERE character_id = cid AND type = 'work' AND status = 'planned';
    INSERT INTO public.career_history (character_id, kind, label) VALUES (cid, 'promotion', j.title || ' — niveau ' || newlvl);
    RETURN jsonb_build_object('level', newlvl, 'salary', j.salary + eco.promotion_raise * newlvl);
  END IF;
  RAISE EXCEPTION 'Action inconnue';
END $$;

CREATE FUNCTION public.career_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; emp public.employments; j public.jobs; s public.career_settings; eco public.economy_settings;
  iv public.job_interviews; housing integer; lay public.career_ledger;
BEGIN
  cid := public.prepare_daily_life();
  PERFORM public.settle_career(cid);
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.career_settings WHERE id = 1;
  SELECT * INTO eco FROM public.economy_settings WHERE id = 1;
  SELECT * INTO emp FROM public.employments WHERE character_id = cid;
  IF FOUND THEN SELECT * INTO j FROM public.jobs WHERE id = emp.job_id; END IF;
  SELECT * INTO iv FROM public.job_interviews WHERE character_id = cid AND status = 'ouvert';
  SELECT COALESCE(ht.daily_cost * 30, 0) INTO housing FROM public.character_housing h JOIN public.housing_types ht ON ht.id = h.type_id WHERE h.character_id = cid;
  SELECT * INTO lay FROM public.career_ledger WHERE character_id = cid AND kind = 'licenciement' ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'eligible_path', c.path_id IN ('young_worker','early_career') OR COALESCE(c.progression->>'career_active','false') = 'true',
    'job', CASE WHEN emp.character_id IS NULL THEN NULL ELSE jsonb_build_object(
      'title', j.title, 'salary', j.salary + emp.salary_bonus, 'base', j.salary, 'level', emp.promotion_level, 'progress', emp.progress,
      'started_at', emp.started_at, 'max_level', s.max_level,
      'next', CASE WHEN emp.promotion_level >= s.max_level THEN NULL ELSE jsonb_build_object(
        'progress', eco.promotion_progress * (emp.promotion_level + 1), 'skill', eco.promotion_skill,
        'skill_level', eco.promotion_level + GREATEST(emp.promotion_level, 0), 'current_skill', COALESCE((c.progression->>eco.promotion_skill)::integer, 0),
        'raise', eco.promotion_raise, 'first', emp.promotion_level = 0) END,
      'last_shift', (SELECT max(end_time) FROM public.activities WHERE character_id = cid AND type = 'work' AND status = 'completed'),
      'layoff_days', s.layoff_days) END,
    'unemployment', CASE WHEN emp.character_id IS NULL AND lay.key IS NOT NULL THEN jsonb_build_object(
      'since', lay.created_at, 'previous', lay.payload->>'job',
      'weekly', floor((lay.payload->>'salary')::integer * s.unemployment_rate / 4.33)::integer,
      'paid_weeks', (SELECT count(*) FROM public.career_ledger WHERE character_id = cid AND kind = 'chomage' AND key LIKE 'chomage:' || lay.key || ':%'),
      'max_weeks', s.unemployment_weeks) END,
    'housing_monthly', COALESCE(housing, 0),
    'offers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'title', o.title, 'salary', o.salary, 'description', o.description,
        'skill', NULLIF(o.required_skill, ''), 'skill_min', o.skill_min, 'blocked', public.career_job_eligible(c, o),
        'profile', public.career_profile_score(cid, o.id), 'current', emp.job_id = o.id) ORDER BY o.salary DESC)
      FROM public.jobs o WHERE o.city_id = c.city_id AND o.location_id IS NOT NULL), '[]'),
    'open_interview', CASE WHEN iv.id IS NULL THEN NULL ELSE jsonb_build_object('id', iv.id, 'job_id', iv.job_id,
      'job', (SELECT title FROM public.jobs WHERE id = iv.job_id),
      'questions', (SELECT jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'answers', q.answers) ORDER BY array_position(iv.question_ids, q.id))
                    FROM public.interview_questions q WHERE q.id = ANY (iv.question_ids))) END,
    'interviews', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'at' DESC) FROM (SELECT jsonb_build_object('job', jb.title, 'score', i.score, 'status', i.status, 'at', i.created_at, 'details', i.details) x
      FROM public.job_interviews i JOIN public.jobs jb ON jb.id = i.job_id WHERE i.character_id = cid AND i.status <> 'ouvert' ORDER BY i.created_at DESC LIMIT 10) z), '[]'),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('kind', h.kind, 'label', h.label, 'at', h.occurred_at) ORDER BY h.occurred_at DESC) FROM public.career_history h WHERE h.character_id = cid), '[]'),
    'salary_months', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', m, 'total', tot) ORDER BY m) FROM (
      SELECT to_char(tr.world_at, 'YYYY-MM') m, sum(tr.amount)::integer tot FROM public.transactions tr JOIN public.accounts a ON a.id = tr.account_id
      WHERE a.character_id = cid AND tr.category = 'salaire' AND tr.amount > 0 GROUP BY 1 ORDER BY 1 DESC LIMIT 6) z), '[]'),
    'pass_score', s.pass_score);
END $$;

REVOKE ALL ON FUNCTION public.career_profile_score(uuid, uuid), public.career_job_eligible(public.characters, public.jobs), public.settle_career(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.career_action(text, jsonb), public.career_state() TO authenticated;

COMMIT;
