-- CIVITAS – VAGUE 2 : RÉPUTATIONS MULTIPLES, COMPÉTENCES, JOURNAL DE VIE (« Ma vie dans CIVITAS »)
-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée, aucune donnée existante touchée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0069_life_profile.sql
-- Principe : rien n'est stocké ni « gagné » à part. Réputations, compétences et journal sont recalculés à chaque lecture
--   à partir des actions réellement enregistrées (emploi, associations, débats, projets, pétitions, mandats, justice…).
--   Aucun risque de doublon, aucun argent, aucun vote, aucune sanction : c'est un miroir du parcours.
-- Barème modifiable dans life_profile_rules (points par action, plafond par source). Profil privé : seul le joueur voit le sien.
BEGIN;

CREATE TABLE public.life_profile_rules (
  id serial PRIMARY KEY,
  axis text NOT NULL CHECK (axis IN ('reputation','skill')),
  dimension text NOT NULL,
  source text NOT NULL,
  points integer NOT NULL,            -- points par occurrence (négatif = perte)
  cap integer NOT NULL CHECK (cap > 0),-- contribution maximale (en valeur absolue) de cette source
  UNIQUE (axis, dimension, source)
);
CREATE TABLE public.life_profile_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  reputation_base integer NOT NULL DEFAULT 30,
  skill_base integer NOT NULL DEFAULT 0,
  journal_limit integer NOT NULL DEFAULT 120
);
INSERT INTO public.life_profile_settings (id) VALUES (1);

INSERT INTO public.life_profile_rules (axis, dimension, source, points, cap) VALUES
  -- Réputations (0–100, départ 30)
  ('reputation','citoyenne','memberships',4,16), ('reputation','citoyenne','org_events',2,16), ('reputation','citoyenne','project_supports',1,10),
  ('reputation','citoyenne','projects_authored',4,16), ('reputation','citoyenne','petition_signatures',1,8), ('reputation','citoyenne','crisis_help',3,12),
  ('reputation','citoyenne','social_reputation',1,20), ('reputation','citoyenne','justice_guilty',-8,24),
  ('reputation','politique','political_reputation',1,40), ('reputation','politique','candidacies',5,15), ('reputation','politique','mandates',10,20),
  ('reputation','politique','debates_won',3,12), ('reputation','politique','parties_founded',5,10),
  ('reputation','popularite','followers',2,30), ('reputation','popularite','debates_won',2,10), ('reputation','popularite','protests_success',4,12),
  ('reputation','popularite','press_articles',1,10), ('reputation','popularite','projects_done',4,12),
  ('reputation','credibilite','projects_done',6,18), ('reputation','credibilite','petitions_won',5,15), ('reputation','credibilite','debates_won',2,10),
  ('reputation','credibilite','justice_guilty',-10,30), ('reputation','credibilite','projects_failed',-4,12), ('reputation','credibilite','business_failed',-5,15),
  ('reputation','fiabilite','work_days',1,25), ('reputation','fiabilite','debates_done',2,10), ('reputation','fiabilite','debates_forfeit',-6,18),
  ('reputation','fiabilite','fines_unpaid',-8,24), ('reputation','fiabilite','projects_done',3,9),
  ('reputation','professionnelle','work_days',1,30), ('reputation','professionnelle','employed',10,10), ('reputation','professionnelle','businesses',8,16),
  ('reputation','professionnelle','study_days',1,10), ('reputation','professionnelle','business_failed',-5,15),
  ('reputation','influence','social_influence',1,25), ('reputation','influence','political_influence',1,25), ('reputation','influence','orgs_founded',5,15),
  ('reputation','influence','mandates',8,16),
  ('reputation','numerique','followers',3,40), ('reputation','numerique','press_articles',3,24),
  -- Compétences (0–100, départ 0)
  ('skill','gestion','businesses',10,30), ('skill','gestion','orgs_founded',6,18), ('skill','gestion','mandates',10,20), ('skill','gestion','work_days',1,20),
  ('skill','economie','businesses',8,24), ('skill','economie','project_donations',2,10), ('skill','economie','study_days',1,20),
  ('skill','communication','press_articles',4,32), ('skill','communication','followers',1,20), ('skill','communication','protests_organized',5,15),
  ('skill','negociation','unions',8,16), ('skill','negociation','couples',3,6), ('skill','negociation','projects_authored',3,15),
  ('skill','prise_de_parole','debates_done',8,40), ('skill','prise_de_parole','candidacies',6,18), ('skill','prise_de_parole','protests_organized',4,12),
  ('skill','administration','mandates',12,24), ('skill','administration','petitions_authored',4,16), ('skill','administration','study_days',1,15),
  ('skill','politique','candidacies',8,24), ('skill','politique','mandates',10,20), ('skill','politique','parties_founded',8,16), ('skill','politique','political_reputation',1,20),
  ('skill','droit','justice_cases',6,24), ('skill','droit','petitions_authored',3,12), ('skill','droit','study_days',1,10),
  ('skill','organisation','orgs_founded',10,30), ('skill','organisation','org_events',2,20), ('skill','organisation','protests_organized',6,18),
  ('skill','gestion_crise','crises_managed',15,45), ('skill','gestion_crise','crisis_help',4,20),
  ('skill','analyse','study_days',1,30), ('skill','analyse','debates_done',3,15), ('skill','analyse','press_articles',2,10),
  ('skill','entrepreneuriat','businesses',15,45), ('skill','entrepreneuriat','projects_authored',4,16);

GRANT SELECT ON public.life_profile_rules, public.life_profile_settings TO authenticated;
GRANT ALL ON public.life_profile_rules, public.life_profile_settings TO service_role;
ALTER TABLE public.life_profile_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_profile_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Life rules readable" ON public.life_profile_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Life settings readable" ON public.life_profile_settings FOR SELECT TO authenticated USING (true);

-- Compte des actions réellement enregistrées pour un personnage (interne).
CREATE FUNCTION public.life_sources(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH mand AS (SELECT m.* FROM public.municipal_mandates m JOIN public.candidacies k ON k.id = m.candidacy_id WHERE k.character_id = _cid)
  SELECT jsonb_build_object(
    'memberships', (SELECT count(*) FROM public.memberships WHERE character_id = _cid),
    'org_events', (SELECT count(*) FROM public.social_participations WHERE character_id = _cid AND status = 'completed'),
    'orgs_founded', (SELECT count(*) FROM public.organizations WHERE founder_character_id = _cid),
    'parties_founded', (SELECT count(*) FROM public.organizations WHERE founder_character_id = _cid AND kind IN ('party','movement')),
    'project_supports', (SELECT count(*) FROM public.citizen_project_supports s JOIN public.citizen_projects p ON p.id = s.project_id WHERE s.character_id = _cid AND p.author_id <> _cid),
    'project_donations', (SELECT count(*) FROM public.citizen_project_donations WHERE character_id = _cid),
    'projects_authored', (SELECT count(*) FROM public.citizen_projects WHERE author_id = _cid),
    'projects_done', (SELECT count(*) FROM public.citizen_projects WHERE author_id = _cid AND status = 'termine'),
    'projects_failed', (SELECT count(*) FROM public.citizen_projects WHERE author_id = _cid AND status IN ('refuse','echoue')),
    'petitions_authored', (SELECT count(*) FROM public.petitions WHERE author_id = _cid),
    'petitions_won', (SELECT count(*) FROM public.petitions WHERE author_id = _cid AND status = 'accepted'),
    'petition_signatures', (SELECT count(*) FROM public.petition_signatures s JOIN public.petitions p ON p.id = s.petition_id WHERE s.character_id = _cid AND p.author_id <> _cid),
    'crisis_help', (SELECT count(*) FROM public.crisis_actions WHERE character_id = _cid AND kind = 'aide'),
    'crises_managed', (SELECT count(*) FROM public.crises c JOIN mand m ON m.city_id = c.city_id AND c.decided_at BETWEEN m.starts_at AND m.ends_at WHERE c.decided_by = 'maire'),
    'debates_done', (SELECT count(*) FROM public.debates WHERE status = 'done' AND NOT forfeit AND _cid IN (challenger_id, opponent_id)),
    'debates_won', (SELECT count(*) FROM public.debates WHERE status = 'done' AND winner_id = _cid),
    'debates_forfeit', (SELECT count(*) FROM public.debates WHERE status = 'done' AND forfeit AND _cid IN (challenger_id, opponent_id) AND winner_id IS DISTINCT FROM _cid),
    'candidacies', (SELECT count(*) FROM public.candidacies WHERE character_id = _cid AND status IN ('validated','completed'))
                 + (SELECT count(*) FROM public.legislative_candidacies WHERE character_id = _cid),
    'mandates', (SELECT count(*) FROM mand),
    'followers', (SELECT count(*) FROM public.player_follows WHERE followed_id = _cid),
    'press_articles', (SELECT count(*) FROM public.press_articles WHERE author_id = _cid AND status = 'published'),
    'justice_cases', (SELECT count(*) FROM public.justice_cases WHERE _cid IN (plaintiff_id, defendant_id) AND status = 'jugee'),
    'justice_guilty', (SELECT count(*) FROM public.justice_cases WHERE defendant_id = _cid AND verdict = 'coupable'),
    'fines_unpaid', (SELECT count(*) FROM public.justice_cases WHERE defendant_id = _cid AND verdict = 'coupable' AND fine > 0 AND fine_paid_at IS NULL),
    'businesses', (SELECT count(*) FROM public.businesses WHERE owner_id = _cid AND status <> 'failed'),
    'business_failed', (SELECT count(*) FROM public.businesses WHERE owner_id = _cid AND status = 'failed'),
    'work_days', (SELECT count(*) FROM public.activities WHERE character_id = _cid AND type = 'work' AND status = 'completed'),
    'study_days', (SELECT count(*) FROM public.activities WHERE character_id = _cid AND type IN ('study','course') AND status = 'completed'),
    'employed', (SELECT count(*) FROM public.employments WHERE character_id = _cid AND status = 'active'),
    'unions', (SELECT count(*) FROM public.union_members WHERE character_id = _cid),
    'couples', (SELECT count(*) FROM public.couples WHERE _cid IN (a_id, b_id) AND started_at IS NOT NULL),
    'protests_organized', (SELECT count(*) FROM public.protests WHERE organizer_character_id = _cid AND status <> 'planned'),
    'protests_success', (SELECT count(*) FROM public.protests WHERE organizer_character_id = _cid AND status = 'success'),
    'social_reputation', COALESCE((SELECT reputation FROM public.social_stats WHERE character_id = _cid), 0),
    'social_influence', COALESCE((SELECT influence FROM public.social_stats WHERE character_id = _cid), 0),
    'political_reputation', COALESCE((SELECT reputation FROM public.political_stats WHERE character_id = _cid), 0),
    'political_influence', COALESCE((SELECT influence FROM public.political_stats WHERE character_id = _cid), 0))
$$;

-- Journal de vie : étapes marquantes datées (interne).
CREATE FUNCTION public.life_journal(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (SELECT * FROM public.characters WHERE id = _cid),
  ev(at, kind, title) AS (
    SELECT created_at, 'naissance', 'Arrivée à ' || (SELECT name FROM public.cities WHERE id = c.city_id) FROM c
    UNION ALL SELECT enrolled_at, 'etudes', 'Inscription en études' FROM public.study_enrollments WHERE character_id = _cid
    UNION ALL SELECT started_at, 'travail', 'Nouvel emploi' FROM public.employments WHERE character_id = _cid
    UNION ALL SELECT joined_at, 'engagement', 'Adhésion : ' || o.name FROM public.memberships m JOIN public.organizations o ON o.id = m.organization_id
      WHERE m.character_id = _cid AND (o.founder_character_id IS DISTINCT FROM _cid)
    UNION ALL SELECT created_at, 'engagement', CASE kind WHEN 'party' THEN 'Création du parti ' WHEN 'movement' THEN 'Création du mouvement ' ELSE 'Création de l''association ' END || name
      FROM public.organizations WHERE founder_character_id = _cid
    UNION ALL SELECT started_at, 'famille', 'Début d''une histoire de couple' FROM public.couples WHERE _cid IN (a_id, b_id) AND started_at IS NOT NULL
    UNION ALL SELECT union_at, 'famille', CASE union_kind WHEN 'mariage' THEN 'Mariage' ELSE 'PACS' END FROM public.couples WHERE _cid IN (a_id, b_id) AND union_at IS NOT NULL
    UNION ALL SELECT born_at, 'famille', CASE origin WHEN 'adoption' THEN 'Adoption de ' ELSE 'Naissance de ' END || first_name
      FROM public.children WHERE _cid IN (parent_a, parent_b) AND born_at IS NOT NULL
    UNION ALL SELECT submitted_at, 'politique', 'Candidature municipale' FROM public.candidacies WHERE character_id = _cid AND submitted_at IS NOT NULL AND status IN ('validated','completed')
    UNION ALL SELECT created_at, 'politique', 'Candidature aux législatives' FROM public.legislative_candidacies WHERE character_id = _cid
    UNION ALL SELECT m.starts_at, 'politique', 'Élection : ' || m.function || ' de ' || (SELECT name FROM public.cities WHERE id = m.city_id)
      FROM public.municipal_mandates m JOIN public.candidacies k ON k.id = m.candidacy_id WHERE k.character_id = _cid
    UNION ALL SELECT voting_ends_at, 'debat', 'Victoire au débat « ' || topic || ' »' FROM public.debates WHERE status = 'done' AND winner_id = _cid AND voting_ends_at IS NOT NULL
    UNION ALL SELECT created_at, 'citoyen', 'Lancement de la pétition « ' || title || ' »' FROM public.petitions WHERE author_id = _cid
    UNION ALL SELECT decided_at, 'citoyen', 'Pétition adoptée : « ' || title || ' »' FROM public.petitions WHERE author_id = _cid AND status = 'accepted' AND decided_at IS NOT NULL
    UNION ALL SELECT created_at, 'citoyen', 'Projet citoyen proposé : « ' || title || ' »' FROM public.citizen_projects WHERE author_id = _cid
    UNION ALL SELECT works_end, 'citoyen', 'Projet réalisé : « ' || title || ' »' FROM public.citizen_projects WHERE author_id = _cid AND status = 'termine' AND works_end IS NOT NULL
    UNION ALL SELECT created_at, 'travail', 'Création de l''entreprise ' || name FROM public.businesses WHERE owner_id = _cid
    UNION ALL SELECT starts_at, 'citoyen', 'Organisation d''une manifestation : ' || cause FROM public.protests WHERE organizer_character_id = _cid
    UNION ALL SELECT judged_at, 'justice', CASE WHEN defendant_id = _cid AND verdict = 'coupable' THEN 'Condamnation par le tribunal'
                                                WHEN defendant_id = _cid THEN 'Relaxe par le tribunal' ELSE 'Jugement d''une plainte déposée' END
      FROM public.justice_cases WHERE _cid IN (plaintiff_id, defendant_id) AND judged_at IS NOT NULL
    UNION ALL SELECT min(published_at), 'media', 'Premier article publié' FROM public.press_articles WHERE author_id = _cid HAVING count(*) > 0
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('at', e.at, 'kind', e.kind, 'title', e.title,
           'age', GREATEST(0, c.age - floor(extract(epoch FROM (public.game_now() - e.at)) / (365.25 * 86400))::integer)) ORDER BY e.at DESC), '[]'::jsonb)
  FROM (SELECT * FROM ev WHERE at IS NOT NULL AND at <= public.game_now() ORDER BY at DESC
        LIMIT (SELECT journal_limit FROM public.life_profile_settings WHERE id = 1)) e, c
$$;

-- Lecture publique pour le joueur connecté : seulement son propre profil.
CREATE FUNCTION public.life_profile() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); src jsonb; s public.life_profile_settings; BEGIN
  SELECT * INTO s FROM public.life_profile_settings WHERE id = 1;
  src := public.life_sources(cid);
  RETURN jsonb_build_object('sources', src, 'journal', public.life_journal(cid),
    'dimensions', (SELECT jsonb_agg(jsonb_build_object('axis', d.axis, 'dimension', d.dimension,
        'value', LEAST(100, GREATEST(0, CASE d.axis WHEN 'reputation' THEN s.reputation_base ELSE s.skill_base END + d.total)),
        'parts', d.parts) ORDER BY d.axis, d.dimension)
      FROM (SELECT r.axis, r.dimension,
              sum(sign(r.points) * LEAST(r.cap, abs(r.points) * COALESCE((src->>r.source)::integer, 0)))::integer AS total,
              jsonb_agg(jsonb_build_object('source', r.source, 'points', sign(r.points) * LEAST(r.cap, abs(r.points) * COALESCE((src->>r.source)::integer, 0))))
                FILTER (WHERE COALESCE((src->>r.source)::integer, 0) > 0) AS parts
            FROM public.life_profile_rules r GROUP BY r.axis, r.dimension) d));
END $$;

REVOKE ALL ON FUNCTION public.life_sources(uuid), public.life_journal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.life_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.life_profile() TO authenticated;

COMMIT;
