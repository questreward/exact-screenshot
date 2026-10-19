-- CIVITAS – MÉDIAS DES JOUEURS (journal + chaîne, abonnés, caisse du média, influence plafonnée)
-- Prolonge la presse des joueurs (0056). Uniquement des ajouts : colonnes nouvelles avec valeur par défaut,
-- tables et fonctions nouvelles. press_publish, press_feed, press_register restent inchangées.
-- Tout ou rien :
--   docker exec -i civitas-db psql -1 -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0083_player_media.sql
-- Règles :
--   * Publication immédiate (filtre automatique existant), 3 signalements distincts masquent un contenu.
--   * Caisse séparée par média, jamais négative ; abonnements joueurs payés chaque semaine à la lecture de l'abonné ;
--     lecteurs fictifs payés une fois par semaine terminée (ligne unique par semaine).
--   * Le propriétaire peut se verser une rémunération plafonnée par semaine (clé unique par semaine).
--   * Influence : une personne citée gagne/perd 1 point de réputation (plafond par personne et par semaine),
--     un indicateur de la ville bouge de 1 point via les effets différés (plafond par média et par semaine).
BEGIN;

-- 1. Réglages ------------------------------------------------------------------------------
CREATE TABLE public.media_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  sub_price integer NOT NULL DEFAULT 3,            -- € par semaine pour un joueur abonné
  npc_per_item integer NOT NULL DEFAULT 6,         -- lecteurs fictifs gagnés par contenu publié dans la semaine
  npc_per_player integer NOT NULL DEFAULT 2,       -- lecteurs fictifs attirés par chaque abonné joueur
  npc_cap integer NOT NULL DEFAULT 300,
  npc_cents integer NOT NULL DEFAULT 50,           -- centimes rapportés par lecteur fictif et par semaine
  owner_pay_max integer NOT NULL DEFAULT 150,      -- rémunération maximale du propriétaire par semaine
  report_hide integer NOT NULL DEFAULT 3,
  mention_rep integer NOT NULL DEFAULT 1,
  mention_week_cap integer NOT NULL DEFAULT 3,     -- points max reçus/perdus par une même personne par semaine
  opinion_delta integer NOT NULL DEFAULT 1,
  opinion_week_cap integer NOT NULL DEFAULT 2,     -- effets sur la ville max par média et par semaine
  max_weeks_back integer NOT NULL DEFAULT 8
);
INSERT INTO public.media_settings (id) VALUES (1);

-- 2. Colonnes ajoutées (avec valeurs par défaut, aucune donnée existante modifiée) ------------
ALTER TABLE public.press_cards ADD COLUMN channel text CHECK (channel IS NULL OR char_length(channel) BETWEEN 3 AND 60);
ALTER TABLE public.press_articles
  ADD COLUMN format text NOT NULL DEFAULT 'article' CHECK (format IN ('article','emission')),
  ADD COLUMN cited_id uuid REFERENCES public.characters(id),
  ADD COLUMN tone text NOT NULL DEFAULT 'neutre' CHECK (tone IN ('neutre','positif','critique')),
  ADD COLUMN indicator text,
  ADD COLUMN reports integer NOT NULL DEFAULT 0;

-- 3. Tables ----------------------------------------------------------------------------------
CREATE TABLE public.media_treasuries (
  owner_id uuid PRIMARY KEY REFERENCES public.press_cards(character_id),
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0)
);
CREATE TABLE public.media_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.press_cards(character_id),
  operation_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('subscription','npc_readers','owner_pay')),
  amount integer NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_ledger_owner ON public.media_ledger (owner_id, created_at DESC);
CREATE TABLE public.media_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.characters(id),
  owner_id uuid NOT NULL REFERENCES public.press_cards(character_id),
  active boolean NOT NULL DEFAULT true,
  paid_week integer NOT NULL,                      -- dernière semaine payée
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CHECK (subscriber_id <> owner_id)
);
CREATE UNIQUE INDEX media_subscriptions_active ON public.media_subscriptions (subscriber_id, owner_id) WHERE active;
CREATE TABLE public.media_weeks (
  owner_id uuid NOT NULL REFERENCES public.press_cards(character_id),
  week integer NOT NULL,
  readers integer NOT NULL,
  revenue integer NOT NULL,
  PRIMARY KEY (owner_id, week)
);
CREATE TABLE public.media_reports (
  article_id uuid NOT NULL REFERENCES public.press_articles(id),
  reporter_id uuid NOT NULL REFERENCES public.characters(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, reporter_id)
);
CREATE TABLE public.media_effects (
  article_id uuid NOT NULL REFERENCES public.press_articles(id),
  kind text NOT NULL CHECK (kind IN ('reputation','opinion')),
  target text NOT NULL,                            -- personnage cité ou indicateur
  delta integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, kind)
);

GRANT SELECT ON public.media_settings, public.media_treasuries, public.media_ledger, public.media_subscriptions,
  public.media_weeks, public.media_reports, public.media_effects TO authenticated;
GRANT ALL ON public.media_settings, public.media_treasuries, public.media_ledger, public.media_subscriptions,
  public.media_weeks, public.media_reports, public.media_effects TO service_role;
ALTER TABLE public.media_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_treasuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_settings_read ON public.media_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY media_treasuries_owner ON public.media_treasuries FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = owner_id AND c.user_id = auth.uid()));
CREATE POLICY media_ledger_owner ON public.media_ledger FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = owner_id AND c.user_id = auth.uid()));
CREATE POLICY media_weeks_owner ON public.media_weeks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = owner_id AND c.user_id = auth.uid()));
CREATE POLICY media_subscriptions_parties ON public.media_subscriptions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (subscriber_id, owner_id) AND c.user_id = auth.uid()));
CREATE POLICY media_reports_own ON public.media_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = reporter_id AND c.user_id = auth.uid()));
CREATE POLICY media_effects_read ON public.media_effects FOR SELECT TO authenticated USING (true);

-- 4. Outils internes ---------------------------------------------------------------------------
CREATE FUNCTION public.media_week(_t timestamptz) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT floor(extract(epoch FROM _t) / 604800)::integer
$$;

CREATE FUNCTION public.media_move(_owner uuid, _key text, _amount integer, _kind text, _label text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal integer; BEGIN
  IF EXISTS (SELECT 1 FROM public.media_ledger WHERE operation_key = _key) THEN RETURN false; END IF;
  INSERT INTO public.media_treasuries (owner_id) VALUES (_owner) ON CONFLICT DO NOTHING;
  SELECT balance INTO bal FROM public.media_treasuries WHERE owner_id = _owner FOR UPDATE;
  IF bal + _amount < 0 THEN RETURN false; END IF;
  INSERT INTO public.media_ledger (owner_id, operation_key, kind, amount, label) VALUES (_owner, _key, _kind, _amount, _label);
  UPDATE public.media_treasuries SET balance = balance + _amount WHERE owner_id = _owner;
  RETURN true;
END $$;

-- Lecteurs fictifs des semaines terminées (exactement une fois par semaine)
CREATE FUNCTION public.media_settle_owner(_owner uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.media_settings; cur integer; first_w integer; w integer; items integer; players integer; readers integer; rev integer; BEGIN
  SELECT * INTO s FROM public.media_settings WHERE id = 1;
  PERFORM 1 FROM public.press_cards WHERE character_id = _owner FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  cur := public.media_week(public.game_now());
  first_w := GREATEST(public.media_week((SELECT created_at FROM public.press_cards WHERE character_id = _owner)), cur - s.max_weeks_back);
  FOR w IN first_w .. cur - 1 LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.media_weeks WHERE owner_id = _owner AND week = w);
    SELECT count(*) INTO items FROM public.press_articles
      WHERE author_id = _owner AND status = 'published' AND public.media_week(published_at) = w;
    SELECT count(*) INTO players FROM public.media_subscriptions
      WHERE owner_id = _owner AND public.media_week(started_at) <= w AND (ended_at IS NULL OR public.media_week(ended_at) > w);
    readers := LEAST(s.npc_cap, items * s.npc_per_item + players * s.npc_per_player);
    rev := readers * s.npc_cents / 100;
    INSERT INTO public.media_weeks (owner_id, week, readers, revenue) VALUES (_owner, w, readers, rev);
    IF rev > 0 THEN PERFORM public.media_move(_owner, 'media-npc:' || _owner || ':' || w, rev, 'npc_readers', 'Lecteurs fictifs — semaine ' || w); END IF;
  END LOOP;
END $$;

-- Abonnements du joueur connecté : une semaine payée à la fois ; manque d'argent = fin de l'abonnement
CREATE FUNCTION public.media_settle_subscriber(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.media_settings; sub public.media_subscriptions; cur integer; w integer; ok boolean; outlet text; BEGIN
  SELECT * INTO s FROM public.media_settings WHERE id = 1;
  cur := public.media_week(public.game_now());
  FOR sub IN SELECT * FROM public.media_subscriptions WHERE subscriber_id = _cid AND active AND paid_week < cur FOR UPDATE LOOP
    SELECT p.outlet INTO outlet FROM public.press_cards p WHERE p.character_id = sub.owner_id;
    FOR w IN sub.paid_week + 1 .. cur LOOP
      BEGIN
        ok := public.economy_cash(_cid, 'media-sub:' || sub.id || ':' || w, -s.sub_price, 'Abonnement — ' || outlet, 'loisirs');
      EXCEPTION WHEN OTHERS THEN ok := false; END;
      IF NOT ok THEN
        UPDATE public.media_subscriptions SET active = false, ended_at = public.game_now() WHERE id = sub.id;
        EXIT;
      END IF;
      PERFORM public.media_move(sub.owner_id, 'media-sub:' || sub.id || ':' || w, s.sub_price, 'subscription', 'Abonnement joueur — semaine ' || w);
      UPDATE public.media_subscriptions SET paid_week = w WHERE id = sub.id;
    END LOOP;
  END LOOP;
END $$;

-- 5. Actions du joueur -------------------------------------------------------------------------
-- Ouvrir / renommer sa chaîne (le journal existe déjà via la carte de presse)
CREATE FUNCTION public.media_channel(_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  IF char_length(btrim(coalesce(_name,''))) NOT BETWEEN 3 AND 60 THEN RAISE EXCEPTION 'Nom de la chaîne : 3 à 60 caractères.'; END IF;
  IF NOT public.press_clean(_name) THEN RAISE EXCEPTION 'Ce nom contient un mot interdit.'; END IF;
  UPDATE public.press_cards SET channel = btrim(_name) WHERE character_id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Il faut d''abord une carte de presse.'; END IF;
  INSERT INTO public.media_treasuries (owner_id) VALUES (cid) ON CONFLICT DO NOTHING;
END $$;

-- Publier un article ou une émission, avec personne citée et indicateur facultatifs
CREATE FUNCTION public.media_publish(_request_id uuid, _format text, _title text, _body text, _photo text,
  _cited uuid, _tone text, _indicator text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.media_settings; aid uuid; existed boolean; city text; d integer; got integer; BEGIN
  SELECT * INTO s FROM public.media_settings WHERE id = 1;
  IF _format NOT IN ('article','emission') THEN RAISE EXCEPTION 'Format inconnu.'; END IF;
  IF coalesce(_tone,'neutre') NOT IN ('neutre','positif','critique') THEN RAISE EXCEPTION 'Ton inconnu.'; END IF;
  IF _format = 'emission' AND (SELECT channel FROM public.press_cards WHERE character_id = cid) IS NULL THEN
    RAISE EXCEPTION 'Ouvre d''abord ta chaîne.'; END IF;
  IF _cited IS NOT NULL THEN
    IF _cited = cid THEN RAISE EXCEPTION 'Tu ne peux pas te citer toi-même.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cited) THEN RAISE EXCEPTION 'Personne citée introuvable.'; END IF;
    IF public.network_blocked(cid, _cited) THEN RAISE EXCEPTION 'Interaction impossible avec ce joueur'; END IF;
  END IF;
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  IF _indicator IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.city_indicators WHERE city_id = city AND indicator = _indicator) THEN
    RAISE EXCEPTION 'Sujet de ville inconnu.'; END IF;
  existed := EXISTS (SELECT 1 FROM public.press_articles WHERE request_id = _request_id);
  aid := public.press_publish(_request_id, _title, _body, _photo);   -- contrôles existants : carte, longueurs, filtre, 3 par jour
  IF existed THEN RETURN aid; END IF;
  UPDATE public.press_articles SET format = _format, cited_id = _cited, tone = coalesce(_tone,'neutre'), indicator = _indicator WHERE id = aid;
  INSERT INTO public.media_treasuries (owner_id) VALUES (cid) ON CONFLICT DO NOTHING;
  IF coalesce(_tone,'neutre') <> 'neutre' THEN
    d := CASE WHEN _tone = 'positif' THEN 1 ELSE -1 END;
    IF _cited IS NOT NULL THEN
      SELECT coalesce(sum(abs(e.delta)),0) INTO got FROM public.media_effects e
        WHERE e.kind = 'reputation' AND e.target = _cited::text AND e.created_at > now() - interval '7 days';
      IF got + s.mention_rep <= s.mention_week_cap THEN
        INSERT INTO public.media_effects (article_id, kind, target, delta) VALUES (aid, 'reputation', _cited::text, d * s.mention_rep);
        INSERT INTO public.social_stats (character_id, reputation, influence) VALUES (_cited, 0, 0) ON CONFLICT (character_id) DO NOTHING;
        UPDATE public.social_stats SET reputation = GREATEST(0, reputation + d * s.mention_rep) WHERE character_id = _cited;
      END IF;
    END IF;
    IF _indicator IS NOT NULL AND (SELECT count(*) FROM public.media_effects e JOIN public.press_articles a ON a.id = e.article_id
        WHERE e.kind = 'opinion' AND a.author_id = cid AND e.created_at > now() - interval '7 days') < s.opinion_week_cap THEN
      INSERT INTO public.media_effects (article_id, kind, target, delta) VALUES (aid, 'opinion', _indicator, d * s.opinion_delta);
      PERFORM public.schedule_effect('media:' || aid, 'media', aid, city, public.game_now(), 'indicator',
        'Effet d''un média : ' || left(btrim(_title), 80), _indicator, d * s.opinion_delta);
    END IF;
  END IF;
  RETURN aid;
END $$;

-- S'abonner (première semaine payée tout de suite) / se désabonner
CREATE FUNCTION public.media_subscribe(_owner uuid, _on boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.media_settings; sid uuid; cur integer; outlet text; BEGIN
  SELECT * INTO s FROM public.media_settings WHERE id = 1;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT _on THEN
    UPDATE public.media_subscriptions SET active = false, ended_at = public.game_now() WHERE subscriber_id = cid AND owner_id = _owner AND active;
    RETURN;
  END IF;
  IF _owner = cid THEN RAISE EXCEPTION 'Tu ne peux pas t''abonner à ton propre média.'; END IF;
  SELECT p.outlet INTO outlet FROM public.press_cards p WHERE p.character_id = _owner;
  IF outlet IS NULL THEN RAISE EXCEPTION 'Média introuvable.'; END IF;
  IF public.network_blocked(cid, _owner) THEN RAISE EXCEPTION 'Interaction impossible avec ce joueur'; END IF;
  IF EXISTS (SELECT 1 FROM public.media_subscriptions WHERE subscriber_id = cid AND owner_id = _owner AND active) THEN RETURN; END IF;
  cur := public.media_week(public.game_now());
  INSERT INTO public.media_subscriptions (subscriber_id, owner_id, paid_week) VALUES (cid, _owner, cur) RETURNING id INTO sid;
  PERFORM public.economy_cash(cid, 'media-sub:' || sid || ':' || cur, -s.sub_price, 'Abonnement — ' || outlet, 'loisirs');
  PERFORM public.media_move(_owner, 'media-sub:' || sid || ':' || cur, s.sub_price, 'subscription', 'Nouvel abonné joueur');
END $$;

-- Signaler un contenu (une fois par joueur ; au seuil, le contenu est masqué)
CREATE FUNCTION public.media_report(_article uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.media_settings; a public.press_articles; BEGIN
  SELECT * INTO s FROM public.media_settings WHERE id = 1;
  SELECT * INTO a FROM public.press_articles WHERE id = _article AND status = 'published' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contenu introuvable.'; END IF;
  IF a.author_id = cid THEN RAISE EXCEPTION 'Tu ne peux pas signaler ton propre contenu.'; END IF;
  INSERT INTO public.media_reports (article_id, reporter_id) VALUES (_article, cid) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.press_articles SET reports = reports + 1,
    status = CASE WHEN reports + 1 >= s.report_hide THEN 'hidden' ELSE status END WHERE id = _article;
END $$;

-- Se verser une rémunération depuis la caisse du média (plafond par semaine)
CREATE FUNCTION public.media_owner_pay(_amount integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.media_settings; cur integer; key text; BEGIN
  SELECT * INTO s FROM public.media_settings WHERE id = 1;
  IF _amount IS NULL OR _amount < 1 OR _amount > s.owner_pay_max THEN RAISE EXCEPTION 'Montant : 1 à % €.', s.owner_pay_max; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  PERFORM public.media_settle_owner(cid);
  cur := public.media_week(public.game_now());
  key := 'media-pay:' || cid || ':' || cur;
  IF EXISTS (SELECT 1 FROM public.media_ledger WHERE operation_key = key) THEN RAISE EXCEPTION 'Rémunération déjà versée cette semaine.'; END IF;
  IF NOT public.media_move(cid, key, -_amount, 'owner_pay', 'Rémunération du propriétaire') THEN RAISE EXCEPTION 'Caisse du média insuffisante.'; END IF;
  PERFORM public.economy_cash(cid, key, _amount, 'Rémunération de mon média', 'salaire');
END $$;

-- 6. Lecture --------------------------------------------------------------------------------------
CREATE FUNCTION public.media_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.media_settings; card public.press_cards; city text; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO s FROM public.media_settings WHERE id = 1;
  PERFORM public.media_settle_subscriber(cid);
  SELECT * INTO card FROM public.press_cards WHERE character_id = cid;
  IF FOUND THEN PERFORM public.media_settle_owner(cid); END IF;
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  RETURN jsonb_build_object(
    'settings', jsonb_build_object('sub_price', s.sub_price, 'owner_pay_max', s.owner_pay_max, 'report_hide', s.report_hide,
      'npc_per_item', s.npc_per_item, 'npc_cents', s.npc_cents, 'mention_week_cap', s.mention_week_cap, 'opinion_week_cap', s.opinion_week_cap),
    'indicators', COALESCE((SELECT jsonb_agg(indicator ORDER BY indicator) FROM public.city_indicators WHERE city_id = city), '[]'::jsonb),
    'mine', CASE WHEN card.character_id IS NULL THEN NULL ELSE jsonb_build_object(
      'outlet', card.outlet, 'channel', card.channel,
      'balance', COALESCE((SELECT balance FROM public.media_treasuries WHERE owner_id = cid), 0),
      'subscribers', (SELECT count(*) FROM public.media_subscriptions WHERE owner_id = cid AND active),
      'paid_this_week', EXISTS (SELECT 1 FROM public.media_ledger WHERE operation_key = 'media-pay:' || cid || ':' || public.media_week(public.game_now())),
      'weeks', COALESCE((SELECT jsonb_agg(jsonb_build_object('week', week, 'readers', readers, 'revenue', revenue) ORDER BY week DESC)
        FROM (SELECT * FROM public.media_weeks WHERE owner_id = cid ORDER BY week DESC LIMIT 6) w), '[]'::jsonb),
      'ledger', COALESCE((SELECT jsonb_agg(jsonb_build_object('kind', kind, 'amount', amount, 'label', label, 'at', created_at) ORDER BY created_at DESC)
        FROM (SELECT * FROM public.media_ledger WHERE owner_id = cid ORDER BY created_at DESC LIMIT 10) l), '[]'::jsonb)) END,
    'outlets', COALESCE((SELECT jsonb_agg(jsonb_build_object('owner_id', p.character_id, 'outlet', p.outlet, 'channel', p.channel,
        'author', c.first_name || ' ' || c.last_name, 'portrait', p.portrait,
        'subscribers', (SELECT count(*) FROM public.media_subscriptions m WHERE m.owner_id = p.character_id AND m.active),
        'subscribed', EXISTS (SELECT 1 FROM public.media_subscriptions m WHERE m.owner_id = p.character_id AND m.subscriber_id = cid AND m.active),
        'items', (SELECT count(*) FROM public.press_articles a WHERE a.author_id = p.character_id AND a.status = 'published'),
        'mine', p.character_id = cid) ORDER BY p.created_at DESC)
      FROM public.press_cards p JOIN public.characters c ON c.id = p.character_id
      WHERE NOT public.network_blocked(cid, p.character_id)), '[]'::jsonb),
    'feed', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'published_at' DESC) FROM (
      SELECT jsonb_build_object('id', a.id, 'format', a.format, 'title', a.title, 'body', a.body, 'photo', a.photo, 'published_at', a.published_at,
        'city', (SELECT name FROM public.cities WHERE id = a.city_id), 'author_id', a.author_id,
        'author', c.first_name || ' ' || c.last_name, 'outlet', CASE WHEN a.format = 'emission' THEN COALESCE(p.channel, p.outlet) ELSE p.outlet END,
        'portrait', p.portrait, 'tone', a.tone, 'indicator', a.indicator,
        'cited', (SELECT q.first_name || ' ' || q.last_name FROM public.characters q WHERE q.id = a.cited_id),
        'mine', a.author_id = cid,
        'reported', EXISTS (SELECT 1 FROM public.media_reports r WHERE r.article_id = a.id AND r.reporter_id = cid)) AS x
      FROM public.press_articles a JOIN public.press_cards p ON p.character_id = a.author_id JOIN public.characters c ON c.id = a.author_id
      WHERE a.status = 'published' AND NOT public.network_blocked(cid, a.author_id)
      ORDER BY a.published_at DESC LIMIT 40) t), '[]'::jsonb),
    'subscriptions', COALESCE((SELECT jsonb_agg(jsonb_build_object('owner_id', m.owner_id, 'outlet', p.outlet))
      FROM public.media_subscriptions m JOIN public.press_cards p ON p.character_id = m.owner_id WHERE m.subscriber_id = cid AND m.active), '[]'::jsonb),
    'people', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.first_name || ' ' || c.last_name) ORDER BY c.last_name)
      FROM (SELECT * FROM public.characters WHERE city_id = city AND id <> cid AND NOT public.network_blocked(cid, id) ORDER BY last_name LIMIT 60) c), '[]'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.media_move(uuid,text,integer,text,text), public.media_settle_owner(uuid), public.media_settle_subscriber(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.media_channel(text), public.media_publish(uuid,text,text,text,text,uuid,text,text),
  public.media_subscribe(uuid,boolean), public.media_report(uuid), public.media_owner_pay(integer), public.media_state() TO authenticated;

-- 7. Contrôles d'intégrité --------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT count(*) FROM public.media_settings) <> 1 THEN RAISE EXCEPTION 'media_settings incomplet'; END IF;
  IF EXISTS (SELECT 1 FROM public.press_articles WHERE format <> 'article' OR tone <> 'neutre' OR reports <> 0) THEN
    RAISE EXCEPTION 'articles existants modifiés'; END IF;
  IF (SELECT count(*) FROM pg_proc WHERE proname LIKE 'media\_%' AND pronamespace = 'public'::regnamespace) <> 10 THEN
    RAISE EXCEPTION 'fonctions media incomplètes'; END IF;
END $$;

COMMIT;
