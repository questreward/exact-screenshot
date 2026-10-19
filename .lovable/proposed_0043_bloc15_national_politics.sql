-- CIVITAS — Bloc 15 — Politique nationale et institutions
-- PROPOSITION NON APPLIQUÉE. Aucun appel de migration n'est autorisé à cette étape.
-- 50 sièges Assemblée / 25 Sénat ; 5 circonscriptions / 45 sièges simulés.
-- Paramètres expressément validés le 19 octobre 2026 intégrés ; activation FALSE.
-- Relecture STATIQUE uniquement : aucun SQL exécuté, aucun test.
-- Limites non décidées : Sénat (admissibilité/répartition/indépendants), votes
-- simulés/absences, voix fictives territoriales et villes sans candidats,
-- publicité des candidatures, textes/deltas des cinq lois. Opérations bloquées.
-- Ce fichier finalise la PROPOSITION CORRIGÉE, pas un lancement complet.
-- LIEN INDIRECT EXPLICITE : nouveau trigger sur activities, inerte pour les autres types.
-- Aucun INSERT/UPDATE/DELETE sur les données existantes à l’installation.
-- Futur fonctionnement après accord : life_rules/activities, énergie characters pour
-- séances uniquement, events/news via publication existante, city_indicators/indicator_history.
-- Majorités VERROUILLÉES : 26/50 et 13/25 ; âge 18, seuils 20/15/10.
-- Les décisions manquantes restent des refus explicites, sans règle inventée.
-- Activation refusée dans ce socle ; une proposition complémentaire approuvée sera requise.
-- Ce SQL est une proposition de socle et opérations. Campagnes/débats nationaux
-- et notifications nationales générales non définis : non ajoutés, non inventés.
BEGIN;

-- national_settings
CREATE TABLE public.national_settings (
  id integer PRIMARY KEY CHECK(id=1), enabled boolean NOT NULL DEFAULT false, assembly_seats integer NOT NULL DEFAULT 50 CHECK(assembly_seats=50), senate_seats integer NOT NULL DEFAULT 25 CHECK(senate_seats=25), assembly_majority integer NOT NULL DEFAULT 26 CHECK(assembly_majority=26), senate_majority integer NOT NULL DEFAULT 13 CHECK(senate_majority=13), rules jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(rules)='object')
);
REVOKE ALL ON public.national_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_settings TO authenticated;
GRANT ALL ON public.national_settings TO service_role;
REVOKE TRUNCATE ON public.national_settings FROM service_role;
ALTER TABLE public.national_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_settings_read ON public.national_settings FOR SELECT TO authenticated USING(true);

-- national_constituencies
CREATE TABLE public.national_constituencies (
  city_id text PRIMARY KEY REFERENCES public.cities(id), name text NOT NULL, seats integer NOT NULL DEFAULT 1 CHECK(seats=1)
);
REVOKE ALL ON public.national_constituencies FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_constituencies TO authenticated;
GRANT ALL ON public.national_constituencies TO service_role;
REVOKE TRUNCATE ON public.national_constituencies FROM service_role;
ALTER TABLE public.national_constituencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_constituencies_read ON public.national_constituencies FOR SELECT TO authenticated USING(true);

-- national_party_profiles
CREATE TABLE public.national_party_profiles (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id), program jsonb NOT NULL DEFAULT '{}'::jsonb, simulation_weight integer NOT NULL DEFAULT 1 CHECK(simulation_weight>0), law_support integer CHECK(law_support BETWEEN 0 AND 100)
);
REVOKE ALL ON public.national_party_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_party_profiles TO authenticated;
GRANT ALL ON public.national_party_profiles TO service_role;
REVOKE TRUNCATE ON public.national_party_profiles FROM service_role;
ALTER TABLE public.national_party_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_party_profiles_read ON public.national_party_profiles FOR SELECT TO authenticated USING(true);

-- national_elections
CREATE TABLE public.national_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, status text NOT NULL DEFAULT 'scheduled' CHECK(status IN('scheduled','candidacies','frozen','vote','completed','cancelled')), candidacies_at timestamptz NOT NULL, candidacies_end_at timestamptz NOT NULL, vote_at timestamptz NOT NULL, vote_end_at timestamptz NOT NULL, term_end_at timestamptz NOT NULL, rules jsonb NOT NULL CHECK(jsonb_typeof(rules)='object'), tie_seed uuid NOT NULL DEFAULT gen_random_uuid(), predecessor_id uuid UNIQUE REFERENCES public.national_elections(id), counted_at timestamptz, CHECK(candidacies_end_at=candidacies_at+interval '7 days' AND vote_at=candidacies_end_at+interval '1 day' AND vote_end_at=vote_at+interval '2 days' AND term_end_at=vote_end_at+interval '28 days')
);
REVOKE ALL ON public.national_elections FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_elections TO authenticated;
GRANT ALL ON public.national_elections TO service_role;
REVOKE TRUNCATE ON public.national_elections FROM service_role;
ALTER TABLE public.national_elections ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_elections_read ON public.national_elections FOR SELECT TO authenticated USING(true);
-- Chevauchement des phases électorales interdit, mais mandat sortant autorisé.
-- GiST natif sur plage temporelle : aucune extension ni table ancienne modifiée.
ALTER TABLE public.national_elections ADD CONSTRAINT national_elections_no_overlap
 EXCLUDE USING gist (tstzrange(candidacies_at,vote_end_at,'[)') WITH &&)
 WHERE (status<>'cancelled');

-- national_candidacies
CREATE TABLE public.national_candidacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), election_id uuid NOT NULL REFERENCES public.national_elections(id), city_id text NOT NULL REFERENCES public.national_constituencies(city_id), character_id uuid REFERENCES public.characters(id), npc_id uuid REFERENCES public.social_npcs(id), organization_id uuid REFERENCES public.organizations(id), display_name text NOT NULL, program jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'accepted' CHECK(status IN('accepted','withdrawn')), fictional_votes integer NOT NULL DEFAULT 0 CHECK(fictional_votes>=0), created_at timestamptz NOT NULL DEFAULT public.game_now(), CHECK(num_nonnulls(character_id,npc_id)=1), UNIQUE(election_id,character_id), UNIQUE(election_id,npc_id), UNIQUE(id,election_id,city_id)
);
REVOKE ALL ON public.national_candidacies FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_candidacies TO authenticated;
GRANT ALL ON public.national_candidacies TO service_role;
REVOKE TRUNCATE ON public.national_candidacies FROM service_role;
ALTER TABLE public.national_candidacies ENABLE ROW LEVEL SECURITY;
-- Publication explicite par opérateur ; date/phase et validation du programme
-- public encore non décidées. Aucun programme privé exposé automatiquement.
ALTER TABLE public.national_candidacies ADD COLUMN published_at timestamptz;
CREATE POLICY national_candidacies_read ON public.national_candidacies FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_ballots
CREATE TABLE public.national_ballots (
  election_id uuid NOT NULL REFERENCES public.national_elections(id), character_id uuid NOT NULL REFERENCES public.characters(id), city_id text NOT NULL REFERENCES public.national_constituencies(city_id), candidacy_id uuid NOT NULL, cast_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(election_id,character_id), FOREIGN KEY(candidacy_id,election_id,city_id) REFERENCES public.national_candidacies(id,election_id,city_id)
);
REVOKE ALL ON public.national_ballots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_ballots TO authenticated;
GRANT ALL ON public.national_ballots TO service_role;
REVOKE TRUNCATE ON public.national_ballots FROM service_role;
ALTER TABLE public.national_ballots ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_ballots_read ON public.national_ballots FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_results
CREATE TABLE public.national_results (
  election_id uuid NOT NULL REFERENCES public.national_elections(id), city_id text NOT NULL REFERENCES public.national_constituencies(city_id), candidacy_id uuid NOT NULL, player_votes integer NOT NULL CHECK(player_votes>=0), fictional_votes integer NOT NULL CHECK(fictional_votes>=0), rank integer NOT NULL CHECK(rank>0), PRIMARY KEY(election_id,city_id,candidacy_id), UNIQUE(election_id,city_id,rank), FOREIGN KEY(candidacy_id,election_id,city_id) REFERENCES public.national_candidacies(id,election_id,city_id)
);
REVOKE ALL ON public.national_results FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_results TO authenticated;
GRANT ALL ON public.national_results TO service_role;
REVOKE TRUNCATE ON public.national_results FROM service_role;
ALTER TABLE public.national_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_results_read ON public.national_results FOR SELECT TO authenticated USING(true);

-- national_legislatures
CREATE TABLE public.national_legislatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), election_id uuid NOT NULL UNIQUE REFERENCES public.national_elections(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, senate_composed_at timestamptz, senate_source jsonb NOT NULL DEFAULT '[]'::jsonb, CHECK(starts_at<ends_at)
);
REVOKE ALL ON public.national_legislatures FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.national_legislatures TO service_role;
REVOKE TRUNCATE ON public.national_legislatures FROM service_role;
ALTER TABLE public.national_legislatures ENABLE ROW LEVEL SECURITY;

-- national_groups
CREATE TABLE public.national_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legislature_id uuid NOT NULL REFERENCES public.national_legislatures(id), chamber text NOT NULL CHECK(chamber IN('assembly','senate')), organization_id uuid REFERENCES public.organizations(id), name text NOT NULL, support integer CHECK(support BETWEEN 0 AND 100), UNIQUE(id,legislature_id,chamber)
);
REVOKE ALL ON public.national_groups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_groups TO authenticated;
GRANT ALL ON public.national_groups TO service_role;
REVOKE TRUNCATE ON public.national_groups FROM service_role;
ALTER TABLE public.national_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_groups_read ON public.national_groups FOR SELECT TO authenticated USING(true);

-- national_seats
CREATE TABLE public.national_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legislature_id uuid NOT NULL REFERENCES public.national_legislatures(id), chamber text NOT NULL CHECK(chamber IN('assembly','senate')), seat_no integer NOT NULL CHECK(seat_no>0), group_id uuid NOT NULL, city_id text REFERENCES public.cities(id), character_id uuid REFERENCES public.characters(id), npc_id uuid REFERENCES public.social_npcs(id), display_name text NOT NULL, simulated boolean NOT NULL DEFAULT true, CHECK(num_nonnulls(character_id,npc_id)<=1), CHECK((chamber='assembly' AND seat_no<=50) OR (chamber='senate' AND seat_no<=25)), CHECK(character_id IS NULL OR NOT simulated), UNIQUE(legislature_id,chamber,seat_no), UNIQUE(legislature_id,chamber,character_id), FOREIGN KEY(group_id,legislature_id,chamber) REFERENCES public.national_groups(id,legislature_id,chamber)
);
REVOKE ALL ON public.national_seats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_seats TO authenticated;
GRANT ALL ON public.national_seats TO service_role;
REVOKE TRUNCATE ON public.national_seats FROM service_role;
ALTER TABLE public.national_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_seats_read ON public.national_seats FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_governments
CREATE TABLE public.national_governments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legislature_id uuid NOT NULL REFERENCES public.national_legislatures(id), government_no integer NOT NULL CHECK(government_no>0), majority_group_id uuid REFERENCES public.national_groups(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, CHECK(starts_at<ends_at), UNIQUE(legislature_id,government_no)
);
REVOKE ALL ON public.national_governments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_governments TO authenticated;
GRANT ALL ON public.national_governments TO service_role;
REVOKE TRUNCATE ON public.national_governments FROM service_role;
ALTER TABLE public.national_governments ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_governments_read ON public.national_governments FOR SELECT TO authenticated USING(true);

-- national_offices
CREATE TABLE public.national_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), government_id uuid NOT NULL REFERENCES public.national_governments(id), role text NOT NULL CHECK(role IN('president','prime_minister','minister')), ministry text NOT NULL DEFAULT '', character_id uuid REFERENCES public.characters(id), npc_id uuid REFERENCES public.social_npcs(id), display_name text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, CHECK(character_id IS NULL AND npc_id IS NOT NULL), CHECK(starts_at<ends_at), CHECK((role IN('president','prime_minister') AND ministry='') OR (role='minister' AND length(btrim(ministry))>0)), UNIQUE(government_id,role,ministry), UNIQUE(government_id,npc_id)
);
REVOKE ALL ON public.national_offices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_offices TO authenticated;
GRANT ALL ON public.national_offices TO service_role;
REVOKE TRUNCATE ON public.national_offices FROM service_role;
ALTER TABLE public.national_offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_offices_read ON public.national_offices FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_law_templates
CREATE TABLE public.national_law_templates (
  id text PRIMARY KEY, title text NOT NULL, category text NOT NULL, effects jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(effects)='object'), cost bigint NOT NULL DEFAULT 12000 CHECK(cost=12000), delay_minutes integer NOT NULL DEFAULT 1440 CHECK(delay_minutes=1440), budget_allocations jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(budget_allocations)='object'), active boolean NOT NULL DEFAULT false
);
REVOKE ALL ON public.national_law_templates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_law_templates TO authenticated;
GRANT ALL ON public.national_law_templates TO service_role;
REVOKE TRUNCATE ON public.national_law_templates FROM service_role;
ALTER TABLE public.national_law_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_law_templates_read ON public.national_law_templates FOR SELECT TO authenticated USING(true);

-- national_laws
CREATE TABLE public.national_laws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legislature_id uuid NOT NULL REFERENCES public.national_legislatures(id), author_character_id uuid REFERENCES public.characters(id), author_group_id uuid REFERENCES public.national_groups(id), author_label text NOT NULL, current_version integer NOT NULL DEFAULT 1 CHECK(current_version>0), status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','proposed','examining','adopted','refused','applied')), proposed_at timestamptz, adopted_at timestamptz, applied_at timestamptz, CHECK(num_nonnulls(author_character_id,author_group_id)=1), CHECK(status NOT IN('adopted','applied') OR adopted_at IS NOT NULL), CHECK(status<>'applied' OR applied_at IS NOT NULL)
);
REVOKE ALL ON public.national_laws FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_laws TO authenticated;
GRANT ALL ON public.national_laws TO service_role;
REVOKE TRUNCATE ON public.national_laws FROM service_role;
ALTER TABLE public.national_laws ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_laws_read ON public.national_laws FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=author_character_id AND c.user_id=auth.uid()));

-- national_law_versions
CREATE TABLE public.national_law_versions (
  law_id uuid NOT NULL REFERENCES public.national_laws(id), version integer NOT NULL CHECK(version>0), template_id text NOT NULL REFERENCES public.national_law_templates(id), title text NOT NULL CHECK(length(title) BETWEEN 3 AND 120), description text NOT NULL CHECK(length(description) BETWEEN 10 AND 4000), category text NOT NULL, effects jsonb NOT NULL, cost bigint NOT NULL CHECK(cost=12000), delay_minutes integer NOT NULL CHECK(delay_minutes=1440), budget_allocations jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(law_id,version)
);
REVOKE ALL ON public.national_law_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_law_versions TO authenticated;
GRANT ALL ON public.national_law_versions TO service_role;
REVOKE TRUNCATE ON public.national_law_versions FROM service_role;
ALTER TABLE public.national_law_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_law_versions_read ON public.national_law_versions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.national_laws l JOIN public.characters c ON c.id=l.author_character_id WHERE l.id=law_id AND c.user_id=auth.uid()));

-- Référence différée : insertion loi puis version possible dans la même transaction.
ALTER TABLE public.national_laws ADD CONSTRAINT national_current_version_exists
 FOREIGN KEY(id,current_version) REFERENCES public.national_law_versions(law_id,version) DEFERRABLE INITIALLY DEFERRED;

-- national_sessions
CREATE TABLE public.national_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), law_id uuid NOT NULL, version integer NOT NULL, chamber text NOT NULL CHECK(chamber IN('assembly','senate')), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN('open','approved','rejected')), eligible_seats integer NOT NULL CHECK(eligible_seats IN(50,25)), majority_required integer NOT NULL, CHECK((chamber='assembly' AND eligible_seats=50 AND majority_required=26) OR (chamber='senate' AND eligible_seats=25 AND majority_required=13)), electorate jsonb NOT NULL CHECK(jsonb_typeof(electorate)='array'), yes_votes integer, no_votes integer, abstentions integer, CHECK(ends_at=starts_at+interval '60 minutes'), CHECK((status='open' AND yes_votes IS NULL AND no_votes IS NULL AND abstentions IS NULL) OR (status<>'open' AND yes_votes IS NOT NULL AND no_votes IS NOT NULL AND abstentions IS NOT NULL AND yes_votes>=0 AND no_votes>=0 AND abstentions>=0 AND yes_votes+no_votes+abstentions=eligible_seats AND ((status='approved' AND yes_votes>=majority_required) OR (status='rejected' AND yes_votes<majority_required)))), UNIQUE(law_id,version,chamber), FOREIGN KEY(law_id,version) REFERENCES public.national_law_versions(law_id,version)
);
REVOKE ALL ON public.national_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_sessions TO authenticated;
GRANT ALL ON public.national_sessions TO service_role;
REVOKE TRUNCATE ON public.national_sessions FROM service_role;
ALTER TABLE public.national_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_sessions_read ON public.national_sessions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.national_laws l JOIN public.characters c ON c.id=l.author_character_id WHERE l.id=law_id AND c.user_id=auth.uid()));

-- national_parliamentary_votes
CREATE TABLE public.national_parliamentary_votes (
  session_id uuid NOT NULL REFERENCES public.national_sessions(id), seat_id uuid NOT NULL REFERENCES public.national_seats(id), character_id uuid NOT NULL REFERENCES public.characters(id), activity_id uuid NOT NULL UNIQUE REFERENCES public.activities(id), vote text NOT NULL CHECK(vote IN('yes','no','abstain')), cast_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(session_id,seat_id)
);
REVOKE ALL ON public.national_parliamentary_votes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_parliamentary_votes TO authenticated;
GRANT ALL ON public.national_parliamentary_votes TO service_role;
REVOKE TRUNCATE ON public.national_parliamentary_votes FROM service_role;
ALTER TABLE public.national_parliamentary_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_parliamentary_votes_read ON public.national_parliamentary_votes FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_treasury
CREATE TABLE public.national_treasury (
  id integer PRIMARY KEY CHECK(id=1), balance bigint NOT NULL CHECK(balance BETWEEN 0 AND 100000)
);
REVOKE ALL ON public.national_treasury FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_treasury TO authenticated;
GRANT ALL ON public.national_treasury TO service_role;
REVOKE TRUNCATE ON public.national_treasury FROM service_role;
ALTER TABLE public.national_treasury ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_treasury_read ON public.national_treasury FOR SELECT TO authenticated USING(true);

-- national_budgets
CREATE TABLE public.national_budgets (
  law_id uuid NOT NULL, version integer NOT NULL, allocations jsonb NOT NULL, total bigint NOT NULL CHECK(total>=0), funded_at timestamptz NOT NULL, PRIMARY KEY(law_id,version), FOREIGN KEY(law_id,version) REFERENCES public.national_law_versions(law_id,version)
);
REVOKE ALL ON public.national_budgets FROM PUBLIC, anon, authenticated;
ALTER TABLE public.national_budgets ADD CONSTRAINT national_law_funded_once UNIQUE(law_id);
GRANT SELECT ON public.national_budgets TO authenticated;
GRANT ALL ON public.national_budgets TO service_role;
REVOKE TRUNCATE ON public.national_budgets FROM service_role;
ALTER TABLE public.national_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_budgets_read ON public.national_budgets FOR SELECT TO authenticated USING(true);

-- national_ledger
CREATE TABLE public.national_ledger (
  entry_key text PRIMARY KEY, law_id uuid NOT NULL, version integer NOT NULL, amount bigint NOT NULL, occurred_at timestamptz NOT NULL, FOREIGN KEY(law_id,version) REFERENCES public.national_law_versions(law_id,version)
);
REVOKE ALL ON public.national_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_ledger TO authenticated;
GRANT ALL ON public.national_ledger TO service_role;
REVOKE TRUNCATE ON public.national_ledger FROM service_role;
ALTER TABLE public.national_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_ledger_read ON public.national_ledger FOR SELECT TO authenticated USING(true);

-- national_city_effects
CREATE TABLE public.national_city_effects (
  law_id uuid NOT NULL, version integer NOT NULL, city_id text NOT NULL, indicator text NOT NULL, requested_delta integer NOT NULL, before_value integer NOT NULL CHECK(before_value BETWEEN 0 AND 100), after_value integer NOT NULL CHECK(after_value BETWEEN 0 AND 100), applied_at timestamptz NOT NULL, PRIMARY KEY(law_id,version,city_id,indicator), FOREIGN KEY(law_id,version) REFERENCES public.national_law_versions(law_id,version), FOREIGN KEY(city_id,indicator) REFERENCES public.city_indicators(city_id,indicator)
);
REVOKE ALL ON public.national_city_effects FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_city_effects TO authenticated;
GRANT ALL ON public.national_city_effects TO service_role;
REVOKE TRUNCATE ON public.national_city_effects FROM service_role;
ALTER TABLE public.national_city_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_city_effects_read ON public.national_city_effects FOR SELECT TO authenticated USING(true);

-- national_requests
CREATE TABLE public.national_requests (
  character_id uuid NOT NULL REFERENCES public.characters(id), request_id uuid NOT NULL, command text NOT NULL, input jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(character_id,request_id)
);
REVOKE ALL ON public.national_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_requests TO authenticated;
GRANT ALL ON public.national_requests TO service_role;
REVOKE TRUNCATE ON public.national_requests FROM service_role;
ALTER TABLE public.national_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_requests_read ON public.national_requests FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

-- national_publications
CREATE TABLE public.national_publications (
  publication_key text PRIMARY KEY, event_id uuid NOT NULL UNIQUE REFERENCES public.events(id)
);
REVOKE ALL ON public.national_publications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.national_publications TO authenticated;
GRANT ALL ON public.national_publications TO service_role;
REVOKE TRUNCATE ON public.national_publications FROM service_role;
ALTER TABLE public.national_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY national_publications_read ON public.national_publications FOR SELECT TO authenticated USING(true);

-- Initialisation de NOUVELLES données seulement. Aucune donnée des anciens blocs changée.
INSERT INTO public.national_settings(id,rules) VALUES(1,'{
 "voting_age":18,"candidate_age":18,"civic_min":20,"reputation_min":15,
 "influence_min":10,"session_minutes":60,"session_energy":10,
 "fictional_vote_unit":100,"initial_budget":100000,
 "candidacy_days":7,"frozen_days":1,"voting_days":2,"term_days":28,
 "successor_preparation_days":10,"law_cost":12000,"law_delay_minutes":1440,
 "currency":"crédits","independent_candidacies":false
}'::jsonb);
INSERT INTO public.national_treasury(id,balance) VALUES(1,100000);
-- Identifiants issus des données initiales du Bloc 7, pas de nouveaux partis.
-- Les FK feront échouer atomiquement une installation si un parti manque.
INSERT INTO public.national_party_profiles(organization_id,simulation_weight) VALUES
('7a7a0000-0000-4000-8000-000000000001',1),
('7a7a0000-0000-4000-8000-000000000002',1),
('7a7a0000-0000-4000-8000-000000000003',1),
('7a7a0000-0000-4000-8000-000000000004',1);
-- Cinq emplacements INACTIFS : aucun titre, texte, delta ou ministère inventé.
-- Prix global, aucun partage obligatoire en postes non décidés.
INSERT INTO public.national_law_templates(id,title,category,effects,cost,delay_minutes,budget_allocations,active) VALUES
('law-01','','','{}',12000,1440,'{}',false),
('law-02','','','{}',12000,1440,'{}',false),
('law-03','','','{}',12000,1440,'{}',false),
('law-04','','','{}',12000,1440,'{}',false),
('law-05','','','{}',12000,1440,'{}',false);
INSERT INTO public.national_constituencies(city_id,name) VALUES
('paris','Circonscription de Paris'),('lyon','Circonscription de Lyon'),
('marseille','Circonscription de Marseille'),('lille','Circonscription de Lille'),
('bordeaux','Circonscription de Bordeaux');
CREATE UNIQUE INDEX national_one_government ON public.national_governments(legislature_id);
CREATE UNIQUE INDEX national_one_president ON public.national_offices(government_id) WHERE role='president';
CREATE UNIQUE INDEX national_one_pm ON public.national_offices(government_id) WHERE role='prime_minister';
CREATE UNIQUE INDEX national_group_party_once ON public.national_groups(legislature_id,chamber,organization_id) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX national_group_independent_once ON public.national_groups(legislature_id,chamber) WHERE organization_id IS NULL;
-- Le Sénat reste entièrement simulé : aucune attribution de siège joueur.
ALTER TABLE public.national_seats ADD CONSTRAINT national_senate_simulated_only CHECK(chamber<>'senate' OR (simulated AND character_id IS NULL));
ALTER TABLE public.national_seats ADD CONSTRAINT national_assembly_5_plus_45
 CHECK(chamber<>'assembly' OR
 (seat_no BETWEEN 1 AND 5 AND NOT simulated AND city_id IS NOT NULL AND num_nonnulls(character_id,npc_id)=1) OR
 (seat_no BETWEEN 6 AND 50 AND simulated AND city_id IS NULL AND character_id IS NULL AND npc_id IS NULL));
CREATE UNIQUE INDEX national_one_territorial_city ON public.national_seats(legislature_id,city_id)
 WHERE chamber='assembly' AND seat_no<=5;
ALTER TABLE public.national_city_effects ADD CONSTRAINT national_effect_once_per_law
 UNIQUE(law_id,city_id,indicator);

-- Authentification sans civic_actor/prepare_daily_life : pas de règlement de salaire/loyer.
CREATE FUNCTION public.national_actor() RETURNS public.characters
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.characters;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 SELECT * INTO c FROM public.characters WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 RETURN c;
END $$;

-- Configuration opérateur UNIQUEMENT ; aucun montant/seuil/calendrier inventé.
-- Clés attendues : voting_age, candidate_age, civic_min, reputation_min, influence_min,
-- session_minutes, session_energy, fictional_vote_unit, initial_budget.
-- Aucun seuil de nomination joueur : gouvernement PNJ uniquement.
-- fictional_vote_unit : poids d'électorat par unité simulation_weight d'un parti.
CREATE FUNCTION public.national_configure(_rules jsonb,_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE approved jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT rules INTO approved FROM public.national_settings WHERE id=1;
 IF _rules IS DISTINCT FROM approved THEN RAISE EXCEPTION 'Les paramètres validés sont figés ; nouvelle proposition requise'; END IF;
 IF _enabled IS NULL THEN RAISE EXCEPTION 'Activation explicite requise'; END IF;
 IF _enabled THEN RAISE EXCEPTION 'Activation refusée : règles Sénat, voix territoriales, votes simulés et contenus/publicité encore à valider'; END IF;
 UPDATE public.national_settings SET enabled=false WHERE id=1;
 -- Aucun réapprovisionnement de trésorerie, aucun revenu ni nouvelle dotation.
END $$;

CREATE FUNCTION public.national_eligible(_cid uuid,_rules jsonb,_office boolean DEFAULT false) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 -- Nomination joueur hors première version, même si ses statistiques suffisent.
 IF _office IS DISTINCT FROM false THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM public.characters c
 LEFT JOIN public.civic_stats cs ON cs.character_id=c.id
 LEFT JOIN public.political_stats ps ON ps.character_id=c.id
 WHERE c.id=_cid AND c.age>=18 AND COALESCE(cs.engagement,0)>=20
 AND COALESCE(ps.reputation,0)>=15 AND COALESCE(ps.influence,0)>=10);
END $$;

-- Calendrier propre : aucune création/modification de scrutin municipal.
CREATE FUNCTION public.national_create_election(_name text,_candidacies_at timestamptz,_candidacies_end timestamptz,_vote_at timestamptz,_vote_end timestamptz,_term_end timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eid uuid; prev public.national_elections; snapshot jsonb; settings jsonb; at_time timestamptz:=public.game_now();
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 IF _name IS NULL OR length(btrim(_name)) NOT BETWEEN 3 AND 120 OR _candidacies_at IS NULL OR _candidacies_at<=at_time
 OR _candidacies_end IS DISTINCT FROM _candidacies_at+interval '7 days'
 OR _vote_at IS DISTINCT FROM _candidacies_end+interval '1 day'
 OR _vote_end IS DISTINCT FROM _vote_at+interval '2 days'
 OR _term_end IS DISTINCT FROM _vote_end+interval '28 days' THEN RAISE EXCEPTION 'Calendrier national requis : 7+1+2 jours, mandat 28 jours après clôture'; END IF;
 SELECT * INTO prev FROM public.national_elections WHERE status<>'cancelled' ORDER BY candidacies_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF prev.status<>'completed' OR at_time<prev.term_end_at-interval '10 days' OR at_time>=prev.term_end_at
  OR _candidacies_at<prev.term_end_at-interval '10 days' OR _candidacies_at>=prev.term_end_at
  THEN RAISE EXCEPTION 'Un successeur seulement, préparation et ouverture dans les dix derniers jours du mandat'; END IF;
 END IF;
 SELECT jsonb_object_agg(p.organization_id::text,jsonb_build_object('weight',p.simulation_weight,'fictional_votes',p.simulation_weight::bigint*100)) INTO snapshot
 FROM public.national_party_profiles p JOIN public.organizations o ON o.id=p.organization_id JOIN public.political_profiles pp ON pp.organization_id=o.id
 WHERE o.kind='party' AND o.status='active' AND o.scope='national';
 IF snapshot IS NULL OR (prev.id IS NULL AND (SELECT count(*) FROM jsonb_object_keys(snapshot))<>4)
 OR (prev.id IS NULL AND EXISTS(SELECT 1 FROM jsonb_each(snapshot) x WHERE (x.value->>'weight')::int<>1)) THEN RAISE EXCEPTION 'Quatre partis actifs de poids initial 1 requis'; END IF;
 SELECT rules INTO settings FROM public.national_settings WHERE id=1;
 INSERT INTO public.national_elections(name,candidacies_at,candidacies_end_at,vote_at,vote_end_at,term_end_at,rules,predecessor_id)
 VALUES(_name,_candidacies_at,_candidacies_end,_vote_at,_vote_end,_term_end,settings||jsonb_build_object('party_snapshot',snapshot),prev.id) RETURNING id INTO eid;
 RETURN eid;
END $$;

-- Répartition Assemblée : plus forts restes ; Sénat toujours bloqué.
CREATE FUNCTION public.national_allocate_simulated(_lid uuid,_chamber text,_weights jsonb,_count integer,_offset integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.national_legislatures; e public.national_elections; approved jsonb; x record; total numeric; gid uuid; n integer; seat_index integer:=5;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 IF _chamber IS DISTINCT FROM 'assembly' OR _count IS DISTINCT FROM 45 OR _offset IS DISTINCT FROM 5 THEN RAISE EXCEPTION 'Répartition du Sénat non validée ; seule Assemblée 45+5 autorisée'; END IF;
 SELECT * INTO l FROM public.national_legislatures WHERE id=_lid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Législature introuvable'; END IF;
 SELECT * INTO e FROM public.national_elections WHERE id=l.election_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scrutin introuvable'; END IF;
 SELECT jsonb_object_agg(key,(value->>'weight')::numeric) INTO approved FROM jsonb_each(e.rules->'party_snapshot');
 IF approved IS NULL OR _weights IS DISTINCT FROM approved THEN RAISE EXCEPTION 'Poids différents de l’instantané électoral'; END IF;
 IF (SELECT count(*) FROM public.national_seats WHERE legislature_id=l.id AND chamber='assembly' AND seat_no<=5)<>5 THEN RAISE EXCEPTION 'Cinq gagnants territoriaux réels requis avant le complément simulé'; END IF;
 IF EXISTS(SELECT 1 FROM public.national_seats WHERE legislature_id=l.id AND chamber='assembly' AND seat_no>5) THEN
  IF (SELECT count(*) FROM public.national_seats WHERE legislature_id=l.id AND chamber='assembly' AND seat_no>5)=45 THEN RETURN; END IF;
  RAISE EXCEPTION 'Répartition partielle incohérente';
 END IF;
 SELECT sum(value::numeric) INTO total FROM jsonb_each_text(approved);
 IF total IS NULL OR total<=0 THEN RAISE EXCEPTION 'Poids manquants'; END IF;
 -- Plus forts restes exacts en NUMERIC, pas de flottants ni de tirage au rattrapage.
 -- Départage proposé transparent : MD5(graine UUID || ':' || UUID parti),
 -- ordre hexadécimal croissant, UUID en dernier recours si collision.
 FOR x IN WITH weights AS (SELECT key::uuid oid,value::numeric w FROM jsonb_each_text(approved)),
 quotas AS (SELECT oid,floor(45*w/total)::int base,45*w/total-floor(45*w/total) remainder FROM weights),
 ordered AS (SELECT *,row_number() OVER(ORDER BY remainder DESC,md5(e.tie_seed::text||':'||oid::text),oid) rn,45-sum(base) OVER() remaining FROM quotas)
 SELECT oid,base+CASE WHEN rn<=remaining THEN 1 ELSE 0 END seats FROM ordered ORDER BY oid LOOP
  SELECT id INTO gid FROM public.national_groups WHERE legislature_id=l.id AND chamber='assembly' AND organization_id=x.oid;
  IF gid IS NULL THEN
   INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name,support)
   SELECT l.id,'assembly',o.id,o.name,NULL FROM public.organizations o WHERE o.id=x.oid RETURNING id INTO gid;
   -- Aucune préférence de vote inventée ; clôture simulée toujours bloquée.
  END IF;
  IF gid IS NULL THEN RAISE EXCEPTION 'Parti introuvable'; END IF;
  FOR n IN 1..x.seats LOOP
   seat_index:=seat_index+1;
   INSERT INTO public.national_seats(legislature_id,chamber,seat_no,group_id,display_name,simulated)
   VALUES(l.id,'assembly',seat_index,gid,'Siège simulé '||seat_index,true);
  END LOOP;
 END LOOP;
 IF seat_index<>50 THEN RAISE EXCEPTION 'Quarante-cinq sièges simulés requis'; END IF;
END $$;

CREATE FUNCTION public.national_compose_senate(_lid uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.national_legislatures; source jsonb; weights jsonb; at_time timestamptz:=public.game_now();
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_legislatures WHERE id=_lid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Législature introuvable'; END IF;
 IF l.senate_composed_at IS NOT NULL THEN RETURN true; END IF;
 IF at_time<l.starts_at OR at_time>=l.ends_at THEN RETURN false; END IF;
 -- Source en lecture seule, aucun rafraîchissement/modification des mandats municipaux.
 SELECT jsonb_agg(jsonb_build_object('mandate_id',m.id,'group_id',g.id,'organization_id',g.organization_id,'seats',g.seats) ORDER BY m.id,g.id)
 INTO source FROM public.municipal_mandates m JOIN public.municipal_council_groups g ON g.mandate_id=m.id
 WHERE m.status='active' AND m.starts_at<=at_time AND m.ends_at>at_time;
 IF source IS NULL THEN RETURN false; END IF;
 SELECT jsonb_object_agg(organization_id::text,n) INTO weights FROM (
 SELECT g.organization_id,sum(g.seats) n FROM jsonb_array_elements(source) x
 CROSS JOIN LATERAL (SELECT (x->>'organization_id')::uuid organization_id,(x->>'seats')::integer seats) g
 JOIN public.national_party_profiles p ON p.organization_id=g.organization_id
 GROUP BY g.organization_id HAVING sum(g.seats)>0) q;
 -- Traitement des indépendants/partis non configurés À DÉCIDER.
 -- Aucun siège local ignoré ; blocage explicite, pas un Sénat faussement constitué.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(source) x WHERE (x->>'seats')::int>0 AND (x->>'organization_id' IS NULL OR NOT EXISTS(SELECT 1 FROM public.national_party_profiles p WHERE p.organization_id=(x->>'organization_id')::uuid))) THEN RAISE EXCEPTION 'Composition du Sénat en attente : traitement des groupes indépendants/non configurés À DÉCIDER'; END IF;
 IF weights IS NULL THEN RETURN false; END IF;
 RAISE EXCEPTION 'Sénat en attente : admissibilité de l’instantané et méthode des 25 sièges non validées';
 -- Aucune écriture ni méthode étendue au Sénat par simple analogie.
END $$;

CREATE FUNCTION public.national_count_election(_eid uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 -- Un tour / un gagnant par ville VALIDÉS ; ne pas inventer la répartition des
 -- 100 voix fictives par parti entre cinq villes/candidats, ni des faux candidats
 -- dans une ville vide. Mandat futur ancré à vote_end_at, jamais à game_now().
 RAISE EXCEPTION 'Dépouillement en attente : voix fictives territoriales, candidatures absentes et publicité à valider';
END $$;

-- Modèles validés opérateur : deltas et coûts jamais envoyés par le joueur.
CREATE FUNCTION public.national_validate_template() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d record; a record; total numeric:=0;
BEGIN
 FOR d IN SELECT * FROM jsonb_each_text(NEW.effects) LOOP
  IF d.value IS NULL OR d.key NOT IN('housing','employment','transport','environment','safety','services','commerce','culture','satisfaction') OR d.value !~ '^-?[0-9]+$' OR d.value::numeric NOT BETWEEN -100 AND 100 THEN RAISE EXCEPTION 'Effet de ville invalide'; END IF;
 END LOOP;
 FOR a IN SELECT * FROM jsonb_each_text(NEW.budget_allocations) LOOP
  -- Noms des postes budgétaires À DÉCIDER ; contrôle de format seulement.
  IF a.key='' OR a.value IS NULL OR a.value !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Poste budgétaire invalide'; END IF;
  total:=total+a.value::numeric;
 END LOOP;
 IF NEW.budget_allocations<>'{}'::jsonb AND total<>NEW.cost THEN RAISE EXCEPTION 'Budget non équilibré'; END IF;
 IF NEW.cost<>12000 OR NEW.delay_minutes<>1440 THEN RAISE EXCEPTION 'Coût global 12 000 et délai 24 heures requis'; END IF;
 IF NEW.active AND (length(btrim(NEW.title))<3 OR length(btrim(NEW.category))=0 OR NEW.effects='{}'::jsonb) THEN RAISE EXCEPTION 'Modèle incomplet : titre, catégorie et effets doivent être validés'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER national_template_validate BEFORE INSERT OR UPDATE ON public.national_law_templates FOR EACH ROW EXECUTE FUNCTION public.national_validate_template();

CREATE FUNCTION public.national_publish(_key text,_title text,_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eid uuid;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
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
BEGIN
 RAISE EXCEPTION 'Votes simulés et traitement des absences À DÉCIDER : opération non disponible dans ce socle';
END $$;

CREATE FUNCTION public.national_apply_law(_law uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.national_laws; v public.national_law_versions; ci record; d record; cur integer; nxt integer; funds bigint; k text;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_laws WHERE id=_law FOR UPDATE;
 IF NOT FOUND OR l.status NOT IN('adopted','applied') THEN RETURN false; END IF;
 IF l.status='applied' THEN RETURN true; END IF;
 SELECT * INTO v FROM public.national_law_versions WHERE law_id=l.id AND version=l.current_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version de loi introuvable'; END IF;
 IF l.adopted_at IS NULL THEN RAISE EXCEPTION 'Date d’adoption manquante'; END IF;
 IF public.game_now()<l.adopted_at+interval '24 hours' THEN RETURN false; END IF;
 IF (SELECT count(DISTINCT chamber) FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND status='approved' AND yes_votes>=majority_required AND ends_at<=public.game_now())<>2 THEN RAISE EXCEPTION 'Deux majorités réelles sur la même version requises'; END IF;
 IF l.adopted_at IS DISTINCT FROM (SELECT max(ends_at) FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND status='approved') THEN RAISE EXCEPTION 'Date d’adoption incohérente avec les séances'; END IF;
 SELECT balance INTO funds FROM public.national_treasury WHERE id=1 FOR UPDATE;
 IF funds IS NULL OR funds<v.cost THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.national_budgets WHERE law_id=l.id) OR EXISTS(SELECT 1 FROM public.national_ledger WHERE law_id=l.id) OR EXISTS(SELECT 1 FROM public.national_city_effects WHERE law_id=l.id) THEN RAISE EXCEPTION 'Registre partiel incohérent : application refusée'; END IF;
 -- Tout ou rien : prévalidation de la présence de tous les indicateurs, ordre stable.
 IF EXISTS(SELECT 1 FROM public.national_constituencies c CROSS JOIN jsonb_each_text(v.effects) d WHERE NOT EXISTS(SELECT 1 FROM public.city_indicators i WHERE i.city_id=c.city_id AND i.indicator=d.key)) THEN RAISE EXCEPTION 'Indicateur de ville manquant'; END IF;
 INSERT INTO public.national_budgets(law_id,version,allocations,total,funded_at) VALUES(l.id,v.version,v.budget_allocations,v.cost,public.game_now());
 IF FOUND THEN
  UPDATE public.national_treasury SET balance=balance-v.cost WHERE id=1;
  INSERT INTO public.national_ledger(entry_key,law_id,version,amount,occurred_at) VALUES('law:'||l.id||':'||v.version,l.id,v.version,-v.cost,public.game_now());
 END IF;
 FOR ci IN SELECT city_id FROM public.national_constituencies ORDER BY city_id LOOP
  FOR d IN SELECT * FROM jsonb_each_text(v.effects) ORDER BY key LOOP
   SELECT value INTO cur FROM public.city_indicators WHERE city_id=ci.city_id AND indicator=d.key FOR UPDATE;
   nxt:=LEAST(100,GREATEST(0,cur+d.value::int));
   INSERT INTO public.national_city_effects(law_id,version,city_id,indicator,requested_delta,before_value,after_value,applied_at)
   VALUES(l.id,v.version,ci.city_id,d.key,d.value::int,cur,nxt,public.game_now());
   IF FOUND THEN
    UPDATE public.city_indicators SET value=nxt WHERE city_id=ci.city_id AND indicator=d.key;
    k:='national:'||l.id||':'||v.version||':'||ci.city_id;
    INSERT INTO public.indicator_history(city_id,indicator,before_value,after_value,effect_key,occurred_at) VALUES(ci.city_id,d.key,cur,nxt,k,public.game_now());
   END IF;
  END LOOP;
 END LOOP;
 UPDATE public.national_laws SET status='applied',applied_at=public.game_now() WHERE id=l.id;
 PERFORM public.national_publish('law-applied:'||l.id||':'||v.version,'Application d’une loi nationale',(SELECT title FROM public.national_law_templates WHERE id=v.template_id));
 RETURN true;
END $$;

-- Exécutif simulé choisi par opérateur ; pas de pouvoir de nomination côté joueur.
CREATE FUNCTION public.national_form_government(_lid uuid,_president uuid,_pm uuid,_ministers jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.national_legislatures; gid uuid; x record; requested jsonb; stored jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 SELECT * INTO l FROM public.national_legislatures WHERE id=_lid FOR UPDATE;
 IF NOT FOUND OR public.game_now()<l.starts_at OR public.game_now()>=l.ends_at THEN RAISE EXCEPTION 'Législature inactive'; END IF;
 IF _president IS NULL OR _pm IS NULL OR jsonb_typeof(_ministers) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Six PNJ explicitement désignés requis'; END IF;
 IF jsonb_array_length(_ministers)<>4 OR EXISTS(SELECT 1 FROM jsonb_array_elements(_ministers) x WHERE jsonb_typeof(x) IS DISTINCT FROM 'object' OR COALESCE(length(btrim(x->>'ministry')),0)=0 OR x->>'npc_id' IS NULL) THEN RAISE EXCEPTION 'Quatre ministres nommés explicitement requis'; END IF;
 requested:=jsonb_build_array(jsonb_build_object('npc_id',_president,'role','president','ministry',''),jsonb_build_object('npc_id',_pm,'role','prime_minister','ministry',''))||
 (SELECT jsonb_agg(jsonb_build_object('npc_id',(x->>'npc_id')::uuid,'role','minister','ministry',btrim(x->>'ministry'))) FROM jsonb_array_elements(_ministers) x);
 IF (SELECT count(DISTINCT x->>'npc_id') FROM jsonb_array_elements(requested) x)<>6 OR (SELECT count(DISTINCT x->>'ministry') FROM jsonb_array_elements(requested) x WHERE x->>'role'='minister')<>4 THEN RAISE EXCEPTION 'PNJ et ministères distincts requis dans cette proposition'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(requested) x WHERE NOT EXISTS(SELECT 1 FROM public.social_npcs n WHERE n.id=(x->>'npc_id')::uuid)) THEN RAISE EXCEPTION 'PNJ existant introuvable'; END IF;
 SELECT id INTO gid FROM public.national_governments WHERE legislature_id=l.id;
 IF gid IS NOT NULL THEN
  SELECT jsonb_agg(jsonb_build_object('npc_id',npc_id,'role',role,'ministry',ministry) ORDER BY role,ministry,npc_id) INTO stored FROM public.national_offices WHERE government_id=gid;
  IF stored IS DISTINCT FROM (SELECT jsonb_agg(x ORDER BY x->>'role',x->>'ministry',x->>'npc_id') FROM jsonb_array_elements(requested) x) THEN RAISE EXCEPTION 'Gouvernement déjà constitué avec d’autres nominations'; END IF;
  RETURN gid;
 END IF;
 INSERT INTO public.national_governments(legislature_id,government_no,majority_group_id,starts_at,ends_at) VALUES(l.id,1,NULL,public.game_now(),l.ends_at) RETURNING id INTO gid;
 FOR x IN SELECT value FROM jsonb_array_elements(requested) LOOP
  INSERT INTO public.national_offices(government_id,role,ministry,npc_id,display_name,starts_at,ends_at)
  SELECT gid,x.value->>'role',x.value->>'ministry',n.id,n.first_name||' '||n.last_name,public.game_now(),l.ends_at FROM public.social_npcs n WHERE n.id=(x.value->>'npc_id')::uuid;
  PERFORM public.national_publish('nomination:'||gid||':'||(x.value->>'role')||':'||(x.value->>'ministry'),'Nomination nationale',
  (SELECT first_name||' '||last_name FROM public.social_npcs WHERE id=(x.value->>'npc_id')::uuid)||' — '||(x.value->>'role'));
 END LOOP;
 -- Proposition technique explicite : six personnes distinctes, mandat exécutif
 -- limité à cette législature ; remplacements non décidés donc interdits.
 RETURN gid;
END $$;

CREATE FUNCTION public.national_nominate(_gov uuid,_role text,_ministry text,_cid uuid,_npc uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RAISE EXCEPTION 'Nomination individuelle/joueur et remplacement hors première version : utiliser la formation atomique des six PNJ';
END $$;

-- Dépôt de groupes fictifs réservé opérateur ; modèles/textes validés uniquement.
CREATE FUNCTION public.national_group_proposal(_group uuid,_template text,_title text,_description text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.national_groups; t public.national_law_templates; lid uuid;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
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
 IF l.id IS NULL OR l.status NOT IN('proposed','examining') OR r IS NULL OR _at IS NULL OR _at<public.game_now() OR _chamber IS NULL OR _chamber NOT IN('assembly','senate') THEN RAISE EXCEPTION 'Séance invalide'; END IF;
 finish:=_at+(r->>'session_minutes')::int*interval '1 minute';
 IF EXISTS(SELECT 1 FROM public.national_constituencies c WHERE NOT EXISTS(SELECT 1 FROM public.locations ll JOIN public.districts dd ON dd.id=ll.district_id WHERE ll.city_id=c.city_id AND ll.kind IN('administration','mairie') AND ll.accessible AND dd.available)) THEN RAISE EXCEPTION 'Lieu administratif manquant : séances en attente, aucun lieu inventé'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.national_legislatures WHERE id=l.legislature_id AND starts_at<=_at AND ends_at>=finish) THEN RAISE EXCEPTION 'Séance hors mandat'; END IF;
 count_seats:=CASE WHEN _chamber='assembly' THEN 50 ELSE 25 END;
 SELECT jsonb_agg(jsonb_build_object('seat_id',s.id,'simulated',s.simulated,'support',g.support) ORDER BY s.seat_no) INTO electorate FROM public.national_seats s JOIN public.national_groups g ON g.id=s.group_id WHERE s.legislature_id=l.legislature_id AND s.chamber=_chamber;
 -- Une seule séance par version/chambre : réouverture identique idempotente,
 -- nouvel examen après refus uniquement par une NOUVELLE version.
 SELECT id INTO sid FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND chamber=_chamber AND starts_at=_at;
 IF sid IS NOT NULL THEN RETURN sid; END IF;
 IF EXISTS(SELECT 1 FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND chamber=_chamber) THEN RAISE EXCEPTION 'Cette chambre a déjà une séance pour cette version'; END IF;
 IF jsonb_array_length(COALESCE(electorate,'[]'::jsonb))<>count_seats THEN RAISE EXCEPTION 'Chambre non constituée'; END IF;
 INSERT INTO public.national_sessions(law_id,version,chamber,starts_at,ends_at,eligible_seats,majority_required,electorate)
 VALUES(l.id,l.current_version,_chamber,_at,finish,count_seats,CASE WHEN _chamber='assembly' THEN 26 ELSE 13 END,electorate) RETURNING id INTO sid;
 UPDATE public.national_laws SET status='examining' WHERE id=l.id;
 RETURN sid;
END $$;

-- Entrée unique joueur : aucune cible personnage ni montant/effet fourni par le client.
CREATE FUNCTION public.national_action(_command text,_request_id uuid,_input jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.characters; old public.national_requests; e public.national_elections; k public.national_candidacies; l public.national_laws; t public.national_law_templates; s public.national_sessions; seat public.national_seats; r jsonb; aid uuid; oid uuid; lid uuid; result jsonb; pp public.character_positions; loc public.locations; activity public.activities;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 SELECT * INTO c FROM public.characters WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 IF _request_id IS NULL OR _command IS NULL OR _input IS NULL OR jsonb_typeof(_input)<>'object' THEN RAISE EXCEPTION 'Demande invalide'; END IF;
 SELECT * INTO old FROM public.national_requests WHERE character_id=c.id AND request_id=_request_id;
 IF FOUND THEN
  IF old.command<>_command OR old.input<>_input THEN RAISE EXCEPTION 'Clé réutilisée avec une autre demande'; END IF;
  RETURN old.result;
 END IF;
 c:=public.national_actor();
 UPDATE public.activities SET status='completed' WHERE character_id=c.id AND type='national' AND status='running' AND end_time<=public.game_now();
 SELECT rules INTO r FROM public.national_settings WHERE id=1;
 CASE _command
 WHEN 'candidacy' THEN
  SELECT * INTO e FROM public.national_elections WHERE id=(_input->>'election_id')::uuid FOR UPDATE;
  IF NOT FOUND OR e.status IN('completed','cancelled') OR public.game_now()<e.candidacies_at OR public.game_now()>=e.candidacies_end_at THEN RAISE EXCEPTION 'Candidatures fermées'; END IF;
  oid:=(_input->>'organization_id')::uuid;
  IF jsonb_typeof(COALESCE(_input->'program','{}'::jsonb))<>'object' OR octet_length(COALESCE(_input->'program','{}'::jsonb)::text)>12000 THEN RAISE EXCEPTION 'Programme invalide'; END IF;
  IF NOT public.national_eligible(c.id,e.rules) OR NOT EXISTS(SELECT 1 FROM public.memberships m JOIN public.national_party_profiles p ON p.organization_id=m.organization_id JOIN public.organizations o ON o.id=m.organization_id WHERE m.character_id=c.id AND m.organization_id=oid AND m.status='active' AND o.kind='party' AND o.status='active' AND o.scope='national' AND (e.rules->'party_snapshot') ? oid::text) THEN RAISE EXCEPTION 'Conditions ou parti non remplis'; END IF;
  INSERT INTO public.national_candidacies(election_id,city_id,character_id,organization_id,display_name,program)
  VALUES(e.id,c.city_id,c.id,oid,c.first_name||' '||c.last_name,COALESCE(_input->'program','{}'::jsonb)) RETURNING id INTO lid;
  result:=jsonb_build_object('id',lid);
 WHEN 'program' THEN
  SELECT * INTO k FROM public.national_candidacies WHERE id=(_input->>'candidacy_id')::uuid AND character_id=c.id FOR UPDATE;
  SELECT * INTO e FROM public.national_elections WHERE id=k.election_id;
  IF k.id IS NULL OR e.status IN('completed','cancelled') OR k.status<>'accepted' OR public.game_now()<e.candidacies_at OR public.game_now()>=e.candidacies_end_at OR _input->'program' IS NULL OR jsonb_typeof(_input->'program')<>'object' OR octet_length((_input->'program')::text)>12000 THEN RAISE EXCEPTION 'Programme invalide ou période fermée'; END IF;
  UPDATE public.national_candidacies SET program=_input->'program' WHERE id=k.id;
  result:=jsonb_build_object('id',k.id);
 WHEN 'vote' THEN
  SELECT * INTO e FROM public.national_elections WHERE id=(_input->>'election_id')::uuid FOR UPDATE;
  IF NOT FOUND OR e.status IN('completed','cancelled') OR c.age<18 OR public.game_now()<e.vote_at OR public.game_now()>=e.vote_end_at THEN RAISE EXCEPTION 'Vote inaccessible'; END IF;
  SELECT * INTO k FROM public.national_candidacies WHERE id=(_input->>'candidacy_id')::uuid AND election_id=e.id AND city_id=c.city_id AND status='accepted' AND published_at<=public.game_now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidat de votre circonscription requis'; END IF;
  IF EXISTS(SELECT 1 FROM public.national_ballots WHERE election_id=e.id AND character_id=c.id AND candidacy_id<>k.id) THEN RAISE EXCEPTION 'Vote déjà enregistré, immuable'; END IF;
  INSERT INTO public.national_ballots(election_id,character_id,city_id,candidacy_id) VALUES(e.id,c.id,c.city_id,k.id) ON CONFLICT(election_id,character_id) DO NOTHING;
  result:=jsonb_build_object('voted',true);
 WHEN 'law' THEN
  SELECT ns.* INTO seat FROM public.national_seats ns JOIN public.national_legislatures nl ON nl.id=ns.legislature_id WHERE ns.character_id=c.id AND nl.starts_at<=public.game_now() AND nl.ends_at>public.game_now() ORDER BY ns.chamber LIMIT 1;
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
  IF seat.id IS NULL OR s.id IS NULL OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version OR public.game_now()>=s.starts_at THEN RAISE EXCEPTION 'Séance inaccessible'; END IF;
  IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=c.id AND status IN('planned','running') AND start_time<s.ends_at AND end_time>s.starts_at) THEN RAISE EXCEPTION 'Chevauchement avec votre agenda'; END IF;
  -- Lieu administratif existant ; aucune téléportation ou modification des positions.
  SELECT ll.* INTO loc FROM public.locations ll JOIN public.districts dd ON dd.id=ll.district_id WHERE ll.city_id=c.city_id AND ll.kind IN('administration','mairie') AND ll.accessible AND dd.available ORDER BY ll.id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lieu de séance indisponible'; END IF;
  INSERT INTO public.activities(character_id,type,title,start_time,end_time,location_id,energy_cost,source_key)
  VALUES(c.id,'national','Séance nationale',s.starts_at,s.ends_at,loc.id,(r->>'session_energy')::int,'national-session:'||s.id) RETURNING id INTO aid;
  result:=jsonb_build_object('activity_id',aid);
 WHEN 'start_session' THEN
  -- Départ explicite ; aucune auto-présence et aucun règlement salaire/loyer.
  SELECT * INTO s FROM public.national_sessions WHERE id=(_input->>'session_id')::uuid FOR UPDATE;
  SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
  IF s.id IS NULL OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version OR public.game_now()<s.starts_at OR public.game_now()>=s.ends_at THEN RAISE EXCEPTION 'Séance inaccessible'; END IF;
  SELECT * INTO activity FROM public.activities WHERE character_id=c.id AND type='national' AND source_key='national-session:'||s.id AND status IN('planned','running') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Réservation requise'; END IF;
  IF activity.status='running' THEN
   result:=jsonb_build_object('activity_id',activity.id);
  ELSE
   IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=c.id AND status='running') OR EXISTS(SELECT 1 FROM public.activities WHERE character_id=c.id AND id<>activity.id AND status='planned' AND start_time<activity.end_time AND end_time>public.game_now()) THEN RAISE EXCEPTION 'Votre agenda est occupé'; END IF;
   SELECT * INTO pp FROM public.character_positions WHERE character_id=c.id;
   IF pp.location_id IS DISTINCT FROM activity.location_id OR NOT EXISTS(SELECT 1 FROM public.locations ll JOIN public.districts dd ON dd.id=ll.district_id WHERE ll.id=activity.location_id AND ll.city_id=c.city_id AND ll.accessible AND dd.available AND ll.kind IN('administration','mairie')) THEN RAISE EXCEPTION 'Rejoignez le lieu administratif prévu'; END IF;
   IF c.energy<activity.energy_cost THEN RAISE EXCEPTION 'Énergie insuffisante'; END IF;
   -- Seule écriture sur personnage : coût d’énergie de LA séance autorisée.
   UPDATE public.characters SET energy=energy-activity.energy_cost WHERE id=c.id;
   -- Autorisation privée persistée dans la même transaction avant la transition.
   INSERT INTO public.national_requests(character_id,request_id,command,input,result)
   VALUES(c.id,_request_id,_command,_input,jsonb_build_object('activity_id',activity.id));
   UPDATE public.activities SET status='running' WHERE id=activity.id;
   result:=jsonb_build_object('activity_id',activity.id);
  END IF;
 WHEN 'parliament_vote' THEN
  SELECT * INTO s FROM public.national_sessions WHERE id=(_input->>'session_id')::uuid FOR UPDATE;
  SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
  SELECT * INTO seat FROM public.national_seats WHERE legislature_id=l.legislature_id AND chamber=s.chamber AND character_id=c.id;
  IF seat.id IS NULL OR s.id IS NULL OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version OR public.game_now()<s.starts_at OR public.game_now()>=s.ends_at OR _input->>'vote' IS NULL OR _input->>'vote' NOT IN('yes','no','abstain') THEN RAISE EXCEPTION 'Vote parlementaire inaccessible'; END IF;
  SELECT a.id INTO aid FROM public.activities a WHERE a.character_id=c.id AND a.source_key='national-session:'||s.id AND a.status='running' AND a.start_time<=public.game_now() AND a.end_time>public.game_now();
  IF aid IS NULL OR NOT EXISTS(SELECT 1 FROM public.activities a JOIN public.character_positions p ON p.character_id=a.character_id AND p.location_id=a.location_id WHERE a.id=aid AND a.type='national') THEN RAISE EXCEPTION 'Présence à la séance requise'; END IF;
  IF EXISTS(SELECT 1 FROM public.national_parliamentary_votes WHERE session_id=s.id AND seat_id=seat.id AND vote<>_input->>'vote') THEN RAISE EXCEPTION 'Vote parlementaire déjà enregistré, immuable'; END IF;
  INSERT INTO public.national_parliamentary_votes(session_id,seat_id,character_id,activity_id,vote) VALUES(s.id,seat.id,c.id,aid,_input->>'vote') ON CONFLICT(session_id,seat_id) DO NOTHING;
  result:=jsonb_build_object('voted',true);
 ELSE RAISE EXCEPTION 'Commande nationale inconnue';
 END CASE;
 IF NOT EXISTS(SELECT 1 FROM public.national_requests WHERE character_id=c.id AND request_id=_request_id) THEN
  INSERT INTO public.national_requests(character_id,request_id,command,input,result) VALUES(c.id,_request_id,_command,_input,result);
 END IF;
 RETURN result;
END $$;

-- Rattrapage opérateur séparé des fonctions Blocs 1–14 ; pas appelé par national_state.
CREATE FUNCTION public.national_refresh() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e record; l record; s record;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RETURN; END IF;
 FOR e IN SELECT id FROM public.national_elections WHERE counted_at IS NULL AND status<>'cancelled' AND vote_end_at<=public.game_now() ORDER BY vote_end_at,id LOOP
  PERFORM public.national_count_election(e.id);
  PERFORM public.national_publish('election-result:'||e.id,'Résultats des élections nationales','Les résultats nationaux et la composition de l’Assemblée sont disponibles.');
 END LOOP;
 UPDATE public.national_elections SET status=CASE WHEN public.game_now()>=vote_at THEN 'vote' WHEN public.game_now()>=candidacies_end_at THEN 'frozen' WHEN public.game_now()>=candidacies_at THEN 'candidacies' ELSE 'scheduled' END WHERE status NOT IN('completed','cancelled');
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
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN
  RETURN jsonb_build_object('enabled',false,'assembly_seats',50,'territorial_seats',5,'simulated_seats',45,'senate_seats',25,'assembly_majority',26,'senate_majority',13);
 END IF;
 SELECT jsonb_build_object(
 'world_now',public.game_now(),
 'settings',(SELECT jsonb_build_object('enabled',enabled,'assembly_seats',assembly_seats,'senate_seats',senate_seats,'assembly_majority',assembly_majority,'senate_majority',senate_majority,'rules',rules) FROM public.national_settings WHERE id=1),
 'elections',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'status',e.status,'candidacies_at',e.candidacies_at,'candidacies_end_at',e.candidacies_end_at,'vote_at',e.vote_at,'vote_end_at',e.vote_end_at,'term_end_at',e.term_end_at)||jsonb_build_object('voted',EXISTS(SELECT 1 FROM public.national_ballots b WHERE b.election_id=e.id AND b.character_id=cid))) FROM public.national_elections e),'[]'::jsonb),
 'candidates',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',k.id,'election_id',k.election_id,'city_id',k.city_id,'organization_id',k.organization_id,'display_name',k.display_name,'program',CASE WHEN k.character_id=cid THEN k.program ELSE NULL END,'mine',COALESCE(k.character_id=cid,false))) FROM public.national_candidacies k WHERE k.character_id=cid OR (k.status='accepted' AND k.published_at<=public.game_now())),'[]'::jsonb),
 'legislatures',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'election_id',election_id,'starts_at',starts_at,'ends_at',ends_at,'senate_composed',senate_composed_at IS NOT NULL)) FROM public.national_legislatures),'[]'::jsonb),
 'groups',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',g.id,'legislature_id',g.legislature_id,'chamber',g.chamber,'organization_id',g.organization_id,'name',g.name,'seats',(SELECT count(*) FROM public.national_seats s WHERE s.group_id=g.id))) FROM public.national_groups g),'[]'::jsonb),
 'seats',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'legislature_id',legislature_id,'chamber',chamber,'seat_no',seat_no,'group_id',group_id,'city_id',city_id,'display_name',CASE WHEN character_id IS NULL OR character_id=cid THEN display_name ELSE 'Siège territorial' END,'simulated',simulated,'mine',COALESCE(character_id=cid,false))) FROM public.national_seats),'[]'::jsonb),
 'government',COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM public.national_governments g),'[]'::jsonb),
 'offices',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'government_id',government_id,'role',role,'ministry',ministry,'display_name',display_name,'starts_at',starts_at,'ends_at',ends_at,'mine',character_id=cid)) FROM public.national_offices),'[]'::jsonb),
 'laws',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'legislature_id',l.legislature_id,'author_label',CASE WHEN l.author_character_id IS NULL OR l.author_character_id=cid THEN l.author_label ELSE 'Parlementaire' END,'version',l.current_version,'status',l.status,'proposed_at',l.proposed_at,'adopted_at',l.adopted_at,'applied_at',l.applied_at,'mine',COALESCE(l.author_character_id=cid,false),'versions',(SELECT jsonb_agg(jsonb_build_object('version',v.version,'template_id',v.template_id,'title',CASE WHEN l.author_character_id IS NULL OR l.author_character_id=cid THEN v.title ELSE t.title END,'description',CASE WHEN l.author_character_id IS NULL OR l.author_character_id=cid THEN v.description ELSE NULL END,'category',v.category,'effects',v.effects,'cost',v.cost,'delay_minutes',v.delay_minutes)) FROM public.national_law_versions v JOIN public.national_law_templates t ON t.id=v.template_id WHERE v.law_id=l.id),'sessions',(SELECT jsonb_agg(jsonb_build_object('id',s.id,'version',s.version,'chamber',s.chamber,'starts_at',s.starts_at,'ends_at',s.ends_at,'status',s.status,'yes_votes',s.yes_votes,'no_votes',s.no_votes,'abstentions',s.abstentions)) FROM public.national_sessions s WHERE s.law_id=l.id))) FROM public.national_laws l WHERE l.status<>'draft' OR l.author_character_id=cid),'[]'::jsonb),
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
 IF TG_OP='DELETE' THEN
  IF OLD.type='national' THEN RAISE EXCEPTION 'Historique de séance immuable'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.type='national' AND NEW.type IS DISTINCT FROM OLD.type THEN RAISE EXCEPTION 'Type national immuable'; END IF;
 IF NEW.type<>'national' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN RAISE EXCEPTION 'Séance nationale immuable'; END IF;
  IF NOT (NEW.status=OLD.status OR (OLD.status='planned' AND NEW.status IN('running','cancelled')) OR (OLD.status='running' AND NEW.status='completed')) THEN RAISE EXCEPTION 'Transition de séance interdite'; END IF;
 END IF;
 IF NEW.source_key IS NULL OR NEW.source_key NOT LIKE 'national-session:%' OR NEW.economy_payload IS DISTINCT FROM '{}'::jsonb OR NEW.target_location_id IS NOT NULL OR NEW.organization_event_id IS NOT NULL OR NEW.social_npc_id IS NOT NULL OR NEW.campaign_action_id IS NOT NULL OR NEW.governance_action_id IS NOT NULL OR NEW.travel_delay_minutes IS DISTINCT FROM 0 OR cardinality(NEW.travel_event_ids) IS DISTINCT FROM 0 OR NEW.reward IS DISTINCT FROM 0 OR NEW.money_cost IS DISTINCT FROM 0 OR NEW.energy_gain IS DISTINCT FROM 0 OR NEW.progression_gain IS DISTINCT FROM 0 OR NEW.political_reputation_gain IS DISTINCT FROM 0 OR NEW.political_influence_gain IS DISTINCT FROM 0 OR NEW.political_engagement_gain IS DISTINCT FROM 0 OR NEW.social_reputation_gain IS DISTINCT FROM 0 OR NEW.social_influence_gain IS DISTINCT FROM 0 OR NEW.social_relation_gain IS DISTINCT FROM 0 OR NEW.civic_engagement_gain IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Activité nationale invalide'; END IF;
 SELECT * INTO s FROM public.national_sessions WHERE id=substring(NEW.source_key from 18)::uuid;
 SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
 IF s.id IS NULL OR NEW.start_time<>s.starts_at OR NEW.end_time<>s.ends_at OR NEW.energy_cost IS DISTINCT FROM (SELECT (rules->>'session_energy')::int FROM public.national_settings WHERE id=1) THEN RAISE EXCEPTION 'Séance invalide'; END IF;
 IF (TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.status='running' AND OLD.status<>'running')) AND NOT EXISTS(SELECT 1 FROM public.national_seats ns JOIN public.national_legislatures nl ON nl.id=ns.legislature_id WHERE ns.legislature_id=l.legislature_id AND ns.chamber=s.chamber AND ns.character_id=NEW.character_id AND nl.starts_at<=NEW.start_time AND nl.ends_at>=NEW.end_time) THEN RAISE EXCEPTION 'Mandat de séance invalide'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'planned' OR NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) OR public.game_now()>=s.starts_at OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version THEN RAISE EXCEPTION 'Réservation nationale invalide'; END IF;
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
  IF NEW.status='running' AND NOT EXISTS(SELECT 1 FROM public.national_requests nr WHERE nr.character_id=NEW.character_id AND nr.command='start_session' AND nr.input->>'session_id'=s.id::text AND nr.result->>'activity_id'=NEW.id::text) THEN RAISE EXCEPTION 'Démarrage national explicite requis'; END IF;
  IF NEW.status='running' AND (public.game_now()<s.starts_at OR public.game_now()>=s.ends_at OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version) THEN RAISE EXCEPTION 'Séance fermée ou ancienne version'; END IF;
  IF NEW.status='completed' AND public.game_now()<s.ends_at THEN RAISE EXCEPTION 'Séance non terminée'; END IF;
 END IF;
 RETURN NEW;
END $$;
-- Installé mais sans nouvelle règle/activité : aucune ancienne ligne touchée.
CREATE TRIGGER national_activity_protection BEFORE INSERT OR UPDATE OR DELETE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.national_activity_guard();

-- Versions figées : un amendement INSERT une version, jamais UPDATE/DELETE.
CREATE FUNCTION public.national_version_immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Version de loi immuable : créer une nouvelle version'; END $$;
CREATE TRIGGER national_version_freeze BEFORE UPDATE OR DELETE ON public.national_law_versions FOR EACH ROW EXECUTE FUNCTION public.national_version_immutable();

CREATE FUNCTION public.national_candidate_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.national_elections;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Candidature conservée dans l’historique'; END IF;
 SELECT * INTO e FROM public.national_elections WHERE id=NEW.election_id;
 IF NOT FOUND OR NEW.organization_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.national_party_profiles p JOIN public.organizations o ON o.id=p.organization_id WHERE p.organization_id=NEW.organization_id AND o.kind='party' AND o.status='active' AND (e.rules->'party_snapshot') ? o.id::text) THEN RAISE EXCEPTION 'Candidature indépendante/non configurée interdite'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'program') IS DISTINCT FROM (to_jsonb(OLD)-'program') THEN RAISE EXCEPTION 'Retrait/publication et électorat candidat non définis dans cette version'; END IF;
  IF public.game_now()>=e.candidacies_end_at THEN RAISE EXCEPTION 'Programme figé'; END IF;
 END IF;
 IF TG_OP='INSERT' AND (NEW.published_at IS NOT NULL OR NEW.fictional_votes<>0) THEN RAISE EXCEPTION 'Publicité et répartition fictive territoriale en attente de règle'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER national_candidate_protection BEFORE INSERT OR UPDATE OR DELETE ON public.national_candidacies FOR EACH ROW EXECUTE FUNCTION public.national_candidate_guard();
REVOKE ALL ON FUNCTION public.national_candidate_guard() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_candidate_guard() TO service_role;

-- Immutabilité des paramètres électoraux : dates, graine et poids jamais rejoués.
CREATE FUNCTION public.national_election_immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Historique de scrutin immuable'; END IF;
 IF (to_jsonb(NEW)-'status'-'counted_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'counted_at') THEN RAISE EXCEPTION 'Dates, règles, poids et graine du scrutin figés'; END IF;
 IF OLD.counted_at IS NOT NULL AND NEW.counted_at IS DISTINCT FROM OLD.counted_at THEN RAISE EXCEPTION 'Dépouillement immuable'; END IF;
 IF OLD.status IN('completed','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Scrutin clôturé'; END IF;
 IF NEW.status='completed' AND NEW.counted_at IS NULL THEN RAISE EXCEPTION 'Dépouillement daté requis'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER national_election_freeze BEFORE UPDATE OR DELETE ON public.national_elections FOR EACH ROW EXECUTE FUNCTION public.national_election_immutable();
REVOKE ALL ON FUNCTION public.national_election_immutable() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_election_immutable() TO service_role;

CREATE FUNCTION public.national_law_terminal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Historique de loi immuable'; END IF;
 IF OLD.status='applied' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Loi appliquée immuable, une seule application par loi'; END IF;
 IF OLD.status='adopted' AND NEW.current_version IS DISTINCT FROM OLD.current_version THEN RAISE EXCEPTION 'Version adoptée figée'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER national_law_final_state BEFORE UPDATE OR DELETE ON public.national_laws FOR EACH ROW EXECUTE FUNCTION public.national_law_terminal();
REVOKE ALL ON FUNCTION public.national_law_terminal() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_law_terminal() TO service_role;

CREATE FUNCTION public.national_version_validate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.national_law_templates;
BEGIN
 SELECT * INTO t FROM public.national_law_templates WHERE id=NEW.template_id AND active;
 IF NOT FOUND OR NEW.effects IS DISTINCT FROM t.effects OR NEW.category IS DISTINCT FROM t.category OR NEW.cost IS DISTINCT FROM t.cost OR NEW.delay_minutes IS DISTINCT FROM t.delay_minutes OR NEW.budget_allocations IS DISTINCT FROM t.budget_allocations THEN RAISE EXCEPTION 'Version non issue d’un modèle national validé'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER national_version_provenance BEFORE INSERT ON public.national_law_versions FOR EACH ROW EXECUTE FUNCTION public.national_version_validate();
REVOKE ALL ON FUNCTION public.national_version_validate() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_version_validate() TO service_role;

REVOKE ALL ON FUNCTION public.national_version_immutable() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_version_immutable() TO service_role;

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
REVOKE ALL ON FUNCTION public.national_form_government(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.national_form_government(uuid,uuid,uuid,jsonb) TO service_role;
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

-- RÉSERVES EXPLICITES DE CETTE PROPOSITION :
-- Activation et dépouillement restent bloqués : première date à fournir ;
-- allocation fictive territoriale/ville sans candidat/publicité non décidées.
-- Sénat : capture admissible, couverture municipale, indépendants et méthode
-- non décidés ; aucune constitution opérationnelle ni faux mandat.
-- Clôture parlementaire : votes simulés/absences non décidés, aucune adoption
-- automatique, donc aucun effet réel. Cinq modèles inactifs sans textes/deltas.
-- Gouvernement : six PNJ et quatre ministères à sélectionner, aucune valeur
-- fictive préremplie ; unicité des personnes/fin à la législature proposées.
-- Aucun mécanisme de tâche nationale ajouté ni ancien job modifié.
-- Installation proposée : objets nationaux + trigger additif activities ;
-- seuls INSERT de données nouvelles nationales. Pas d’exécution à cette étape.
