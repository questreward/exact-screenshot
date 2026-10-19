-- CIVITAS – CLASSEMENTS PUBLICS
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0065_public_rankings.sql
-- Classements des joueurs (France entière ou une ville) : réputation, influence, popularité (abonnés),
--   et fortune UNIQUEMENT pour les joueurs qui choisissent de l'afficher (désactivé par défaut : l'argent reste privé).
-- Lecture seule : aucune valeur de jeu n'est modifiée. Les données passent par une fonction qui n'expose que nom, ville et score.
BEGIN;

CREATE TABLE public.ranking_preferences (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  show_wealth boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT public.game_now()
);
GRANT SELECT ON public.ranking_preferences TO authenticated;
GRANT ALL ON public.ranking_preferences TO service_role;
ALTER TABLE public.ranking_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY ranking_preferences_own ON public.ranking_preferences FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = ranking_preferences.character_id AND c.user_id = auth.uid()));

-- Scores par catégorie (fonction interne)
CREATE FUNCTION public.ranking_scores(_kind text, _city text) RETURNS TABLE (character_id uuid, score bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, CASE _kind
      WHEN 'reputation' THEN COALESCE((SELECT reputation FROM public.social_stats WHERE character_id = c.id), 0)
      WHEN 'influence' THEN COALESCE((SELECT influence FROM public.social_stats WHERE character_id = c.id), 0)
      WHEN 'popularite' THEN (SELECT count(*) FROM public.player_follows WHERE followed_id = c.id)
      WHEN 'fortune' THEN COALESCE((SELECT sum(balance) FROM public.accounts WHERE character_id = c.id), 0) END::bigint
  FROM public.characters c
  WHERE (_city IS NULL OR c.city_id = _city)
    AND (_kind <> 'fortune' OR EXISTS (SELECT 1 FROM public.ranking_preferences p WHERE p.character_id = c.id AND p.show_wealth))
$$;

CREATE FUNCTION public.rankings_state(_kind text, _city text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  IF _kind NOT IN ('reputation','influence','popularite','fortune') THEN RAISE EXCEPTION 'Classement inconnu.'; END IF;
  IF _city IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cities WHERE id = _city) THEN RAISE EXCEPTION 'Ville inconnue.'; END IF;
  RETURN jsonb_build_object('kind', _kind, 'city', _city, 'me', cid,
    'my_city', (SELECT city_id FROM public.characters WHERE id = cid),
    'show_wealth', COALESCE((SELECT show_wealth FROM public.ranking_preferences WHERE character_id = cid), false),
    'cities', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY name) FROM public.cities),
    'top', COALESCE((SELECT jsonb_agg(jsonb_build_object('rank', r.rnk, 'id', r.character_id, 'score', r.score,
        'name', ch.first_name || ' ' || ch.last_name, 'city', (SELECT name FROM public.cities WHERE id = ch.city_id)) ORDER BY r.rnk, ch.last_name)
      FROM (SELECT x.*, rank() OVER (ORDER BY x.score DESC) rnk FROM public.ranking_scores(_kind, _city) x) r
      JOIN public.characters ch ON ch.id = r.character_id WHERE r.rnk <= 20), '[]'::jsonb),
    'mine', (SELECT jsonb_build_object('rank', r.rnk, 'score', r.score, 'total', r.total)
      FROM (SELECT x.*, rank() OVER (ORDER BY x.score DESC) rnk, count(*) OVER () total FROM public.ranking_scores(_kind, _city) x) r
      WHERE r.character_id = cid));
END $$;

CREATE FUNCTION public.rankings_set_wealth(_show boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  INSERT INTO public.ranking_preferences (character_id, show_wealth) VALUES (cid, COALESCE(_show, false))
  ON CONFLICT (character_id) DO UPDATE SET show_wealth = EXCLUDED.show_wealth, updated_at = public.game_now();
  RETURN COALESCE(_show, false);
END $$;

REVOKE ALL ON FUNCTION public.ranking_scores(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rankings_state(text, text), public.rankings_set_wealth(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rankings_state(text, text), public.rankings_set_wealth(boolean) TO authenticated;

COMMIT;
