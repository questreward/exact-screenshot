-- CIVITAS – LÉGISLATIVES RÉELLES, partie 2 : Assemblée de 577 sièges, deux tours
-- Tout ou rien. Nécessite 0057 (base 2024).
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0058_legislatives_577.sql
--
-- CE QUI CHANGE DANS LE PARLEMENT EXISTANT (Bloc 15)
--  * national_groups : +1 colonne party_code (étiquette réelle du groupe), vide pour les groupes existants.
--  * national_seats  : +1 colonne constituency_code ; contraintes élargies pour accepter 577 sièges
--                      liés à une circonscription. Correction : un siège territorial gagné par un PNJ
--                      (marqué « simulé ») était refusé, ce qui bloquait le dépouillement de l'ancien modèle.
--  * national_sessions : contraintes élargies pour accepter une Assemblée 577 / majorité 289.
--  * national_law_positions : +2 200 positions (100 lois × 22 étiquettes réelles), anciennes conservées.
--  * Fonctions remplacées : national_count_election (redirige les scrutins « 577 »), national_open_session
--    (compte 577/289 si l'Assemblée est réelle), national_close_session (position par étiquette réelle),
--    national_tick (programme et dépouille les législatives), national_form_government (lecture sans ambiguïté
--    de l'alias « x », sinon le gouvernement de la nouvelle Assemblée ne peut pas être formé).
--  * L'Assemblée actuelle (50 sièges) N'EST PAS modifiée : elle finit son mandat, puis la première
--    Assemblée de 577 députés lui succède. Rien n'est effacé.
-- Les deux tours se jouent dans les 2 jours de vote existants (calendrier national inchangé) :
--   jour 1 = 1er tour, jour 2 = 2e tour.
BEGIN;

-- 1. Colonnes et contraintes (NOT VALID : les lignes déjà enregistrées ne sont pas re-vérifiées, seules les nouvelles le sont) -------------------------------------------------------------
ALTER TABLE public.national_groups ADD COLUMN party_code text REFERENCES public.legislative_parties(code);
ALTER TABLE public.national_seats ADD COLUMN constituency_code text REFERENCES public.legislative_constituencies(code);
CREATE UNIQUE INDEX national_seats_constituency_unique ON public.national_seats (legislature_id, constituency_code) WHERE constituency_code IS NOT NULL;

ALTER TABLE public.national_seats DROP CONSTRAINT IF EXISTS national_seats_check1;
ALTER TABLE public.national_seats ADD CONSTRAINT national_seats_check1 CHECK ((chamber='assembly' AND seat_no<=577) OR (chamber='senate' AND seat_no<=25)) NOT VALID;
ALTER TABLE public.national_seats DROP CONSTRAINT IF EXISTS national_assembly_5_plus_45;
ALTER TABLE public.national_seats ADD CONSTRAINT national_assembly_5_plus_45 CHECK (
  chamber<>'assembly'
  OR (constituency_code IS NULL AND (
       ((seat_no BETWEEN 1 AND 5) AND (NOT simulated OR character_id IS NULL) AND city_id IS NOT NULL AND num_nonnulls(character_id,npc_id)=1)
    OR ((seat_no BETWEEN 6 AND 50) AND simulated AND city_id IS NULL AND character_id IS NULL AND npc_id IS NULL)))
  OR (constituency_code IS NOT NULL AND (seat_no BETWEEN 1 AND 577) AND city_id IS NULL AND npc_id IS NULL AND simulated=(character_id IS NULL))) NOT VALID;

ALTER TABLE public.national_sessions DROP CONSTRAINT IF EXISTS national_sessions_eligible_seats_check;
ALTER TABLE public.national_sessions ADD CONSTRAINT national_sessions_eligible_seats_check CHECK (eligible_seats = ANY (ARRAY[50,25,577])) NOT VALID;
ALTER TABLE public.national_sessions DROP CONSTRAINT IF EXISTS national_sessions_check;
ALTER TABLE public.national_sessions ADD CONSTRAINT national_sessions_check CHECK (
  (chamber='assembly' AND eligible_seats=50 AND majority_required=26)
  OR (chamber='assembly' AND eligible_seats=577 AND majority_required=289)
  OR (chamber='senate' AND eligible_seats=25 AND majority_required=13)) NOT VALID;

-- Villes jouables : 1re circonscription de chaque ville (lieu de vote des joueurs)
UPDATE public.legislative_constituencies SET city_id=v.city FROM (VALUES ('7501','paris'),('6901','lyon'),('1301','marseille'),('5901','lille'),('3301','bordeaux')) v(code,city)
 WHERE legislative_constituencies.code=v.code AND EXISTS (SELECT 1 FROM public.cities ci WHERE ci.id=v.city);

-- 2. Tables des législatives --------------------------------------------------------------
CREATE TABLE public.legislative_settings (
  id integer PRIMARY KEY CHECK (id=1),
  seats integer NOT NULL DEFAULT 577,
  majority integer NOT NULL DEFAULT 289,
  win_r1_expressed numeric NOT NULL DEFAULT 0.5,      -- plus de 50 % des exprimés
  win_r1_registered numeric NOT NULL DEFAULT 0.25,    -- et au moins 25 % des inscrits
  qualify_registered numeric NOT NULL DEFAULT 0.125,  -- 12,5 % des inscrits pour le 2e tour
  player_vote_share numeric NOT NULL DEFAULT 0.02,    -- poids d'un bulletin de joueur : 2 % des inscrits
  noise_pct integer NOT NULL DEFAULT 15               -- variation simulée ± 15 % par parti
);
CREATE TABLE public.legislative_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  national_election_id uuid NOT NULL UNIQUE REFERENCES public.national_elections(id),
  round1_counted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.legislative_candidacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.legislative_elections(id),
  constituency_code text NOT NULL REFERENCES public.legislative_constituencies(code),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  party_code text NOT NULL REFERENCES public.legislative_parties(code),
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (election_id, character_id),
  UNIQUE (election_id, constituency_code, party_code)
);
CREATE TABLE public.legislative_ballots (
  election_id uuid NOT NULL REFERENCES public.legislative_elections(id),
  round integer NOT NULL CHECK (round IN (1,2)),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  constituency_code text NOT NULL REFERENCES public.legislative_constituencies(code),
  party_code text NOT NULL REFERENCES public.legislative_parties(code),
  cast_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (election_id, round, character_id)
);
CREATE TABLE public.legislative_results (
  election_id uuid NOT NULL REFERENCES public.legislative_elections(id),
  constituency_code text NOT NULL REFERENCES public.legislative_constituencies(code),
  round integer NOT NULL CHECK (round IN (1,2)),
  party_code text NOT NULL REFERENCES public.legislative_parties(code),
  candidacy_id uuid REFERENCES public.legislative_candidacies(id),
  display_name text NOT NULL,
  simulated_votes integer NOT NULL CHECK (simulated_votes>=0),
  player_votes integer NOT NULL CHECK (player_votes>=0),
  qualified boolean NOT NULL DEFAULT false,
  elected boolean NOT NULL DEFAULT false,
  PRIMARY KEY (election_id, constituency_code, round, party_code)
);
CREATE INDEX legislative_ballots_count ON public.legislative_ballots (election_id, round, constituency_code, party_code);

GRANT SELECT ON public.legislative_settings, public.legislative_elections, public.legislative_candidacies, public.legislative_results TO authenticated;
GRANT SELECT ON public.legislative_ballots TO authenticated;
GRANT ALL ON public.legislative_settings, public.legislative_elections, public.legislative_candidacies, public.legislative_ballots, public.legislative_results TO service_role;
ALTER TABLE public.legislative_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislative_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislative_candidacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislative_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislative_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY legislative_settings_read ON public.legislative_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY legislative_elections_read ON public.legislative_elections FOR SELECT TO authenticated USING (true);
CREATE POLICY legislative_candidacies_read ON public.legislative_candidacies FOR SELECT TO authenticated USING (true);
CREATE POLICY legislative_results_read ON public.legislative_results FOR SELECT TO authenticated USING (true);
-- Bulletins privés : chacun ne voit que les siens
CREATE POLICY legislative_ballots_own ON public.legislative_ballots FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id=legislative_ballots.character_id AND c.user_id=auth.uid()));
INSERT INTO public.legislative_settings (id) VALUES (1);

-- 3. Positions de vote des 22 étiquettes réelles sur les 100 lois ------------------------
INSERT INTO public.national_law_positions (template_id, party_key, vote) VALUES
{{POSITIONS}};

-- 4. Outils ------------------------------------------------------------------------------
CREATE FUNCTION public.legislative_invented_name(_seed text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT (ARRAY['Claire','Sophie','Camille','Julie','Inès','Manon','Léa','Sarah','Pauline','Nadia','Hélène','Céline','Lucie','Anaïs','Fatou',
                'Thomas','Nicolas','Julien','Antoine','Hugo','Lucas','Mehdi','Karim','Samuel','Olivier','Laurent','Vincent','Romain','Yanis','Arnaud'])[1+abs(hashtext(_seed||':p'))%30]
      ||' '||(ARRAY['Martin','Bernard','Roux','Fournier','Girard','Bonnet','Lambert','Fontaine','Rousseau','Muller','Lefèvre','Faure','Mercier','Blanc','Guérin',
                'Garnier','Chevalier','Legrand','Perrin','Robin','Morin','Roussel','Masson','Marchand','Duval','Dumont','Meyer','Brun','Giraud','Rivière',
                'Gaillard','Barbier','Arnaud','Roche','Renard','Colin','Vidal','Caron','Picard','Aubert'])[1+abs(hashtext(_seed||':n'))%40]
$$;

CREATE FUNCTION public.legislative_noise(_seed text, _pct integer) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT 1 + ((abs(hashtext(_seed)) % (2*_pct+1)) - _pct)::numeric / 100
$$;

-- Programme la prochaine législative (une seule à la fois), calendrier national 7+1+2 jours, mandat 28 jours.
CREATE FUNCTION public.legislative_schedule() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prev public.national_elections; t timestamptz:=public.game_now(); start_at timestamptz; neid uuid; leid uuid; v_rules jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(151515);
  IF EXISTS (SELECT 1 FROM public.legislative_elections le JOIN public.national_elections e ON e.id=le.national_election_id WHERE e.counted_at IS NULL AND e.status<>'cancelled') THEN RETURN NULL; END IF;
  SELECT * INTO prev FROM public.national_elections WHERE status<>'cancelled' ORDER BY candidacies_at DESC LIMIT 1;
  IF prev.id IS NOT NULL AND prev.counted_at IS NULL THEN RETURN NULL; END IF;     -- un scrutin est déjà en cours
  IF prev.id IS NOT NULL AND t < prev.term_end_at - interval '10 days' THEN RETURN NULL; END IF;  -- trop tôt
  start_at := date_trunc('minute', greatest(COALESCE(prev.term_end_at - interval '10 days', t), t) + interval '1 minute');
  SELECT s.rules INTO v_rules FROM public.national_settings s WHERE s.id=1;
  v_rules := v_rules || jsonb_build_object('model','real577','party_snapshot',COALESCE(prev.rules->'party_snapshot','{}'::jsonb));
  INSERT INTO public.national_elections(name,candidacies_at,candidacies_end_at,vote_at,vote_end_at,term_end_at,rules,predecessor_id)
  VALUES ('Élections législatives', start_at, start_at+interval '7 days', start_at+interval '8 days', start_at+interval '10 days', start_at+interval '38 days', v_rules, prev.id)
  RETURNING id INTO neid;
  INSERT INTO public.legislative_elections(national_election_id) VALUES (neid) RETURNING id INTO leid;
  PERFORM public.national_publish('legislatives-open:'||neid,'Élections législatives','Les candidatures sont ouvertes dans les 577 circonscriptions pendant 7 jours. 1er tour le 1er jour du vote, 2e tour le lendemain.');
  RETURN leid;
END $$;

-- Dépouille un tour dans toutes les circonscriptions (idempotent : ne refait jamais un tour déjà compté)
CREATE FUNCTION public.legislative_count_round(_leid uuid, _round integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.legislative_settings; c record; top record; second_votes integer; total integer; weight integer;
BEGIN
  PERFORM pg_advisory_xact_lock(151515);
  IF EXISTS (SELECT 1 FROM public.legislative_results WHERE election_id=_leid AND round=_round) THEN RETURN; END IF;
  SELECT * INTO s FROM public.legislative_settings WHERE id=1;
  FOR c IN SELECT * FROM public.legislative_constituencies ORDER BY code LOOP
    weight := ceil(c.registered * s.player_vote_share)::int;
    IF _round = 1 THEN
      INSERT INTO public.legislative_results (election_id, constituency_code, round, party_code, candidacy_id, display_name, simulated_votes, player_votes)
      SELECT _leid, c.code, 1, p.party_code, k.id,
             COALESCE(k.display_name, public.legislative_invented_name(_leid::text||c.code||p.party_code)),
             round(COALESCE(b.votes,0) * public.legislative_noise(_leid::text||':1:'||c.code||p.party_code, s.noise_pct))::int,
             weight * (SELECT count(*) FROM public.legislative_ballots lb WHERE lb.election_id=_leid AND lb.round=1 AND lb.constituency_code=c.code AND lb.party_code=p.party_code)::int
      FROM (SELECT party_code FROM public.legislative_baseline_2024 WHERE constituency_code=c.code AND round=1
            UNION SELECT party_code FROM public.legislative_candidacies WHERE election_id=_leid AND constituency_code=c.code) p
      LEFT JOIN public.legislative_baseline_2024 b ON b.constituency_code=c.code AND b.round=1 AND b.party_code=p.party_code
      LEFT JOIN public.legislative_candidacies k ON k.election_id=_leid AND k.constituency_code=c.code AND k.party_code=p.party_code;
      SELECT sum(simulated_votes+player_votes) INTO total FROM public.legislative_results WHERE election_id=_leid AND constituency_code=c.code AND round=1;
      SELECT party_code, simulated_votes+player_votes v INTO top FROM public.legislative_results WHERE election_id=_leid AND constituency_code=c.code AND round=1
        ORDER BY simulated_votes+player_votes DESC, md5(_leid::text||c.code||party_code) LIMIT 1;
      IF total > 0 AND top.v > total * s.win_r1_expressed AND top.v >= c.registered * s.win_r1_registered THEN
        UPDATE public.legislative_results SET elected=true WHERE election_id=_leid AND constituency_code=c.code AND round=1 AND party_code=top.party_code;
      ELSE
        UPDATE public.legislative_results r SET qualified=true FROM (
          SELECT party_code, row_number() OVER (ORDER BY simulated_votes+player_votes DESC, md5(_leid::text||constituency_code||party_code)) rn, simulated_votes+player_votes v
          FROM public.legislative_results WHERE election_id=_leid AND constituency_code=c.code AND round=1) q
        WHERE r.election_id=_leid AND r.constituency_code=c.code AND r.round=1 AND r.party_code=q.party_code
          AND (q.rn <= 2 OR q.v >= c.registered * s.qualify_registered);
      END IF;
    ELSE
      CONTINUE WHEN NOT EXISTS (SELECT 1 FROM public.legislative_results WHERE election_id=_leid AND constituency_code=c.code AND round=1 AND qualified);
      -- Reports : chaque éliminé donne ses voix au qualifié du même bloc le plus fort, sinon 50 % répartis à parts égales.
      INSERT INTO public.legislative_results (election_id, constituency_code, round, party_code, candidacy_id, display_name, simulated_votes, player_votes)
      SELECT _leid, c.code, 2, q.party_code, q.candidacy_id, q.display_name,
        round((q.simulated_votes + q.player_votes + COALESCE((
          SELECT sum(CASE
            WHEN e_bloc.bloc = qp.bloc AND q.party_code = (SELECT q2.party_code FROM public.legislative_results q2 JOIN public.legislative_parties p2 ON p2.code=q2.party_code
                 WHERE q2.election_id=_leid AND q2.constituency_code=c.code AND q2.round=1 AND q2.qualified AND p2.bloc=e_bloc.bloc
                 ORDER BY q2.simulated_votes+q2.player_votes DESC, q2.party_code LIMIT 1) THEN e.simulated_votes
            WHEN NOT EXISTS (SELECT 1 FROM public.legislative_results q3 JOIN public.legislative_parties p3 ON p3.code=q3.party_code
                 WHERE q3.election_id=_leid AND q3.constituency_code=c.code AND q3.round=1 AND q3.qualified AND p3.bloc=e_bloc.bloc)
              THEN e.simulated_votes * 0.5 / (SELECT count(*) FROM public.legislative_results q4 WHERE q4.election_id=_leid AND q4.constituency_code=c.code AND q4.round=1 AND q4.qualified)
            ELSE 0 END)
          FROM public.legislative_results e JOIN public.legislative_parties e_bloc ON e_bloc.code=e.party_code
          WHERE e.election_id=_leid AND e.constituency_code=c.code AND e.round=1 AND NOT e.qualified), 0))
          * public.legislative_noise(_leid::text||':2:'||c.code||q.party_code, s.noise_pct))::int,
        weight * (SELECT count(*) FROM public.legislative_ballots lb WHERE lb.election_id=_leid AND lb.round=2 AND lb.constituency_code=c.code AND lb.party_code=q.party_code)::int
      FROM public.legislative_results q JOIN public.legislative_parties qp ON qp.code=q.party_code
      WHERE q.election_id=_leid AND q.constituency_code=c.code AND q.round=1 AND q.qualified;
      UPDATE public.legislative_results SET elected=true WHERE election_id=_leid AND constituency_code=c.code AND round=2 AND party_code=(
        SELECT party_code FROM public.legislative_results WHERE election_id=_leid AND constituency_code=c.code AND round=2
        ORDER BY simulated_votes+player_votes DESC, md5(_leid::text||c.code||party_code) LIMIT 1);
    END IF;
  END LOOP;
  IF _round = 1 THEN UPDATE public.legislative_elections SET round1_counted_at=public.game_now() WHERE id=_leid; END IF;
END $$;

-- Dépouillement final : crée la législature de 577 sièges (appelé par national_count_election)
CREATE FUNCTION public.legislative_finalize(_eid uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.national_elections; le public.legislative_elections; lid uuid; w record; n integer:=0; gid uuid; k public.legislative_candidacies;
BEGIN
  PERFORM pg_advisory_xact_lock(151515);
  SELECT * INTO e FROM public.national_elections WHERE id=_eid FOR UPDATE;
  SELECT * INTO le FROM public.legislative_elections WHERE national_election_id=_eid;
  IF e.counted_at IS NOT NULL THEN SELECT id INTO lid FROM public.national_legislatures WHERE election_id=e.id; RETURN lid; END IF;
  IF public.game_now() < e.vote_end_at THEN RAISE EXCEPTION 'Vote en cours'; END IF;
  PERFORM public.legislative_count_round(le.id, 1);
  PERFORM public.legislative_count_round(le.id, 2);
  INSERT INTO public.national_legislatures(election_id,starts_at,ends_at) VALUES(e.id,e.vote_end_at,e.term_end_at) RETURNING id INTO lid;
  INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name,party_code)
  SELECT DISTINCT lid,'assembly',p.organization_id,p.label,p.code FROM public.legislative_results r JOIN public.legislative_parties p ON p.code=r.party_code
  WHERE r.election_id=le.id AND r.elected;
  FOR w IN SELECT r.* FROM public.legislative_results r WHERE r.election_id=le.id AND r.elected ORDER BY r.constituency_code LOOP
    n := n+1; k := NULL;
    IF w.candidacy_id IS NOT NULL THEN SELECT * INTO k FROM public.legislative_candidacies WHERE id=w.candidacy_id; END IF;
    SELECT id INTO gid FROM public.national_groups WHERE legislature_id=lid AND chamber='assembly' AND party_code=w.party_code;
    INSERT INTO public.national_seats(legislature_id,chamber,seat_no,group_id,constituency_code,character_id,display_name,simulated)
    VALUES (lid,'assembly',n,gid,w.constituency_code,k.character_id,w.display_name,k.character_id IS NULL);
  END LOOP;
  IF n <> (SELECT seats FROM public.legislative_settings WHERE id=1) THEN RAISE EXCEPTION 'Il faut exactement 577 élus (%).', n; END IF;
  UPDATE public.national_elections SET status='completed', counted_at=public.game_now() WHERE id=e.id;
  PERFORM public.national_publish('legislatives-result:'||e.id,'Résultats des législatives','La nouvelle Assemblée nationale de 577 députés est élue.');
  RETURN lid;
END $$;

CREATE FUNCTION public.legislative_refresh() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record;
BEGIN
  PERFORM pg_advisory_xact_lock(151515);
  PERFORM public.legislative_schedule();
  FOR r IN SELECT le.id FROM public.legislative_elections le JOIN public.national_elections e ON e.id=le.national_election_id
           WHERE le.round1_counted_at IS NULL AND e.counted_at IS NULL AND public.game_now() >= e.vote_at + interval '1 day' LOOP
    PERFORM public.legislative_count_round(r.id, 1);
    PERFORM public.national_publish('legislatives-r1:'||r.id,'Législatives : résultats du 1er tour','Les qualifiés du 2e tour sont connus. Le 2e tour est ouvert aujourd''hui.');
  END LOOP;
END $$;

-- 5. Actions et lecture des joueurs ------------------------------------------------------
CREATE FUNCTION public.legislative_action(_command text, _input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.characters; le public.legislative_elections; e public.national_elections; t timestamptz; rnd integer; v_code text; v_party text; my_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT * INTO c FROM public.characters WHERE user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  PERFORM pg_advisory_xact_lock(151515);
  PERFORM public.legislative_refresh();
  t := public.game_now();
  SELECT le2.* INTO le FROM public.legislative_elections le2 JOIN public.national_elections ne ON ne.id=le2.national_election_id
    WHERE ne.counted_at IS NULL AND ne.status<>'cancelled' ORDER BY ne.candidacies_at DESC LIMIT 1;
  IF le.id IS NULL THEN RAISE EXCEPTION 'Aucune élection législative en cours'; END IF;
  SELECT * INTO e FROM public.national_elections WHERE id=le.national_election_id;
  v_party := _input->>'party_code';
  IF _command = 'candidacy' THEN
    v_code := _input->>'constituency_code';
    IF t < e.candidacies_at OR t >= e.candidacies_end_at THEN RAISE EXCEPTION 'Candidatures fermées'; END IF;
    IF NOT public.national_eligible(c.id, e.rules) THEN RAISE EXCEPTION 'Conditions non remplies : 18 ans, engagement 20, réputation politique 15, influence 10.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.legislative_constituencies WHERE legislative_constituencies.code=v_code) THEN RAISE EXCEPTION 'Circonscription inconnue'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.legislative_parties WHERE legislative_parties.code=v_party) THEN RAISE EXCEPTION 'Étiquette inconnue'; END IF;
    IF EXISTS (SELECT 1 FROM public.legislative_candidacies k WHERE k.election_id=le.id AND k.constituency_code=v_code AND k.party_code=v_party) THEN RAISE EXCEPTION 'Cette étiquette a déjà un candidat joueur dans cette circonscription'; END IF;
    INSERT INTO public.legislative_candidacies (election_id, constituency_code, character_id, party_code, display_name)
    VALUES (le.id, v_code, c.id, v_party, c.first_name||' '||c.last_name)
    ON CONFLICT (election_id, character_id) DO UPDATE SET constituency_code=EXCLUDED.constituency_code, party_code=EXCLUDED.party_code;
    RETURN jsonb_build_object('ok', true);
  ELSIF _command = 'withdraw' THEN
    IF t >= e.candidacies_end_at THEN RAISE EXCEPTION 'Candidatures closes : retrait impossible'; END IF;
    DELETE FROM public.legislative_candidacies WHERE election_id=le.id AND character_id=c.id;
    RETURN jsonb_build_object('ok', true);
  ELSIF _command = 'vote' THEN
    IF c.age < 18 THEN RAISE EXCEPTION 'Vote à partir de 18 ans'; END IF;
    SELECT lc.code INTO my_code FROM public.legislative_constituencies lc WHERE lc.city_id=c.city_id;
    IF my_code IS NULL THEN RAISE EXCEPTION 'Votre ville n''a pas de bureau de vote'; END IF;
    IF t >= e.vote_at AND t < e.vote_at + interval '1 day' THEN rnd := 1;
    ELSIF t >= e.vote_at + interval '1 day' AND t < e.vote_end_at THEN rnd := 2;
    ELSE RAISE EXCEPTION 'Bureaux de vote fermés'; END IF;
    IF rnd = 1 AND NOT (EXISTS (SELECT 1 FROM public.legislative_baseline_2024 WHERE constituency_code=my_code AND round=1 AND party_code=v_party)
                     OR EXISTS (SELECT 1 FROM public.legislative_candidacies WHERE election_id=le.id AND constituency_code=my_code AND party_code=v_party)) THEN
      RAISE EXCEPTION 'Candidat absent de votre circonscription'; END IF;
    IF rnd = 2 AND NOT EXISTS (SELECT 1 FROM public.legislative_results WHERE election_id=le.id AND constituency_code=my_code AND round=1 AND qualified AND party_code=v_party) THEN
      RAISE EXCEPTION 'Ce candidat n''est pas qualifié pour le 2e tour'; END IF;
    INSERT INTO public.legislative_ballots (election_id, round, character_id, constituency_code, party_code) VALUES (le.id, rnd, c.id, my_code, v_party)
    ON CONFLICT (election_id, round, character_id) DO NOTHING;
    IF NOT FOUND THEN RAISE EXCEPTION 'Vous avez déjà voté à ce tour'; END IF;
    RETURN jsonb_build_object('ok', true, 'round', rnd);
  END IF;
  RAISE EXCEPTION 'Action inconnue';
END $$;

CREATE FUNCTION public.legislative_state(_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.characters; le public.legislative_elections; e public.national_elections; my_code text; t timestamptz; lid uuid; focus text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT * INTO c FROM public.characters WHERE user_id=auth.uid();
  IF COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN PERFORM public.legislative_refresh(); PERFORM public.national_refresh(); END IF;
  t := public.game_now();
  SELECT le2.* INTO le FROM public.legislative_elections le2 JOIN public.national_elections ne ON ne.id=le2.national_election_id WHERE ne.status<>'cancelled' ORDER BY ne.candidacies_at DESC LIMIT 1;
  IF le.id IS NOT NULL THEN SELECT * INTO e FROM public.national_elections WHERE id=le.national_election_id; END IF;
  SELECT lc.code INTO my_code FROM public.legislative_constituencies lc WHERE lc.city_id=c.city_id;
  focus := COALESCE(_code, my_code);
  SELECT l.id INTO lid FROM public.national_legislatures l WHERE l.starts_at<=t AND l.ends_at>t ORDER BY l.starts_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'now', t, 'my_constituency', my_code, 'eligible', public.national_eligible(c.id, COALESCE(e.rules,'{}'::jsonb)),
    'election', CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object('id', le.id, 'candidacies_at', e.candidacies_at, 'candidacies_end_at', e.candidacies_end_at,
       'round1_at', e.vote_at, 'round2_at', e.vote_at + interval '1 day', 'vote_end_at', e.vote_end_at, 'counted', e.counted_at IS NOT NULL, 'round1_counted', le.round1_counted_at IS NOT NULL) END,
    'my_candidacy', (SELECT jsonb_build_object('constituency_code', k.constituency_code, 'party_code', k.party_code) FROM public.legislative_candidacies k WHERE k.election_id=le.id AND k.character_id=c.id),
    'my_votes', COALESCE((SELECT jsonb_object_agg(b.round::text, b.party_code) FROM public.legislative_ballots b WHERE b.election_id=le.id AND b.character_id=c.id), '{}'::jsonb),
    'focus', focus,
    'player_candidates', COALESCE((SELECT jsonb_agg(jsonb_build_object('party_code', k.party_code, 'name', k.display_name)) FROM public.legislative_candidacies k WHERE k.election_id=le.id AND k.constituency_code=focus), '[]'::jsonb),
    'results', COALESCE((SELECT jsonb_agg(jsonb_build_object('round', r.round, 'party_code', r.party_code, 'name', r.display_name, 'votes', r.simulated_votes+r.player_votes, 'qualified', r.qualified, 'elected', r.elected) ORDER BY r.round, r.simulated_votes+r.player_votes DESC)
                FROM public.legislative_results r WHERE r.election_id=le.id AND r.constituency_code=focus), '[]'::jsonb),
    'assembly', CASE WHEN lid IS NULL OR NOT EXISTS (SELECT 1 FROM public.national_seats WHERE legislature_id=lid AND constituency_code IS NOT NULL) THEN NULL ELSE jsonb_build_object(
       'by_party', (SELECT jsonb_object_agg(g.party_code, (SELECT count(*) FROM public.national_seats s WHERE s.group_id=g.id)) FROM public.national_groups g WHERE g.legislature_id=lid AND g.chamber='assembly'),
       'seats', (SELECT jsonb_object_agg(s.constituency_code, jsonb_build_object('n', g.party_code, 'd', s.display_name, 'p', s.character_id IS NOT NULL)) FROM public.national_seats s JOIN public.national_groups g ON g.id=s.group_id WHERE s.legislature_id=lid AND s.constituency_code IS NOT NULL)) END
  );
END $$;
GRANT EXECUTE ON FUNCTION public.legislative_action(text, jsonb), public.legislative_state(text) TO authenticated;
REVOKE ALL ON FUNCTION public.legislative_schedule(), public.legislative_count_round(uuid, integer), public.legislative_finalize(uuid), public.legislative_refresh() FROM PUBLIC, authenticated;

-- 6. Fonctions du Parlement remplacées (corps d'origine conservé, ajouts marqués « 577 ») --
{{REPLACED}}

-- 7. Contrôles ----------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT count(*) FROM public.national_law_positions WHERE party_key IN (SELECT code FROM public.legislative_parties)) <> 2200 THEN RAISE EXCEPTION 'positions incomplètes'; END IF;
  IF (SELECT count(*) FROM public.legislative_constituencies WHERE city_id IS NOT NULL) < 1 THEN RAISE EXCEPTION 'aucune ville jouable reliée'; END IF;
  IF public.legislative_noise('x', 15) NOT BETWEEN 0.85 AND 1.15 THEN RAISE EXCEPTION 'variation hors bornes'; END IF;
  IF EXISTS (SELECT 1 FROM public.national_seats WHERE constituency_code IS NOT NULL) THEN RAISE EXCEPTION 'aucun siège 577 ne doit exister avant le premier scrutin'; END IF;
END $$;

COMMIT;
