-- CIVITAS – PRESSE DES JOUEURS (journalistes, articles, photo)
-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0056_player_press.sql
-- Aucun argent, aucune récompense : seulement de la visibilité.
-- La photo est stockée en petite image compressée (limite 200 Ko) car le serveur n'a pas de stockage de fichiers séparé.
BEGIN;

CREATE TABLE public.press_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  title_max integer NOT NULL DEFAULT 120,
  body_max integer NOT NULL DEFAULT 3000,
  photo_max integer NOT NULL DEFAULT 270000,      -- taille maximale de l'image encodée (≈ 200 Ko)
  daily_max integer NOT NULL DEFAULT 3,
  banned_words text[] NOT NULL DEFAULT ARRAY['connard','connasse','salope','enculé','encule','pute','nique','negro','bougnoule','pédé','pede','fdp','ntm']
);
CREATE TABLE public.press_cards (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  outlet text NOT NULL CHECK (char_length(outlet) BETWEEN 3 AND 60),
  portrait text,                                   -- photo du journaliste (image compressée), facultative
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.press_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.press_cards(character_id),
  city_id text REFERENCES public.cities(id),
  title text NOT NULL,
  body text NOT NULL,
  photo text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden')),
  request_id uuid NOT NULL UNIQUE,
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX press_articles_recent ON public.press_articles (status, published_at DESC);
CREATE INDEX press_articles_author ON public.press_articles (author_id, published_at DESC);

GRANT SELECT ON public.press_settings, public.press_cards, public.press_articles TO authenticated;
GRANT ALL ON public.press_settings, public.press_cards, public.press_articles TO service_role;
ALTER TABLE public.press_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.press_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.press_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY press_settings_read ON public.press_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY press_cards_read ON public.press_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY press_articles_read ON public.press_articles FOR SELECT TO authenticated USING (
  status = 'published' OR EXISTS (SELECT 1 FROM public.characters c WHERE c.id = press_articles.author_id AND c.user_id = auth.uid()));
INSERT INTO public.press_settings (id) VALUES (1);

-- Filtre automatique : refuse les mots interdits (insensible à la casse)
CREATE FUNCTION public.press_clean(_text text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.press_settings s, unnest(s.banned_words) w
    WHERE lower(_text) ~ ('(^|[^[:alpha:]])' || w || '($|[^[:alpha:]])'))
$$;

CREATE FUNCTION public.press_valid_image(_img text, _max integer) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _img IS NULL OR (_img ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' AND char_length(_img) <= _max)
$$;

-- Devenir journaliste (ou modifier sa carte de presse)
CREATE FUNCTION public.press_register(_outlet text, _portrait text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.press_settings; BEGIN
  SELECT * INTO s FROM public.press_settings WHERE id = 1;
  IF char_length(btrim(coalesce(_outlet,''))) NOT BETWEEN 3 AND 60 THEN RAISE EXCEPTION 'Nom du média : 3 à 60 caractères.'; END IF;
  IF NOT public.press_clean(_outlet) THEN RAISE EXCEPTION 'Ce nom contient un mot interdit.'; END IF;
  IF NOT public.press_valid_image(_portrait, s.photo_max) THEN RAISE EXCEPTION 'Photo invalide ou trop lourde.'; END IF;
  INSERT INTO public.press_cards (character_id, outlet, portrait) VALUES (cid, btrim(_outlet), _portrait)
  ON CONFLICT (character_id) DO UPDATE SET outlet = EXCLUDED.outlet, portrait = COALESCE(EXCLUDED.portrait, press_cards.portrait);
END $$;

-- Publier un article (filtre automatique, 3 par jour, une seule fois par demande)
CREATE FUNCTION public.press_publish(_request_id uuid, _title text, _body text, _photo text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.press_settings; aid uuid; city text; BEGIN
  SELECT * INTO s FROM public.press_settings WHERE id = 1;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT id INTO aid FROM public.press_articles WHERE request_id = _request_id;
  IF aid IS NOT NULL THEN RETURN aid; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.press_cards WHERE character_id = cid) THEN RAISE EXCEPTION 'Il faut d''abord une carte de presse.'; END IF;
  IF char_length(btrim(coalesce(_title,''))) NOT BETWEEN 5 AND s.title_max THEN RAISE EXCEPTION 'Titre : 5 à % caractères.', s.title_max; END IF;
  IF char_length(btrim(coalesce(_body,''))) NOT BETWEEN 50 AND s.body_max THEN RAISE EXCEPTION 'Article : 50 à % caractères.', s.body_max; END IF;
  IF NOT public.press_clean(_title || ' ' || _body) THEN RAISE EXCEPTION 'Article refusé par le filtre automatique : langage interdit.'; END IF;
  IF NOT public.press_valid_image(_photo, s.photo_max) THEN RAISE EXCEPTION 'Photo invalide ou trop lourde.'; END IF;
  IF (SELECT count(*) FROM public.press_articles WHERE author_id = cid AND published_at > now() - interval '1 day') >= s.daily_max THEN
    RAISE EXCEPTION 'Maximum % articles par jour.', s.daily_max; END IF;
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  INSERT INTO public.press_articles (author_id, city_id, title, body, photo, request_id)
  VALUES (cid, city, btrim(_title), btrim(_body), _photo, _request_id) RETURNING id INTO aid;
  RETURN aid;
END $$;

-- Retirer son propre article
CREATE FUNCTION public.press_hide(_article uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.press_articles SET status = 'hidden' WHERE id = _article AND author_id = public.social_actor();
  IF NOT FOUND THEN RAISE EXCEPTION 'Article introuvable.'; END IF;
END $$;

-- Fil de presse : derniers articles publiés, avec le nom et le média de l'auteur
CREATE FUNCTION public.press_feed(_limit integer) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'published_at' DESC), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body, 'photo', a.photo, 'published_at', a.published_at,
      'city', (SELECT name FROM public.cities WHERE id = a.city_id), 'author_id', a.author_id,
      'author', c.first_name || ' ' || c.last_name, 'outlet', p.outlet, 'portrait', p.portrait,
      'mine', c.user_id = auth.uid()) AS x
    FROM public.press_articles a JOIN public.press_cards p ON p.character_id = a.author_id JOIN public.characters c ON c.id = a.author_id
    WHERE a.status = 'published' ORDER BY a.published_at DESC LIMIT least(greatest(coalesce(_limit, 20), 1), 50)) t
$$;

REVOKE ALL ON FUNCTION public.press_clean(text), public.press_valid_image(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.press_register(text, text), public.press_publish(uuid, text, text, text), public.press_hide(uuid), public.press_feed(integer) TO authenticated;

-- Contrôles d'intégrité
DO $$ BEGIN
  IF (SELECT count(*) FROM public.press_settings) <> 1 THEN RAISE EXCEPTION 'press_settings incomplet'; END IF;
  IF public.press_clean('Bonjour la ville') IS NOT TRUE OR public.press_clean('espèce de connard') IS NOT FALSE THEN RAISE EXCEPTION 'filtre défaillant'; END IF;
END $$;

COMMIT;
