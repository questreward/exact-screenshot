-- CIVITAS 0121 : décisions interactives Mairie / Assemblée / Élysée avec effets visibles en ville.
-- Règles validées par Alex :
--   Mairie  : le maire (mandat actif) prend 1 arrêté par jour de jeu, ±1 à ±8 sur une jauge d'un quartier de SA ville.
--   Élysée  : le président prend 1 décret par jour de jeu, ±1 à ±5 sur une jauge de tous les quartiers d'une ville.
--   Assemblée : chaque loi adoptée après l'installation donne +3 sur une jauge dans toutes les villes (une seule fois).
-- Les effets passent par district_gauge_apply (0091) : plafonnés 0–100, clé unique, retour progressif à 50.
-- Aucune écriture d'argent, de stats ou d'indicateurs de ville. Tout ou rien.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.institution_decrees') IS NOT NULL THEN RAISE EXCEPTION '0121 déjà installée : ne pas relancer'; END IF;
  IF to_regprocedure('public.district_gauge_apply(text,text,text,integer,integer,text)') IS NULL
     OR to_regprocedure('public.pr_president()') IS NULL OR to_regclass('public.municipal_mandates') IS NULL
     OR to_regclass('public.national_laws') IS NULL OR to_regprocedure('public.social_actor()') IS NULL THEN
    RAISE EXCEPTION 'Prérequis manquants (0091 jauges, 0119 présidence, mandats, lois)'; END IF;
END $$;

CREATE TABLE public.institution_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  installed_at timestamptz NOT NULL,
  mayor_max integer NOT NULL, president_max integer NOT NULL, law_gain integer NOT NULL
);
GRANT SELECT ON public.institution_settings TO authenticated; GRANT ALL ON public.institution_settings TO service_role;
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY institution_settings_read ON public.institution_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.institution_settings VALUES (true, public.game_now(), 8, 5, 3);

-- Arrêtés et décrets : faits publics (comme les décisions municipales).
CREATE TABLE public.institution_decrees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('mairie','elysee')),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  city_id text NOT NULL REFERENCES public.cities(id),
  district_id text REFERENCES public.districts(id),
  gauge text NOT NULL CHECK (gauge IN ('cadre','tranquillite','animation')),
  delta integer NOT NULL CHECK (delta <> 0 AND delta BETWEEN -8 AND 8),
  title text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 80),
  game_day integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (kind, character_id, game_day)
);
CREATE INDEX institution_decrees_city ON public.institution_decrees (city_id, created_at DESC);
GRANT SELECT ON public.institution_decrees TO authenticated; GRANT ALL ON public.institution_decrees TO service_role;
ALTER TABLE public.institution_decrees ENABLE ROW LEVEL SECURITY;
CREATE POLICY institution_decrees_read ON public.institution_decrees FOR SELECT TO authenticated USING (true);

CREATE FUNCTION public.institution_game_day() RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT floor(extract(epoch FROM public.game_now()) / 86400)::integer $$;

-- Jauge touchée par une loi selon sa catégorie (indice de présentation, effet toujours positif).
CREATE FUNCTION public.institution_law_gauge(_category text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _category ~* 's[ée]curit|justice|police|ordre' THEN 'tranquillite'
              WHEN _category ~* 'culture|sport|jeunesse|loisir|tourisme' THEN 'animation'
              ELSE 'cadre' END $$;

-- Lois adoptées après l'installation : +law_gain une seule fois par quartier.
CREATE FUNCTION public.institution_laws_settle() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s institution_settings; r record; d record;
BEGIN
  SELECT * INTO s FROM institution_settings;
  FOR r IN SELECT l.id, coalesce(v.title, 'Loi adoptée') AS title, institution_law_gauge(coalesce(v.category, '')) AS gauge, l.adopted_at
           FROM national_laws l LEFT JOIN national_law_versions v ON v.law_id = l.id AND v.version = l.current_version
           WHERE l.adopted_at IS NOT NULL AND l.adopted_at >= s.installed_at AND l.adopted_at <= game_now() LOOP
    FOR d IN SELECT dd.id, dd.city_id FROM districts dd JOIN district_gauges g ON g.district_id = dd.id AND g.gauge = r.gauge LOOP
      PERFORM district_gauge_apply('law:' || r.id || ':' || d.id, d.id, r.gauge, district_gauge_week(r.adopted_at), s.law_gain, 'Loi adoptée : ' || r.title);
    END LOOP;
  END LOOP;
END $$;

CREATE FUNCTION public.institution_decree(_kind text, _city text, _district text, _gauge text, _delta integer, _title text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := social_actor(); s institution_settings; did uuid; t text := btrim(coalesce(_title, '')); dd record; _day integer := institution_game_day();
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
  PERFORM 1 FROM characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM institution_settings;
  IF _gauge NOT IN ('cadre','tranquillite','animation') THEN RAISE EXCEPTION 'Jauge inconnue'; END IF;
  IF char_length(t) < 5 OR char_length(t) > 80 THEN RAISE EXCEPTION 'Titre de 5 à 80 caractères'; END IF;
  IF NOT EXISTS (SELECT 1 FROM cities WHERE id = _city) THEN RAISE EXCEPTION 'Ville inconnue'; END IF;
  IF EXISTS (SELECT 1 FROM institution_decrees WHERE kind = _kind AND character_id = cid AND game_day = _day) THEN
    RAISE EXCEPTION 'Une seule décision par jour de jeu'; END IF;
  IF _kind = 'mairie' THEN
    IF NOT EXISTS (SELECT 1 FROM municipal_mandates m JOIN candidacies c ON c.id = m.candidacy_id
                   WHERE m.city_id = _city AND m.status = 'active' AND m.ends_at > game_now() AND c.character_id = cid) THEN
      RAISE EXCEPTION 'Réservé au maire de cette ville'; END IF;
    IF abs(_delta) < 1 OR abs(_delta) > s.mayor_max THEN RAISE EXCEPTION 'Effet de 1 à % points', s.mayor_max; END IF;
    IF NOT EXISTS (SELECT 1 FROM districts WHERE id = _district AND city_id = _city) THEN RAISE EXCEPTION 'Quartier hors de la ville'; END IF;
  ELSIF _kind = 'elysee' THEN
    IF pr_president() IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Réservé au président de la République'; END IF;
    IF abs(_delta) < 1 OR abs(_delta) > s.president_max THEN RAISE EXCEPTION 'Effet de 1 à % points', s.president_max; END IF;
    _district := NULL;
  ELSE RAISE EXCEPTION 'Institution inconnue'; END IF;

  PERFORM district_gauges_settle(_city);
  INSERT INTO institution_decrees(kind, character_id, city_id, district_id, gauge, delta, title, game_day)
    VALUES (_kind, cid, _city, _district, _gauge, _delta, t, _day) RETURNING id INTO did;
  FOR dd IN SELECT id FROM districts WHERE city_id = _city AND (_district IS NULL OR id = _district) LOOP
    PERFORM district_gauge_apply('decree:' || did || ':' || dd.id, dd.id, _gauge, district_gauge_week(game_now()), _delta,
      CASE _kind WHEN 'mairie' THEN 'Arrêté municipal : ' ELSE 'Décret présidentiel : ' END || t);
  END LOOP;
  RETURN did;
END $$;

CREATE FUNCTION public.institution_state(_city text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := social_actor(); s institution_settings; _day integer := institution_game_day();
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
  IF NOT EXISTS (SELECT 1 FROM cities WHERE id = _city) THEN RAISE EXCEPTION 'Ville inconnue'; END IF;
  SELECT * INTO s FROM institution_settings;
  PERFORM district_gauges_settle(_city);
  PERFORM institution_laws_settle();
  RETURN jsonb_build_object(
    'mayor', EXISTS (SELECT 1 FROM municipal_mandates m JOIN candidacies c ON c.id = m.candidacy_id
                     WHERE m.city_id = _city AND m.status = 'active' AND m.ends_at > game_now() AND c.character_id = cid),
    'president', pr_president() IS NOT DISTINCT FROM cid AND cid IS NOT NULL,
    'mayor_max', s.mayor_max, 'president_max', s.president_max, 'law_gain', s.law_gain,
    'used', coalesce((SELECT jsonb_agg(kind) FROM institution_decrees WHERE character_id = cid AND game_day = _day), '[]'),
    'decrees', coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
      SELECT d.kind, d.title, d.gauge, d.delta, d.district_id, d.created_at FROM institution_decrees d
      WHERE d.city_id = _city ORDER BY d.created_at DESC LIMIT 10) x), '[]'));
END $$;

REVOKE ALL ON FUNCTION public.institution_laws_settle(), public.institution_game_day(), public.institution_law_gauge(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.institution_laws_settle(), public.institution_game_day(), public.institution_law_gauge(text) TO service_role;
REVOKE ALL ON FUNCTION public.institution_decree(text,text,text,text,integer,text), public.institution_state(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.institution_decree(text,text,text,text,integer,text), public.institution_state(text) TO authenticated, service_role;

-- Contrôles d'intégrité
DO $$ BEGIN
  IF (SELECT count(*) FROM public.institution_settings) <> 1 THEN RAISE EXCEPTION 'Réglages manquants'; END IF;
  IF public.institution_law_gauge('Sécurité intérieure') <> 'tranquillite' OR public.institution_law_gauge('Culture') <> 'animation' OR public.institution_law_gauge('Logement') <> 'cadre' THEN
    RAISE EXCEPTION 'Correspondance des lois incorrecte'; END IF;
END $$;

COMMIT;
