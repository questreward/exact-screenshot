-- CIVITAS – BLOC 15 : OUVERTURE DE LA POLITIQUE NATIONALE (après v3)
-- Tout ou rien : la moindre erreur annule l'ensemble.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0045_bloc15_activation.sql
BEGIN;

-- 1. Les 5 lois validées ------------------------------------------------------
UPDATE public.national_law_templates SET title='Plan logement abordable', category='Logement', active=true,
  effects='{"housing":6,"satisfaction":2,"commerce":-1}' WHERE id='law-01';
UPDATE public.national_law_templates SET title='Transports du quotidien', category='Transports', active=true,
  effects='{"transport":6,"environment":2,"employment":1}' WHERE id='law-02';
UPDATE public.national_law_templates SET title='Soutien à l''emploi local', category='Emploi', active=true,
  effects='{"employment":5,"commerce":3,"environment":-1}' WHERE id='law-03';
UPDATE public.national_law_templates SET title='Villes vertes', category='Environnement', active=true,
  effects='{"environment":6,"culture":1,"commerce":-2}' WHERE id='law-04';
UPDATE public.national_law_templates SET title='Sécurité et services publics', category='Services publics', active=true,
  effects='{"safety":4,"services":4,"satisfaction":1}' WHERE id='law-05';

-- 2. Position de vote de chaque parti (et du groupe Divers) sur chaque loi -----
CREATE TABLE public.national_law_positions (
  template_id text NOT NULL REFERENCES public.national_law_templates(id),
  party_key text NOT NULL,            -- identifiant du parti, ou 'divers'
  vote text NOT NULL CHECK (vote IN ('yes','no')),
  PRIMARY KEY (template_id, party_key)
);
GRANT SELECT ON public.national_law_positions TO authenticated;
GRANT ALL ON public.national_law_positions TO service_role;
ALTER TABLE public.national_law_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_law_positions_read ON public.national_law_positions FOR SELECT TO authenticated USING (true);

INSERT INTO public.national_law_positions (template_id, party_key, vote)
SELECT t.id, p.k, (p.votes)[t.n] FROM
 (VALUES ('law-01',1),('law-02',2),('law-03',3),('law-04',4),('law-05',5)) AS t(id,n)
CROSS JOIN (VALUES
 ('7a7a0000-0000-4000-8000-000000000001', ARRAY['yes','yes','yes','no','no']),   -- Avenir Commun
 ('7a7a0000-0000-4000-8000-000000000002', ARRAY['no','no','yes','no','yes']),    -- Initiative
 ('7a7a0000-0000-4000-8000-000000000003', ARRAY['yes','yes','no','yes','no']),   -- Territoires & Nature
 ('7a7a0000-0000-4000-8000-000000000004', ARRAY['yes','yes','yes','yes','yes']), -- Concorde
 ('divers',                               ARRAY['yes','no','yes','no','yes'])    -- Divers (Sénat)
) AS p(k,votes);

-- 3. Activation autorisée ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.national_configure(_rules jsonb,_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE approved jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT rules INTO approved FROM public.national_settings WHERE id=1;
 IF _rules IS DISTINCT FROM approved THEN RAISE EXCEPTION 'Les paramètres validés sont figés ; nouvelle proposition requise'; END IF;
 IF _enabled IS NULL THEN RAISE EXCEPTION 'Activation explicite requise'; END IF;
 UPDATE public.national_settings SET enabled=_enabled WHERE id=1;
END $$;

-- 4. Candidatures : publication unique à la clôture, candidats fictifs autorisés -
CREATE OR REPLACE FUNCTION public.national_candidate_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.national_elections;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Candidature conservée dans l’historique'; END IF;
 SELECT * INTO e FROM public.national_elections WHERE id=NEW.election_id;
 IF NOT FOUND OR NEW.organization_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.national_party_profiles p JOIN public.organizations o ON o.id=p.organization_id WHERE p.organization_id=NEW.organization_id AND o.kind='party' AND o.status='active' AND (e.rules->'party_snapshot') ? o.id::text) THEN RAISE EXCEPTION 'Candidature indépendante/non configurée interdite'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'program'-'published_at') IS DISTINCT FROM (to_jsonb(OLD)-'program'-'published_at') THEN RAISE EXCEPTION 'Candidature figée'; END IF;
  IF NEW.published_at IS DISTINCT FROM OLD.published_at AND (OLD.published_at IS NOT NULL OR public.game_now()<e.candidacies_end_at) THEN RAISE EXCEPTION 'Publication unique à la clôture des candidatures'; END IF;
  IF NEW.program IS DISTINCT FROM OLD.program AND public.game_now()>=e.candidacies_end_at THEN RAISE EXCEPTION 'Programme figé'; END IF;
 END IF;
 IF TG_OP='INSERT' AND (NEW.published_at IS NOT NULL OR NEW.fictional_votes<>0) THEN RAISE EXCEPTION 'Candidature initiale invalide'; END IF;
 RETURN NEW;
END $$;

-- 5. Législature : Sénat constitué une seule fois ---------------------------------
CREATE OR REPLACE FUNCTION public.national_legislature_calendar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.national_elections;
BEGIN
 SELECT * INTO e FROM public.national_elections WHERE id=NEW.election_id;
 IF NOT FOUND OR NEW.starts_at IS DISTINCT FROM e.vote_end_at OR NEW.ends_at IS DISTINCT FROM e.term_end_at THEN RAISE EXCEPTION 'Mandat national ancré à la clôture du vote pour 28 jours'; END IF;
 IF TG_OP='INSERT' AND (NEW.senate_composed_at IS NOT NULL OR NEW.senate_source<>'[]'::jsonb) THEN RAISE EXCEPTION 'Sénat initialement non constitué'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'senate_composed_at'-'senate_source') IS DISTINCT FROM (to_jsonb(OLD)-'senate_composed_at'-'senate_source') THEN RAISE EXCEPTION 'Mandat national immuable'; END IF;
  IF OLD.senate_composed_at IS NOT NULL AND (NEW.senate_composed_at IS DISTINCT FROM OLD.senate_composed_at OR NEW.senate_source IS DISTINCT FROM OLD.senate_source) THEN RAISE EXCEPTION 'Sénat déjà constitué, immuable'; END IF;
  IF OLD.senate_composed_at IS NULL AND NEW.senate_composed_at IS NOT NULL AND NEW.senate_source='[]'::jsonb THEN RAISE EXCEPTION 'Source du Sénat requise'; END IF;
 END IF;
 RETURN NEW;
END $$;

-- 6. Sénat : 25 sièges proportionnels aux élus municipaux (Divers inclus) ;
--    sans aucun conseil élu, Sénat de départ fictif à parts égales (5×5). -------
CREATE OR REPLACE FUNCTION public.national_compose_senate(_lid uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.national_legislatures; e public.national_elections; source jsonb; weights jsonb; at_time timestamptz:=public.game_now(); x record; gid uuid; n integer; seat_index integer:=0; total numeric;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_legislatures WHERE id=_lid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Législature introuvable'; END IF;
 IF l.senate_composed_at IS NOT NULL THEN RETURN true; END IF;
 IF at_time<l.starts_at OR at_time>=l.ends_at THEN RETURN false; END IF;
 SELECT * INTO e FROM public.national_elections WHERE id=l.election_id;
 SELECT jsonb_agg(jsonb_build_object('mandate_id',m.id,'group_id',g.id,'organization_id',g.organization_id,'seats',g.seats) ORDER BY m.id,g.id)
 INTO source FROM public.municipal_mandates m JOIN public.municipal_council_groups g ON g.mandate_id=m.id
 WHERE m.status='active' AND m.starts_at<=at_time AND m.ends_at>at_time AND g.seats>0;
 IF source IS NULL THEN
  source:=jsonb_build_array(jsonb_build_object('initial_fictional_senate',true));
  SELECT jsonb_object_agg(k,1) INTO weights FROM (SELECT p.organization_id::text k FROM public.national_party_profiles p UNION ALL SELECT 'divers') q;
 ELSE
  SELECT jsonb_object_agg(k,s) INTO weights FROM (
   SELECT CASE WHEN p.organization_id IS NULL THEN 'divers' ELSE p.organization_id::text END k, sum((x->>'seats')::int) s
   FROM jsonb_array_elements(source) x LEFT JOIN public.national_party_profiles p ON p.organization_id=(x->>'organization_id')::uuid
   GROUP BY 1) q;
 END IF;
 SELECT sum(value::numeric) INTO total FROM jsonb_each_text(weights);
 FOR x IN WITH w AS (SELECT key k, value::numeric v FROM jsonb_each_text(weights)),
  q AS (SELECT k,((25*v-mod(25*v,total))/total)::int base, mod(25*v,total) rem FROM w),
  o AS (SELECT *, row_number() OVER (ORDER BY rem DESC, md5(e.tie_seed::text||':senate:'||k), k) rn, 25-sum(base) OVER () remaining FROM q)
  SELECT k, base+CASE WHEN rn<=remaining THEN 1 ELSE 0 END seats FROM o ORDER BY k LOOP
  CONTINUE WHEN x.seats=0;
  IF x.k='divers' THEN
   INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name) VALUES(l.id,'senate',NULL,'Divers') RETURNING id INTO gid;
  ELSE
   INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name)
   SELECT l.id,'senate',o.id,o.name FROM public.organizations o WHERE o.id=x.k::uuid RETURNING id INTO gid;
  END IF;
  FOR n IN 1..x.seats LOOP
   seat_index:=seat_index+1;
   INSERT INTO public.national_seats(legislature_id,chamber,seat_no,group_id,display_name,simulated)
   VALUES(l.id,'senate',seat_index,gid,'Sénateur '||seat_index,true);
  END LOOP;
 END LOOP;
 IF seat_index<>25 THEN RAISE EXCEPTION 'Vingt-cinq sièges de Sénat requis'; END IF;
 UPDATE public.national_legislatures SET senate_composed_at=at_time, senate_source=source WHERE id=l.id;
 PERFORM public.national_publish('senate:'||l.id,'Le Sénat est constitué','Les 25 sièges du Sénat ont été attribués pour la nouvelle législature.');
 RETURN true;
END $$;

-- 7. Dépouillement : 20 voix fictives par parti et par ville + votes des joueurs ;
--    sans candidat joueur du parti en tête, un candidat fictif de ce parti gagne. -
CREATE OR REPLACE FUNCTION public.national_count_election(_eid uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.national_elections; lid uuid; city record; win_party uuid; win_cand uuid; npc public.social_npcs; seat_no integer:=0; weights jsonb; gid uuid; k public.national_candidacies;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO e FROM public.national_elections WHERE id=_eid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scrutin introuvable'; END IF;
 IF e.counted_at IS NOT NULL THEN SELECT id INTO lid FROM public.national_legislatures WHERE election_id=e.id; RETURN lid; END IF;
 IF public.game_now()<e.vote_end_at THEN RAISE EXCEPTION 'Vote en cours'; END IF;

 INSERT INTO public.national_legislatures(election_id,starts_at,ends_at) VALUES(e.id,e.vote_end_at,e.term_end_at) RETURNING id INTO lid;
 INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name)
 SELECT lid,'assembly',o.id,o.name FROM jsonb_each(e.rules->'party_snapshot') s JOIN public.organizations o ON o.id=s.key::uuid ORDER BY o.id;

 FOR city IN SELECT city_id FROM public.national_constituencies ORDER BY city_id LOOP
  seat_no:=seat_no+1;
  -- Parti en tête : voix fictives (unité du parti ÷ 5 villes) + bulletins des joueurs.
  SELECT s.key::uuid INTO win_party FROM jsonb_each(e.rules->'party_snapshot') s
  ORDER BY ((s.value->>'fictional_votes')::int/5) + (SELECT count(*) FROM public.national_ballots b JOIN public.national_candidacies c ON c.id=b.candidacy_id WHERE b.election_id=e.id AND b.city_id=city.city_id AND c.organization_id=s.key::uuid) DESC,
   md5(e.tie_seed::text||':'||city.city_id||':'||s.key), s.key LIMIT 1;
  -- Meilleur candidat joueur de ce parti dans la ville.
  SELECT c.id INTO win_cand FROM public.national_candidacies c
  WHERE c.election_id=e.id AND c.city_id=city.city_id AND c.organization_id=win_party AND c.status='accepted' AND c.character_id IS NOT NULL
  ORDER BY (SELECT count(*) FROM public.national_ballots b WHERE b.candidacy_id=c.id) DESC, md5(e.tie_seed::text||':'||c.id), c.id LIMIT 1;
  IF win_cand IS NULL THEN
   SELECT n.* INTO npc FROM public.social_npcs n
   WHERE n.organization_id=win_party AND NOT EXISTS(SELECT 1 FROM public.national_candidacies c WHERE c.election_id=e.id AND c.npc_id=n.id)
   ORDER BY (n.city_id=city.city_id) DESC, n.influence DESC NULLS LAST, n.id LIMIT 1;
   IF npc.id IS NULL THEN RAISE EXCEPTION 'Aucun candidat fictif disponible pour ce parti'; END IF;
   INSERT INTO public.national_candidacies(election_id,city_id,npc_id,organization_id,display_name)
   VALUES(e.id,city.city_id,npc.id,win_party,npc.first_name||' '||npc.last_name) RETURNING id INTO win_cand;
  END IF;
  INSERT INTO public.national_results(election_id,city_id,candidacy_id,player_votes,fictional_votes,rank)
  SELECT e.id, city.city_id, r.id, r.pv, r.fv, row_number() OVER (ORDER BY (r.id=win_cand) DESC, r.pv+r.fv DESC, md5(e.tie_seed::text||':'||r.id), r.id)
  FROM (SELECT c.id,
    (SELECT count(*) FROM public.national_ballots b WHERE b.candidacy_id=c.id)::int pv,
    CASE WHEN c.id=win_cand THEN ((e.rules->'party_snapshot'->c.organization_id::text->>'fictional_votes')::int/5) ELSE 0 END fv
   FROM public.national_candidacies c WHERE c.election_id=e.id AND c.city_id=city.city_id AND c.status='accepted') r;
  SELECT * INTO k FROM public.national_candidacies WHERE id=win_cand;
  SELECT id INTO gid FROM public.national_groups WHERE legislature_id=lid AND chamber='assembly' AND organization_id=win_party;
  INSERT INTO public.national_seats(legislature_id,chamber,seat_no,group_id,city_id,character_id,npc_id,display_name,simulated)
  VALUES(lid,'assembly',seat_no,gid,city.city_id,k.character_id,k.npc_id,k.display_name,k.character_id IS NULL);
  win_cand:=NULL; npc:=NULL;
 END LOOP;

 SELECT jsonb_object_agg(key,(value->>'weight')::numeric) INTO weights FROM jsonb_each(e.rules->'party_snapshot');
 PERFORM public.national_allocate_simulated(lid,'assembly',weights,45,5);
 UPDATE public.national_elections SET status='completed', counted_at=public.game_now() WHERE id=e.id;
 RETURN lid;
END $$;

-- 8. Clôture des séances : joueur absent = abstention ; fictifs = position du parti.
--    Adoption après approbation de la même version par les deux chambres. ---------
CREATE OR REPLACE FUNCTION public.national_close_session(_sid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.national_sessions; l public.national_laws; v public.national_law_versions; y integer:=0; nn integer:=0; a integer:=0; st record; vote text; ok boolean; title text;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO s FROM public.national_sessions WHERE id=_sid FOR UPDATE;
 IF NOT FOUND OR s.status<>'open' OR public.game_now()<s.ends_at THEN RETURN; END IF;
 SELECT * INTO l FROM public.national_laws WHERE id=s.law_id FOR UPDATE;
 SELECT * INTO v FROM public.national_law_versions WHERE law_id=s.law_id AND version=s.version;
 FOR st IN SELECT ns.id, ns.character_id, g.organization_id FROM jsonb_array_elements(s.electorate) x
   JOIN public.national_seats ns ON ns.id=(x->>'seat_id')::uuid JOIN public.national_groups g ON g.id=ns.group_id LOOP
  IF st.character_id IS NOT NULL THEN
   SELECT pv.vote INTO vote FROM public.national_parliamentary_votes pv WHERE pv.session_id=s.id AND pv.seat_id=st.id;
  ELSE
   SELECT p.vote INTO vote FROM public.national_law_positions p WHERE p.template_id=v.template_id AND p.party_key=COALESCE(st.organization_id::text,'divers');
  END IF;
  IF vote='yes' THEN y:=y+1; ELSIF vote='no' THEN nn:=nn+1; ELSE a:=a+1; END IF;
  vote:=NULL;
 END LOOP;
 ok:= y>=s.majority_required;
 UPDATE public.national_sessions SET status=CASE WHEN ok THEN 'approved' ELSE 'rejected' END, yes_votes=y, no_votes=nn, abstentions=a WHERE id=s.id;
 UPDATE public.activities SET status='completed' WHERE type='national' AND source_key='national-session:'||s.id AND status='running';
 UPDATE public.activities SET status='cancelled' WHERE type='national' AND source_key='national-session:'||s.id AND status='planned';
 title:=v.title||' — '||CASE s.chamber WHEN 'assembly' THEN 'Assemblée' ELSE 'Sénat' END;
 IF NOT ok THEN
  UPDATE public.national_laws SET status='refused' WHERE id=l.id;
  PERFORM public.national_publish('session:'||s.id,'Loi rejetée : '||title, y||' pour, '||nn||' contre, '||a||' abstentions.');
 ELSE
  PERFORM public.national_publish('session:'||s.id,'Loi approuvée : '||title, y||' pour, '||nn||' contre, '||a||' abstentions.');
  IF (SELECT count(DISTINCT chamber) FROM public.national_sessions WHERE law_id=l.id AND version=s.version AND status='approved')=2 THEN
   UPDATE public.national_laws SET status='adopted', adopted_at=(SELECT max(ends_at) FROM public.national_sessions WHERE law_id=l.id AND version=s.version AND status='approved') WHERE id=l.id;
   PERFORM public.national_publish('law-adopted:'||l.id||':'||s.version,'Loi adoptée par le Parlement',v.title||' entrera en vigueur dans 24 heures.');
  END IF;
 END IF;
END $$;

-- 9. Automatismes : publication des candidatures, gouvernement, ouverture des séances
CREATE OR REPLACE FUNCTION public.national_tick() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lg record; lw record; t timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RETURN; END IF;
 PERFORM public.national_refresh();
 t:=public.game_now();
 -- Candidatures des joueurs rendues publiques à la clôture du dépôt.
 UPDATE public.national_candidacies c SET published_at=e.candidacies_end_at
 FROM public.national_elections e WHERE e.id=c.election_id AND c.published_at IS NULL AND c.status='accepted' AND t>=e.candidacies_end_at AND e.counted_at IS NULL;
 -- Gouvernement fictif validé, formé une fois par législature active.
 FOR lg IN SELECT id FROM public.national_legislatures WHERE starts_at<=t AND ends_at>t AND NOT EXISTS(SELECT 1 FROM public.national_governments g WHERE g.legislature_id=national_legislatures.id) LOOP
  PERFORM public.national_form_government(lg.id,
   'fba90217-b89f-44a1-ad1b-e85c5c119123',  -- Léa Weber, Présidente
   '69997cc3-d132-4f51-bf6c-24b938d4a709',  -- Hugo Mercier, Premier ministre
   '[{"npc_id":"15cdeb99-8c07-488c-afcd-42f6db298434","ministry":"Économie et Emploi"},
     {"npc_id":"a2a92987-a86b-4600-b152-5f6e4e91b5e1","ministry":"Territoires et Environnement"},
     {"npc_id":"1794d1c7-2e60-44a0-b9ef-63a74bb97cba","ministry":"Logement et Transports"},
     {"npc_id":"2cd2b419-e252-48cf-96dd-d895f4585a0a","ministry":"Intérieur et Services publics"}]'::jsonb);
 END LOOP;
 -- Séance à l'Assemblée 2 heures après le dépôt (le temps de réserver), puis au Sénat 2 heures après l'approbation.
 FOR lw IN SELECT l.id, nl.ends_at FROM public.national_laws l JOIN public.national_legislatures nl ON nl.id=l.legislature_id
   WHERE l.status IN ('proposed','examining') AND nl.ends_at>t+interval '3 hours' AND NOT EXISTS(SELECT 1 FROM public.national_sessions s WHERE s.law_id=l.id AND s.version=l.current_version AND s.chamber='assembly') LOOP
  PERFORM public.national_open_session(lw.id,'assembly',date_trunc('minute',t)+interval '2 hours');
 END LOOP;
 FOR lw IN SELECT l.id FROM public.national_laws l JOIN public.national_legislatures nl ON nl.id=l.legislature_id
   WHERE l.status='examining' AND nl.senate_composed_at IS NOT NULL AND nl.ends_at>t+interval '3 hours'
   AND EXISTS(SELECT 1 FROM public.national_sessions s WHERE s.law_id=l.id AND s.version=l.current_version AND s.chamber='assembly' AND s.status='approved')
   AND NOT EXISTS(SELECT 1 FROM public.national_sessions s WHERE s.law_id=l.id AND s.version=l.current_version AND s.chamber='senate') LOOP
  PERFORM public.national_open_session(lw.id,'senate',date_trunc('minute',t)+interval '2 hours');
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.national_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.national_tick() TO service_role;

-- Lecture du jeu : met d'abord le calendrier national à jour (pas de tâche planifiée nécessaire).
CREATE OR REPLACE FUNCTION public.national_state_live() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 PERFORM public.national_tick();
 RETURN public.national_state() || jsonb_build_object(
  'templates', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'category',t.category,'effects',t.effects,'cost',t.cost) ORDER BY t.id) FROM public.national_law_templates t WHERE t.active),'[]'::jsonb),
  'positions', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.national_law_positions p),'[]'::jsonb),
  'sessions', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'law_id',s.law_id,'version',s.version,'chamber',s.chamber,'starts_at',s.starts_at,'ends_at',s.ends_at,'status',s.status,'yes_votes',s.yes_votes,'no_votes',s.no_votes,'abstentions',s.abstentions) ORDER BY s.starts_at) FROM public.national_sessions s),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.national_state_live() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.national_state_live() TO authenticated;

-- 10. Ouverture et premières élections législatives --------------------------------
SELECT public.national_configure((SELECT rules FROM public.national_settings WHERE id=1), true);
SELECT public.national_install_activity_rule();
SELECT public.national_create_election('Élections législatives — 1re législature',
  date_trunc('hour',public.game_now())+interval '1 hour',
  date_trunc('hour',public.game_now())+interval '1 hour'+interval '7 days',
  date_trunc('hour',public.game_now())+interval '1 hour'+interval '8 days',
  date_trunc('hour',public.game_now())+interval '1 hour'+interval '10 days',
  date_trunc('hour',public.game_now())+interval '1 hour'+interval '38 days');

-- Contrôles finaux : on annule tout si un seul est faux.
DO $$ BEGIN
 IF (SELECT count(*) FROM public.national_law_templates WHERE active)<>5 THEN RAISE EXCEPTION 'Contrôle : 5 lois actives attendues'; END IF;
 IF (SELECT count(*) FROM public.national_law_positions)<>25 THEN RAISE EXCEPTION 'Contrôle : 25 positions attendues'; END IF;
 IF (SELECT count(*) FROM public.social_npcs WHERE id IN ('fba90217-b89f-44a1-ad1b-e85c5c119123','69997cc3-d132-4f51-bf6c-24b938d4a709','15cdeb99-8c07-488c-afcd-42f6db298434','a2a92987-a86b-4600-b152-5f6e4e91b5e1','1794d1c7-2e60-44a0-b9ef-63a74bb97cba','2cd2b419-e252-48cf-96dd-d895f4585a0a'))<>6 THEN RAISE EXCEPTION 'Contrôle : 6 membres du gouvernement introuvables'; END IF;
 IF NOT (SELECT enabled FROM public.national_settings WHERE id=1) THEN RAISE EXCEPTION 'Contrôle : activation'; END IF;
 IF (SELECT count(*) FROM public.national_elections)<>1 THEN RAISE EXCEPTION 'Contrôle : une élection attendue'; END IF;
 IF (SELECT count(*) FROM public.events)<79 THEN RAISE EXCEPTION 'Contrôle : événements existants modifiés'; END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
