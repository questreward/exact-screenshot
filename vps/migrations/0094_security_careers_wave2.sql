-- 0094 — Carrières de sécurité, vague 2 : Gendarmerie nationale, SAMU (ambulancier, infirmier).
-- Touché : security_services (contrôle des identifiants élargi + 3 lignes), security_exam_questions (+8),
-- security_missions (+10), 3 fonctions remplacées après vérification d'empreinte :
--   security_team_info (nouvelles équipes), security_apply (questions du concours propres à chaque service),
--   security_start_shift (cycle 5/2 des gendarmes). Comportement inchangé pour les 4 services existants.
-- Aucune donnée de joueur modifiée.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.security_careers') IS NULL THEN RAISE EXCEPTION '0093 requise'; END IF;
  IF EXISTS (SELECT 1 FROM public.security_services WHERE id = 'gendarmerie') THEN RAISE EXCEPTION '0094 déjà installée : ne pas relancer'; END IF;
  IF (SELECT string_agg(proname || '=' || md5(btrim(regexp_replace(prosrc,'\s+',' ','g'))), ',' ORDER BY proname) FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace AND proname IN ('security_apply','security_start_shift','security_team_info'))
     <> 'security_apply=d4cf6e9fa5a4ae8b9e023e556d755b80,security_start_shift=e9a4308f51a21b0fe171483b1b06dae8,security_team_info=433dd8a5eb47caef710c7fe90ea7ee83' THEN
    RAISE EXCEPTION 'Fonctions de carrière modifiées depuis 0093 : installation annulée'; END IF;
END $$;

ALTER TABLE public.security_services DROP CONSTRAINT security_services_id_check;
ALTER TABLE public.security_services ADD CONSTRAINT security_services_id_check
  CHECK (id IN ('police','pompier_pro','pompier_vol','protection_civile','gendarmerie','samu_ambulancier','samu_infirmier'));
INSERT INTO public.security_services VALUES
 ('gendarmerie','Gendarmerie nationale',17,40,true,28,1400,ARRAY['Élève gendarme','Gendarme','Maréchal des logis-chef','Adjudant','Adjudant-chef'],ARRAY[1400,1900,2150,2450,2800],ARRAY[0,0,10,25,50],0,0,true),
 ('samu_ambulancier','SAMU — Ambulancier',18,60,false,14,1750,ARRAY['Ambulancier stagiaire','Ambulancier','Ambulancier confirmé','Ambulancier référent'],ARRAY[1750,1750,1950,2200],ARRAY[0,0,10,25],0,0,true),
 ('samu_infirmier','SAMU — Infirmier',21,60,true,21,2100,ARRAY['Infirmier en formation','Infirmier','Infirmier confirmé','Infirmier référent'],ARRAY[2100,2100,2500,2900],ARRAY[0,0,10,25],0,0,true);

INSERT INTO public.security_exam_questions VALUES
 ('g1','gendarmerie','La gendarmerie est surtout présente :',ARRAY['Dans les grandes villes uniquement','Dans les zones rurales et périurbaines','Seulement aux frontières'],1),
 ('g2','gendarmerie','La gendarmerie dépend :',ARRAY['Du ministère de l''Intérieur, avec un statut militaire','Du ministère de la Santé','De la mairie'],0),
 ('g3','gendarmerie','Lors d''un contrôle routier, un conducteur semble avoir bu. Vous :',ARRAY['Le laissez repartir doucement','Procédez à un dépistage d''alcoolémie','Lui confisquez sa voiture définitivement'],1),
 ('g4','gendarmerie','Un accident a lieu sur une route de campagne. Priorité :',ARRAY['Baliser la zone et alerter les secours','Photographier les véhicules','Faire circuler les autres voitures'],0),
 ('i1','samu_infirmier','Le numéro du SAMU est le :',ARRAY['17','15','18'],1),
 ('i2','samu_infirmier','Une personne inconsciente qui respire est placée :',ARRAY['En position latérale de sécurité','Debout contre un mur','Sur le ventre, bras levés'],0),
 ('i3','samu_infirmier','Qui décide de l''envoi d''une équipe du SAMU ?',ARRAY['Le médecin régulateur','Le maire','Le patient lui-même'],0),
 ('i4','samu_infirmier','Avant tout soin, l''infirmier doit :',ARRAY['Se laver les mains et se protéger','Donner un médicament au hasard','Attendre la famille'],0);

INSERT INTO public.security_missions VALUES
 ('gen-route',ARRAY['gendarmerie'],'routine','Contrôle routier','Vous tenez un contrôle à l''entrée de la ville. Une voiture ralentit puis tente de faire demi-tour.',
  '[{"id":"suivre","label":"La suivre pour l''arrêter","ok":75,"injury":15,"complaint":5},{"id":"signaler","label":"Relever la plaque et prévenir les patrouilles","ok":60,"injury":0,"complaint":0},{"id":"barrage","label":"Bloquer la route avec le véhicule","ok":70,"injury":10,"complaint":15}]'),
 ('gen-surveillance',ARRAY['gendarmerie'],'routine','Surveillance de secteur','Des habitants d''un quartier calme signalent des vols dans les jardins la nuit.',
  '[{"id":"ronde","label":"Organiser des rondes de nuit","ok":70,"injury":5,"complaint":0},{"id":"voisins","label":"Monter une réunion avec les voisins","ok":65,"injury":0,"complaint":2}]'),
 ('gen-cambriolage',ARRAY['gendarmerie'],'signalement','Intervention : cambriolage','Un signalement grave fait état d''une maison forcée. Les auteurs sont peut-être encore là.',
  '[{"id":"entrer","label":"Entrer à deux tout de suite","ok":75,"injury":20,"complaint":5},{"id":"attendre","label":"Encercler et attendre les renforts","ok":65,"injury":5,"complaint":0}]'),
 ('gen-manif',ARRAY['gendarmerie'],'manif','Maintien de l''ordre','Une manifestation se tend près d''un bâtiment public.',
  '[{"id":"dialogue","label":"Ouvrir le dialogue avec les organisateurs","ok":70,"injury":5,"complaint":5},{"id":"cordon","label":"Former un cordon devant le bâtiment","ok":75,"injury":15,"complaint":20}]'),
 ('gen-crise',ARRAY['gendarmerie'],'crise','Crise : bouclage et évacuation','La crise oblige à évacuer une rue. Certains habitants refusent de partir.',
  '[{"id":"convaincre","label":"Prendre le temps de convaincre","ok":65,"injury":5,"complaint":2},{"id":"imposer","label":"Imposer l''évacuation","ok":80,"injury":10,"complaint":20}]'),
 ('samu-malaise',ARRAY['samu_ambulancier','samu_infirmier'],'routine','Malaise à domicile','Un homme de 70 ans a une douleur dans la poitrine. Sa femme est paniquée.',
  '[{"id":"ecg","label":"Faire les examens sur place avant de partir","ok":80,"injury":0,"complaint":5},{"id":"rapide","label":"Partir tout de suite vers l''hôpital","ok":70,"injury":2,"complaint":10}]'),
 ('samu-respiration',ARRAY['samu_ambulancier','samu_infirmier'],'routine','Détresse respiratoire','Une jeune femme fait une forte crise d''asthme dans la rue.',
  '[{"id":"oxygene","label":"Oxygène et surveillance avant transport","ok":85,"injury":0,"complaint":2},{"id":"transport","label":"Transport immédiat","ok":70,"injury":2,"complaint":8}]'),
 ('samu-accident',ARRAY['samu_ambulancier','samu_infirmier'],'signalement','Accident grave','Un scooter a percuté un poteau. Le conducteur ne bouge plus.',
  '[{"id":"immobiliser","label":"Immobiliser avant tout mouvement","ok":80,"injury":5,"complaint":5},{"id":"degager","label":"Le dégager vite de la route","ok":65,"injury":10,"complaint":15}]'),
 ('samu-crise',ARRAY['samu_ambulancier','samu_infirmier'],'crise','Crise : afflux de blessés','La crise provoque de nombreux blessés. Il faut trier les urgences.',
  '[{"id":"tri","label":"Trier selon la gravité","ok":80,"injury":5,"complaint":10},{"id":"premier","label":"Soigner le premier arrivé","ok":55,"injury":2,"complaint":20}]'),
 ('samu-manif',ARRAY['samu_ambulancier','samu_infirmier'],'manif','Poste médical en manifestation','Pendant la manifestation, une personne fait une crise d''épilepsie.',
  '[{"id":"proteger","label":"Protéger la personne et attendre la fin de la crise","ok":85,"injury":2,"complaint":2},{"id":"evacuer","label":"L''évacuer tout de suite","ok":65,"injury":5,"complaint":10}]');

CREATE OR REPLACE FUNCTION public.security_team_info(_service text, _team text) RETURNS TABLE (start_hour integer, hours integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT h, d FROM (VALUES ('police','matin',5,8),('police','apres_midi',13,8),('police','nuit',21,8),
    ('pompier_pro','garde12',7,12),('pompier_pro','garde24',7,24),
    ('gendarmerie','matin',5,8),('gendarmerie','apres_midi',13,8),('gendarmerie','nuit',21,8),
    ('samu_ambulancier','garde_jour',7,12),('samu_ambulancier','garde_nuit',19,12),('samu_infirmier','garde_jour',7,12),('samu_infirmier','garde_nuit',19,12),
    ('pompier_vol','disponible',-1,4),('protection_civile','libre',-1,4)) v(s,t,h,d)
  WHERE s = _service AND t = _team $$;

CREATE OR REPLACE FUNCTION public.security_apply(_service text, _team text, _answers jsonb, _request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    FOR q IN SELECT * FROM public.security_exam_questions WHERE service = _service LOOP
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

CREATE OR REPLACE FUNCTION public.security_start_shift(_request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; car public.security_careers; sv public.security_services; st public.security_settings;
  t timestamptz := public.game_now(); h integer; ti record; need integer; src text; mis text; last_end timestamptz; last_hours integer;
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
  IF car.service = 'gendarmerie' AND ((t AT TIME ZONE 'UTC')::date - (car.trained_at AT TIME ZONE 'UTC')::date) % 7 >= 5 THEN
    RAISE EXCEPTION 'Jour de repos : votre cycle est de 5 jours de travail puis 2 jours de repos.'; END IF;
  IF car.service = 'pompier_vol' AND h BETWEEN 7 AND 17 AND extract(isodow FROM t AT TIME ZONE 'UTC') < 6 THEN
    RAISE EXCEPTION 'Les volontaires sont disponibles le soir (après 18h), la nuit et le week-end.'; END IF;

  SELECT ends_at, hours INTO last_end, last_hours FROM public.security_shifts WHERE character_id = cid ORDER BY ends_at DESC LIMIT 1;
  rest := CASE WHEN last_hours >= 24 THEN interval '48 hours' WHEN last_hours >= 12 THEN interval '24 hours' ELSE interval '11 hours' END;
  IF last_end IS NOT NULL AND t < last_end + rest THEN RAISE EXCEPTION 'Repos obligatoire avant le prochain service.'; END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND status IN ('planned','running') AND start_time < t + ti.hours * interval '1 hour' AND end_time > t) THEN
    RAISE EXCEPTION 'Ce service chevauche votre agenda.'; END IF;
  need := ceil(st.energy_per_8h * ti.hours / 8.0 * CASE WHEN ti.hours >= 24 THEN 0.8 ELSE 1 END)::integer;
  IF c.energy < need THEN RAISE EXCEPTION 'Pas assez d''énergie (% nécessaires).', need; END IF;

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
  UPDATE public.characters SET energy = energy - need WHERE id = cid;
  INSERT INTO public.security_shifts (character_id, request_id, service, starts_at, ends_at, hours, mission_id)
  VALUES (cid, _request, car.service, t, t + ti.hours * interval '1 hour', ti.hours, mis);
  INSERT INTO public.activities (character_id, type, title, start_time, end_time, location_id, energy_cost, status, source_key)
  VALUES (cid, 'security_shift', 'Service : ' || sv.label, t, t + ti.hours * interval '1 hour', loc, need, 'running', 'security:' || _request);
  RETURN public.security_state();
END $$;

REVOKE ALL ON FUNCTION public.security_team_info(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_team_info(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.security_apply(text, text, jsonb, uuid), public.security_start_shift(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_apply(text, text, jsonb, uuid), public.security_start_shift(uuid) TO authenticated, service_role;

COMMIT;
