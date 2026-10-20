-- 0093 — Carrières de sécurité et de secours : Police nationale, Sapeurs-pompiers (pro et volontaires), Protection civile.
-- Touché : 7 nouvelles tables (réglages par service, questions du concours, missions, carrière, concours, services, journal),
-- 1 type d'activité d'agenda ('security_shift'), 6 fonctions. Aucune table existante modifiée, aucune fonction existante remplacée.
-- Argent : uniquement via economy_cash avec clés uniques (salaire hebdomadaire, indemnités), jamais négatif.
-- Missions tirées des faits publics de la ville (crises, signalements graves, manifestations), résultat déterministe (hashtext).
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.security_careers') IS NOT NULL THEN RAISE EXCEPTION '0093 déjà installée : ne pas relancer'; END IF;
  IF to_regprocedure('public.economy_cash(uuid,text,integer,text,text,jsonb)') IS NULL OR to_regprocedure('public.award_civic(uuid,text,text,integer)') IS NULL
     OR to_regprocedure('public.social_actor()') IS NULL OR to_regclass('public.health_profiles') IS NULL OR to_regclass('public.protests') IS NULL THEN
    RAISE EXCEPTION 'Prérequis manquants (économie, civique, santé, manifestations)'; END IF;
END $$;

-- 1. Réglages par service -------------------------------------------------------------
CREATE TABLE public.security_services (
  id text PRIMARY KEY CHECK (id IN ('police','pompier_pro','pompier_vol','protection_civile')),
  label text NOT NULL,
  min_age integer NOT NULL, max_age integer NOT NULL,
  exam boolean NOT NULL,
  training_days integer NOT NULL CHECK (training_days >= 0),
  training_monthly integer NOT NULL CHECK (training_monthly >= 0),
  rank_titles text[] NOT NULL,
  rank_monthly integer[] NOT NULL,
  rank_missions integer[] NOT NULL,   -- missions réussies nécessaires pour chaque grade
  hourly_pay integer NOT NULL DEFAULT 0 CHECK (hourly_pay >= 0),
  civic_per_shift integer NOT NULL DEFAULT 0,
  exclusive_job boolean NOT NULL      -- incompatible avec un autre emploi
);
GRANT SELECT ON public.security_services TO authenticated; GRANT ALL ON public.security_services TO service_role;
ALTER TABLE public.security_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_services_read ON public.security_services FOR SELECT TO authenticated USING (true);
INSERT INTO public.security_services VALUES
 ('police','Police nationale',18,44,true,28,1450,ARRAY['Élève gardien de la paix','Gardien de la paix','Brigadier','Brigadier-chef','Major'],ARRAY[1450,1950,2200,2500,2900],ARRAY[0,0,10,25,50],0,0,true),
 ('pompier_pro','Sapeur-pompier professionnel',18,35,true,14,1500,ARRAY['Sapeur stagiaire','Sapeur','Caporal','Sergent','Adjudant'],ARRAY[1500,1850,2050,2300,2600],ARRAY[0,0,10,25,50],0,0,true),
 ('pompier_vol','Sapeur-pompier volontaire',16,60,false,3,0,ARRAY['Stagiaire','Sapeur','Caporal','Sergent'],ARRAY[0,0,0,0],ARRAY[0,0,10,25],9,2,false),
 ('protection_civile','Protection civile (bénévole)',16,99,false,1,0,ARRAY['Équipier en formation','Équipier secouriste','Chef d''équipe','Chef de poste'],ARRAY[0,0,0,0],ARRAY[0,0,10,25],0,3,false);

CREATE TABLE public.security_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  installed_at timestamptz NOT NULL,
  exam_retry_days integer NOT NULL DEFAULT 30,
  exam_energy integer NOT NULL DEFAULT 20,
  exam_pass_total integer NOT NULL DEFAULT 30,   -- sur 60
  exam_min_each integer NOT NULL DEFAULT 5,      -- sur 20
  energy_per_8h integer NOT NULL DEFAULT 30,
  injury_days integer NOT NULL DEFAULT 3,
  commendation_pct integer NOT NULL DEFAULT 10,
  complaint_block integer NOT NULL DEFAULT 3     -- plaintes bloquant l'avancement
);
GRANT SELECT ON public.security_settings TO authenticated; GRANT ALL ON public.security_settings TO service_role;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_settings_read ON public.security_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.security_settings (installed_at) VALUES (public.game_now());

-- 2. Questions du concours (la bonne réponse ne sort jamais de la base) --------------------
CREATE TABLE public.security_exam_questions (
  id text PRIMARY KEY,
  service text NOT NULL REFERENCES public.security_services(id),
  question text NOT NULL,
  choices text[] NOT NULL,
  answer integer NOT NULL
);
GRANT ALL ON public.security_exam_questions TO service_role;
ALTER TABLE public.security_exam_questions ENABLE ROW LEVEL SECURITY;
INSERT INTO public.security_exam_questions VALUES
 ('p1','police','Un témoin vous signale un vol à l''arraché qui vient d''avoir lieu. Première chose à faire ?',ARRAY['Relever le signalement de l''auteur et alerter les patrouilles','Rédiger tout de suite le procès-verbal complet','Demander au témoin de revenir le lendemain'],0),
 ('p2','police','Qui dirige les enquêtes judiciaires de la police ?',ARRAY['Le maire','Le procureur de la République','Le préfet de région'],1),
 ('p3','police','Pendant un contrôle, la personne refuse de donner son identité. Vous pouvez :',ARRAY['La frapper pour l''intimider','La retenir pour vérification d''identité, 4 heures au plus','La laisser partir sans rien noter'],1),
 ('p4','police','Le numéro d''urgence de la police est le :',ARRAY['15','17','18'],1),
 ('f1','pompier_pro','Le numéro d''urgence des sapeurs-pompiers est le :',ARRAY['18','15','17'],0),
 ('f2','pompier_pro','Les trois éléments du triangle du feu sont :',ARRAY['Eau, air, chaleur','Combustible, comburant, énergie d''activation','Fumée, flamme, cendre'],1),
 ('f3','pompier_pro','La majorité des interventions des pompiers concerne :',ARRAY['Les incendies','Le secours aux personnes','Les animaux'],1),
 ('f4','pompier_pro','Une victime ne respire plus. Vous commencez :',ARRAY['Le massage cardiaque et l''alerte','À la mettre assise','À lui donner à boire'],0);

-- 3. Missions : 2 ou 3 choix, aucun parfait (chances de réussite, blessure, plainte en %) ---
CREATE TABLE public.security_missions (
  id text PRIMARY KEY,
  services text[] NOT NULL,
  source text NOT NULL CHECK (source IN ('crise','signalement','manif','routine')),
  title text NOT NULL,
  situation text NOT NULL,
  choices jsonb NOT NULL   -- [{id,label,ok,injury,complaint}]
);
GRANT SELECT ON public.security_missions TO authenticated; GRANT ALL ON public.security_missions TO service_role;
ALTER TABLE public.security_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_missions_read ON public.security_missions FOR SELECT TO authenticated USING (true);
INSERT INTO public.security_missions VALUES
 ('pol-patrouille',ARRAY['police'],'routine','Patrouille de quartier','Un groupe bruyant occupe un hall d''immeuble tard le soir. Des habitants se plaignent.',
  '[{"id":"dialogue","label":"Discuter calmement et demander de partir","ok":70,"injury":5,"complaint":5},{"id":"controle","label":"Contrôler les identités de tout le groupe","ok":80,"injury":10,"complaint":20},{"id":"renfort","label":"Attendre un renfort avant d''agir","ok":60,"injury":2,"complaint":0}]'),
 ('pol-plainte',ARRAY['police'],'routine','Accueil des plaintes','Une personne âgée vient porter plainte pour une arnaque au téléphone. La file d''attente est longue.',
  '[{"id":"detail","label":"Prendre le temps d''un dépôt de plainte complet","ok":85,"injury":0,"complaint":5},{"id":"rapide","label":"Enregistrer une main courante rapide","ok":55,"injury":0,"complaint":25}]'),
 ('pol-cambriolage',ARRAY['police'],'signalement','Intervention : cambriolage signalé','Un signalement grave indique des allers-retours suspects dans un local fermé du quartier.',
  '[{"id":"entrer","label":"Entrer tout de suite","ok":75,"injury":20,"complaint":5},{"id":"encercler","label":"Bloquer les sorties et attendre","ok":65,"injury":5,"complaint":0},{"id":"voisins","label":"Interroger d''abord les voisins","ok":50,"injury":0,"complaint":0}]'),
 ('pol-manif',ARRAY['police'],'manif','Encadrement d''une manifestation','Une manifestation traverse la ville. Quelques personnes veulent sortir du parcours déclaré.',
  '[{"id":"mediation","label":"Envoyer un agent parler aux organisateurs","ok":70,"injury":5,"complaint":5},{"id":"barrage","label":"Bloquer la rue avec un cordon","ok":75,"injury":15,"complaint":20}]'),
 ('pol-crise',ARRAY['police'],'crise','Crise en ville : sécuriser le secteur','La ville traverse une crise. Il faut sécuriser un périmètre et rassurer les habitants.',
  '[{"id":"perimetre","label":"Fermer largement le périmètre","ok":75,"injury":5,"complaint":15},{"id":"presence","label":"Rester visible et informer les passants","ok":65,"injury":10,"complaint":0}]'),
 ('feu-malaise',ARRAY['pompier_pro','pompier_vol'],'routine','Secours à personne : malaise','Une personne a fait un malaise dans un commerce. Elle est consciente mais très pâle.',
  '[{"id":"bilan","label":"Faire un bilan complet et appeler le médecin régulateur","ok":85,"injury":0,"complaint":5},{"id":"transport","label":"Transporter tout de suite à l''hôpital","ok":70,"injury":2,"complaint":10}]'),
 ('feu-accident',ARRAY['pompier_pro','pompier_vol'],'routine','Accident de la route','Deux voitures se sont percutées. Un conducteur est coincé, de l''essence coule.',
  '[{"id":"desincarcerer","label":"Découper la portière tout de suite","ok":75,"injury":15,"complaint":0},{"id":"securiser","label":"Sécuriser la fuite avant tout","ok":70,"injury":5,"complaint":5},{"id":"medical","label":"Attendre l''équipe médicale avant de bouger la victime","ok":60,"injury":2,"complaint":10}]'),
 ('feu-incendie',ARRAY['pompier_pro','pompier_vol'],'signalement','Feu d''appartement','Un feu s''est déclaré au 3e étage. Une voisine pense que quelqu''un est resté à l''intérieur.',
  '[{"id":"reconnaissance","label":"Monter en binôme pour chercher la personne","ok":75,"injury":25,"complaint":0},{"id":"attaque","label":"Éteindre le feu depuis l''extérieur d''abord","ok":60,"injury":5,"complaint":15}]'),
 ('feu-crise',ARRAY['pompier_pro','pompier_vol'],'crise','Crise : renfort des secours','La crise en cours multiplie les appels. Il faut choisir les interventions prioritaires.',
  '[{"id":"urgence","label":"Traiter d''abord les urgences vitales","ok":80,"injury":10,"complaint":10},{"id":"ordre","label":"Prendre les appels dans l''ordre","ok":55,"injury":5,"complaint":20}]'),
 ('feu-manif',ARRAY['pompier_pro','pompier_vol'],'manif','Poste de secours en manifestation','Une manifestation a lieu. Un participant est tombé et la foule se resserre.',
  '[{"id":"extraire","label":"Sortir la victime de la foule","ok":75,"injury":10,"complaint":5},{"id":"sur_place","label":"Soigner sur place en écartant la foule","ok":65,"injury":5,"complaint":5}]'),
 ('pc-poste',ARRAY['protection_civile'],'routine','Poste de secours','Vous tenez un poste de secours. Un enfant s''est blessé au genou, ses parents s''inquiètent.',
  '[{"id":"soin","label":"Soigner et rassurer la famille","ok":85,"injury":0,"complaint":2},{"id":"orienter","label":"Orienter vers un médecin par prudence","ok":70,"injury":0,"complaint":5}]'),
 ('pc-crise',ARRAY['protection_civile'],'crise','Aide aux sinistrés','La crise oblige des habitants à quitter leur logement. Il faut organiser un accueil.',
  '[{"id":"hebergement","label":"Ouvrir un hébergement d''urgence","ok":80,"injury":2,"complaint":5},{"id":"distribution","label":"Distribuer d''abord eau et couvertures","ok":70,"injury":2,"complaint":5}]'),
 ('pc-manif',ARRAY['protection_civile'],'manif','Secours pendant une manifestation','Il fait chaud pendant la manifestation. Plusieurs personnes se sentent mal.',
  '[{"id":"eau","label":"Installer un point d''eau à l''ombre","ok":80,"injury":0,"complaint":2},{"id":"mobile","label":"Circuler dans le cortège avec les sacs de secours","ok":70,"injury":5,"complaint":2}]'),
 ('pc-signalement',ARRAY['protection_civile'],'signalement','Soutien à la population','Un problème grave signalé dans le quartier inquiète les habitants. On vous demande d''aider.',
  '[{"id":"ecoute","label":"Écouter et informer les habitants","ok":75,"injury":0,"complaint":2},{"id":"securite","label":"Baliser la zone dangereuse","ok":70,"injury":5,"complaint":2}]');

-- 4. Carrière, concours, services, journal -------------------------------------------
CREATE TABLE public.security_careers (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  service text NOT NULL REFERENCES public.security_services(id),
  status text NOT NULL CHECK (status IN ('formation','service','quitte')),
  team text NOT NULL,
  rank integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL,
  trained_at timestamptz NOT NULL,
  missions_ok integer NOT NULL DEFAULT 0,
  missions_total integer NOT NULL DEFAULT 0,
  commendations integer NOT NULL DEFAULT 0,
  complaints integer NOT NULL DEFAULT 0,
  injured_until timestamptz,
  paid_week date
);
GRANT SELECT ON public.security_careers TO authenticated; GRANT ALL ON public.security_careers TO service_role;
ALTER TABLE public.security_careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_careers_owner ON public.security_careers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE TABLE public.security_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  service text NOT NULL REFERENCES public.security_services(id),
  request_id uuid NOT NULL UNIQUE,
  written integer NOT NULL, sport integer NOT NULL, oral integer NOT NULL,
  passed boolean NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT public.game_now()
);
GRANT SELECT ON public.security_exams TO authenticated; GRANT ALL ON public.security_exams TO service_role;
ALTER TABLE public.security_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_exams_owner ON public.security_exams FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE TABLE public.security_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  request_id uuid NOT NULL UNIQUE,
  service text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  hours integer NOT NULL,
  mission_id text NOT NULL REFERENCES public.security_missions(id),
  choice text,
  outcome text CHECK (outcome IN ('reussite','felicitations','blessure','plainte','echec','equipe')),
  settled boolean NOT NULL DEFAULT false
);
CREATE INDEX security_shifts_char ON public.security_shifts (character_id, starts_at DESC);
GRANT SELECT ON public.security_shifts TO authenticated; GRANT ALL ON public.security_shifts TO service_role;
ALTER TABLE public.security_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_shifts_owner ON public.security_shifts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE TABLE public.security_ledger (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  key text NOT NULL,
  kind text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, key)
);
GRANT SELECT ON public.security_ledger TO authenticated; GRANT ALL ON public.security_ledger TO service_role;
ALTER TABLE public.security_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_ledger_owner ON public.security_ledger FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

INSERT INTO public.life_rules (id, title, duration_minutes, energy_cost, energy_gain, money_cost, progression_gain, allowed_kinds)
VALUES ('security_shift', 'Service de sécurité ou de secours', 240, 0, 0, 0, 0, '{}') ON CONFLICT (id) DO NOTHING;

-- 5. Fonctions --------------------------------------------------------------------------
-- Équipes et horaires : heure de prise de service autorisée (± 1 h) et durée
CREATE FUNCTION public.security_team_info(_service text, _team text) RETURNS TABLE (start_hour integer, hours integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT * FROM (VALUES ('police','matin',5,8),('police','apres_midi',13,8),('police','nuit',21,8),
    ('pompier_pro','garde12',7,12),('pompier_pro','garde24',7,24),
    ('pompier_vol','disponible',-1,4),('protection_civile','libre',-1,4)) v(s,t,h,d)
  WHERE s = _service AND t = _team $$;

-- Règlement à la lecture : fin de formation, missions terminées, salaires hebdomadaires, avancement
CREATE FUNCTION public.security_settle(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE car public.security_careers; sv public.security_services; st public.security_settings; sh public.security_shifts;
  t timestamptz := public.game_now(); wk date; last_wk date; monthly integer; weekly integer; worked boolean; newrank integer; r integer; BEGIN
  SELECT * INTO car FROM public.security_careers WHERE character_id = _cid FOR UPDATE;
  IF NOT FOUND OR car.status = 'quitte' THEN RETURN; END IF;
  SELECT * INTO sv FROM public.security_services WHERE id = car.service;
  SELECT * INTO st FROM public.security_settings;

  -- Services terminés (une seule fois)
  FOR sh IN SELECT * FROM public.security_shifts WHERE character_id = _cid AND NOT settled AND ends_at <= t ORDER BY ends_at FOR UPDATE LOOP
    IF sh.choice IS NULL THEN
      UPDATE public.security_shifts SET outcome = 'equipe', settled = true WHERE id = sh.id;
    ELSE
      car.missions_total := car.missions_total + 1;
      IF sh.outcome IN ('reussite','felicitations') THEN car.missions_ok := car.missions_ok + 1; END IF;
      IF sh.outcome = 'felicitations' THEN car.commendations := car.commendations + 1; END IF;
      IF sh.outcome = 'plainte' THEN car.complaints := car.complaints + 1; END IF;
      IF sh.outcome = 'blessure' THEN car.injured_until := GREATEST(COALESCE(car.injured_until, sh.ends_at), sh.ends_at + st.injury_days * interval '1 day'); END IF;
      IF sh.outcome IN ('reussite','felicitations') AND sv.exclusive_job THEN
        INSERT INTO public.social_stats (character_id, reputation, influence) VALUES (_cid, 0, 0) ON CONFLICT (character_id) DO NOTHING;
        UPDATE public.social_stats SET reputation = reputation + CASE WHEN sh.outcome = 'felicitations' THEN 3 ELSE 1 END WHERE character_id = _cid;
      END IF;
      UPDATE public.security_shifts SET settled = true WHERE id = sh.id;
    END IF;
    IF sv.hourly_pay > 0 THEN
      INSERT INTO public.security_ledger (character_id, key, kind, amount, label) VALUES (_cid, 'vac:' || sh.id, 'indemnite', sv.hourly_pay * sh.hours, 'Indemnités : ' || sv.label) ON CONFLICT DO NOTHING;
      IF FOUND THEN PERFORM public.economy_cash(_cid, 'security-vac:' || sh.id, sv.hourly_pay * sh.hours, 'Indemnités — ' || sv.label, 'salaire', '{}'::jsonb); END IF;
    END IF;
    IF sv.civic_per_shift > 0 THEN PERFORM public.award_civic(_cid, 'security-shift:' || sh.id, 'security', sv.civic_per_shift); END IF;
  END LOOP;

  -- Fin de formation
  IF car.status = 'formation' AND t >= car.trained_at THEN
    car.status := 'service'; car.rank := 1;
    PERFORM public.economy_notify(_cid, 'security:trained:' || _cid || ':' || car.joined_at, 'Formation terminée', 'Vous êtes maintenant ' || sv.rank_titles[2] || '.');
  END IF;

  -- Avancement (bloqué au-delà du seuil de plaintes)
  IF car.status = 'service' AND car.complaints < st.complaint_block THEN
    newrank := car.rank;
    FOR r IN car.rank + 1 .. array_length(sv.rank_titles, 1) - 1 LOOP
      IF car.missions_ok >= sv.rank_missions[r + 1] THEN newrank := r; END IF;
    END LOOP;
    IF newrank > car.rank THEN
      car.rank := newrank;
      INSERT INTO public.security_ledger (character_id, key, kind, label) VALUES (_cid, 'grade:' || car.joined_at || ':' || newrank, 'grade', 'Promotion : ' || sv.rank_titles[newrank + 1]) ON CONFLICT DO NOTHING;
      PERFORM public.economy_notify(_cid, 'security:grade:' || _cid || ':' || car.joined_at || ':' || newrank, 'Promotion', 'Vous êtes promu ' || sv.rank_titles[newrank + 1] || '.');
    END IF;
  END IF;

  -- Salaires hebdomadaires (semaines entières écoulées) : formation payée ; en service, semaine payée si au moins un service ou un arrêt
  IF sv.exclusive_job THEN
    last_wk := date_trunc('week', t AT TIME ZONE 'UTC')::date - 7;
    wk := COALESCE(car.paid_week + 7, date_trunc('week', car.joined_at AT TIME ZONE 'UTC')::date);
    wk := GREATEST(wk, last_wk - 7 * 11);   -- au plus 12 semaines rattrapées
    WHILE wk <= last_wk LOOP
      IF (wk + 7)::timestamp AT TIME ZONE 'UTC' > car.joined_at THEN
        IF wk::timestamp AT TIME ZONE 'UTC' < car.trained_at THEN monthly := sv.training_monthly; worked := true;
        ELSE
          monthly := sv.rank_monthly[GREATEST(car.rank, 1) + 1];
          worked := EXISTS (SELECT 1 FROM public.security_shifts WHERE character_id = _cid AND starts_at >= wk::timestamp AT TIME ZONE 'UTC'
                              AND starts_at < (wk + 7)::timestamp AT TIME ZONE 'UTC' AND ends_at <= t)
                 OR (car.injured_until IS NOT NULL AND car.injured_until > wk::timestamp AT TIME ZONE 'UTC');
        END IF;
        weekly := round(monthly * 12 / 52.0);
        IF worked AND weekly > 0 THEN
          INSERT INTO public.security_ledger (character_id, key, kind, amount, label) VALUES (_cid, 'paie:' || wk, 'salaire', weekly, 'Traitement : ' || sv.label) ON CONFLICT DO NOTHING;
          IF FOUND THEN PERFORM public.economy_cash(_cid, 'security-paie:' || _cid || ':' || wk, weekly, 'Traitement — ' || sv.label, 'salaire', '{}'::jsonb); END IF;
        END IF;
      END IF;
      car.paid_week := wk; wk := wk + 7;
    END LOOP;
  END IF;

  UPDATE public.security_careers SET status = car.status, rank = car.rank, missions_ok = car.missions_ok, missions_total = car.missions_total,
    commendations = car.commendations, complaints = car.complaints, injured_until = car.injured_until, paid_week = car.paid_week WHERE character_id = _cid;
END $$;

CREATE FUNCTION public.security_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); car public.security_careers; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM public.security_settle(cid);
  SELECT * INTO car FROM public.security_careers WHERE character_id = cid;
  RETURN jsonb_build_object(
    'now', public.game_now(),
    'age', (SELECT age FROM public.characters WHERE id = cid),
    'energy', (SELECT energy FROM public.characters WHERE id = cid),
    'employed', EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid),
    'settings', (SELECT to_jsonb(s) - 'id' - 'installed_at' FROM public.security_settings s),
    'services', (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM public.security_services v),
    'questions', (SELECT jsonb_agg(jsonb_build_object('id', q.id, 'service', q.service, 'question', q.question, 'choices', q.choices) ORDER BY q.id) FROM public.security_exam_questions q),
    'career', CASE WHEN car.character_id IS NULL THEN NULL ELSE to_jsonb(car) END,
    'exams', COALESCE((SELECT jsonb_agg(to_jsonb(e) - 'request_id' ORDER BY e.taken_at DESC) FROM public.security_exams e WHERE e.character_id = cid), '[]'::jsonb),
    'shifts', COALESCE((SELECT jsonb_agg(to_jsonb(x) - 'request_id' ORDER BY x.starts_at DESC) FROM (SELECT * FROM public.security_shifts WHERE character_id = cid ORDER BY starts_at DESC LIMIT 20) x), '[]'::jsonb),
    'ledger', COALESCE((SELECT jsonb_agg(to_jsonb(l) - 'character_id' ORDER BY l.created_at DESC) FROM (SELECT * FROM public.security_ledger WHERE character_id = cid ORDER BY created_at DESC LIMIT 20) l), '[]'::jsonb));
END $$;

-- Concours (police, pompiers pros) ou inscription directe (volontaires, protection civile)
CREATE FUNCTION public.security_apply(_service text, _team text, _answers jsonb, _request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; sv public.security_services; st public.security_settings; car public.security_careers;
  t timestamptz := public.game_now(); w integer := 0; sp integer; o integer; ok boolean; hp integer; q record; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.security_exams WHERE request_id = _request) THEN RETURN public.security_state(); END IF;
  SELECT * INTO sv FROM public.security_services WHERE id = _service;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service inconnu.'; END IF;
  SELECT * INTO st FROM public.security_settings;
  IF NOT EXISTS (SELECT 1 FROM public.security_team_info(_service, _team)) THEN RAISE EXCEPTION 'Équipe inconnue pour ce service.'; END IF;
  SELECT * INTO car FROM public.security_careers WHERE character_id = cid;
  IF FOUND AND car.status <> 'quitte' THEN RAISE EXCEPTION 'Vous êtes déjà engagé dans un service. Quittez-le d''abord.'; END IF;
  IF c.age < sv.min_age OR c.age > sv.max_age THEN RAISE EXCEPTION 'Âge requis : de % à % ans.', sv.min_age, sv.max_age; END IF;
  IF sv.exclusive_job AND EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid) THEN
    RAISE EXCEPTION 'Ce métier est à temps plein : quittez d''abord votre emploi actuel.'; END IF;

  IF sv.exam THEN
    IF EXISTS (SELECT 1 FROM public.security_exams WHERE character_id = cid AND service = _service AND taken_at > t - st.exam_retry_days * interval '1 day') THEN
      RAISE EXCEPTION 'Prochaine session du concours dans % jours au plus.', st.exam_retry_days; END IF;
    IF c.energy < st.exam_energy THEN RAISE EXCEPTION 'Pas assez d''énergie pour les épreuves sportives (% nécessaires).', st.exam_energy; END IF;
    FOR q IN SELECT * FROM public.security_exam_questions WHERE service = CASE WHEN _service = 'police' THEN 'police' ELSE 'pompier_pro' END LOOP
      IF (_answers ->> q.id) IS NOT NULL AND (_answers ->> q.id) ~ '^[0-9]+$' AND (_answers ->> q.id)::integer = q.answer THEN w := w + 5; END IF;
    END LOOP;
    hp := COALESCE((SELECT health FROM public.health_profiles WHERE character_id = cid), 70);
    sp := LEAST(20, round((hp * 0.6 + c.energy * 0.4) / 5.0)::integer);
    o := 8 + abs(hashtext(cid::text || ':' || _service || ':' || t::date)) % 10;
    ok := w + sp + o >= st.exam_pass_total AND w >= st.exam_min_each AND sp >= st.exam_min_each AND o >= st.exam_min_each;
    UPDATE public.characters SET energy = energy - st.exam_energy WHERE id = cid;
    INSERT INTO public.security_exams (character_id, service, request_id, written, sport, oral, passed) VALUES (cid, _service, _request, w, sp, o, ok);
    IF NOT ok THEN RETURN public.security_state(); END IF;
  ELSE
    INSERT INTO public.security_exams (character_id, service, request_id, written, sport, oral, passed) VALUES (cid, _service, _request, 0, 0, 0, true);
  END IF;

  INSERT INTO public.security_careers (character_id, service, status, team, rank, joined_at, trained_at, paid_week)
  VALUES (cid, _service, 'formation', _team, 0, t, t + sv.training_days * interval '1 day', NULL)
  ON CONFLICT (character_id) DO UPDATE SET service = EXCLUDED.service, status = 'formation', team = EXCLUDED.team, rank = 0, joined_at = t,
    trained_at = EXCLUDED.trained_at, missions_ok = 0, missions_total = 0, commendations = 0, complaints = 0, injured_until = NULL, paid_week = NULL;
  INSERT INTO public.security_ledger (character_id, key, kind, label) VALUES (cid, 'entree:' || _request, 'entree', 'Entrée en formation : ' || sv.label);
  IF sv.exclusive_job THEN UPDATE public.characters SET situation = sv.rank_titles[1] WHERE id = cid; END IF;
  RETURN public.security_state();
END $$;

-- Changer d'équipe (horaires)
CREATE FUNCTION public.security_set_team(_team text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); car public.security_careers; BEGIN
  SELECT * INTO car FROM public.security_careers WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND OR car.status = 'quitte' THEN RAISE EXCEPTION 'Aucun engagement en cours.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.security_team_info(car.service, _team)) THEN RAISE EXCEPTION 'Équipe inconnue pour ce service.'; END IF;
  UPDATE public.security_careers SET team = _team WHERE character_id = cid;
  RETURN public.security_state();
END $$;

-- Prendre son service : horaires, repos, énergie ; mission tirée des faits publics de la ville
CREATE FUNCTION public.security_start_shift(_request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; car public.security_careers; sv public.security_services; st public.security_settings;
  t timestamptz := public.game_now(); h integer; ti record; energy integer; src text; mis text; last_end timestamptz; last_hours integer;
  loc uuid; rest interval; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.security_shifts WHERE request_id = _request) THEN RETURN public.security_state(); END IF;
  PERFORM public.security_settle(cid);
  SELECT * INTO car FROM public.security_careers WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND OR car.status = 'quitte' THEN RAISE EXCEPTION 'Aucun engagement en cours.'; END IF;
  IF car.status = 'formation' THEN RAISE EXCEPTION 'Vous êtes encore en formation.'; END IF;
  IF car.injured_until IS NOT NULL AND car.injured_until > t THEN RAISE EXCEPTION 'Vous êtes en arrêt après une blessure.'; END IF;
  SELECT * INTO sv FROM public.security_services WHERE id = car.service;
  SELECT * INTO st FROM public.security_settings;
  SELECT * INTO ti FROM public.security_team_info(car.service, car.team);
  h := extract(hour FROM t AT TIME ZONE 'UTC')::integer;

  IF ti.start_hour >= 0 AND least(abs(h - ti.start_hour), 24 - abs(h - ti.start_hour)) > 1 THEN
    RAISE EXCEPTION 'Votre équipe prend son service vers %h (une heure avant ou après).', ti.start_hour; END IF;
  IF car.service = 'police' AND ((t AT TIME ZONE 'UTC')::date - (car.trained_at AT TIME ZONE 'UTC')::date) % 6 >= 4 THEN
    RAISE EXCEPTION 'Jour de repos : votre cycle est de 4 jours de travail puis 2 jours de repos.'; END IF;
  IF car.service = 'pompier_vol' AND h BETWEEN 7 AND 17 AND extract(isodow FROM t AT TIME ZONE 'UTC') < 6 THEN
    RAISE EXCEPTION 'Les volontaires sont disponibles le soir (après 18h), la nuit et le week-end.'; END IF;

  SELECT ends_at, hours INTO last_end, last_hours FROM public.security_shifts WHERE character_id = cid ORDER BY ends_at DESC LIMIT 1;
  rest := CASE WHEN last_hours >= 24 THEN interval '48 hours' WHEN last_hours >= 12 THEN interval '24 hours' ELSE interval '11 hours' END;
  IF last_end IS NOT NULL AND t < last_end + rest THEN RAISE EXCEPTION 'Repos obligatoire avant le prochain service.'; END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND status IN ('planned','running') AND start_time < t + ti.hours * interval '1 hour' AND end_time > t) THEN
    RAISE EXCEPTION 'Ce service chevauche votre agenda.'; END IF;
  energy := ceil(st.energy_per_8h * ti.hours / 8.0 * CASE WHEN ti.hours >= 24 THEN 0.8 ELSE 1 END)::integer;
  IF c.energy < energy THEN RAISE EXCEPTION 'Pas assez d''énergie (% nécessaires).', energy; END IF;

  src := CASE
    WHEN EXISTS (SELECT 1 FROM public.crises WHERE city_id = c.city_id AND status <> 'terminee') THEN 'crise'
    WHEN EXISTS (SELECT 1 FROM public.protests WHERE city_id = c.city_id AND status IN ('planned','ongoing')) AND abs(hashtext(_request::text)) % 2 = 0 THEN 'manif'
    WHEN EXISTS (SELECT 1 FROM public.public_issues WHERE city_id = c.city_id AND status <> 'resolved' AND severity >= 3) AND abs(hashtext(_request::text || 's')) % 2 = 0 THEN 'signalement'
    ELSE 'routine' END;
  SELECT id INTO mis FROM public.security_missions WHERE car.service = ANY (services) AND source = src
    ORDER BY abs(hashtext(id || _request::text)) LIMIT 1;
  IF mis IS NULL THEN SELECT id INTO mis FROM public.security_missions WHERE car.service = ANY (services) AND source = 'routine' ORDER BY abs(hashtext(id || _request::text)) LIMIT 1; END IF;

  SELECT location_id INTO loc FROM public.character_positions WHERE character_id = cid;
  IF loc IS NULL THEN RAISE EXCEPTION 'Position introuvable.'; END IF;
  UPDATE public.characters SET energy = energy - energy WHERE id = cid;
  INSERT INTO public.security_shifts (character_id, request_id, service, starts_at, ends_at, hours, mission_id)
  VALUES (cid, _request, car.service, t, t + ti.hours * interval '1 hour', ti.hours, mis);
  INSERT INTO public.activities (character_id, type, title, start_time, end_time, location_id, energy_cost, status, source_key)
  VALUES (cid, 'security_shift', 'Service : ' || sv.label, t, t + ti.hours * interval '1 hour', loc, energy, 'running', 'security:' || _request);
  RETURN public.security_state();
END $$;

-- Choix pendant la mission en cours : résultat déterministe, appliqué en fin de service
CREATE FUNCTION public.security_choose(_shift uuid, _choice text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); sh public.security_shifts; m public.security_missions; ch jsonb; st public.security_settings; roll integer; res text; BEGIN
  SELECT * INTO sh FROM public.security_shifts WHERE id = _shift AND character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service introuvable.'; END IF;
  IF sh.choice IS NOT NULL THEN RETURN public.security_state(); END IF;
  IF sh.ends_at <= public.game_now() THEN RAISE EXCEPTION 'Ce service est terminé.'; END IF;
  SELECT * INTO m FROM public.security_missions WHERE id = sh.mission_id;
  SELECT x INTO ch FROM jsonb_array_elements(m.choices) x WHERE x->>'id' = _choice;
  IF ch IS NULL THEN RAISE EXCEPTION 'Choix inconnu.'; END IF;
  SELECT * INTO st FROM public.security_settings;
  roll := abs(hashtext(sh.id::text || ':' || _choice)) % 100;
  res := CASE
    WHEN roll < (ch->>'injury')::integer THEN 'blessure'
    WHEN roll < (ch->>'injury')::integer + (ch->>'complaint')::integer THEN 'plainte'
    WHEN abs(hashtext(sh.id::text || ':ok')) % 100 < (ch->>'ok')::integer THEN
      CASE WHEN abs(hashtext(sh.id::text || ':bravo')) % 100 < st.commendation_pct THEN 'felicitations' ELSE 'reussite' END
    ELSE 'echec' END;
  UPDATE public.security_shifts SET choice = _choice, outcome = res WHERE id = sh.id;
  RETURN public.security_state();
END $$;

CREATE FUNCTION public.security_quit() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); car public.security_careers; sv public.security_services; BEGIN
  PERFORM public.security_settle(cid);
  SELECT * INTO car FROM public.security_careers WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND OR car.status = 'quitte' THEN RAISE EXCEPTION 'Aucun engagement en cours.'; END IF;
  IF EXISTS (SELECT 1 FROM public.security_shifts WHERE character_id = cid AND ends_at > public.game_now()) THEN RAISE EXCEPTION 'Terminez d''abord votre service en cours.'; END IF;
  SELECT * INTO sv FROM public.security_services WHERE id = car.service;
  UPDATE public.security_careers SET status = 'quitte' WHERE character_id = cid;
  INSERT INTO public.security_ledger (character_id, key, kind, label) VALUES (cid, 'depart:' || car.joined_at, 'depart', 'Départ : ' || sv.label) ON CONFLICT DO NOTHING;
  IF sv.exclusive_job AND NOT EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid) THEN
    UPDATE public.characters SET situation = 'En recherche d’emploi' WHERE id = cid; END IF;
  RETURN public.security_state();
END $$;

REVOKE ALL ON FUNCTION public.security_settle(uuid), public.security_team_info(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_settle(uuid), public.security_team_info(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.security_state(), public.security_apply(text, text, jsonb, uuid), public.security_set_team(text),
  public.security_start_shift(uuid), public.security_choose(uuid, text), public.security_quit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_state(), public.security_apply(text, text, jsonb, uuid), public.security_set_team(text),
  public.security_start_shift(uuid), public.security_choose(uuid, text), public.security_quit() TO authenticated, service_role;

COMMIT;
