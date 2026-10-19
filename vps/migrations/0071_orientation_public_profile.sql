-- CIVITAS – DOCUMENTS ADMINISTRATIFS, VAGUE 2 : ORIENTATION POLITIQUE + PROFIL PUBLIC / PROFIL CITOYEN
-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée, aucune donnée existante touchée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0071_orientation_public_profile.sql
-- - real_parties : liste de partis français réels. Choisir un parti = positionnement du personnage dans le jeu,
--   JAMAIS une adhésion (aucune ligne dans memberships, aucun lien avec les partis CIVITAS créés par les joueurs).
--   Table distincte de legislative_parties (nuances électorales 2024, ex. « Divers gauche »), qui reste inchangée.
-- - orientation_axes + character_orientation : curseurs 0–100 choisis par le joueur. Les opinions du Bloc 7 restent intactes.
--   Le parcours du joueur (projets, syndicats…) ajoute une « tendance » affichée à part (±15 max) : jamais le parti.
-- - orientation_history : historique immuable des changements de parti / indépendance.
-- - public_profile_prefs : ce que le joueur accepte de montrer. Jamais d'adresse, banque, documents ou identifiants.
-- - public_profile(_cid) / public_photo(_cid) : lecture par les autres joueurs, filtrée par ces choix et par les blocages.
BEGIN;

CREATE TABLE public.real_parties (
  code text PRIMARY KEY, label text NOT NULL, short text NOT NULL, family text NOT NULL, sort_order integer NOT NULL DEFAULT 0
);
INSERT INTO public.real_parties VALUES
  ('LO','Lutte ouvrière','LO','gauche',10), ('NPA','Nouveau Parti anticapitaliste','NPA','gauche',11),
  ('PCF','Parti communiste français','PCF','gauche',12), ('LFI','La France insoumise','LFI','gauche',13),
  ('ECO','Les Écologistes','Écologistes','gauche',14), ('GS','Génération.s','Génération.s','gauche',15),
  ('PS','Parti socialiste','PS','gauche',16), ('PP','Place publique','Place publique','gauche',17),
  ('PRG','Parti radical de gauche','PRG','gauche',18),
  ('REN','Renaissance','Renaissance','centre',20), ('MODEM','Mouvement démocrate (MoDem)','MoDem','centre',21),
  ('HOR','Horizons','Horizons','centre',22), ('RAD','Parti radical','Parti radical','centre',23), ('UDI','UDI','UDI','centre',24),
  ('LR','Les Républicains','LR','droite',30), ('DLF','Debout la France','DLF','droite',31),
  ('RN','Rassemblement national','RN','droite',40), ('REC','Reconquête','Reconquête','droite',41),
  ('PAT','Les Patriotes','Les Patriotes','droite',42), ('RPS','Régions et peuples solidaires','R&PS','autre',50);

CREATE TABLE public.orientation_axes (
  id text PRIMARY KEY, label text NOT NULL, low_label text NOT NULL, high_label text NOT NULL, sort_order integer NOT NULL DEFAULT 0
);
INSERT INTO public.orientation_axes VALUES
  ('economie','Économie','Marché libre','État régulateur',1), ('fiscalite','Fiscalité','Faible intervention','Forte intervention',2),
  ('services','Services publics','Priorité faible','Priorité forte',3), ('securite','Sécurité','Priorité faible','Priorité forte',4),
  ('environnement','Environnement','Priorité faible','Priorité forte',5), ('immigration','Immigration','Plus restrictive','Plus ouverte',6),
  ('institutions','Institutions','Stabilité','Réforme profonde',7), ('europe','Europe','Moins d''Europe','Plus d''Europe',8),
  ('travail','Travail','Flexibilité','Protection des salariés',9), ('logement','Logement','Marché libre','Forte régulation',10),
  ('decentralisation','Décentralisation','Pouvoir national','Pouvoir local',11);

CREATE TABLE public.character_orientation (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  party_code text REFERENCES public.real_parties(code),        -- NULL = indépendant / sans parti
  axes jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.orientation_history (
  id bigserial PRIMARY KEY,
  character_id uuid NOT NULL REFERENCES public.characters(id),
  at timestamptz NOT NULL DEFAULT public.game_now(),
  party_code text REFERENCES public.real_parties(code),
  label text NOT NULL
);
CREATE INDEX orientation_history_character ON public.orientation_history (character_id, at);
CREATE TABLE public.public_profile_prefs (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  show_photo boolean NOT NULL DEFAULT true,
  show_party boolean NOT NULL DEFAULT false,
  show_job boolean NOT NULL DEFAULT true,
  show_orgs boolean NOT NULL DEFAULT true,
  show_mandates boolean NOT NULL DEFAULT true,
  show_projects boolean NOT NULL DEFAULT true,
  show_skills boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT public.game_now()
);

GRANT SELECT ON public.real_parties, public.orientation_axes TO authenticated;
GRANT ALL ON public.real_parties, public.orientation_axes, public.character_orientation, public.orientation_history, public.public_profile_prefs TO service_role;
GRANT USAGE ON SEQUENCE public.orientation_history_id_seq TO service_role;
ALTER TABLE public.real_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orientation_axes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_orientation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orientation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profile_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Real parties readable" ON public.real_parties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Orientation axes readable" ON public.orientation_axes FOR SELECT TO authenticated USING (true);
-- Pas de politique sur les tables personnelles : accès uniquement par les fonctions ci-dessous.

-- Tendance issue du parcours réel (affichage seulement, ±15 max par axe).
CREATE FUNCTION public.orientation_drift(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'environnement', NULLIF(LEAST(15, 3 * (SELECT count(*) FROM public.citizen_projects p WHERE p.type_id IN ('parc','velo','environnement')
        AND (p.author_id = _cid OR EXISTS (SELECT 1 FROM public.citizen_project_supports s WHERE s.project_id = p.id AND s.character_id = _cid))))::integer, 0),
    'services', NULLIF(LEAST(15, 3 * (SELECT count(*) FROM public.citizen_projects p WHERE p.type_id IN ('ecole','sport','bibliotheque','culture')
        AND (p.author_id = _cid OR EXISTS (SELECT 1 FROM public.citizen_project_supports s WHERE s.project_id = p.id AND s.character_id = _cid))))::integer, 0),
    'securite', NULLIF(LEAST(15, 3 * (SELECT count(*) FROM public.citizen_projects p WHERE p.type_id = 'securite'
        AND (p.author_id = _cid OR EXISTS (SELECT 1 FROM public.citizen_project_supports s WHERE s.project_id = p.id AND s.character_id = _cid))))::integer, 0),
    'travail', NULLIF(LEAST(15, 5 * (SELECT count(*) FROM public.union_members WHERE character_id = _cid))::integer, 0),
    'decentralisation', NULLIF(LEAST(15, 2 * (SELECT count(*) FROM public.petitions WHERE author_id = _cid AND scope = 'city'))::integer, 0),
    'economie', NULLIF(-LEAST(15, 4 * (SELECT count(*) FROM public.businesses WHERE owner_id = _cid))::integer, 0)))
$$;

-- 3 meilleures compétences (même barème que « Ma vie »), pour le profil citoyen public.
CREATE FUNCTION public.life_top_skills(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH src AS (SELECT public.life_sources(_cid) AS j),
  d AS (SELECT r.dimension, LEAST(100, GREATEST(0, (SELECT skill_base FROM public.life_profile_settings WHERE id = 1)
           + sum(sign(r.points) * LEAST(r.cap, abs(r.points) * COALESCE((src.j->>r.source)::integer, 0)))))::integer AS value
        FROM public.life_profile_rules r, src WHERE r.axis = 'skill' GROUP BY r.dimension)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('dimension', dimension, 'value', value) ORDER BY value DESC), '[]'::jsonb)
  FROM (SELECT * FROM d WHERE value > 0 ORDER BY value DESC LIMIT 3) x
$$;

CREATE FUNCTION public.orientation_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); o public.character_orientation; pr public.public_profile_prefs; BEGIN
  INSERT INTO public.character_orientation (character_id) VALUES (cid) ON CONFLICT DO NOTHING;
  INSERT INTO public.public_profile_prefs (character_id) VALUES (cid) ON CONFLICT DO NOTHING;
  SELECT * INTO o FROM public.character_orientation WHERE character_id = cid;
  SELECT * INTO pr FROM public.public_profile_prefs WHERE character_id = cid;
  RETURN jsonb_build_object('me', cid, 'party_code', o.party_code, 'axes', o.axes, 'drift', public.orientation_drift(cid),
    'prefs', to_jsonb(pr) - 'character_id' - 'updated_at',
    'parties', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.sort_order) FROM public.real_parties p),
    'axis_defs', (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.sort_order) FROM public.orientation_axes a),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('at', h.at, 'label', h.label, 'party_code', h.party_code) ORDER BY h.at, h.id)
      FROM public.orientation_history h WHERE h.character_id = cid), '[]'::jsonb),
    'civitas_orgs', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'kind', g.kind))
      FROM public.memberships m JOIN public.organizations g ON g.id = m.organization_id
      WHERE m.character_id = cid AND m.status = 'active' AND g.kind IN ('party','movement')), '[]'::jsonb));
END $$;

CREATE FUNCTION public.orientation_action(_command text, _input jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); o public.character_orientation; code text; k text; v integer; ax jsonb := '{}'::jsonb; BEGIN
  INSERT INTO public.character_orientation (character_id) VALUES (cid) ON CONFLICT DO NOTHING;
  INSERT INTO public.public_profile_prefs (character_id) VALUES (cid) ON CONFLICT DO NOTHING;
  SELECT * INTO o FROM public.character_orientation WHERE character_id = cid FOR UPDATE;

  IF _command = 'party' THEN                      -- choisir un parti réel, ou NULL = indépendant
    code := NULLIF(_input->>'party_code', '');
    IF code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.real_parties WHERE real_parties.code = orientation_action.code) THEN
      RAISE EXCEPTION 'Parti inconnu.'; END IF;
    IF code IS NOT DISTINCT FROM o.party_code THEN RETURN; END IF;
    UPDATE public.character_orientation SET party_code = code, updated_at = public.game_now() WHERE character_id = cid;
    INSERT INTO public.orientation_history (character_id, party_code, label)
    VALUES (cid, code, CASE WHEN code IS NULL THEN 'Indépendant' ELSE 'Soutien à ' || (SELECT label FROM public.real_parties WHERE real_parties.code = orientation_action.code) END);

  ELSIF _command = 'axes' THEN
    IF jsonb_typeof(_input->'axes') <> 'object' THEN RAISE EXCEPTION 'Positionnement invalide.'; END IF;
    FOR k IN SELECT jsonb_object_keys(_input->'axes') LOOP
      IF NOT EXISTS (SELECT 1 FROM public.orientation_axes WHERE id = k) THEN RAISE EXCEPTION 'Axe inconnu.'; END IF;
      v := (_input->'axes'->>k)::integer;
      IF v IS NULL OR v NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Valeur entre 0 et 100.'; END IF;
      ax := ax || jsonb_build_object(k, v);
    END LOOP;
    UPDATE public.character_orientation SET axes = axes || ax, updated_at = public.game_now() WHERE character_id = cid;

  ELSIF _command = 'prefs' THEN
    UPDATE public.public_profile_prefs SET
      show_photo = COALESCE((_input->>'show_photo')::boolean, show_photo), show_party = COALESCE((_input->>'show_party')::boolean, show_party),
      show_job = COALESCE((_input->>'show_job')::boolean, show_job), show_orgs = COALESCE((_input->>'show_orgs')::boolean, show_orgs),
      show_mandates = COALESCE((_input->>'show_mandates')::boolean, show_mandates), show_projects = COALESCE((_input->>'show_projects')::boolean, show_projects),
      show_skills = COALESCE((_input->>'show_skills')::boolean, show_skills), updated_at = public.game_now()
    WHERE character_id = cid;
  ELSE RAISE EXCEPTION 'Commande inconnue.';
  END IF;
END $$;

-- Profil citoyen public d'un joueur, vu par le joueur connecté (filtré par ses choix et les blocages).
CREATE FUNCTION public.public_profile(_cid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := public.social_actor(); c public.characters; pr public.public_profile_prefs; o public.character_orientation; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = _cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Joueur introuvable.'; END IF;
  IF me <> _cid AND public.network_blocked(me, _cid) THEN RAISE EXCEPTION 'Profil indisponible.'; END IF;
  SELECT * INTO pr FROM public.public_profile_prefs WHERE character_id = _cid;
  IF NOT FOUND THEN pr.show_photo := true; pr.show_party := false; pr.show_job := true; pr.show_orgs := true;
    pr.show_mandates := true; pr.show_projects := true; pr.show_skills := true; END IF;
  SELECT * INTO o FROM public.character_orientation WHERE character_id = _cid;
  RETURN jsonb_build_object(
    'name', c.first_name || ' ' || c.last_name, 'age', c.age, 'city', (SELECT name FROM public.cities WHERE id = c.city_id),
    'appearance', c.appearance,
    'has_photo', pr.show_photo AND EXISTS (SELECT 1 FROM public.character_identity i WHERE i.character_id = _cid AND i.use_photo AND i.photo IS NOT NULL),
    'party', CASE WHEN pr.show_party THEN COALESCE((SELECT label FROM public.real_parties WHERE code = o.party_code), 'Indépendant') END,
    'job', CASE WHEN pr.show_job THEN (SELECT j.title FROM public.employments e JOIN public.jobs j ON j.id = e.job_id WHERE e.character_id = _cid AND e.status = 'active') END,
    'organizations', CASE WHEN pr.show_orgs THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('name', g.name, 'kind', g.kind))
        FROM public.memberships m JOIN public.organizations g ON g.id = m.organization_id WHERE m.character_id = _cid AND m.status = 'active'), '[]'::jsonb) END,
    'mandates', CASE WHEN pr.show_mandates THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('function', m.function, 'city', ci.name,
        'starts_at', m.starts_at, 'ends_at', m.ends_at, 'active', m.status = 'active') ORDER BY m.starts_at DESC)
        FROM public.municipal_mandates m JOIN public.candidacies k ON k.id = m.candidacy_id JOIN public.cities ci ON ci.id = m.city_id
        WHERE k.character_id = _cid), '[]'::jsonb) END,
    'projects', CASE WHEN pr.show_projects THEN jsonb_build_object(
        'proposed', (SELECT count(*) FROM public.citizen_projects WHERE author_id = _cid),
        'done', (SELECT count(*) FROM public.citizen_projects WHERE author_id = _cid AND status = 'termine'),
        'petitions', (SELECT count(*) FROM public.petitions WHERE author_id = _cid)) END,
    'skills', CASE WHEN pr.show_skills THEN public.life_top_skills(_cid) END,
    'engagement', jsonb_build_object(
        'reputation', COALESCE((SELECT reputation FROM public.social_stats WHERE character_id = _cid), 0),
        'political_reputation', COALESCE((SELECT reputation FROM public.political_stats WHERE character_id = _cid), 0),
        'followers', (SELECT count(*) FROM public.player_follows WHERE followed_id = _cid)));
END $$;

CREATE FUNCTION public.public_photo(_cid uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := public.social_actor(); BEGIN
  IF me <> _cid AND public.network_blocked(me, _cid) THEN RETURN NULL; END IF;
  RETURN (SELECT i.photo FROM public.character_identity i WHERE i.character_id = _cid AND i.use_photo
    AND COALESCE((SELECT show_photo FROM public.public_profile_prefs WHERE character_id = _cid), true));
END $$;

REVOKE ALL ON FUNCTION public.orientation_drift(uuid), public.life_top_skills(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orientation_state(), public.orientation_action(text, jsonb), public.public_profile(uuid), public.public_photo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orientation_state(), public.orientation_action(text, jsonb), public.public_profile(uuid), public.public_photo(uuid) TO authenticated;

COMMIT;
