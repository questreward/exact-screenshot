-- CIVITAS 0088 : projection visuelle du JT, aucun changement du moteur.
-- Aucune table/colonne créée ; aucune donnée historique réécrite.
-- Deux fonctions nouvelles uniquement. tv_state et tv_build restent inchangées.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('public.tv_state(text)') IS NULL
    OR to_regprocedure('public.social_actor()') IS NULL
    OR to_regclass('public.tv_segments') IS NULL THEN
    RAISE EXCEPTION '0088 : journal télévisé existant requis, installation annulée';
  END IF;
  IF to_regprocedure('public.tv_scenes_state(uuid[])') IS NOT NULL THEN
    RAISE EXCEPTION '0088 déjà installée : ne pas relancer';
  END IF;
END $$;

CREATE FUNCTION public.scene_importance_level(_importance integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN COALESCE(_importance,0) < 25 THEN 1
    WHEN _importance < 50 THEN 2 WHEN _importance < 65 THEN 3
    WHEN _importance < 85 THEN 4 ELSE 5 END
$$;
REVOKE ALL ON FUNCTION public.scene_importance_level(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scene_importance_level(integer) TO service_role;

CREATE FUNCTION public.tv_scenes_state(_segments uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; result jsonb;
BEGIN
  cid := public.social_actor();
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage requis'; END IF;
  IF COALESCE(cardinality(_segments),0) > 100 THEN RAISE EXCEPTION 'Trop de sujets'; END IF;
  SELECT COALESCE(jsonb_object_agg(g.id::text, jsonb_build_object(
    'event_id', e.id, 'title', e.title, 'category', e.category,
    'importance', e.importance, 'location_name', l.name,
    'starts_at', e.starts_at, 'scope', e.scope)), '{}'::jsonb)
  INTO result
  FROM public.tv_segments g
  JOIN public.news n ON n.id = g.news_id
  JOIN public.events e ON e.id = n.event_id
  LEFT JOIN public.locations l ON l.id = e.location_id
  WHERE g.id = ANY(_segments) AND g.kind = 'news'
    AND n.status = 'published' AND n.published_at <= public.game_now()
    AND e.status <> 'cancelled' AND e.starts_at <= public.game_now()
    AND e.character_id IS NULL AND e.target_kind IN ('city','general');
  -- Only public events. Organization/participation/location-targeted or personal
  -- events are never disclosed here, even if an old TV segment references them.
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.tv_scenes_state(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tv_scenes_state(uuid[]) TO authenticated, service_role;

DO $$ BEGIN
  IF public.scene_importance_level(64) <> 3 OR public.scene_importance_level(65) <> 4
    OR public.scene_importance_level(100) <> 5 THEN RAISE EXCEPTION '0088 : niveaux incompatibles'; END IF;
  IF has_function_privilege('anon','public.tv_scenes_state(uuid[])','EXECUTE') THEN
    RAISE EXCEPTION '0088 : accès anonyme interdit';
  END IF;
END $$;
COMMIT;