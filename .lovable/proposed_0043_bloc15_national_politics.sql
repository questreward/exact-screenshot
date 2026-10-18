-- CIVITAS — Bloc 15 — Politique nationale et institutions
-- PROPOSITION NON APPLIQUÉE. Aucun appel de migration n'est autorisé à cette étape.
-- 50 sièges Assemblée / 25 Sénat ; 5 circonscriptions / 45 sièges simulés.
-- Paramètres non validés laissés vides, activation FALSE ; aucun changement aux Blocs 1–14.
-- Les algorithmes ci-dessous (scrutin à un tour, plus forts restes, majorité absolue,
-- absence = abstention, séances depuis lieu administratif existant) sont PROPOSÉS,
-- pas des décisions utilisateur déjà acquises. Valider avant toute application.
-- Ce SQL est une proposition de socle et opérations. Campagnes/débats nationaux
-- et notifications nationales générales non définis : non ajoutés, non inventés.
BEGIN;

-- national_settings
CREATE TABLE public.national_settings (
  id integer PRIMARY KEY CHECK(id=1), enabled boolean NOT NULL DEFAULT false, assembly_seats integer NOT NULL DEFAULT 50 CHECK(assembly_seats=50), senate_seats integer NOT NULL DEFAULT 25 CHECK(senate_seats=25), rules jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(rules)='object')
);
GRANT SELECT ON public.national_settings TO authenticated;
GRANT ALL ON public.national_settings TO service_role;
ALTER TABLE public.national_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_settings_read ON public.national_settings FOR SELECT TO authenticated USING(true);

-- national_constituencies
CREATE TABLE public.national_constituencies (
  city_id text PRIMARY KEY REFERENCES public.cities(id), name text NOT NULL, seats integer NOT NULL DEFAULT 1 CHECK(seats=1)
);
GRANT SELECT ON public.national_constituencies TO authenticated;
GRANT ALL ON public.national_constituencies TO service_role;
ALTER TABLE public.national_constituencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_constituencies_read ON public.national_constituencies FOR SELECT TO authenticated USING(true);

-- national_party_profiles
CREATE TABLE public.national_party_profiles (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id), program jsonb NOT NULL DEFAULT '{}'::jsonb, simulation_weight integer NOT NULL DEFAULT 0 CHECK(simulation_weight>=0), law_support integer NOT NULL DEFAULT 0 CHECK(law_support BETWEEN 0 AND 100)
);
GRANT SELECT ON public.national_party_profiles TO authenticated;
GRANT ALL ON public.national_party_profiles TO service_role;
ALTER TABLE public.national_party_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_party_profiles_read ON public.national_party_profiles FOR SELECT TO authenticated USING(true);

-- national_elections
CREATE TABLE public.national_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, status text NOT NULL DEFAULT 'scheduled' CHECK(status IN('scheduled','candidacies','vote','completed','cancelled')), candidacies_at timestamptz NOT NULL, candidacies_end_at timestamptz NOT NULL, vote_at timestamptz NOT NULL, vote_end_at timestamptz NOT NULL, term_end_at timestamptz NOT NULL, rules jsonb NOT NULL, counted_at timestamptz, CHECK(candidacies_at<candidacies_end_at AND candidacies_end_at<=vote_at AND vote_at<vote_end_at AND vote_end_at<term_end_at)
);
GRANT SELECT ON public.national_elections TO authenticated;
GRANT ALL ON public.national_elections TO service_role;
ALTER TABLE public.national_elections ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_elections_read ON public.national_elections FOR SELECT TO authenticated USING(true);

-- national_candidacies
CREATE TABLE public.national_candidacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), election_id uuid NOT NULL REFERENCES public.national_elections(id), city_id text NOT NULL REFERENCES public.national_constituencies(city_id), character_id uuid REFERENCES public.characters(id), npc_id uuid REFERENCES public.social_npcs(id), organization_id uuid REFERENCES public.organizations(id), display_name text NOT NULL, program jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'accepted' CHECK(status IN('accepted','withdrawn')), fictional_votes integer NOT NULL DEFAULT 0 CHECK(fictional_votes>=0), created_at timestamptz NOT NULL DEFAULT public.game_now(), CHECK(num_nonnulls(character_id,npc_id)=1), UNIQUE(election_id,character_id), UNIQUE(election_id,npc_id), UNIQUE(id,election_id,city_id)
);
GRANT SELECT ON public.national_candidacies TO authenticated;
GRANT ALL ON public.national_candidacies TO service_role;
ALTER TABLE public.national_candidacies ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_candidacies_read ON public.national_candidacies FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_ballots
CREATE TABLE public.national_ballots (
  election_id uuid NOT NULL REFERENCES public.national_elections(id), character_id uuid NOT NULL REFERENCES public.characters(id), city_id text NOT NULL REFERENCES public.national_constituencies(city_id), candidacy_id uuid NOT NULL, cast_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(election_id,character_id), FOREIGN KEY(candidacy_id,election_id,city_id) REFERENCES public.national_candidacies(id,election_id,city_id)
);
GRANT SELECT ON public.national_ballots TO authenticated;
GRANT ALL ON public.national_ballots TO service_role;
ALTER TABLE public.national_ballots ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_ballots_read ON public.national_ballots FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_results
CREATE TABLE public.national_results (
  election_id uuid NOT NULL REFERENCES public.national_elections(id), city_id text NOT NULL REFERENCES public.national_constituencies(city_id), candidacy_id uuid NOT NULL, player_votes integer NOT NULL CHECK(player_votes>=0), fictional_votes integer NOT NULL CHECK(fictional_votes>=0), rank integer NOT NULL CHECK(rank>0), PRIMARY KEY(election_id,city_id,candidacy_id), UNIQUE(election_id,city_id,rank), FOREIGN KEY(candidacy_id,election_id,city_id) REFERENCES public.national_candidacies(id,election_id,city_id)
);
GRANT SELECT ON public.national_results TO authenticated;
GRANT ALL ON public.national_results TO service_role;
ALTER TABLE public.national_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_results_read ON public.national_results FOR SELECT TO authenticated USING(true);

-- national_legislatures
CREATE TABLE public.national_legislatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), election_id uuid NOT NULL UNIQUE REFERENCES public.national_elections(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, senate_composed_at timestamptz, senate_source jsonb NOT NULL DEFAULT '[]'::jsonb, CHECK(starts_at<ends_at)
);
GRANT ALL ON public.national_legislatures TO service_role;
ALTER TABLE public.national_legislatures ENABLE ROW LEVEL SECURITY;

-- national_groups
CREATE TABLE public.national_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legislature_id uuid NOT NULL REFERENCES public.national_legislatures(id), chamber text NOT NULL CHECK(chamber IN('assembly','senate')), organization_id uuid REFERENCES public.organizations(id), name text NOT NULL, support integer NOT NULL CHECK(support BETWEEN 0 AND 100), UNIQUE(id,legislature_id,chamber)
);
GRANT SELECT ON public.national_groups TO authenticated;
GRANT ALL ON public.national_groups TO service_role;
ALTER TABLE public.national_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_groups_read ON public.national_groups FOR SELECT TO authenticated USING(true);

-- national_seats
CREATE TABLE public.national_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legislature_id uuid NOT NULL REFERENCES public.national_legislatures(id), chamber text NOT NULL CHECK(chamber IN('assembly','senate')), seat_no integer NOT NULL CHECK(seat_no>0), group_id uuid NOT NULL, city_id text REFERENCES public.cities(id), character_id uuid REFERENCES public.characters(id), npc_id uuid REFERENCES public.social_npcs(id), display_name text NOT NULL, simulated boolean NOT NULL DEFAULT true, CHECK(num_nonnulls(character_id,npc_id)<=1), CHECK((chamber='assembly' AND seat_no<=50) OR (chamber='senate' AND seat_no<=25)), CHECK(character_id IS NULL OR NOT simulated), UNIQUE(legislature_id,chamber,seat_no), UNIQUE(legislature_id,chamber,character_id), FOREIGN KEY(group_id,legislature_id,chamber) REFERENCES public.national_groups(id,legislature_id,chamber)
);
GRANT SELECT ON public.national_seats TO authenticated;
GRANT ALL ON public.national_seats TO service_role;
ALTER TABLE public.national_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_seats_read ON public.national_seats FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_governments
CREATE TABLE public.national_governments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legislature_id uuid NOT NULL REFERENCES public.national_legislatures(id), government_no integer NOT NULL CHECK(government_no>0), majority_group_id uuid NOT NULL REFERENCES public.national_groups(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, CHECK(starts_at<ends_at), UNIQUE(legislature_id,government_no)
);
GRANT SELECT ON public.national_governments TO authenticated;
GRANT ALL ON public.national_governments TO service_role;
ALTER TABLE public.national_governments ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_governments_read ON public.national_governments FOR SELECT TO authenticated USING(true);

-- national_offices
CREATE TABLE public.national_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), government_id uuid NOT NULL REFERENCES public.national_governments(id), role text NOT NULL CHECK(role IN('president','prime_minister','minister')), ministry text NOT NULL DEFAULT '', character_id uuid REFERENCES public.characters(id), npc_id uuid REFERENCES public.social_npcs(id), display_name text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, CHECK(num_nonnulls(character_id,npc_id)=1), CHECK(starts_at<ends_at), UNIQUE(government_id,role,ministry)
);
GRANT SELECT ON public.national_offices TO authenticated;
GRANT ALL ON public.national_offices TO service_role;
ALTER TABLE public.national_offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_offices_read ON public.national_offices FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_law_templates
CREATE TABLE public.national_law_templates (
  id text PRIMARY KEY, title text NOT NULL, category text NOT NULL, effects jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(effects)='object'), cost bigint NOT NULL DEFAULT 0 CHECK(cost>=0), delay_minutes integer NOT NULL DEFAULT 0 CHECK(delay_minutes>=0), budget_allocations jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(budget_allocations)='object'), active boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.national_law_templates TO authenticated;
GRANT ALL ON public.national_law_templates TO service_role;
ALTER TABLE public.national_law_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_law_templates_read ON public.national_law_templates FOR SELECT TO authenticated USING(true);

-- national_laws
CREATE TABLE public.national_laws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legislature_id uuid NOT NULL REFERENCES public.national_legislatures(id), author_character_id uuid REFERENCES public.characters(id), author_group_id uuid REFERENCES public.national_groups(id), author_label text NOT NULL, current_version integer NOT NULL DEFAULT 1 CHECK(current_version>0), status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','proposed','examining','adopted','refused','applied')), proposed_at timestamptz, adopted_at timestamptz, applied_at timestamptz, CHECK(num_nonnulls(author_character_id,author_group_id)=1)
);
GRANT SELECT ON public.national_laws TO authenticated;
GRANT ALL ON public.national_laws TO service_role;
ALTER TABLE public.national_laws ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_laws_read ON public.national_laws FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=author_character_id AND c.user_id=auth.uid()));

-- national_law_versions
CREATE TABLE public.national_law_versions (
  law_id uuid NOT NULL REFERENCES public.national_laws(id), version integer NOT NULL CHECK(version>0), template_id text NOT NULL REFERENCES public.national_law_templates(id), title text NOT NULL CHECK(length(title) BETWEEN 3 AND 120), description text NOT NULL CHECK(length(description) BETWEEN 10 AND 4000), category text NOT NULL, effects jsonb NOT NULL, cost bigint NOT NULL CHECK(cost>=0), delay_minutes integer NOT NULL CHECK(delay_minutes>=0), budget_allocations jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(law_id,version)
);
GRANT SELECT ON public.national_law_versions TO authenticated;
GRANT ALL ON public.national_law_versions TO service_role;
ALTER TABLE public.national_law_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_law_versions_read ON public.national_law_versions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.national_laws l JOIN public.characters c ON c.id=l.author_character_id WHERE l.id=law_id AND c.user_id=auth.uid()));

-- national_sessions
CREATE TABLE public.national_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), law_id uuid NOT NULL, version integer NOT NULL, chamber text NOT NULL CHECK(chamber IN('assembly','senate')), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN('open','approved','rejected')), eligible_seats integer NOT NULL CHECK(eligible_seats IN(50,25)), majority_required integer NOT NULL CHECK(majority_required>0), electorate jsonb NOT NULL CHECK(jsonb_typeof(electorate)='array'), yes_votes integer, no_votes integer, abstentions integer, CHECK(starts_at<ends_at), UNIQUE(law_id,version,chamber), FOREIGN KEY(law_id,version) REFERENCES public.national_law_versions(law_id,version)
);
GRANT SELECT ON public.national_sessions TO authenticated;
GRANT ALL ON public.national_sessions TO service_role;
ALTER TABLE public.national_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_sessions_read ON public.national_sessions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.national_laws l JOIN public.characters c ON c.id=l.author_character_id WHERE l.id=law_id AND c.user_id=auth.uid()));

-- national_parliamentary_votes
CREATE TABLE public.national_parliamentary_votes (
  session_id uuid NOT NULL REFERENCES public.national_sessions(id), seat_id uuid NOT NULL REFERENCES public.national_seats(id), character_id uuid NOT NULL REFERENCES public.characters(id), activity_id uuid NOT NULL UNIQUE REFERENCES public.activities(id), vote text NOT NULL CHECK(vote IN('yes','no','abstain')), cast_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(session_id,seat_id)
);
GRANT SELECT ON public.national_parliamentary_votes TO authenticated;
GRANT ALL ON public.national_parliamentary_votes TO service_role;
ALTER TABLE public.national_parliamentary_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_parliamentary_votes_read ON public.national_parliamentary_votes FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_treasury
CREATE TABLE public.national_treasury (
  id integer PRIMARY KEY CHECK(id=1), balance bigint NOT NULL CHECK(balance>=0)
);
GRANT SELECT ON public.national_treasury TO authenticated;
GRANT ALL ON public.national_treasury TO service_role;
ALTER TABLE public.national_treasury ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_treasury_read ON public.national_treasury FOR SELECT TO authenticated USING(true);

-- national_budgets
CREATE TABLE public.national_budgets (
  law_id uuid NOT NULL, version integer NOT NULL, allocations jsonb NOT NULL, total bigint NOT NULL CHECK(total>=0), funded_at timestamptz NOT NULL, PRIMARY KEY(law_id,version), FOREIGN KEY(law_id,version) REFERENCES public.national_law_versions(law_id,version)
);
GRANT SELECT ON public.national_budgets TO authenticated;
GRANT ALL ON public.national_budgets TO service_role;
ALTER TABLE public.national_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_budgets_read ON public.national_budgets FOR SELECT TO authenticated USING(true);

-- national_ledger
CREATE TABLE public.national_ledger (
  entry_key text PRIMARY KEY, law_id uuid NOT NULL, version integer NOT NULL, amount bigint NOT NULL, occurred_at timestamptz NOT NULL, FOREIGN KEY(law_id,version) REFERENCES public.national_law_versions(law_id,version)
);
GRANT SELECT ON public.national_ledger TO authenticated;
GRANT ALL ON public.national_ledger TO service_role;
ALTER TABLE public.national_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_ledger_read ON public.national_ledger FOR SELECT TO authenticated USING(true);

-- national_city_effects
CREATE TABLE public.national_city_effects (
  law_id uuid NOT NULL, version integer NOT NULL, city_id text NOT NULL, indicator text NOT NULL, requested_delta integer NOT NULL, before_value integer NOT NULL CHECK(before_value BETWEEN 0 AND 100), after_value integer NOT NULL CHECK(after_value BETWEEN 0 AND 100), applied_at timestamptz NOT NULL, PRIMARY KEY(law_id,version,city_id,indicator), FOREIGN KEY(law_id,version) REFERENCES public.national_law_versions(law_id,version), FOREIGN KEY(city_id,indicator) REFERENCES public.city_indicators(city_id,indicator)
);
GRANT SELECT ON public.national_city_effects TO authenticated;
GRANT ALL ON public.national_city_effects TO service_role;
ALTER TABLE public.national_city_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_city_effects_read ON public.national_city_effects FOR SELECT TO authenticated USING(true);

-- national_requests
CREATE TABLE public.national_requests (
  character_id uuid NOT NULL REFERENCES public.characters(id), request_id uuid NOT NULL, command text NOT NULL, input jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(character_id,request_id)
);
GRANT SELECT ON public.national_requests TO authenticated;
GRANT ALL ON public.national_requests TO service_role;
ALTER TABLE public.national_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_requests_read ON public.national_requests FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_publications
CREATE TABLE public.national_publications (
  publication_key text PRIMARY KEY, event_id uuid NOT NULL UNIQUE REFERENCES public.events(id)
);
GRANT SELECT ON public.national_publications TO authenticated;
GRANT ALL ON public.national_publications TO service_role;
ALTER TABLE public.national_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_publications_read ON public.national_publications FOR SELECT TO authenticated USING(true);

-- Initialisation de NOUVELLES données seulement. Aucune donnée des anciens blocs changée.
INSERT INTO public.national_settings(id) VALUES(1);
INSERT INTO public.national_constituencies(city_id,name) VALUES
('paris','Circonscription de Paris'),('lyon','Circonscription de Lyon'),
('marseille','Circonscription de Marseille'),('lille','Circonscription de Lille'),
('bordeaux','Circonscription de Bordeaux');
CREATE UNIQUE INDEX national_group_party_once ON public.national_groups(legislature_id,chamber,organization_id) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX national_group_independent_once ON public.national_groups(legislature_id,chamber) WHERE organization_id IS NULL;
CREATE UNIQUE INDEX national_one_player_seat ON public.national_seats(legislature_id,character_id) WHERE character_id IS NOT NULL;

-- Authentification sans civic_actor/prepare_daily_life : pas de règlement de salaire/loyer.
CREATE FUNCTION public.national_actor() RETURNS public.characters
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.characters;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 SELECT * INTO c FROM public.characters WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT (SELECT enabled FROM public.national_settings WHERE id=1) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 RETURN c;
END $$;

-- Configuration opérateur UNIQUEMENT ; aucun montant/seuil/calendrier inventé.
-- Clés attendues : voting_age, candidate_age, civic_min, reputation_min, influence_min,
-- session_minutes, session_energy, office_civic_min, office_reputation_min,
-- office_influence_min, fictional_vote_unit, initial_budget.
-- fictional_vote_unit : poids d'électorat par unité simulation_weight d'un parti.
CREATE FUNCTION public.national_configure(_rules jsonb,_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; n numeric;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF jsonb_typeof(_rules) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Réglages invalides'; END IF;
 FOREACH k IN ARRAY ARRAY['voting_age','candidate_age','civic_min','reputation_min','influence_min','session_minutes','session_energy','office_civic_min','office_reputation_min','office_influence_min','fictional_vote_unit','initial_budget'] LOOP
  IF NOT (_rules ? k) OR (_rules->>k) !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Paramètre manquant ou invalide : %',k; END IF;
  n:=(_rules->>k)::numeric;
  IF n>1000000000000 THEN RAISE EXCEPTION 'Paramètre hors limite : %',k; END IF;
 END LOOP;
 IF (_rules->>'candidate_age')::int<18 OR (_rules->>'voting_age')::int<18
 OR (_rules->>'session_minutes')::int NOT BETWEEN 1 AND 1440
 OR (_rules->>'session_energy')::int>100 THEN RAISE EXCEPTION 'Âge ou séance invalide'; END IF;
 FOREACH k IN ARRAY ARRAY['civic_min','reputation_min','influence_min','office_civic_min','office_reputation_min','office_influence_min'] LOOP
  IF (_rules->>k)::int>100 THEN RAISE EXCEPTION 'Seuil hors 0–100'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.national_elections WHERE status<>'cancelled') THEN RAISE EXCEPTION 'Configuration figée après création du premier scrutin'; END IF;
 UPDATE public.national_settings SET rules=_rules,enabled=_enabled WHERE id=1;
 INSERT INTO public.national_treasury(id,balance) VALUES(1,(_rules->>'initial_budget')::bigint)
 ON CONFLICT(id) DO UPDATE SET balance=EXCLUDED.balance;
END $$;

CREATE FUNCTION public.national_eligible(_cid uuid,_rules jsonb,_office boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.characters c
 LEFT JOIN public.civic_stats cs ON cs.character_id=c.id
 LEFT JOIN public.political_stats ps ON ps.character_id=c.id
 WHERE c.id=_cid AND c.age>=(_rules->>'candidate_age')::int
 AND COALESCE(cs.engagement,0)>=(_rules->>CASE WHEN _office THEN 'office_civic_min' ELSE 'civic_min' END)::int
 AND COALESCE(ps.reputation,0)>=(_rules->>CASE WHEN _office THEN 'office_reputation_min' ELSE 'reputation_min' END)::int
 AND COALESCE(ps.influence,0)>=(_rules->>CASE WHEN _office THEN 'office_influence_min' ELSE 'influence_min' END)::int
 AND EXISTS(SELECT 1 FROM public.memberships m JOIN public.organizations o ON o.id=m.organization_id
 WHERE m.character_id=c.id AND m.status='active' AND o.kind='party' AND o.status='active'));
$$;

-- Calendrier propre : aucune création/modification de scrutin municipal.
CREATE FUNCTION public.national_create_election(_name text,_candidacies_at timestamptz,_candidacies_end timestamptz,_vote_at timestamptz,_vote_end timestamptz,_term_end timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eid uuid; r jsonb; ci record; p record; np public.social_npcs;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT rules INTO r FROM public.national_settings WHERE id=1 AND enabled;
 IF r IS NULL OR _candidacies_at<=public.game_now() THEN RAISE EXCEPTION 'Configuration ou date invalide'; END IF;
 IF EXISTS(SELECT 1 FROM public.national_elections WHERE status<>'cancelled' AND candidacies_at<_term_end AND term_end_at>_candidacies_at) THEN RAISE EXCEPTION 'Calendrier national concurrent'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.national_party_profiles WHERE simulation_weight>0) THEN RAISE EXCEPTION 'Poids de simulation à définir'; END IF;
 INSERT INTO public.national_elections(name,candidacies_at,candidacies_end_at,vote_at,vote_end_at,term_end_at,rules)
 VALUES(_name,_candidacies_at,_candidacies_end,_vote_at,_vote_end,_term_end,r) RETURNING id INTO eid;
 FOR ci IN SELECT city_id FROM public.national_constituencies ORDER BY city_id LOOP
  FOR p IN SELECT npf.*,o.name FROM public.national_party_profiles npf JOIN public.organizations o ON o.id=npf.organization_id WHERE o.kind='party' AND o.status='active' AND npf.simulation_weight>0 ORDER BY o.id LOOP
   SELECT * INTO np FROM public.social_npcs WHERE organization_id=p.organization_id AND city_id=ci.city_id ORDER BY id LIMIT 1;
   IF NOT FOUND THEN RAISE EXCEPTION 'Aucun candidat fictif existant pour % dans %',p.name,ci.city_id; END IF;
   INSERT INTO public.national_candidacies(election_id,city_id,npc_id,organization_id,display_name,program,fictional_votes)
   VALUES(eid,ci.city_id,np.id,p.organization_id,np.first_name||' '||np.last_name,p.program,p.simulation_weight*(r->>'fictional_vote_unit')::int);
  END LOOP;
 END LOOP;
 RETURN eid;
END $$;

-- Répartition proposée : plus forts restes, ordre UUID stable à égalité ; 45/25 exacts.
CREATE FUNCTION public.national_allocate_simulated(_lid uuid,_chamber text,_weights jsonb,_count integer,_offset integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a record; i integer; gid uuid; total numeric; last_no integer:=_offset;
BEGIN
 SELECT sum(value::numeric) INTO total FROM jsonb_each_text(_weights);
 IF total IS NULL OR total<=0 THEN RAISE EXCEPTION 'Collège de simulation indisponible'; END IF;
 FOR a IN
 WITH raw AS (SELECT key::uuid oid,value::numeric w FROM jsonb_each_text(_weights)),
 base AS (SELECT oid,floor(w*_count/total)::int n,w*_count/total-floor(w*_count/total) rem FROM raw),
 ranked AS (SELECT *,row_number() OVER(ORDER BY rem DESC,oid) rn,sum(n) OVER() taken FROM base)
 SELECT oid,n+CASE WHEN rn<=_count-taken THEN 1 ELSE 0 END AS allotted FROM ranked ORDER BY oid
 LOOP
  SELECT id INTO gid FROM public.national_groups WHERE legislature_id=_lid AND chamber=_chamber AND organization_id=a.oid;
  IF gid IS NULL THEN
   INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name,support)
   SELECT _lid,_chamber,o.id,o.name,p.law_support FROM public.organizations o JOIN public.national_party_profiles p ON p.organization_id=o.id WHERE o.id=a.oid RETURNING id INTO gid;
  END IF;
  IF gid IS NULL THEN RAISE EXCEPTION 'Parti national non configuré'; END IF;
  FOR i IN 1..a.allotted LOOP
   last_no:=last_no+1;
   INSERT INTO public.national_seats(legislature_id,chamber,seat_no,group_id,display_name,simulated)
   VALUES(_lid,_chamber,last_no,gid,'Élu fictif '||last_no,true);
  END LOOP;
 END LOOP;
 IF last_no<>_offset+_count THEN RAISE EXCEPTION 'Total de sièges incohérent'; END IF;
END $$;

CREATE FUNCTION public.national_compose_senate(_lid uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.national_legislatures; source jsonb; weights jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_legislatures WHERE id=_lid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Législature introuvable'; END IF;
 IF l.senate_composed_at IS NOT NULL THEN RETURN true; END IF;
 IF public.game_now()>=l.ends_at THEN RETURN false; END IF;
 -- Source en lecture seule, aucun rafraîchissement/modification des mandats municipaux.
 SELECT jsonb_agg(jsonb_build_object('mandate_id',m.id,'group_id',g.id,'organization_id',g.organization_id,'seats',g.seats) ORDER BY m.id,g.id)
 INTO source FROM public.municipal_mandates m JOIN public.municipal_council_groups g ON g.mandate_id=m.id
 WHERE m.status='active' AND m.starts_at<=l.starts_at AND m.ends_at>l.starts_at;
 IF source IS NULL THEN RETURN false; END IF;
 SELECT jsonb_object_agg(organization_id::text,n) INTO weights FROM (
 SELECT g.organization_id,sum(g.seats) n FROM public.municipal_mandates m JOIN public.municipal_council_groups g ON g.mandate_id=m.id
 JOIN public.national_party_profiles p ON p.organization_id=g.organization_id
 WHERE m.status='active' AND m.starts_at<=l.starts_at AND m.ends_at>l.starts_at GROUP BY g.organization_id HAVING sum(g.seats)>0) q;
 -- Proposition : pas de collège représentatif si indépendants/partis non configurés.
 -- On refuse la composition plutôt que d'effacer une composante locale.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(source) x WHERE x->>'organization_id' IS NULL OR NOT EXISTS(SELECT 1 FROM public.national_party_profiles p WHERE p.organization_id=(x->>'organization_id')::uuid)) THEN RETURN false; END IF;
 IF weights IS NULL THEN RETURN false; END IF;
 PERFORM public.national_allocate_simulated(l.id,'senate',weights,25,0);
 UPDATE public.national_legislatures SET senate_source=source,senate_composed_at=public.game_now() WHERE id=l.id;
 RETURN true;
END $$;

CREATE FUNCTION public.national_count_election(_eid uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.national_elections; lid uuid; ci record; winner public.national_candidacies; gid uuid; sn integer:=0; weights jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO e FROM public.national_elections WHERE id=_eid FOR UPDATE;
 IF NOT FOUND OR e.status='cancelled' THEN RAISE EXCEPTION 'Scrutin indisponible'; END IF;
 IF e.counted_at IS NOT NULL THEN SELECT id INTO lid FROM public.national_legislatures WHERE election_id=e.id; RETURN lid; END IF;
 IF public.game_now()<e.vote_end_at THEN RAISE EXCEPTION 'Vote non terminé'; END IF;
 FOR ci IN SELECT city_id FROM public.national_constituencies ORDER BY city_id LOOP
  INSERT INTO public.national_results(election_id,city_id,candidacy_id,player_votes,fictional_votes,rank)
  SELECT e.id,ci.city_id,k.id,(SELECT count(*)::int FROM public.national_ballots b WHERE b.election_id=e.id AND b.candidacy_id=k.id),k.fictional_votes,
  row_number() OVER(ORDER BY k.fictional_votes+(SELECT count(*) FROM public.national_ballots b WHERE b.election_id=e.id AND b.candidacy_id=k.id) DESC,k.id)::int
  FROM public.national_candidacies k WHERE k.election_id=e.id AND k.city_id=ci.city_id AND k.status='accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Circonscription sans candidat'; END IF;
 END LOOP;
 INSERT INTO public.national_legislatures(election_id,starts_at,ends_at) VALUES(e.id,e.vote_end_at,e.term_end_at) RETURNING id INTO lid;
 FOR ci IN SELECT city_id FROM public.national_constituencies ORDER BY city_id LOOP
  SELECT k.* INTO winner FROM public.national_candidacies k JOIN public.national_results r ON r.candidacy_id=k.id WHERE r.election_id=e.id AND r.city_id=ci.city_id AND r.rank=1;
  SELECT id INTO gid FROM public.national_groups WHERE legislature_id=lid AND chamber='assembly' AND organization_id=winner.organization_id;
  IF gid IS NULL THEN
   INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name,support)
   SELECT lid,'assembly',o.id,o.name,p.law_support FROM public.organizations o JOIN public.national_party_profiles p ON p.organization_id=o.id WHERE o.id=winner.organization_id RETURNING id INTO gid;
  END IF;
  IF gid IS NULL THEN RAISE EXCEPTION 'Groupe du gagnant non configuré'; END IF;
  sn:=sn+1;
  INSERT INTO public.national_seats(legislature_id,chamber,seat_no,group_id,city_id,character_id,npc_id,display_name,simulated)
  VALUES(lid,'assembly',sn,gid,ci.city_id,winner.character_id,winner.npc_id,winner.display_name,winner.character_id IS NULL);
 END LOOP;
 -- Poids figés depuis les candidats fictifs du scrutin, pas la configuration courante.
 SELECT jsonb_object_agg(organization_id::text,n) INTO weights FROM (SELECT organization_id,sum(fictional_votes) n FROM public.national_candidacies WHERE election_id=e.id AND npc_id IS NOT NULL GROUP BY organization_id HAVING sum(fictional_votes)>0) q;
 PERFORM public.national_allocate_simulated(lid,'assembly',weights,45,5);
 UPDATE public.national_elections SET status='completed',counted_at=public.game_now() WHERE id=e.id;
 PERFORM public.national_compose_senate(lid);
 RETURN lid;
END $$;

-- Modèles validés opérateur : deltas et coûts jamais envoyés par le joueur.
CREATE FUNCTION public.national_validate_template() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d record; a record; total numeric:=0;
BEGIN
 FOR d IN SELECT * FROM jsonb_each_text(NEW.effects) LOOP
  IF d.key NOT IN('housing','employment','transport','environment','safety','services','commerce','culture','satisfaction') OR d.value !~ '^-?[0-9]+$' OR d.value::numeric NOT BETWEEN -100 AND 100 THEN RAISE EXCEPTION 'Effet de ville invalide'; END IF;
 END LOOP;
 FOR a IN SELECT * FROM jsonb_each_text(NEW.budget_allocations) LOOP
  IF a.key NOT IN('sante','education','transports','logement','securite','environnement','services_publics') OR a.value !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Poste budgétaire invalide'; END IF;
  total:=total+a.value::numeric;
 END LOOP;
 IF NEW.budget_allocations<>'{}'::jsonb AND total<>NEW.cost THEN RAISE EXCEPTION 'Budget non équilibré'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER national_template_validate BEFORE INSERT OR UPDATE ON public.national_law_templates FOR EACH ROW EXECUTE FUNCTION public.national_validate_template();

CREATE FUNCTION public.national_publish(_key text,_title text,_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT event_id INTO eid FROM public.national_publications WHERE publication_key=_key;
 IF eid IS NOT NULL THEN RETURN eid; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.news_sources WHERE id='france-direct' AND status='active') THEN RAISE EXCEPTION 'Source nationale indisponible'; END IF;
 INSERT INTO public.events(title,description,starts_at,ends_at,scope,category,importance,status,source_id,event_key,news_title,news_summary,news_body,target_kind,character_id,template_id,interactive,travel_delay_minutes)
 VALUES(_title,_body,public.game_now(),public.game_now(),'national','Politique',75,'scheduled','france-direct','national-politics:'||_key,_title,_body,_body,'general',NULL,NULL,false,0)
 RETURNING id INTO eid;
 INSERT INTO public.national_publications(publication_key,event_id) VALUES(_key,eid);
 -- Le déclencheur existant publie l'article ; pas de nouvel effet du Bloc 14 (template NULL).
 -- notify_news actuel n'envoie pas aux target_kind='general' : aucune notification
 -- générale nationale ajoutée implicitement ni plafond existant modifié.
 RETURN eid;
END $$;

CREATE FUNCTION public.national_close_session(_sid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.national_sessions; l public.national_laws; y integer:=0; n integer:=0; a integer:=0; entry jsonb; v text;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO s FROM public.national_sessions WHERE id=_sid FOR UPDATE;
 IF NOT FOUND OR s.status<>'open' THEN RETURN; END IF;
 IF public.game_now()<s.ends_at THEN RETURN; END IF;
 SELECT * INTO l FROM public.national_laws WHERE id=s.law_id FOR UPDATE;
 FOR entry IN SELECT value FROM jsonb_array_elements(s.electorate) LOOP
  IF (entry->>'simulated')::boolean THEN
   -- Simulation déterministe proposée : support groupe >=50 = pour, sinon contre.
   v:=CASE WHEN (entry->>'support')::int>=50 THEN 'yes' ELSE 'no' END;
  ELSE
   SELECT vote INTO v FROM public.national_parliamentary_votes WHERE session_id=s.id AND seat_id=(entry->>'seat_id')::uuid;
   v:=COALESCE(v,'abstain');
  END IF;
  IF v='yes' THEN y:=y+1; ELSIF v='no' THEN n:=n+1; ELSE a:=a+1; END IF;
 END LOOP;
 UPDATE public.national_sessions SET status=CASE WHEN y>=majority_required THEN 'approved' ELSE 'rejected' END,yes_votes=y,no_votes=n,abstentions=a WHERE id=s.id;
 IF l.current_version=s.version AND l.status IN('proposed','examining') THEN
  IF y<s.majority_required THEN UPDATE public.national_laws SET status='refused' WHERE id=l.id;
  ELSIF (SELECT count(*) FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND status='approved')=2 THEN
   UPDATE public.national_laws SET status='adopted',adopted_at=s.ends_at WHERE id=l.id;
   PERFORM public.national_publish('law-adopted:'||l.id||':'||l.current_version,'Une loi nationale est adoptée', (SELECT title FROM public.national_law_versions WHERE law_id=l.id AND version=l.current_version));
  END IF;
 END IF;
END $$;

CREATE FUNCTION public.national_apply_law(_law uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.national_laws; v public.national_law_versions; ci record; d record; cur integer; nxt integer; funds bigint; k text;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_laws WHERE id=_law FOR UPDATE;
 IF NOT FOUND OR l.status NOT IN('adopted','applied') THEN RETURN false; END IF;
 IF l.status='applied' THEN RETURN true; END IF;
 SELECT * INTO v FROM public.national_law_versions WHERE law_id=l.id AND version=l.current_version;
 IF public.game_now()<l.adopted_at+v.delay_minutes*interval '1 minute' THEN RETURN false; END IF;
 IF (SELECT count(*) FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND status='approved')<>2 THEN RAISE EXCEPTION 'Deux chambres sur la même version requises'; END IF;
 SELECT balance INTO funds FROM public.national_treasury WHERE id=1 FOR UPDATE;
 IF funds IS NULL OR funds<v.cost THEN RETURN false; END IF;
 -- Tout ou rien : prévalidation de la présence de tous les indicateurs, ordre stable.
 IF EXISTS(SELECT 1 FROM public.national_constituencies c CROSS JOIN jsonb_each_text(v.effects) d WHERE NOT EXISTS(SELECT 1 FROM public.city_indicators i WHERE i.city_id=c.city_id AND i.indicator=d.key)) THEN RAISE EXCEPTION 'Indicateur de ville manquant'; END IF;
 INSERT INTO public.national_budgets(law_id,version,allocations,total,funded_at) VALUES(l.id,v.version,v.budget_allocations,v.cost,public.game_now()) ON CONFLICT DO NOTHING;
 IF FOUND THEN
  UPDATE public.national_treasury SET balance=balance-v.cost WHERE id=1;
  INSERT INTO public.national_ledger(entry_key,law_id,version,amount,occurred_at) VALUES('law:'||l.id||':'||v.version,l.id,v.version,-v.cost,public.game_now());
 END IF;
 FOR ci IN SELECT city_id FROM public.national_constituencies ORDER BY city_id LOOP
  FOR d IN SELECT * FROM jsonb_each_text(v.effects) ORDER BY key LOOP
   SELECT value INTO cur FROM public.city_indicators WHERE city_id=ci.city_id AND indicator=d.key FOR UPDATE;
   nxt:=LEAST(100,GREATEST(0,cur+d.value::int));
   INSERT INTO public.national_city_effects(law_id,version,city_id,indicator,requested_delta,before_value,after_value,applied_at)
   VALUES(l.id,v.version,ci.city_id,d.key,d.value::int,cur,nxt,public.game_now()) ON CONFLICT DO NOTHING;
   IF FOUND THEN
    UPDATE public.city_indicators SET value=nxt WHERE city_id=ci.city_id AND indicator=d.key;
    k:='national:'||l.id||':'||v.version||':'||ci.city_id;
    INSERT INTO public.indicator_history(city_id,indicator,before_value,after_value,effect_key,occurred_at) VALUES(ci.city_id,d.key,cur,nxt,k,public.game_now());
   END IF;
  END LOOP;
 END LOOP;
 UPDATE public.national_laws SET status='applied',applied_at=public.game_now() WHERE id=l.id;
 PERFORM public.national_publish('law-applied:'||l.id||':'||v.version,'Application d’une loi nationale',v.title);
 RETURN true;
END $$;

-- Exécutif simulé choisi par opérateur ; pas de pouvoir de nomination côté joueur.
CREATE FUNCTION public.national_form_government(_lid uuid,_president uuid,_pm uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.national_legislatures; gid uuid; gov uuid; num integer; np public.social_npcs;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_legislatures WHERE id=_lid FOR UPDATE;
 IF NOT FOUND OR public.game_now() NOT BETWEEN l.starts_at AND l.ends_at OR public.game_now()=l.ends_at THEN RAISE EXCEPTION 'Législature inactive'; END IF;
 SELECT g.id INTO gid FROM public.national_groups g JOIN public.national_seats s ON s.group_id=g.id WHERE g.legislature_id=l.id AND g.chamber='assembly' GROUP BY g.id ORDER BY count(*) DESC,g.id LIMIT 1;
 IF gid IS NULL THEN RAISE EXCEPTION 'Assemblée non constituée'; END IF;
 SELECT COALESCE(max(government_no),0)+1 INTO num FROM public.national_governments WHERE legislature_id=l.id;
 -- Changement : ferme l'ancien gouvernement/nominations, sans supprimer l'historique.
 UPDATE public.national_offices o SET ends_at=public.game_now() FROM public.national_governments g WHERE o.government_id=g.id AND g.legislature_id=l.id AND o.ends_at>public.game_now();
 UPDATE public.national_governments SET ends_at=public.game_now() WHERE legislature_id=l.id AND ends_at>public.game_now();
 INSERT INTO public.national_governments(legislature_id,government_no,majority_group_id,starts_at,ends_at) VALUES(l.id,num,gid,public.game_now(),l.ends_at) RETURNING id INTO gov;
 SELECT * INTO np FROM public.social_npcs WHERE id=_president;
 IF NOT FOUND THEN RAISE EXCEPTION 'Président fictif introuvable'; END IF;
 INSERT INTO public.national_offices(government_id,role,npc_id,display_name,starts_at,ends_at) VALUES(gov,'president',np.id,np.first_name||' '||np.last_name,public.game_now(),l.ends_at);
 SELECT * INTO np FROM public.social_npcs WHERE id=_pm AND organization_id=(SELECT organization_id FROM public.national_groups WHERE id=gid);
 IF NOT FOUND THEN RAISE EXCEPTION 'Premier ministre incompatible avec le groupe principal'; END IF;
 INSERT INTO public.national_offices(government_id,role,npc_id,display_name,starts_at,ends_at) VALUES(gov,'prime_minister',np.id,np.first_name||' '||np.last_name,public.game_now(),l.ends_at);
 RETURN gov;
END $$;

CREATE FUNCTION public.national_nominate(_gov uuid,_role text,_ministry text,_cid uuid,_npc uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.national_governments; r jsonb; oid uuid; label text;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO g FROM public.national_governments WHERE id=_gov FOR UPDATE;
 IF NOT FOUND OR public.game_now()<g.starts_at OR public.game_now()>=g.ends_at OR num_nonnulls(_cid,_npc)<>1 THEN RAISE EXCEPTION 'Nomination invalide'; END IF;
 IF _role NOT IN('president','prime_minister','minister') OR (_role='minister' AND COALESCE(_ministry,'')='') OR (_role<>'minister' AND COALESCE(_ministry,'')<>'') THEN RAISE EXCEPTION 'Fonction invalide'; END IF;
 SELECT rules INTO r FROM public.national_settings WHERE id=1 AND enabled;
 IF _cid IS NOT NULL THEN
  IF NOT public.national_eligible(_cid,r,true) OR NOT EXISTS(SELECT 1 FROM public.national_seats WHERE legislature_id=g.legislature_id AND character_id=_cid) THEN RAISE EXCEPTION 'Conditions nationales non remplies'; END IF;
  SELECT first_name||' '||last_name INTO label FROM public.characters WHERE id=_cid;
 ELSE SELECT first_name||' '||last_name INTO label FROM public.social_npcs WHERE id=_npc; END IF;
 IF label IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 -- Historique : nouveau gouvernement pour changer un titulaire existant.
 INSERT INTO public.national_offices(government_id,role,ministry,character_id,npc_id,display_name,starts_at,ends_at)
 VALUES(g.id,_role,COALESCE(_ministry,''),_cid,_npc,label,public.game_now(),g.ends_at) RETURNING id INTO oid;
 RETURN oid;
END $$;

-- Dépôt de groupes fictifs réservé opérateur ; modèles/textes validés uniquement.
CREATE FUNCTION public.national_group_proposal(_group uuid,_template text,_title text,_description text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.national_groups; t public.national_law_templates; lid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO g FROM public.national_groups WHERE id=_group;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.national_legislatures WHERE id=g.legislature_id AND starts_at<=public.game_now() AND ends_at>public.game_now()) THEN RAISE EXCEPTION 'Groupe inactif'; END IF;
 SELECT * INTO t FROM public.national_law_templates WHERE id=_template AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Modèle non validé'; END IF;
 INSERT INTO public.national_laws(legislature_id,author_group_id,author_label,status,proposed_at) VALUES(g.legislature_id,g.id,g.name,'proposed',public.game_now()) RETURNING id INTO lid;
 INSERT INTO public.national_law_versions(law_id,version,template_id,title,description,category,effects,cost,delay_minutes,budget_allocations)
 VALUES(lid,1,t.id,_title,_description,t.category,t.effects,t.cost,t.delay_minutes,t.budget_allocations);
 RETURN lid;
END $$;

CREATE FUNCTION public.national_open_session(_law uuid,_chamber text,_at timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.national_laws; r jsonb; sid uuid; count_seats integer; electorate jsonb; finish timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_laws WHERE id=_law FOR UPDATE;
 SELECT rules INTO r FROM public.national_settings WHERE id=1 AND enabled;
 IF l.id IS NULL OR l.status NOT IN('proposed','examining') OR r IS NULL OR _at<public.game_now() OR _chamber NOT IN('assembly','senate') THEN RAISE EXCEPTION 'Séance invalide'; END IF;
 finish:=_at+(r->>'session_minutes')::int*interval '1 minute';
 IF NOT EXISTS(SELECT 1 FROM public.national_legislatures WHERE id=l.legislature_id AND starts_at<=_at AND ends_at>=finish) THEN RAISE EXCEPTION 'Séance hors mandat'; END IF;
 count_seats:=CASE WHEN _chamber='assembly' THEN 50 ELSE 25 END;
 SELECT jsonb_agg(jsonb_build_object('seat_id',s.id,'simulated',s.simulated,'support',g.support) ORDER BY s.seat_no) INTO electorate FROM public.national_seats s JOIN public.national_groups g ON g.id=s.group_id WHERE s.legislature_id=l.legislature_id AND s.chamber=_chamber;
 IF jsonb_array_length(COALESCE(electorate,'[]'::jsonb))<>count_seats THEN RAISE EXCEPTION 'Chambre non constituée'; END IF;
 INSERT INTO public.national_sessions(law_id,version,chamber,starts_at,ends_at,eligible_seats,majority_required,electorate)
 VALUES(l.id,l.current_version,_chamber,_at,finish,count_seats,count_seats/2+1,electorate) RETURNING id INTO sid;
 UPDATE public.national_laws SET status='examining' WHERE id=l.id;
 RETURN sid;
END $$;

-- Entrée unique joueur : aucune cible personnage ni montant/effet fourni par le client.
CREATE FUNCTION public.national_action(_command text,_request_id uuid,_input jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.characters; old public.national_requests; e public.national_elections; k public.national_candidacies; l public.national_laws; t public.national_law_templates; s public.national_sessions; seat public.national_seats; r jsonb; aid uuid; oid uuid; lid uuid; result jsonb; pp public.character_positions; loc public.locations;
BEGIN
 c:=public.national_actor();
 IF _request_id IS NULL OR _command IS NULL OR _input IS NULL OR jsonb_typeof(_input)<>'object' THEN RAISE EXCEPTION 'Demande invalide'; END IF;
 SELECT * INTO old FROM public.national_requests WHERE character_id=c.id AND request_id=_request_id;
 IF FOUND THEN
  IF old.command<>_command OR old.input<>_input THEN RAISE EXCEPTION 'Clé réutilisée avec une autre demande'; END IF;
  RETURN old.result;
 END IF;
 SELECT rules INTO r FROM public.national_settings WHERE id=1;
 CASE _command
 WHEN 'candidacy' THEN
  SELECT * INTO e FROM public.national_elections WHERE id=(_input->>'election_id')::uuid FOR UPDATE;
  IF NOT FOUND OR e.status IN('completed','cancelled') OR public.game_now()<e.candidacies_at OR public.game_now()>=e.candidacies_end_at THEN RAISE EXCEPTION 'Candidatures fermées'; END IF;
  oid:=(_input->>'organization_id')::uuid;
  IF jsonb_typeof(COALESCE(_input->'program','{}'::jsonb))<>'object' OR octet_length(COALESCE(_input->'program','{}'::jsonb)::text)>12000 THEN RAISE EXCEPTION 'Programme invalide'; END IF;
  IF NOT public.national_eligible(c.id,e.rules) OR NOT EXISTS(SELECT 1 FROM public.memberships m JOIN public.national_party_profiles p ON p.organization_id=m.organization_id WHERE m.character_id=c.id AND m.organization_id=oid AND m.status='active') THEN RAISE EXCEPTION 'Conditions ou parti non remplis'; END IF;
  INSERT INTO public.national_candidacies(election_id,city_id,character_id,organization_id,display_name,program)
  VALUES(e.id,c.city_id,c.id,oid,c.first_name||' '||c.last_name,COALESCE(_input->'program','{}'::jsonb)) RETURNING id INTO lid;
  result:=jsonb_build_object('id',lid);
 WHEN 'program' THEN
  SELECT * INTO k FROM public.national_candidacies WHERE id=(_input->>'candidacy_id')::uuid AND character_id=c.id FOR UPDATE;
  SELECT * INTO e FROM public.national_elections WHERE id=k.election_id;
  IF k.id IS NULL OR public.game_now()>=e.candidacies_end_at OR _input->'program' IS NULL OR jsonb_typeof(_input->'program')<>'object' OR octet_length((_input->'program')::text)>12000 THEN RAISE EXCEPTION 'Programme invalide ou période fermée'; END IF;
  UPDATE public.national_candidacies SET program=_input->'program' WHERE id=k.id;
  result:=jsonb_build_object('id',k.id);
 WHEN 'vote' THEN
  SELECT * INTO e FROM public.national_elections WHERE id=(_input->>'election_id')::uuid FOR UPDATE;
  IF NOT FOUND OR e.status IN('completed','cancelled') OR c.age<(e.rules->>'voting_age')::int OR public.game_now()<e.vote_at OR public.game_now()>=e.vote_end_at THEN RAISE EXCEPTION 'Vote inaccessible'; END IF;
  SELECT * INTO k FROM public.national_candidacies WHERE id=(_input->>'candidacy_id')::uuid AND election_id=e.id AND city_id=c.city_id AND status='accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidat de votre circonscription requis'; END IF;
  INSERT INTO public.national_ballots(election_id,character_id,city_id,candidacy_id) VALUES(e.id,c.id,c.city_id,k.id);
  result:=jsonb_build_object('voted',true);
 WHEN 'law' THEN
  SELECT ns.* INTO seat FROM public.national_seats ns JOIN public.national_legislatures nl ON nl.id=ns.legislature_id WHERE ns.character_id=c.id AND nl.starts_at<=public.game_now() AND nl.ends_at>public.game_now();
  IF seat.id IS NULL OR NOT public.national_eligible(c.id,r) THEN RAISE EXCEPTION 'Réservé à un parlementaire éligible'; END IF;
  SELECT * INTO t FROM public.national_law_templates WHERE id=_input->>'template_id' AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modèle non validé'; END IF;
  INSERT INTO public.national_laws(legislature_id,author_character_id,author_label,status,proposed_at)
  VALUES(seat.legislature_id,c.id,c.first_name||' '||c.last_name,'proposed',public.game_now()) RETURNING id INTO lid;
  INSERT INTO public.national_law_versions(law_id,version,template_id,title,description,category,effects,cost,delay_minutes,budget_allocations)
  VALUES(lid,1,t.id,_input->>'title',_input->>'description',t.category,t.effects,t.cost,t.delay_minutes,t.budget_allocations);
  result:=jsonb_build_object('id',lid);
 WHEN 'amend' THEN
  SELECT * INTO l FROM public.national_laws WHERE id=(_input->>'law_id')::uuid AND author_character_id=c.id FOR UPDATE;
  IF NOT FOUND OR l.status NOT IN('proposed','refused') OR EXISTS(SELECT 1 FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND status='open') OR NOT public.national_eligible(c.id,r) OR NOT EXISTS(SELECT 1 FROM public.national_seats ns JOIN public.national_legislatures nl ON nl.id=ns.legislature_id WHERE ns.character_id=c.id AND ns.legislature_id=l.legislature_id AND nl.ends_at>public.game_now()) THEN RAISE EXCEPTION 'Version non amendable'; END IF;
  SELECT * INTO t FROM public.national_law_templates WHERE id=_input->>'template_id' AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modèle non validé'; END IF;
  INSERT INTO public.national_law_versions(law_id,version,template_id,title,description,category,effects,cost,delay_minutes,budget_allocations)
  VALUES(l.id,l.current_version+1,t.id,_input->>'title',_input->>'description',t.category,t.effects,t.cost,t.delay_minutes,t.budget_allocations);
  UPDATE public.national_laws SET current_version=current_version+1,status='proposed',adopted_at=NULL WHERE id=l.id;
  result:=jsonb_build_object('id',l.id,'version',l.current_version+1);
 WHEN 'reserve_session' THEN
  SELECT * INTO s FROM public.national_sessions WHERE id=(_input->>'session_id')::uuid FOR UPDATE;
  SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
  SELECT * INTO seat FROM public.national_seats WHERE legislature_id=l.legislature_id AND chamber=s.chamber AND character_id=c.id;
  IF seat.id IS NULL OR s.status<>'open' OR l.current_version<>s.version OR public.game_now()>=s.starts_at THEN RAISE EXCEPTION 'Séance inaccessible'; END IF;
  IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=c.id AND status IN('planned','running') AND start_time<s.ends_at AND end_time>s.starts_at) THEN RAISE EXCEPTION 'Chevauchement avec votre agenda'; END IF;
  -- Lieu administratif existant ; aucune téléportation ou modification des positions.
  SELECT * INTO loc FROM public.locations WHERE city_id=c.city_id AND kind IN('administration','mairie') AND accessible ORDER BY id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lieu de séance indisponible'; END IF;
  INSERT INTO public.activities(character_id,type,title,start_time,end_time,location_id,energy_cost,source_key)
  VALUES(c.id,'national','Séance nationale',s.starts_at,s.ends_at,loc.id,(r->>'session_energy')::int,'national-session:'||s.id) RETURNING id INTO aid;
  result:=jsonb_build_object('activity_id',aid);
 WHEN 'parliament_vote' THEN
  SELECT * INTO s FROM public.national_sessions WHERE id=(_input->>'session_id')::uuid FOR UPDATE;
  SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
  SELECT * INTO seat FROM public.national_seats WHERE legislature_id=l.legislature_id AND chamber=s.chamber AND character_id=c.id;
  IF seat.id IS NULL OR s.status<>'open' OR l.current_version<>s.version OR public.game_now()<s.starts_at OR public.game_now()>=s.ends_at OR _input->>'vote' IS NULL OR _input->>'vote' NOT IN('yes','no','abstain') THEN RAISE EXCEPTION 'Vote parlementaire inaccessible'; END IF;
  SELECT a.id INTO aid FROM public.activities a WHERE a.character_id=c.id AND a.source_key='national-session:'||s.id AND a.status='running' AND a.start_time<=public.game_now() AND a.end_time>public.game_now();
  IF aid IS NULL THEN RAISE EXCEPTION 'Présence à la séance requise'; END IF;
  INSERT INTO public.national_parliamentary_votes(session_id,seat_id,character_id,activity_id,vote) VALUES(s.id,seat.id,c.id,aid,_input->>'vote');
  result:=jsonb_build_object('voted',true);
 ELSE RAISE EXCEPTION 'Commande nationale inconnue';
 END CASE;
 INSERT INTO public.national_requests(character_id,request_id,command,input,result) VALUES(c.id,_request_id,_command,_input,result);
 RETURN result;
END $$;

-- Rattrapage opérateur séparé des fonctions Blocs 1–14 ; pas appelé par national_state.
CREATE FUNCTION public.national_refresh() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e record; l record; s record;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT (SELECT enabled FROM public.national_settings WHERE id=1) THEN RETURN; END IF;
 FOR e IN SELECT id FROM public.national_elections WHERE counted_at IS NULL AND status<>'cancelled' AND vote_end_at<=public.game_now() ORDER BY vote_end_at,id LOOP
  PERFORM public.national_count_election(e.id);
  PERFORM public.national_publish('election-result:'||e.id,'Résultats des élections nationales','Les résultats nationaux et la composition de l’Assemblée sont disponibles.');
 END LOOP;
 UPDATE public.national_elections SET status=CASE WHEN public.game_now()>=vote_at THEN 'vote' WHEN public.game_now()>=candidacies_at THEN 'candidacies' ELSE 'scheduled' END WHERE status NOT IN('completed','cancelled');
 FOR l IN SELECT id FROM public.national_legislatures WHERE senate_composed_at IS NULL AND ends_at>public.game_now() ORDER BY starts_at,id LOOP PERFORM public.national_compose_senate(l.id); END LOOP;
 FOR s IN SELECT id FROM public.national_sessions WHERE status='open' AND ends_at<=public.game_now() ORDER BY ends_at,id LOOP PERFORM public.national_close_session(s.id); END LOOP;
 FOR l IN SELECT id FROM public.national_laws WHERE status='adopted' ORDER BY adopted_at,id LOOP PERFORM public.national_apply_law(l.id); END LOOP;
END $$;

-- État en lecture seule. Projections explicites : jamais to_jsonb(characters).
CREATE FUNCTION public.national_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 SELECT id INTO cid FROM public.characters WHERE user_id=auth.uid();
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 SELECT jsonb_build_object(
 'world_now',public.game_now(),
 'settings',(SELECT jsonb_build_object('enabled',enabled,'assembly_seats',assembly_seats,'senate_seats',senate_seats,'rules',rules) FROM public.national_settings WHERE id=1),
 'elections',COALESCE((SELECT jsonb_agg(to_jsonb(e)||jsonb_build_object('voted',EXISTS(SELECT 1 FROM public.national_ballots b WHERE b.election_id=e.id AND b.character_id=cid))) FROM public.national_elections e),'[]'::jsonb),
 'candidates',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',k.id,'election_id',k.election_id,'city_id',k.city_id,'organization_id',k.organization_id,'display_name',k.display_name,'program',k.program,'mine',k.character_id=cid)) FROM public.national_candidacies k WHERE k.status='accepted'),'[]'::jsonb),
 'legislatures',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'election_id',election_id,'starts_at',starts_at,'ends_at',ends_at,'senate_composed',senate_composed_at IS NOT NULL)) FROM public.national_legislatures),'[]'::jsonb),
 'groups',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',g.id,'legislature_id',g.legislature_id,'chamber',g.chamber,'organization_id',g.organization_id,'name',g.name,'seats',(SELECT count(*) FROM public.national_seats s WHERE s.group_id=g.id))) FROM public.national_groups g),'[]'::jsonb),
 'seats',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'legislature_id',legislature_id,'chamber',chamber,'seat_no',seat_no,'group_id',group_id,'city_id',city_id,'display_name',display_name,'simulated',simulated,'mine',character_id=cid)) FROM public.national_seats),'[]'::jsonb),
 'government',COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM public.national_governments g),'[]'::jsonb),
 'offices',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'government_id',government_id,'role',role,'ministry',ministry,'display_name',display_name,'starts_at',starts_at,'ends_at',ends_at,'mine',character_id=cid)) FROM public.national_offices),'[]'::jsonb),
 'laws',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'legislature_id',l.legislature_id,'author_label',l.author_label,'version',l.current_version,'status',l.status,'proposed_at',l.proposed_at,'adopted_at',l.adopted_at,'applied_at',l.applied_at,'mine',l.author_character_id=cid,'versions',(SELECT jsonb_agg(to_jsonb(v)) FROM public.national_law_versions v WHERE v.law_id=l.id),'sessions',(SELECT jsonb_agg(jsonb_build_object('id',s.id,'version',s.version,'chamber',s.chamber,'starts_at',s.starts_at,'ends_at',s.ends_at,'status',s.status,'yes_votes',s.yes_votes,'no_votes',s.no_votes,'abstentions',s.abstentions)) FROM public.national_sessions s WHERE s.law_id=l.id))) FROM public.national_laws l WHERE l.status<>'draft' OR l.author_character_id=cid),'[]'::jsonb),
 'treasury',(SELECT balance FROM public.national_treasury WHERE id=1),
 'budgets',COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM public.national_budgets b),'[]'::jsonb),
 'effects',COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM public.national_city_effects f),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;

-- Agenda : ajout d'une règle neuve sans changer la Vie existante.
-- Pas insérée pendant la préparation ; opérateur après validation des paramètres.
CREATE FUNCTION public.national_install_activity_rule() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
 SELECT rules INTO r FROM public.national_settings WHERE id=1 AND enabled;
 IF r IS NULL THEN RAISE EXCEPTION 'Configuration non validée'; END IF;
 INSERT INTO public.life_rules(id,title,duration_minutes,energy_cost,allowed_kinds)
 VALUES('national','Séance nationale',(r->>'session_minutes')::int,(r->>'session_energy')::int,ARRAY['administration','mairie']);
END $$;
-- Garde additive : national ne peut être démarrée librement depuis start_life_activity.
-- Nouveau déclencheur seulement ; corps des fonctions et règles existantes inchangés.
CREATE FUNCTION public.national_activity_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.national_sessions; l public.national_laws;
BEGIN
 IF NEW.type<>'national' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.character_id<>NEW.character_id OR OLD.source_key IS DISTINCT FROM NEW.source_key OR OLD.start_time<>NEW.start_time OR OLD.end_time<>NEW.end_time OR OLD.location_id<>NEW.location_id OR NEW.reward<>0 OR NEW.money_cost<>0 OR NEW.progression_gain<>0 THEN RAISE EXCEPTION 'Activité nationale immuable'; END IF;
 END IF;
 IF NEW.source_key IS NULL OR NEW.source_key NOT LIKE 'national-session:%' OR NEW.reward<>0 OR NEW.money_cost<>0 OR NEW.energy_gain<>0 OR NEW.progression_gain<>0 OR NEW.political_reputation_gain<>0 OR NEW.political_influence_gain<>0 OR NEW.political_engagement_gain<>0 OR NEW.social_reputation_gain<>0 OR NEW.social_influence_gain<>0 OR NEW.social_relation_gain<>0 OR NEW.civic_engagement_gain<>0 THEN RAISE EXCEPTION 'Activité nationale invalide'; END IF;
 SELECT * INTO s FROM public.national_sessions WHERE id=substring(NEW.source_key from 18)::uuid;
 SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
 IF s.id IS NULL OR NEW.start_time<>s.starts_at OR NEW.end_time<>s.ends_at OR NOT EXISTS(SELECT 1 FROM public.national_seats WHERE legislature_id=l.legislature_id AND chamber=s.chamber AND character_id=NEW.character_id) THEN RAISE EXCEPTION 'Séance ou mandat invalide'; END IF;
 IF (TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.status='running' AND OLD.status<>'running')) AND (s.status<>'open' OR l.current_version<>s.version) THEN RAISE EXCEPTION 'Séance fermée ou ancienne version'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER national_activity_protection BEFORE INSERT OR UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.national_activity_guard();

-- Permissions des fonctions : chaque création retire le défaut PUBLIC.
REVOKE ALL ON FUNCTION public.national_actor() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_actor() TO service_role;
REVOKE ALL ON FUNCTION public.national_configure(jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_configure(jsonb,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.national_eligible(uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_eligible(uuid,jsonb,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.national_create_election(text,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_create_election(text,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.national_allocate_simulated(uuid,text,jsonb,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_allocate_simulated(uuid,text,jsonb,integer,integer) TO service_role;
REVOKE ALL ON FUNCTION public.national_compose_senate(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_compose_senate(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.national_count_election(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_count_election(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.national_validate_template() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_validate_template() TO service_role;
REVOKE ALL ON FUNCTION public.national_publish(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_publish(text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.national_close_session(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_close_session(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.national_apply_law(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_apply_law(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.national_form_government(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_form_government(uuid,uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.national_nominate(uuid,text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_nominate(uuid,text,text,uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.national_group_proposal(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_group_proposal(uuid,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.national_open_session(uuid,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_open_session(uuid,text,timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.national_action(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_action(text,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.national_action(text,uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.national_refresh() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_refresh() TO service_role;
REVOKE ALL ON FUNCTION public.national_state() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_state() TO service_role;
GRANT EXECUTE ON FUNCTION public.national_state() TO authenticated;
REVOKE ALL ON FUNCTION public.national_install_activity_rule() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_install_activity_rule() TO service_role;
REVOKE ALL ON FUNCTION public.national_activity_guard() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_activity_guard() TO service_role;

-- Assertions d'intégrité structurelle — exécutées seulement SI ce fichier est appliqué.
-- Aucune lecture ne lance de test du jeu ni ne modifie les données existantes.
DO $$ BEGIN
 IF (SELECT count(*) FROM public.national_constituencies)<>5 THEN RAISE EXCEPTION 'Cinq circonscriptions requises'; END IF;
 IF EXISTS(SELECT 1 FROM pg_tables t WHERE t.schemaname='public' AND t.tablename LIKE 'national_%' AND NOT t.rowsecurity) THEN RAISE EXCEPTION 'Protection de table manquante'; END IF;
END $$;
COMMIT;
-- FIN DE PROPOSITION. Aucun appel de national_configure/national_refresh ici.
