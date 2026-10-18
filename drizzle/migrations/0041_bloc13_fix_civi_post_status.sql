CREATE OR REPLACE FUNCTION public.civi_post(_template text, _request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.communication_settings; t public.social_post_templates; city text;
        d date := (public.game_now() AT TIME ZONE 'UTC')::date; n integer; pid uuid; BEGIN
  cid := public.social_actor();
  SELECT * INTO s FROM public.communication_settings WHERE id = 1; IF NOT s.enabled THEN RAISE EXCEPTION 'Civi est momentanément indisponible'; END IF;
  SELECT * INTO t FROM public.social_post_templates WHERE id = _template AND active; IF NOT FOUND THEN RAISE EXCEPTION 'Modèle inconnu'; END IF;
  -- Même requête rejouée (double clic, recharge) : renvoie la publication existante
  SELECT id INTO pid FROM public.social_posts WHERE character_id = cid AND source_key LIKE 'player:' || cid || ':req:' || _request_id;
  IF pid IS NOT NULL THEN RETURN pid; END IF;
  SELECT count(*) INTO n FROM public.economy_operations WHERE character_id = cid AND operation_key LIKE 'civi:post:' || d || ':%';
  IF n >= s.daily_post_limit THEN RAISE EXCEPTION 'Limite de publications atteinte pour aujourd''hui'; END IF;
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT coalesce(p.city_id, c.city_id) INTO city FROM public.character_positions p WHERE p.character_id = cid;
  city := coalesce(city, c.city_id);
  INSERT INTO public.social_posts (author_kind, author_label, character_id, city_id, template_id, body, source_key)
  VALUES ('player', c.first_name || ' ' || c.last_name, cid, city, t.id,
          replace(replace(t.body, '{city}', (SELECT name FROM public.cities WHERE id = city)), '{place}', ''),
          'player:' || cid || ':req:' || _request_id)
  RETURNING id INTO pid;
  INSERT INTO public.economy_operations (character_id, operation_key, kind, amount, status, payload)
  VALUES (cid, 'civi:post:' || d || ':' || (n + 1), 'social_post', 0, 'done', jsonb_build_object('post_id', pid));
  RETURN pid;
END $$;