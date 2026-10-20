-- 0099 — Vie étudiante : vœux type Parcoursup, bourse sur critères sociaux, partiels + rattrapage, diplômes, résidence universitaire.
-- Touché :
--   * 6 nouvelles tables : student_settings (réglages), higher_ed_programs (formations : BTS, BUT, licence, école),
--     student_profiles (moyenne de lycée et revenus familiaux fictifs, échelon de bourse, formation, année, rattrapage),
--     student_wishes (vœux et réponses), student_ledger (bourses, loyers, notes, diplômes — clés uniques),
--     student_rooms (chambre en résidence universitaire).
--   * Fonctions : student_state (lecture + règlement de ce qui est échu), student_wish, student_accept, student_retake,
--     student_room_request + student_settle (interne).
--   * Seule écriture sur une table existante : à l'acceptation d'une formation, l'inscription (study_enrollments) est créée
--     ou sa filière mise à jour, comme le fait déjà enroll_studies ; la progression n'est jamais modifiée.
--   * Aucune fonction existante remplacée. Rien de rétroactif : bourses, loyers et partiels comptent après l'installation.
-- Règles validées par Alex : 10 vœux max, réponse oui / en attente / non selon les notes ; bourse 6 échelons 145–650 €/mois
--   de septembre à juin ; partiels mi-janvier et mi-mai, 10/20 pour valider l'année, rattrapage en juin, diplôme en fin de cursus ;
--   résidence universitaire 250 €/mois, boursiers prioritaires. Loyer impayé : noté comme échec, jamais de solde négatif.
-- Installation : docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0099_student_life.sql
BEGIN;

CREATE TABLE public.student_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  installed_at timestamptz NOT NULL DEFAULT public.game_now(),
  max_wishes integer NOT NULL DEFAULT 10,
  answer_days integer NOT NULL DEFAULT 3,
  min_age integer NOT NULL DEFAULT 17,
  scholarship integer[] NOT NULL DEFAULT '{145,240,310,380,460,650}',
  room_rent integer NOT NULL DEFAULT 250,
  pass_grade numeric NOT NULL DEFAULT 10,
  progress_per_point integer NOT NULL DEFAULT 30
);
INSERT INTO public.student_settings (id) VALUES (1);

CREATE TABLE public.higher_ed_programs (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('BTS','BUT','Licence','École')),
  name text NOT NULL,
  field_id text NOT NULL REFERENCES public.study_fields(id),
  years integer NOT NULL,
  min_grade numeric NOT NULL,
  diploma text NOT NULL
);
INSERT INTO public.higher_ed_programs VALUES
 ('lic-droit','Licence','Licence de droit','law',3,10,'Licence de droit'),
 ('lic-eco','Licence','Licence d''économie-gestion','economics',3,10,'Licence d''économie-gestion'),
 ('lic-sciencespo','Licence','Licence de science politique','politics',3,11,'Licence de science politique'),
 ('lic-info','Licence','Licence d''informatique','computing',3,10,'Licence d''informatique'),
 ('but-info','BUT','BUT Informatique','computing',3,12,'BUT Informatique'),
 ('but-gea','BUT','BUT Gestion des entreprises et des administrations','business',3,11.5,'BUT GEA'),
 ('but-info-com','BUT','BUT Information-communication','journalism',3,12,'BUT Information-communication'),
 ('bts-ndrc','BTS','BTS Négociation et digitalisation de la relation client','business',2,9,'BTS NDRC'),
 ('bts-sio','BTS','BTS Services informatiques aux organisations','computing',2,9.5,'BTS SIO'),
 ('bts-communication','BTS','BTS Communication','journalism',2,10,'BTS Communication'),
 ('ecole-journalisme','École','École de journalisme (fictive)','journalism',5,14,'Diplôme d''école de journalisme'),
 ('ecole-commerce','École','École de commerce (fictive)','business',5,13,'Diplôme d''école de commerce'),
 ('iep','École','Institut d''études politiques (fictif)','politics',5,15,'Diplôme d''IEP'),
 ('ecole-ingenieur','École','École d''ingénieurs en informatique (fictive)','computing',5,14.5,'Diplôme d''ingénieur');

CREATE TABLE public.student_profiles (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  hs_average numeric NOT NULL,
  family_income integer NOT NULL,
  scholarship_level integer NOT NULL CHECK (scholarship_level BETWEEN 0 AND 6),
  program_id text REFERENCES public.higher_ed_programs(id),
  year integer NOT NULL DEFAULT 1,
  year_started_at timestamptz,
  session_progress integer NOT NULL DEFAULT 0,
  retake_open boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.student_wishes (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  program_id text NOT NULL REFERENCES public.higher_ed_programs(id),
  answer text NOT NULL DEFAULT 'attente_reponse' CHECK (answer IN ('attente_reponse','oui','en_attente','non','acceptee','renoncee')),
  answer_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, program_id)
);
CREATE TABLE public.student_ledger (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('bourse','loyer','loyer_impaye','partiel','rattrapage','annee','diplome')),
  amount integer NOT NULL DEFAULT 0,
  grade numeric,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, key)
);
CREATE TABLE public.student_rooms (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('attribuee','refusee')),
  residence text NOT NULL,
  since timestamptz NOT NULL DEFAULT public.game_now()
);

GRANT SELECT ON public.student_settings, public.higher_ed_programs TO authenticated;
GRANT SELECT ON public.student_profiles, public.student_wishes, public.student_ledger, public.student_rooms TO authenticated;
GRANT ALL ON public.student_settings, public.higher_ed_programs, public.student_profiles, public.student_wishes, public.student_ledger, public.student_rooms TO service_role;
ALTER TABLE public.student_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.higher_ed_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_settings_read ON public.student_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY higher_ed_programs_read ON public.higher_ed_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY student_profiles_owner ON public.student_profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY student_wishes_owner ON public.student_wishes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY student_ledger_owner ON public.student_ledger FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY student_rooms_owner ON public.student_rooms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- Profil fictif stable : moyenne de lycée 8–17, revenus familiaux 12 000–80 000 €, échelon déduit.
CREATE FUNCTION public.student_profile(_cid uuid) RETURNS public.student_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.student_profiles; h int := abs(hashtext(_cid::text || ':lycee')); inc int; BEGIN
  SELECT * INTO p FROM public.student_profiles WHERE character_id = _cid;
  IF FOUND THEN RETURN p; END IF;
  inc := 12000 + (abs(hashtext(_cid::text || ':famille')) % 69) * 1000;
  INSERT INTO public.student_profiles (character_id, hs_average, family_income, scholarship_level)
    VALUES (_cid, round((8 + (h % 91) / 10.0)::numeric, 1), inc,
      CASE WHEN inc < 18000 THEN 6 WHEN inc < 24000 THEN 5 WHEN inc < 30000 THEN 4 WHEN inc < 36000 THEN 3 WHEN inc < 42000 THEN 2 WHEN inc < 50000 THEN 1 ELSE 0 END)
    RETURNING * INTO p;
  RETURN p;
END $$;

-- Note d'une session : 6 + travail fourni (progression depuis la session précédente) + aléa stable −2..+2, bornée 0–20.
CREATE FUNCTION public.student_grade(_cid uuid, _key text, _delta integer) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT least(20, greatest(0, round((6 + _delta::numeric / (SELECT progress_per_point FROM public.student_settings WHERE id = 1)
    + (abs(hashtext(_cid::text || _key)) % 41 - 20) / 10.0)::numeric, 1))) $$;

CREATE FUNCTION public.student_settle(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.student_settings; p public.student_profiles; pr public.higher_ed_programs; t timestamptz := public.game_now();
  m date; now_m date; prog int; y int; sess date; k text; g numeric; av numeric; n int; amount int; BEGIN
  SELECT * INTO s FROM public.student_settings WHERE id = 1;
  p := public.student_profile(_cid);
  SELECT * INTO p FROM public.student_profiles WHERE character_id = _cid FOR UPDATE;
  -- Réponses aux vœux : oui si moyenne ≥ seuil, en attente si à moins d'1 point, sinon non.
  UPDATE public.student_wishes w SET answer = CASE WHEN p.hs_average >= h.min_grade THEN 'oui' WHEN p.hs_average >= h.min_grade - 1 THEN 'en_attente' ELSE 'non' END
    FROM public.higher_ed_programs h WHERE h.id = w.program_id AND w.character_id = _cid AND w.answer = 'attente_reponse' AND w.answer_at <= t;
  -- Liste d'attente : une place se libère (1 chance sur 2, stable) 7 jours après la réponse.
  UPDATE public.student_wishes w SET answer = CASE WHEN abs(hashtext(_cid::text || w.program_id)) % 2 = 0 THEN 'oui' ELSE 'non' END
    WHERE w.character_id = _cid AND w.answer = 'en_attente' AND w.answer_at + interval '7 days' <= t;
  IF p.program_id IS NULL THEN RETURN; END IF;
  SELECT * INTO pr FROM public.higher_ed_programs WHERE id = p.program_id;
  now_m := date_trunc('month', t AT TIME ZONE 'UTC')::date;
  -- Bourse (septembre à juin) et loyer de résidence, mois entamés après l'installation et l'entrée en formation.
  m := greatest((date_trunc('month', s.installed_at AT TIME ZONE 'UTC') + interval '1 month')::date, date_trunc('month', p.year_started_at AT TIME ZONE 'UTC')::date);
  WHILE m <= now_m LOOP
    IF p.scholarship_level > 0 AND extract(month FROM m) NOT IN (7, 8) THEN
      amount := s.scholarship[p.scholarship_level];
      INSERT INTO public.student_ledger (character_id, key, kind, amount, label) VALUES (_cid, 'bourse:' || to_char(m, 'YYYY-MM'), 'bourse', amount,
        'Bourse échelon ' || p.scholarship_level || ' — ' || to_char(m, 'MM/YYYY')) ON CONFLICT DO NOTHING;
      IF FOUND THEN PERFORM public.economy_cash(_cid, 'student:bourse:' || to_char(m, 'YYYY-MM'), amount, 'Bourse sur critères sociaux', 'aide', '{}'::jsonb); END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM public.student_rooms WHERE character_id = _cid AND status = 'attribuee' AND date_trunc('month', since AT TIME ZONE 'UTC')::date <= m)
       AND NOT EXISTS (SELECT 1 FROM public.student_ledger WHERE character_id = _cid AND key IN ('loyer:' || to_char(m, 'YYYY-MM'), 'loyer-impaye:' || to_char(m, 'YYYY-MM'))) THEN
      IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = _cid ORDER BY created_at LIMIT 1), 0) >= s.room_rent THEN
        INSERT INTO public.student_ledger (character_id, key, kind, amount, label) VALUES (_cid, 'loyer:' || to_char(m, 'YYYY-MM'), 'loyer', s.room_rent, 'Loyer résidence universitaire — ' || to_char(m, 'MM/YYYY'));
        PERFORM public.economy_cash(_cid, 'student:loyer:' || to_char(m, 'YYYY-MM'), -s.room_rent, 'Loyer résidence universitaire', 'logement', '{}'::jsonb);
      ELSE
        INSERT INTO public.student_ledger (character_id, key, kind, amount, label) VALUES (_cid, 'loyer-impaye:' || to_char(m, 'YYYY-MM'), 'loyer_impaye', s.room_rent, 'Loyer non payé (solde insuffisant) — ' || to_char(m, 'MM/YYYY'));
      END IF;
    END IF;
    m := (m + interval '1 month')::date;
  END LOOP;
  -- Partiels mi-janvier et mi-mai ; bilan de l'année au 1er juillet (rattrapage possible en juin).
  prog := COALESCE((SELECT progress FROM public.study_enrollments WHERE character_id = _cid), 0);
  FOR y IN extract(year FROM p.year_started_at)::int .. extract(year FROM t)::int LOOP
    FOREACH sess IN ARRAY ARRAY[make_date(y, 1, 15), make_date(y, 5, 15)] LOOP
      IF sess > (p.year_started_at AT TIME ZONE 'UTC')::date AND sess > (s.installed_at AT TIME ZONE 'UTC')::date AND sess <= (t AT TIME ZONE 'UTC')::date THEN
        k := 'partiel:' || to_char(sess, 'YYYY-MM');
        IF NOT EXISTS (SELECT 1 FROM public.student_ledger l WHERE l.character_id = _cid AND l.key = k) THEN
          g := public.student_grade(_cid, k, prog - p.session_progress);
          INSERT INTO public.student_ledger (character_id, key, kind, grade, label) VALUES (_cid, k, 'partiel', g,
            'Partiels de ' || CASE extract(month FROM sess) WHEN 1 THEN 'janvier' ELSE 'mai' END || ' ' || y || ' — année ' || p.year);
          UPDATE public.student_profiles SET session_progress = prog WHERE character_id = _cid;
          p.session_progress := prog;
          IF extract(month FROM sess) = 5 THEN
            SELECT avg(grade), count(*) INTO av, n FROM public.student_ledger WHERE character_id = _cid AND kind = 'partiel' AND key IN ('partiel:' || y || '-01', 'partiel:' || y || '-05');
            IF av < s.pass_grade THEN UPDATE public.student_profiles SET retake_open = true WHERE character_id = _cid; p.retake_open := true; END IF;
          END IF;
        END IF;
      END IF;
    END LOOP;
    -- Bilan au 1er juillet.
    IF make_date(y, 7, 1) > (p.year_started_at AT TIME ZONE 'UTC')::date AND make_date(y, 7, 1) <= (t AT TIME ZONE 'UTC')::date
       AND EXISTS (SELECT 1 FROM public.student_ledger WHERE character_id = _cid AND key = 'partiel:' || y || '-05')
       AND NOT EXISTS (SELECT 1 FROM public.student_ledger WHERE character_id = _cid AND key = 'annee:' || y) THEN
      SELECT avg(grade) INTO av FROM public.student_ledger WHERE character_id = _cid AND key IN ('partiel:' || y || '-01', 'partiel:' || y || '-05');
      SELECT greatest(av, COALESCE((SELECT grade FROM public.student_ledger WHERE character_id = _cid AND key = 'rattrapage:' || y), 0)) INTO av;
      IF av >= s.pass_grade THEN
        INSERT INTO public.student_ledger (character_id, key, kind, grade, label) VALUES (_cid, 'annee:' || y, 'annee', round(av, 1), 'Année ' || p.year || ' validée');
        IF p.year >= pr.years THEN
          INSERT INTO public.student_ledger (character_id, key, kind, grade, label) VALUES (_cid, 'diplome:' || pr.id, 'diplome', round(av, 1), pr.diploma || ' obtenu') ON CONFLICT DO NOTHING;
          UPDATE public.student_profiles SET program_id = NULL, year = 1, retake_open = false WHERE character_id = _cid;
          RETURN;
        END IF;
        UPDATE public.student_profiles SET year = year + 1, retake_open = false WHERE character_id = _cid; p.year := p.year + 1;
      ELSE
        INSERT INTO public.student_ledger (character_id, key, kind, grade, label) VALUES (_cid, 'annee:' || y, 'annee', round(av, 1), 'Année ' || p.year || ' non validée : redoublement');
        UPDATE public.student_profiles SET retake_open = false WHERE character_id = _cid;
      END IF;
      p.retake_open := false;
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION public.student_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  PERFORM public.student_settle(cid);
  RETURN jsonb_build_object('now', public.game_now(),
    'age', (SELECT age FROM public.characters WHERE id = cid),
    'path', (SELECT path_id FROM public.characters WHERE id = cid),
    'settings', (SELECT to_jsonb(s) - 'id' FROM public.student_settings s),
    'profile', (SELECT to_jsonb(p) - 'character_id' FROM public.student_profiles p WHERE p.character_id = cid),
    'progress', COALESCE((SELECT progress FROM public.study_enrollments WHERE character_id = cid), 0),
    'programs', (SELECT jsonb_agg(to_jsonb(h) ORDER BY h.kind, h.name) FROM public.higher_ed_programs h),
    'wishes', COALESCE((SELECT jsonb_agg(to_jsonb(w) - 'character_id' ORDER BY w.created_at) FROM public.student_wishes w WHERE w.character_id = cid), '[]'::jsonb),
    'room', (SELECT to_jsonb(r) - 'character_id' FROM public.student_rooms r WHERE r.character_id = cid),
    'ledger', COALESCE((SELECT jsonb_agg(to_jsonb(l) - 'character_id' ORDER BY l.created_at DESC, l.key DESC) FROM public.student_ledger l WHERE l.character_id = cid), '[]'::jsonb));
END $$;

CREATE FUNCTION public.student_wish(_program text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; s public.student_settings; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO s FROM public.student_settings WHERE id = 1;
  IF c.path_id <> 'student' THEN RAISE EXCEPTION 'Réservé au parcours Étudiant.'; END IF;
  IF c.age < s.min_age THEN RAISE EXCEPTION 'Vœux possibles dès % ans.', s.min_age; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.higher_ed_programs WHERE id = _program) THEN RAISE EXCEPTION 'Formation inconnue.'; END IF;
  PERFORM public.student_profile(cid);
  IF (SELECT program_id FROM public.student_profiles WHERE character_id = cid) IS NOT NULL THEN RAISE EXCEPTION 'Tu suis déjà une formation.'; END IF;
  IF (SELECT count(*) FROM public.student_wishes WHERE character_id = cid AND answer NOT IN ('renoncee','non')) >= s.max_wishes THEN RAISE EXCEPTION 'Maximum % vœux.', s.max_wishes; END IF;
  INSERT INTO public.student_wishes (character_id, program_id, answer_at) VALUES (cid, _program, public.game_now() + s.answer_days * interval '1 day')
    ON CONFLICT (character_id, program_id) DO NOTHING;
  RETURN public.student_state();
END $$;

CREATE FUNCTION public.student_accept(_program text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; pr public.higher_ed_programs; lid uuid; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM public.student_settle(cid);
  IF NOT EXISTS (SELECT 1 FROM public.student_wishes WHERE character_id = cid AND program_id = _program AND answer = 'oui') THEN RAISE EXCEPTION 'Cette formation ne t''a pas répondu oui.'; END IF;
  IF (SELECT program_id FROM public.student_profiles WHERE character_id = cid) IS NOT NULL THEN RAISE EXCEPTION 'Tu suis déjà une formation.'; END IF;
  SELECT * INTO pr FROM public.higher_ed_programs WHERE id = _program;
  UPDATE public.student_wishes SET answer = CASE WHEN program_id = _program THEN 'acceptee' ELSE 'renoncee' END
    WHERE character_id = cid AND answer IN ('oui','en_attente','attente_reponse');
  UPDATE public.student_profiles SET program_id = _program, year = 1, year_started_at = public.game_now(), retake_open = false,
    session_progress = COALESCE((SELECT progress FROM public.study_enrollments WHERE character_id = cid), 0) WHERE character_id = cid;
  IF EXISTS (SELECT 1 FROM public.study_enrollments WHERE character_id = cid) THEN
    UPDATE public.study_enrollments SET field_id = pr.field_id WHERE character_id = cid;
  ELSE
    SELECT id INTO lid FROM public.locations WHERE city_id = c.city_id AND kind = 'universite' AND accessible AND district_id IS NOT NULL LIMIT 1;
    IF lid IS NULL THEN RAISE EXCEPTION 'Université indisponible.'; END IF;
    INSERT INTO public.study_enrollments (character_id, field_id, location_id) VALUES (cid, pr.field_id, lid);
  END IF;
  UPDATE public.characters SET situation = 'Étudiant — ' || pr.name WHERE id = cid;
  RETURN public.student_state();
END $$;

CREATE FUNCTION public.student_retake() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); p public.student_profiles; t timestamptz := public.game_now(); y int; prog int; g numeric; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  PERFORM public.student_settle(cid);
  SELECT * INTO p FROM public.student_profiles WHERE character_id = cid FOR UPDATE;
  y := extract(year FROM t)::int;
  IF NOT COALESCE(p.retake_open, false) OR extract(month FROM t) <> 6 THEN RAISE EXCEPTION 'Rattrapage possible en juin si l''année n''est pas validée.'; END IF;
  IF EXISTS (SELECT 1 FROM public.student_ledger WHERE character_id = cid AND key = 'rattrapage:' || y) THEN RAISE EXCEPTION 'Rattrapage déjà passé.'; END IF;
  prog := COALESCE((SELECT progress FROM public.study_enrollments WHERE character_id = cid), 0);
  g := least(20, public.student_grade(cid, 'rattrapage:' || y, (prog - p.session_progress) * 2) + 1);
  INSERT INTO public.student_ledger (character_id, key, kind, grade, label) VALUES (cid, 'rattrapage:' || y, 'rattrapage', g, 'Session de rattrapage ' || y);
  UPDATE public.student_profiles SET session_progress = prog WHERE character_id = cid;
  RETURN public.student_state();
END $$;

CREATE FUNCTION public.student_room_request() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); p public.student_profiles; c public.characters; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  p := public.student_profile(cid);
  IF p.program_id IS NULL THEN RAISE EXCEPTION 'Réservé aux étudiants inscrits dans une formation.'; END IF;
  IF EXISTS (SELECT 1 FROM public.student_rooms WHERE character_id = cid) THEN RAISE EXCEPTION 'Demande déjà traitée.'; END IF;
  INSERT INTO public.student_rooms (character_id, status, residence) VALUES (cid,
    CASE WHEN p.scholarship_level > 0 OR abs(hashtext(cid::text || ':crous')) % 3 = 0 THEN 'attribuee' ELSE 'refusee' END,
    'Résidence universitaire ' || (SELECT name FROM public.cities WHERE id = c.city_id));
  RETURN public.student_state();
END $$;

REVOKE ALL ON FUNCTION public.student_profile(uuid), public.student_grade(uuid, text, integer), public.student_settle(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_profile(uuid), public.student_grade(uuid, text, integer), public.student_settle(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.student_state(), public.student_wish(text), public.student_accept(text), public.student_retake(), public.student_room_request() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_state(), public.student_wish(text), public.student_accept(text), public.student_retake(), public.student_room_request() TO authenticated, service_role;

COMMIT;
