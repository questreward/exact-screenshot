-- CIVITAS – CONSÉQUENCES DIFFÉRÉES (moteur générique)
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0066_deferred_effects.sql
-- Une décision programme des effets datés (court, moyen, long terme). Chaque effet a une clé unique et ne s'applique qu'une fois,
-- à la première lecture après son échéance (pas de tâche planifiée). Types d'effets :
--   indicator : indicateur de ville (0–100, borné) ;
--   treasury  : budget municipal (registre municipal à clé unique ; une dépense ne fait jamais passer le budget sous zéro) ;
--   reputation: réputation sociale d'un joueur (jamais sous zéro) ;
--   political : réputation politique via award_political (registre existant, une fois) ;
--   news      : article + événement via civic_news (alimente Actualités et JT).
-- Les effets sont publics par ville : chacun peut voir « ce qui va arriver » et « pourquoi ».
BEGIN;

CREATE TABLE public.scheduled_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effect_key text NOT NULL UNIQUE,
  source_kind text NOT NULL,            -- 'projet', 'crise', ...
  source_id uuid NOT NULL,
  city_id text NOT NULL REFERENCES public.cities(id),
  due_at timestamptz NOT NULL,
  kind text NOT NULL CHECK (kind IN ('indicator','treasury','reputation','political','news')),
  indicator text,
  delta integer NOT NULL DEFAULT 0,
  amount bigint NOT NULL DEFAULT 0,
  character_id uuid REFERENCES public.characters(id),
  label text NOT NULL,                  -- explication lisible : « pourquoi »
  body text,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  applied_at timestamptz,
  applied_value bigint,                 -- valeur réellement appliquée (bornes, budget insuffisant)
  CHECK (kind <> 'indicator' OR indicator IS NOT NULL),
  CHECK (kind NOT IN ('reputation','political') OR character_id IS NOT NULL)
);
CREATE INDEX scheduled_effects_due ON public.scheduled_effects (city_id, due_at) WHERE applied_at IS NULL;
CREATE INDEX scheduled_effects_source ON public.scheduled_effects (source_kind, source_id);

GRANT SELECT ON public.scheduled_effects TO authenticated;
GRANT ALL ON public.scheduled_effects TO service_role;
ALTER TABLE public.scheduled_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY scheduled_effects_read ON public.scheduled_effects FOR SELECT TO authenticated USING (true);

-- Programmer un effet (interne). Idempotent grâce à la clé.
CREATE FUNCTION public.schedule_effect(_key text, _source_kind text, _source uuid, _city text, _due timestamptz, _kind text,
  _label text, _indicator text DEFAULT NULL, _delta integer DEFAULT 0, _amount bigint DEFAULT 0, _character uuid DEFAULT NULL, _body text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.scheduled_effects (effect_key, source_kind, source_id, city_id, due_at, kind, label, indicator, delta, amount, character_id, body)
  VALUES (_key, _source_kind, _source, _city, _due, _kind, _label, _indicator, _delta, _amount, _character, _body)
  ON CONFLICT (effect_key) DO NOTHING
$$;

-- Appliquer les effets arrivés à échéance dans une ville (interne, exactement une fois par effet)
CREATE FUNCTION public.apply_due_effects(_city text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.scheduled_effects; v bigint; bal bigint; n integer := 0; BEGIN
  FOR e IN SELECT * FROM public.scheduled_effects WHERE city_id = _city AND applied_at IS NULL AND due_at <= public.game_now()
           ORDER BY due_at, effect_key FOR UPDATE SKIP LOCKED LOOP
    v := 0;
    IF e.kind = 'indicator' THEN
      UPDATE public.city_indicators SET value = GREATEST(0, LEAST(100, value + e.delta)) WHERE city_id = e.city_id AND indicator = e.indicator
        RETURNING e.delta INTO v;
    ELSIF e.kind = 'treasury' THEN
      SELECT balance INTO bal FROM public.municipal_treasuries WHERE city_id = e.city_id FOR UPDATE;
      v := CASE WHEN e.amount < 0 THEN -LEAST(-e.amount, COALESCE(bal, 0)) ELSE e.amount END;
      IF v <> 0 AND bal IS NOT NULL THEN
        INSERT INTO public.municipal_ledger (city_id, entry_key, category, amount, label)
        VALUES (e.city_id, 'effect:' || e.effect_key, CASE WHEN v < 0 THEN 'Dépenses' ELSE 'Recettes' END, v, e.label);
        UPDATE public.municipal_treasuries SET balance = balance + v,
          income = income + GREATEST(v, 0), expenses = expenses + GREATEST(-v, 0) WHERE city_id = e.city_id;
      END IF;
    ELSIF e.kind = 'reputation' THEN
      INSERT INTO public.social_stats (character_id, reputation, influence) VALUES (e.character_id, 0, 0) ON CONFLICT (character_id) DO NOTHING;
      SELECT GREATEST(e.delta, -reputation) INTO v FROM public.social_stats WHERE character_id = e.character_id;
      UPDATE public.social_stats SET reputation = reputation + v WHERE character_id = e.character_id;
    ELSIF e.kind = 'political' THEN
      v := GREATEST(e.delta, -COALESCE((SELECT reputation FROM public.political_stats WHERE character_id = e.character_id), 0));
      PERFORM public.award_political(e.character_id, 'effect:' || e.effect_key, 'effect', v::integer, 0, 0, 0, e.label);
    ELSIF e.kind = 'news' THEN
      PERFORM public.civic_news('effect:' || e.effect_key, e.label, COALESCE(e.body, e.label), e.city_id, NULL, NULL);
    END IF;
    UPDATE public.scheduled_effects SET applied_at = public.game_now(), applied_value = v WHERE id = e.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Lecture publique : effets récents et à venir d'une ville
CREATE FUNCTION public.city_effects(_city text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.social_actor() IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM public.apply_due_effects(_city);
  RETURN jsonb_build_object('now', public.game_now(),
    'upcoming', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'indicator', indicator, 'delta', delta, 'amount', amount,
        'label', label, 'due_at', due_at, 'source_kind', source_kind) ORDER BY due_at)
      FROM (SELECT * FROM public.scheduled_effects WHERE city_id = _city AND applied_at IS NULL AND kind <> 'news' ORDER BY due_at LIMIT 30) x), '[]'::jsonb),
    'recent', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'indicator', indicator, 'delta', delta, 'amount', amount,
        'value', applied_value, 'label', label, 'applied_at', applied_at, 'source_kind', source_kind) ORDER BY applied_at DESC)
      FROM (SELECT * FROM public.scheduled_effects WHERE city_id = _city AND applied_at IS NOT NULL AND kind <> 'news' ORDER BY applied_at DESC LIMIT 20) x), '[]'::jsonb),
    'indicators', COALESCE((SELECT jsonb_object_agg(indicator, value) FROM public.city_indicators WHERE city_id = _city), '{}'::jsonb),
    'treasury', (SELECT balance FROM public.municipal_treasuries WHERE city_id = _city));
END $$;

REVOKE ALL ON FUNCTION public.schedule_effect(text, text, uuid, text, timestamptz, text, text, text, integer, bigint, uuid, text),
  public.apply_due_effects(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.city_effects(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.city_effects(text) TO authenticated;

COMMIT;
