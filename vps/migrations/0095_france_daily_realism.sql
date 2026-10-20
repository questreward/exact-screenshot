-- 0095 — Réalisme France : médecin traitant + remboursements, calendrier (jours fériés), bulletins de paie, permis de conduire.
-- Touché :
--   * 6 nouvelles tables : medical_doctors, medical_doctor_choices, medical_refunds, driving_settings, driving_questions, driving_licenses
--     (+ medical_settings, driving_ledger).
--   * 2 déclencheurs ajoutés (aucune fonction existante remplacée) :
--       - activities : jour férié = pas de cours ; vacation de travail un jour férié payée double.
--       - personal_assets : acheter une voiture exige le permis (voitures déjà possédées conservées).
--       - security_careers : entrer en formation d'ambulancier exige le permis.
--   * Fonctions : fr_easter, fr_is_holiday, medical_state, medical_choose_doctor, payslips_state, driving_state,
--     driving_register, driving_code, driving_lesson, driving_exam.
-- Argent : uniquement via economy_cash avec clés uniques ; jamais de solde négatif (vérifié avant chaque paiement).
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.driving_licenses') IS NOT NULL THEN RAISE EXCEPTION '0095 déjà installée : ne pas relancer'; END IF;
  IF to_regclass('public.health_log') IS NULL OR to_regclass('public.security_careers') IS NULL OR to_regclass('public.personal_assets') IS NULL
     OR to_regprocedure('public.economy_cash(uuid,text,integer,text,text,jsonb)') IS NULL THEN RAISE EXCEPTION 'Prérequis manquants (santé 0062, secours 0093, patrimoine)'; END IF;
END $$;

-- 1. Calendrier -----------------------------------------------------------------------
CREATE FUNCTION public.fr_easter(_y integer) RETURNS date LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE a int := _y % 19; b int := _y / 100; c int := _y % 100; d int := b / 4; e int := b % 4; f int := (b + 8) / 25; g int := (b - f + 1) / 3;
  h int := (19 * a + b - d - g + 15) % 30; i int := c / 4; k int := c % 4; l int := (32 + 2 * e + 2 * i - h - k) % 7; m int := (a + 11 * h + 22 * l) / 451;
BEGIN RETURN make_date(_y, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1); END $$;

CREATE FUNCTION public.fr_is_holiday(_d date) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char(_d, 'MM-DD') IN ('01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25')
      OR _d IN (public.fr_easter(extract(year FROM _d)::int) + 1, public.fr_easter(extract(year FROM _d)::int) + 39, public.fr_easter(extract(year FROM _d)::int) + 50) $$;

CREATE FUNCTION public.fr_holiday_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF NEW.status = 'running' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'running')
     AND public.fr_is_holiday((NEW.start_time AT TIME ZONE 'UTC')::date) THEN
    IF NEW.type = 'course' THEN RAISE EXCEPTION 'Jour férié : pas de cours aujourd''hui.'; END IF;
    IF NEW.type = 'work' AND NEW.reward > 0 THEN NEW.reward := NEW.reward * 2; NEW.title := NEW.title || ' (jour férié, payé double)'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fr_holiday_activity BEFORE INSERT OR UPDATE OF status ON public.activities FOR EACH ROW EXECUTE FUNCTION public.fr_holiday_activity();

-- 2. Médecin traitant et remboursements ------------------------------------------------
CREATE TABLE public.medical_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  installed_at timestamptz NOT NULL,
  refund_with_doctor numeric NOT NULL DEFAULT 0.70,
  refund_without_doctor numeric NOT NULL DEFAULT 0.30,
  refund_delay_days integer NOT NULL DEFAULT 3,
  change_days integer NOT NULL DEFAULT 30
);
GRANT SELECT ON public.medical_settings TO authenticated; GRANT ALL ON public.medical_settings TO service_role;
ALTER TABLE public.medical_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY medical_settings_read ON public.medical_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.medical_settings (installed_at) VALUES (public.game_now());

CREATE TABLE public.medical_doctors (
  id text PRIMARY KEY,
  city_id text NOT NULL REFERENCES public.cities(id),
  name text NOT NULL,
  address text NOT NULL
);
GRANT SELECT ON public.medical_doctors TO authenticated; GRANT ALL ON public.medical_doctors TO service_role;
ALTER TABLE public.medical_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY medical_doctors_read ON public.medical_doctors FOR SELECT TO authenticated USING (true);
INSERT INTO public.medical_doctors (id, city_id, name, address)
SELECT c.id || '-dr' || n, c.id, 'Dr ' || (ARRAY['Claire Morel','Karim Benali','Sophie Lambert','Julien Faure','Nadia Rousseau','Thomas Girard'])[((c.sort_order + n) % 6) + 1],
  (ARRAY['12 rue de la République','4 place du Marché','27 avenue Jean-Jaurès'])[n] || ', ' || c.name
FROM public.cities c CROSS JOIN generate_series(1, 3) n;

CREATE TABLE public.medical_doctor_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  doctor_id text NOT NULL REFERENCES public.medical_doctors(id),
  chosen_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE INDEX medical_doctor_choices_char ON public.medical_doctor_choices (character_id, chosen_at DESC);
GRANT SELECT ON public.medical_doctor_choices TO authenticated; GRANT ALL ON public.medical_doctor_choices TO service_role;
ALTER TABLE public.medical_doctor_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY medical_doctor_choices_owner ON public.medical_doctor_choices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE TABLE public.medical_refunds (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  consult_day date NOT NULL,
  cost integer NOT NULL,
  rate numeric NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  with_doctor boolean NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, consult_day)
);
GRANT SELECT ON public.medical_refunds TO authenticated; GRANT ALL ON public.medical_refunds TO service_role;
ALTER TABLE public.medical_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY medical_refunds_owner ON public.medical_refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- Remboursements réglés à la lecture : consultations depuis l'installation, après le délai, une seule fois
CREATE FUNCTION public.medical_settle(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.medical_settings; cost integer; r record; doc boolean; rate numeric; amt integer; BEGIN
  SELECT * INTO s FROM public.medical_settings;
  SELECT doctor_cost INTO cost FROM public.health_settings WHERE id = 1;
  FOR r IN SELECT h.day FROM public.health_log h WHERE h.character_id = _cid AND h.kind = 'medecin'
      AND h.created_at >= s.installed_at AND h.day + s.refund_delay_days <= (public.game_now() AT TIME ZONE 'UTC')::date
      AND NOT EXISTS (SELECT 1 FROM public.medical_refunds m WHERE m.character_id = _cid AND m.consult_day = h.day) LOOP
    doc := EXISTS (SELECT 1 FROM public.medical_doctor_choices WHERE character_id = _cid AND (chosen_at AT TIME ZONE 'UTC')::date <= r.day);
    rate := CASE WHEN doc THEN s.refund_with_doctor ELSE s.refund_without_doctor END;
    amt := round(cost * rate);
    INSERT INTO public.medical_refunds (character_id, consult_day, cost, rate, amount, with_doctor) VALUES (_cid, r.day, cost, rate, amt, doc) ON CONFLICT DO NOTHING;
    IF FOUND AND amt > 0 THEN PERFORM public.economy_cash(_cid, 'medical-refund:' || _cid || ':' || r.day, amt, 'Remboursement Santé CIVITAS — consultation du ' || to_char(r.day, 'DD/MM'), 'sante', '{}'::jsonb); END IF;
  END LOOP;
END $$;

CREATE FUNCTION public.medical_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.medical_settings; cur record; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM public.medical_settle(cid);
  SELECT * INTO s FROM public.medical_settings;
  SELECT ch.chosen_at, d.* INTO cur FROM public.medical_doctor_choices ch JOIN public.medical_doctors d ON d.id = ch.doctor_id
    WHERE ch.character_id = cid ORDER BY ch.chosen_at DESC LIMIT 1;
  RETURN jsonb_build_object('now', public.game_now(),
    'settings', to_jsonb(s) - 'id' - 'installed_at',
    'doctor', CASE WHEN cur.id IS NULL THEN NULL ELSE jsonb_build_object('id', cur.id, 'name', cur.name, 'address', cur.address, 'chosen_at', cur.chosen_at) END,
    'doctors', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'address', d.address) ORDER BY d.id) FROM public.medical_doctors d
      WHERE d.city_id = (SELECT city_id FROM public.characters WHERE id = cid)), '[]'::jsonb),
    'refunds', COALESCE((SELECT jsonb_agg(to_jsonb(m) - 'character_id' ORDER BY m.consult_day DESC) FROM public.medical_refunds m WHERE m.character_id = cid), '[]'::jsonb),
    'pending', COALESCE((SELECT jsonb_agg(h.day ORDER BY h.day DESC) FROM public.health_log h WHERE h.character_id = cid AND h.kind = 'medecin' AND h.created_at >= s.installed_at
      AND NOT EXISTS (SELECT 1 FROM public.medical_refunds m WHERE m.character_id = cid AND m.consult_day = h.day)), '[]'::jsonb));
END $$;

CREATE FUNCTION public.medical_choose_doctor(_doctor text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; s public.medical_settings; last timestamptz; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO s FROM public.medical_settings;
  IF NOT EXISTS (SELECT 1 FROM public.medical_doctors WHERE id = _doctor AND city_id = c.city_id) THEN RAISE EXCEPTION 'Choisissez un médecin de votre ville.'; END IF;
  SELECT chosen_at INTO last FROM public.medical_doctor_choices WHERE character_id = cid ORDER BY chosen_at DESC LIMIT 1;
  IF last IS NOT NULL AND last > public.game_now() - s.change_days * interval '1 day' THEN
    RAISE EXCEPTION 'Changement de médecin traitant possible une fois tous les % jours.', s.change_days; END IF;
  INSERT INTO public.medical_doctor_choices (character_id, doctor_id) VALUES (cid, _doctor);
  RETURN public.medical_state();
END $$;

-- 3. Bulletins de paie (lecture seule) : vacations payées par mois de jeu et traitements des métiers de secours ---
CREATE FUNCTION public.payslips_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  RETURN jsonb_build_object('now', public.game_now(), 'months', COALESCE((SELECT jsonb_agg(x ORDER BY x.month DESC, x.employer) FROM (
    SELECT to_char(end_time AT TIME ZONE 'UTC', 'YYYY-MM') AS month, regexp_replace(title, ' \(jour férié, payé double\)$', '') AS employer,
      count(*)::int AS shifts, sum(reward)::int AS net, count(*) FILTER (WHERE title LIKE '%(jour férié, payé double)')::int AS holidays
    FROM public.activities WHERE character_id = cid AND type = 'work' AND status = 'completed' AND reward > 0
    GROUP BY 1, 2
    UNION ALL
    SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM'), replace(label, 'Traitement : ', ''), count(*)::int, sum(amount)::int, 0
    FROM public.security_ledger WHERE character_id = cid AND kind IN ('salaire','indemnite') GROUP BY 1, 2) x), '[]'::jsonb));
END $$;

-- 4. Permis de conduire ----------------------------------------------------------------
CREATE TABLE public.driving_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  min_age integer NOT NULL DEFAULT 17,
  code_fee integer NOT NULL DEFAULT 30,
  code_pass integer NOT NULL DEFAULT 7,
  code_questions integer NOT NULL DEFAULT 10,
  lesson_price integer NOT NULL DEFAULT 45,
  lesson_energy integer NOT NULL DEFAULT 10,
  lessons_per_day integer NOT NULL DEFAULT 2,
  min_lessons integer NOT NULL DEFAULT 20,
  exam_base_pct integer NOT NULL DEFAULT 55,
  exam_pct_per_lesson integer NOT NULL DEFAULT 3,
  exam_max_pct integer NOT NULL DEFAULT 90,
  exam_retry_days integer NOT NULL DEFAULT 7
);
GRANT SELECT ON public.driving_settings TO authenticated; GRANT ALL ON public.driving_settings TO service_role;
ALTER TABLE public.driving_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY driving_settings_read ON public.driving_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.driving_settings DEFAULT VALUES;

CREATE TABLE public.driving_questions (id text PRIMARY KEY, question text NOT NULL, choices text[] NOT NULL, answer integer NOT NULL);
GRANT ALL ON public.driving_questions TO service_role;
ALTER TABLE public.driving_questions ENABLE ROW LEVEL SECURITY;
INSERT INTO public.driving_questions VALUES
 ('c01','En agglomération, la vitesse est limitée par défaut à :',ARRAY['30 km/h','50 km/h','70 km/h'],1),
 ('c02','Sur autoroute par temps sec, la vitesse maximale est de :',ARRAY['110 km/h','130 km/h','150 km/h'],1),
 ('c03','Le taux d''alcool maximal pour un jeune conducteur est de :',ARRAY['0,2 g/l de sang','0,5 g/l de sang','0,8 g/l de sang'],0),
 ('c04','À un feu orange fixe, je dois :',ARRAY['Accélérer pour passer','M''arrêter sauf si c''est dangereux','Klaxonner'],1),
 ('c05','Un panneau triangulaire signale :',ARRAY['Une obligation','Un danger','Une information'],1),
 ('c06','Le téléphone tenu en main en conduisant est :',ARRAY['Autorisé à l''arrêt au feu','Interdit','Autorisé pour un appel court'],1),
 ('c07','La priorité à droite s''applique :',ARRAY['Quand aucun panneau ne dit autre chose','Seulement la nuit','Jamais en ville'],0),
 ('c08','La distance de sécurité minimale correspond à :',ARRAY['1 seconde','2 secondes','5 secondes'],1),
 ('c09','Un jeune permis commence avec :',ARRAY['6 points','12 points','3 points'],0),
 ('c10','Pour dépasser un cycliste en ville, je laisse au moins :',ARRAY['50 cm','1 mètre','3 mètres'],1);

CREATE TABLE public.driving_licenses (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT public.game_now(),
  code_passed_at timestamptz,
  last_code_day date,
  lessons integer NOT NULL DEFAULT 0,
  last_exam_at timestamptz,
  license_at timestamptz
);
GRANT SELECT ON public.driving_licenses TO authenticated; GRANT ALL ON public.driving_licenses TO service_role;
ALTER TABLE public.driving_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY driving_licenses_owner ON public.driving_licenses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE TABLE public.driving_ledger (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  request_id uuid NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('inscription','code','lecon','examen')),
  result text,
  amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, request_id)
);
GRANT SELECT ON public.driving_ledger TO authenticated; GRANT ALL ON public.driving_ledger TO service_role;
ALTER TABLE public.driving_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY driving_ledger_owner ON public.driving_ledger FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE FUNCTION public.has_driving_license(_cid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.driving_licenses WHERE character_id = _cid AND license_at IS NOT NULL) $$;

CREATE FUNCTION public.driving_balance(_cid uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT balance FROM public.accounts WHERE character_id = _cid ORDER BY created_at LIMIT 1), 0) $$;

CREATE FUNCTION public.driving_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  RETURN jsonb_build_object('now', public.game_now(),
    'age', (SELECT age FROM public.characters WHERE id = cid), 'energy', (SELECT energy FROM public.characters WHERE id = cid),
    'balance', public.driving_balance(cid),
    'settings', (SELECT to_jsonb(s) - 'id' FROM public.driving_settings s),
    'questions', (SELECT jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'choices', q.choices) ORDER BY q.id) FROM public.driving_questions q),
    'license', (SELECT to_jsonb(l) - 'character_id' FROM public.driving_licenses l WHERE l.character_id = cid),
    'lessons_today', (SELECT count(*) FROM public.driving_ledger WHERE character_id = cid AND kind = 'lecon' AND (created_at AT TIME ZONE 'UTC')::date = (public.game_now() AT TIME ZONE 'UTC')::date),
    'history', COALESCE((SELECT jsonb_agg(to_jsonb(x) - 'character_id' - 'request_id' ORDER BY x.created_at DESC) FROM (SELECT * FROM public.driving_ledger WHERE character_id = cid AND kind <> 'lecon' ORDER BY created_at DESC LIMIT 15) x), '[]'::jsonb));
END $$;

CREATE FUNCTION public.driving_register(_request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; s public.driving_settings; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  IF EXISTS (SELECT 1 FROM public.driving_ledger WHERE request_id = _request) THEN RETURN public.driving_state(); END IF;
  SELECT * INTO s FROM public.driving_settings;
  IF c.age < s.min_age THEN RAISE EXCEPTION 'Inscription possible dès % ans.', s.min_age; END IF;
  IF EXISTS (SELECT 1 FROM public.driving_licenses WHERE character_id = cid) THEN RAISE EXCEPTION 'Vous êtes déjà inscrit.'; END IF;
  IF public.driving_balance(cid) < s.code_fee THEN RAISE EXCEPTION 'Solde insuffisant (% €).', s.code_fee; END IF;
  INSERT INTO public.driving_licenses (character_id) VALUES (cid);
  INSERT INTO public.driving_ledger (character_id, request_id, kind, amount) VALUES (cid, _request, 'inscription', s.code_fee);
  PERFORM public.economy_cash(cid, 'driving:' || _request, -s.code_fee, 'Inscription au code de la route', 'permis', '{}'::jsonb);
  RETURN public.driving_state();
END $$;

CREATE FUNCTION public.driving_code(_answers jsonb, _request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); l public.driving_licenses; s public.driving_settings; ok int := 0; q record; today date := (public.game_now() AT TIME ZONE 'UTC')::date; BEGIN
  IF EXISTS (SELECT 1 FROM public.driving_ledger WHERE request_id = _request) THEN RETURN public.driving_state(); END IF;
  SELECT * INTO l FROM public.driving_licenses WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inscrivez-vous d''abord au code.'; END IF;
  IF l.code_passed_at IS NOT NULL THEN RAISE EXCEPTION 'Code déjà obtenu.'; END IF;
  IF l.last_code_day = today THEN RAISE EXCEPTION 'Un essai du code par jour : revenez demain.'; END IF;
  SELECT * INTO s FROM public.driving_settings;
  FOR q IN SELECT * FROM public.driving_questions LOOP
    IF (_answers ->> q.id) ~ '^[0-9]+$' AND (_answers ->> q.id)::int = q.answer THEN ok := ok + 1; END IF;
  END LOOP;
  UPDATE public.driving_licenses SET last_code_day = today, code_passed_at = CASE WHEN ok >= s.code_pass THEN public.game_now() END WHERE character_id = cid;
  INSERT INTO public.driving_ledger (character_id, request_id, kind, result) VALUES (cid, _request, 'code', ok || '/' || s.code_questions);
  RETURN public.driving_state();
END $$;

CREATE FUNCTION public.driving_lesson(_request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; l public.driving_licenses; s public.driving_settings; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.driving_ledger WHERE request_id = _request) THEN RETURN public.driving_state(); END IF;
  SELECT * INTO l FROM public.driving_licenses WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND OR l.code_passed_at IS NULL THEN RAISE EXCEPTION 'Obtenez d''abord le code.'; END IF;
  IF l.license_at IS NOT NULL THEN RAISE EXCEPTION 'Vous avez déjà le permis.'; END IF;
  SELECT * INTO s FROM public.driving_settings;
  IF (SELECT count(*) FROM public.driving_ledger WHERE character_id = cid AND kind = 'lecon' AND (created_at AT TIME ZONE 'UTC')::date = (public.game_now() AT TIME ZONE 'UTC')::date) >= s.lessons_per_day THEN
    RAISE EXCEPTION 'Au plus % leçons par jour.', s.lessons_per_day; END IF;
  IF c.energy < s.lesson_energy THEN RAISE EXCEPTION 'Pas assez d''énergie (% nécessaires).', s.lesson_energy; END IF;
  IF public.driving_balance(cid) < s.lesson_price THEN RAISE EXCEPTION 'Solde insuffisant (% €).', s.lesson_price; END IF;
  UPDATE public.characters SET energy = energy - s.lesson_energy WHERE id = cid;
  UPDATE public.driving_licenses SET lessons = lessons + 1 WHERE character_id = cid;
  INSERT INTO public.driving_ledger (character_id, request_id, kind, amount) VALUES (cid, _request, 'lecon', s.lesson_price);
  PERFORM public.economy_cash(cid, 'driving:' || _request, -s.lesson_price, 'Leçon de conduite', 'permis', '{}'::jsonb);
  RETURN public.driving_state();
END $$;

CREATE FUNCTION public.driving_exam(_request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); l public.driving_licenses; s public.driving_settings; pct int; ok boolean; BEGIN
  IF EXISTS (SELECT 1 FROM public.driving_ledger WHERE request_id = _request) THEN RETURN public.driving_state(); END IF;
  SELECT * INTO l FROM public.driving_licenses WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND OR l.code_passed_at IS NULL THEN RAISE EXCEPTION 'Obtenez d''abord le code.'; END IF;
  IF l.license_at IS NOT NULL THEN RAISE EXCEPTION 'Vous avez déjà le permis.'; END IF;
  SELECT * INTO s FROM public.driving_settings;
  IF (SELECT age FROM public.characters WHERE id = cid) < s.min_age THEN RAISE EXCEPTION 'Examen possible dès % ans.', s.min_age; END IF;
  IF l.lessons < s.min_lessons THEN RAISE EXCEPTION 'Il faut au moins % leçons avant l''examen.', s.min_lessons; END IF;
  IF l.last_exam_at IS NOT NULL AND l.last_exam_at > public.game_now() - s.exam_retry_days * interval '1 day' THEN
    RAISE EXCEPTION 'Prochaine date d''examen : % jours après le précédent.', s.exam_retry_days; END IF;
  pct := LEAST(s.exam_max_pct, s.exam_base_pct + s.exam_pct_per_lesson * (l.lessons - s.min_lessons));
  ok := abs(hashtext(cid::text || ':' || _request::text)) % 100 < pct;
  UPDATE public.driving_licenses SET last_exam_at = public.game_now(), license_at = CASE WHEN ok THEN public.game_now() END WHERE character_id = cid;
  INSERT INTO public.driving_ledger (character_id, request_id, kind, result) VALUES (cid, _request, 'examen', CASE WHEN ok THEN 'reussi' ELSE 'echec' END);
  RETURN public.driving_state();
END $$;

-- Permis exigé : nouvelles voitures et entrée en formation d'ambulancier
CREATE FUNCTION public.require_license_vehicle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.economy_catalog WHERE id = NEW.catalog_id AND kind = 'vehicle') AND NOT public.has_driving_license(NEW.character_id) THEN
    RAISE EXCEPTION 'Permis de conduire obligatoire pour acheter une voiture.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER require_license_vehicle BEFORE INSERT ON public.personal_assets FOR EACH ROW EXECUTE FUNCTION public.require_license_vehicle();

CREATE FUNCTION public.require_license_ambulance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF NEW.service = 'samu_ambulancier' AND NEW.status = 'formation' AND (TG_OP = 'INSERT' OR OLD.joined_at IS DISTINCT FROM NEW.joined_at)
     AND NOT public.has_driving_license(NEW.character_id) THEN
    RAISE EXCEPTION 'Permis de conduire obligatoire pour devenir ambulancier.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER require_license_ambulance BEFORE INSERT OR UPDATE ON public.security_careers FOR EACH ROW EXECUTE FUNCTION public.require_license_ambulance();

-- Droits -------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.fr_holiday_activity(), public.require_license_vehicle(), public.require_license_ambulance(),
  public.medical_settle(uuid), public.driving_balance(uuid), public.has_driving_license(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.medical_settle(uuid), public.driving_balance(uuid), public.has_driving_license(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fr_easter(integer), public.fr_is_holiday(date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.medical_state(), public.medical_choose_doctor(text), public.payslips_state(), public.driving_state(),
  public.driving_register(uuid), public.driving_code(jsonb, uuid), public.driving_lesson(uuid), public.driving_exam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.medical_state(), public.medical_choose_doctor(text), public.payslips_state(), public.driving_state(),
  public.driving_register(uuid), public.driving_code(jsonb, uuid), public.driving_lesson(uuid), public.driving_exam(uuid) TO authenticated, service_role;

COMMIT;
