-- 0118 — Civi devient un vrai réseau social.
-- Ajouts uniquement : 3 colonnes sur social_posts, 4 tables (réglages, commentaires, signalements, buzz),
-- 1 table de modérateurs (sans accès joueur), fonctions civi_publish / civi_feed / civi_detail /
-- civi_profile / civi_action / civi_moderate. Abonnements et blocages réutilisent player_follows
-- et player_blocks (déjà protégés par guard_player_block). Aucune règle existante modifiée.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.civi_settings') IS NOT NULL THEN RAISE EXCEPTION '0118 déjà installée : ne pas relancer'; END IF;
 IF to_regclass('public.social_posts') IS NULL OR to_regclass('public.player_follows') IS NULL OR to_regclass('public.player_blocks') IS NULL
 OR to_regprocedure('public.network_blocked(uuid,uuid)') IS NULL OR to_regprocedure('public.social_actor()') IS NULL
 THEN RAISE EXCEPTION 'Prérequis Civi (0040) et réseau joueurs (0053/0054) requis'; END IF;
END $$;

ALTER TABLE public.social_posts
 ADD COLUMN repost_of uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
 ADD COLUMN photo text CHECK (photo IS NULL OR photo IN ('ville','place','transport','culture','politique','societe')),
 ADD COLUMN moderation text NOT NULL DEFAULT 'visible' CHECK (moderation IN ('visible','masquee','supprimee'));
CREATE INDEX social_posts_visible_idx ON public.social_posts (posted_at DESC) WHERE moderation = 'visible';

CREATE TABLE public.civi_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 posts_per_day integer NOT NULL DEFAULT 10 CHECK (posts_per_day > 0),
 report_threshold integer NOT NULL DEFAULT 3 CHECK (report_threshold > 0),
 buzz_likes integer NOT NULL DEFAULT 10 CHECK (buzz_likes > 0),
 buzz_week_cap integer NOT NULL DEFAULT 5 CHECK (buzz_week_cap >= 0),
 body_limit integer NOT NULL DEFAULT 280 CHECK (body_limit BETWEEN 1 AND 1000)
);
INSERT INTO public.civi_settings DEFAULT VALUES;

CREATE TABLE public.civi_comments (
 id uuid PRIMARY KEY, post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
 body text NOT NULL, created_at timestamptz NOT NULL DEFAULT public.game_now(), removed boolean NOT NULL DEFAULT false
);
CREATE INDEX civi_comments_post_idx ON public.civi_comments (post_id, created_at);

CREATE TABLE public.civi_reports (
 post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE,
 reporter uuid REFERENCES public.characters(id) ON DELETE CASCADE,
 reason text NOT NULL CHECK (reason IN ('insulte','haine','spam','fausse_info','autre')),
 created_at timestamptz NOT NULL DEFAULT public.game_now(), reviewed boolean NOT NULL DEFAULT false,
 PRIMARY KEY (post_id, reporter)
);

-- Une ligne par publication récompensée (jamais deux fois), plafond hebdomadaire par auteur.
CREATE TABLE public.civi_buzz (
 post_id uuid PRIMARY KEY REFERENCES public.social_posts(id) ON DELETE CASCADE,
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
 week date NOT NULL, created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE INDEX civi_buzz_week_idx ON public.civi_buzz (character_id, week);

CREATE TABLE public.civi_moderators (user_id uuid PRIMARY KEY);

GRANT SELECT ON public.civi_settings TO authenticated;
GRANT ALL ON public.civi_settings, public.civi_comments, public.civi_reports, public.civi_buzz, public.civi_moderators TO service_role;
REVOKE ALL ON public.civi_comments, public.civi_reports, public.civi_buzz, public.civi_moderators FROM PUBLIC, anon, authenticated;
ALTER TABLE public.civi_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civi_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civi_buzz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civi_moderators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read civi settings" ON public.civi_settings FOR SELECT TO authenticated USING (true);

-- Interne : ville actuelle du personnage.
CREATE FUNCTION public.civi_city(_cid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce((SELECT p.city_id FROM public.character_positions p WHERE p.character_id=_cid), (SELECT c.city_id FROM public.characters c WHERE c.id=_cid)) $$;

-- Interne : gains de buzz de l'auteur, réglés à SA lecture (ne verrouille que lui-même).
CREATE FUNCTION public.civi_settle_buzz(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.civi_settings; wk date := date_trunc('week', public.game_now())::date; used integer; r record; BEGIN
 SELECT * INTO s FROM public.civi_settings WHERE id;
 SELECT count(*) INTO used FROM public.civi_buzz WHERE character_id=_cid AND week=wk;
 FOR r IN SELECT p.id FROM public.social_posts p
   WHERE p.character_id=_cid AND p.moderation='visible' AND p.repost_of IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.civi_buzz b WHERE b.post_id=p.id)
     AND (SELECT count(*) FROM public.social_post_reactions x WHERE x.post_id=p.id AND x.kind='like' AND x.character_id<>_cid) >= s.buzz_likes
   ORDER BY p.posted_at LOOP
  EXIT WHEN used >= s.buzz_week_cap;
  INSERT INTO public.civi_buzz(post_id,character_id,week) VALUES (r.id,_cid,wk) ON CONFLICT DO NOTHING;
  IF FOUND THEN
   used := used + 1;
   INSERT INTO public.social_stats(character_id) VALUES (_cid) ON CONFLICT DO NOTHING;
   UPDATE public.social_stats SET influence=influence+1, reputation=reputation+1 WHERE character_id=_cid;
  END IF;
 END LOOP;
END $$;

-- Interne : une publication formatée pour le lecteur.
CREATE FUNCTION public.civi_post_json(_p public.social_posts, _me uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object(
  'id',_p.id,'author_kind',_p.author_kind,
  'author_label',CASE WHEN _p.character_id IS NOT NULL THEN (SELECT c.first_name||' '||c.last_name FROM public.characters c WHERE c.id=_p.character_id) ELSE _p.author_label END,
  'character_id',_p.character_id,'mine',_p.character_id=_me,'body',_p.body,'photo',_p.photo,'city_id',_p.city_id,
  'posted_at',_p.posted_at,'news_id',_p.news_id,
  'repost',CASE WHEN _p.repost_of IS NULL THEN NULL ELSE (SELECT jsonb_build_object('id',o.id,'body',o.body,'photo',o.photo,
     'author_label',CASE WHEN o.character_id IS NOT NULL THEN (SELECT c.first_name||' '||c.last_name FROM public.characters c WHERE c.id=o.character_id) ELSE o.author_label END)
     FROM public.social_posts o WHERE o.id=_p.repost_of AND o.moderation='visible') END,
  'likes',(SELECT count(*) FROM public.social_post_reactions x WHERE x.post_id=_p.id AND x.kind='like'),
  'reposts',(SELECT count(*) FROM public.social_posts r WHERE r.repost_of=_p.id AND r.moderation='visible'),
  'comments',(SELECT count(*) FROM public.civi_comments m WHERE m.post_id=_p.id AND NOT m.removed),
  'liked',EXISTS(SELECT 1 FROM public.social_post_reactions x WHERE x.post_id=_p.id AND x.kind='like' AND x.character_id=_me),
  'reposted',EXISTS(SELECT 1 FROM public.social_posts r WHERE r.repost_of=_p.id AND r.character_id=_me AND r.moderation='visible'),
  'following',CASE WHEN _p.character_id IS NULL OR _p.character_id=_me THEN NULL ELSE EXISTS(SELECT 1 FROM public.player_follows f WHERE f.follower_id=_me AND f.followed_id=_p.character_id) END,
  'badge',CASE _p.author_kind WHEN 'media' THEN 'Média' WHEN 'mairie' THEN 'Institution' WHEN 'organization' THEN 'Organisation' WHEN 'npc' THEN 'Habitant' ELSE NULL END) $$;

-- Interne : visible pour ce lecteur (modération et blocages dans les deux sens).
CREATE FUNCTION public.civi_visible(_p public.social_posts, _me uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _p.moderation='visible' AND (_p.character_id IS NULL OR _p.character_id=_me OR NOT public.network_blocked(_me,_p.character_id)) $$;

-- Fil : onglets pour_toi / abonnements / ville ; pagination par date.
CREATE FUNCTION public.civi_feed(_tab text DEFAULT 'pour_toi', _before timestamptz DEFAULT NULL, _limit integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); city text; s public.civi_settings; d date := (public.game_now() AT TIME ZONE 'UTC')::date; BEGIN
 IF _tab NOT IN ('pour_toi','abonnements','ville') THEN RAISE EXCEPTION 'Onglet inconnu'; END IF;
 city := public.civi_city(cid);
 IF to_regprocedure('public.civi_refresh(text)') IS NOT NULL THEN PERFORM public.civi_refresh(city); END IF;
 PERFORM public.civi_settle_buzz(cid);
 SELECT * INTO s FROM public.civi_settings WHERE id;
 RETURN jsonb_build_object(
  'posts', coalesce((SELECT jsonb_agg(public.civi_post_json(p,cid) ORDER BY p.posted_at DESC) FROM (
     SELECT p.* FROM public.social_posts p
     WHERE public.civi_visible(p,cid) AND p.posted_at <= public.game_now()
       AND (_before IS NULL OR p.posted_at < _before)
       AND CASE _tab
         WHEN 'ville' THEN p.city_id = city
         WHEN 'abonnements' THEN p.character_id = cid OR EXISTS(SELECT 1 FROM public.player_follows f WHERE f.follower_id=cid AND f.followed_id=p.character_id)
         ELSE p.city_id = city OR p.city_id IS NULL OR p.character_id = cid
              OR EXISTS(SELECT 1 FROM public.player_follows f WHERE f.follower_id=cid AND f.followed_id=p.character_id) END
     ORDER BY p.posted_at DESC LIMIT LEAST(GREATEST(coalesce(_limit,30),1),50)) p),'[]'::jsonb),
  'posts_today', (SELECT count(*) FROM public.social_posts WHERE character_id=cid AND source_key LIKE 'player:'||cid||':%' AND (posted_at AT TIME ZONE 'UTC')::date=d),
  'posts_per_day', s.posts_per_day, 'body_limit', s.body_limit,
  'buzz_week', (SELECT count(*) FROM public.civi_buzz WHERE character_id=cid AND week=date_trunc('week',public.game_now())::date),
  'buzz_week_cap', s.buzz_week_cap, 'buzz_likes', s.buzz_likes,
  'moderator', EXISTS(SELECT 1 FROM public.civi_moderators m WHERE m.user_id=auth.uid()));
END $$;

-- Publier un texte libre (ou republier). Rejouer la même requête renvoie la même publication.
CREATE FUNCTION public.civi_publish(_body text, _photo text, _repost uuid, _request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); s public.civi_settings; o public.social_posts; pid uuid; n integer; key text;
 d date := (public.game_now() AT TIME ZONE 'UTC')::date; b text := btrim(coalesce(_body,'')); BEGIN
 IF _request IS NULL THEN RAISE EXCEPTION 'Requête invalide'; END IF;
 key := 'player:'||cid||':req:'||_request;
 SELECT id INTO pid FROM public.social_posts WHERE source_key=key; IF pid IS NOT NULL THEN RETURN pid; END IF;
 SELECT * INTO s FROM public.civi_settings WHERE id;
 IF _repost IS NULL AND b='' THEN RAISE EXCEPTION 'Écrivez quelque chose'; END IF;
 IF char_length(b) > s.body_limit THEN RAISE EXCEPTION 'Maximum % caractères', s.body_limit; END IF;
 IF _photo IS NOT NULL AND _photo NOT IN ('ville','place','transport','culture','politique','societe') THEN RAISE EXCEPTION 'Photo inconnue'; END IF;
 SELECT count(*) INTO n FROM public.social_posts WHERE character_id=cid AND source_key LIKE 'player:'||cid||':%' AND (posted_at AT TIME ZONE 'UTC')::date=d;
 IF n >= s.posts_per_day THEN RAISE EXCEPTION 'Limite de % publications par jour atteinte', s.posts_per_day; END IF;
 IF _repost IS NOT NULL THEN
  SELECT * INTO o FROM public.social_posts WHERE id=_repost;
  IF NOT FOUND OR NOT public.civi_visible(o,cid) OR o.repost_of IS NOT NULL THEN RAISE EXCEPTION 'Publication indisponible'; END IF;
  IF o.character_id=cid THEN RAISE EXCEPTION 'Vous ne pouvez pas republier votre propre publication'; END IF;
  IF EXISTS(SELECT 1 FROM public.social_posts WHERE repost_of=_repost AND character_id=cid AND moderation='visible') THEN RAISE EXCEPTION 'Déjà republiée'; END IF;
 END IF;
 INSERT INTO public.social_posts(author_kind,author_label,character_id,city_id,body,photo,repost_of,source_key,posted_at)
 VALUES ('player','Joueur',cid,public.civi_city(cid),b,_photo,_repost,key,public.game_now()) RETURNING id INTO pid;
 RETURN pid;
END $$;

-- Détail : publication + commentaires.
CREATE FUNCTION public.civi_detail(_post uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); p public.social_posts; BEGIN
 SELECT * INTO p FROM public.social_posts WHERE id=_post;
 IF NOT FOUND OR NOT public.civi_visible(p,cid) THEN RAISE EXCEPTION 'Publication indisponible'; END IF;
 RETURN jsonb_build_object('post',public.civi_post_json(p,cid),'comments',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'id',m.id,'character_id',m.character_id,'mine',m.character_id=cid,'author_label',c.first_name||' '||c.last_name,'body',m.body,'created_at',m.created_at) ORDER BY m.created_at)
   FROM public.civi_comments m JOIN public.characters c ON c.id=m.character_id
   WHERE m.post_id=_post AND NOT m.removed AND (m.character_id=cid OR NOT public.network_blocked(cid,m.character_id))),'[]'::jsonb));
END $$;

-- Profil Civi d'un joueur (refusé en cas de blocage).
CREATE FUNCTION public.civi_profile(_character uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.characters WHERE id=_character) OR (_character<>cid AND public.network_blocked(cid,_character)) THEN RAISE EXCEPTION 'Profil indisponible'; END IF;
 RETURN jsonb_build_object(
  'character_id',_character,'mine',_character=cid,
  'name',(SELECT first_name||' '||last_name FROM public.characters WHERE id=_character),
  'city_id',public.civi_city(_character),
  'followers',(SELECT count(*) FROM public.player_follows WHERE followed_id=_character),
  'following_count',(SELECT count(*) FROM public.player_follows WHERE follower_id=_character),
  'following',EXISTS(SELECT 1 FROM public.player_follows WHERE follower_id=cid AND followed_id=_character),
  'blocked',EXISTS(SELECT 1 FROM public.player_blocks WHERE blocker_id=cid AND blocked_id=_character),
  'posts',coalesce((SELECT jsonb_agg(public.civi_post_json(p,cid) ORDER BY p.posted_at DESC) FROM (
    SELECT * FROM public.social_posts WHERE character_id=_character AND moderation='visible' ORDER BY posted_at DESC LIMIT 30) p),'[]'::jsonb));
END $$;

-- Actions : like, unlike, comment, delete_comment, report, follow, unfollow, block, unblock, delete.
CREATE FUNCTION public.civi_action(_command text, _post uuid DEFAULT NULL, _target uuid DEFAULT NULL, _body text DEFAULT NULL, _reason text DEFAULT NULL, _request uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); s public.civi_settings; p public.social_posts; b text := btrim(coalesce(_body,'')); n integer; BEGIN
 SELECT * INTO s FROM public.civi_settings WHERE id;
 IF _command IN ('like','unlike','comment','report','delete') THEN
  SELECT * INTO p FROM public.social_posts WHERE id=_post FOR UPDATE;
  IF NOT FOUND OR (_command<>'delete' AND NOT public.civi_visible(p,cid)) THEN RAISE EXCEPTION 'Publication indisponible'; END IF;
 END IF;
 IF _command='like' THEN
  INSERT INTO public.social_post_reactions(post_id,character_id,kind) VALUES (_post,cid,'like') ON CONFLICT DO NOTHING;
 ELSIF _command='unlike' THEN
  DELETE FROM public.social_post_reactions WHERE post_id=_post AND character_id=cid AND kind='like';
 ELSIF _command='comment' THEN
  IF _request IS NULL THEN RAISE EXCEPTION 'Requête invalide'; END IF;
  IF b='' OR char_length(b)>s.body_limit THEN RAISE EXCEPTION 'Commentaire de 1 à % caractères', s.body_limit; END IF;
  INSERT INTO public.civi_comments(id,post_id,character_id,body) VALUES (_request,_post,cid,b) ON CONFLICT (id) DO NOTHING;
 ELSIF _command='delete_comment' THEN
  UPDATE public.civi_comments SET removed=true WHERE id=_target AND character_id=cid;
 ELSIF _command='report' THEN
  IF p.character_id IS NULL OR p.character_id=cid THEN RAISE EXCEPTION 'Signalement impossible'; END IF;
  IF _reason NOT IN ('insulte','haine','spam','fausse_info','autre') THEN RAISE EXCEPTION 'Motif inconnu'; END IF;
  INSERT INTO public.civi_reports(post_id,reporter,reason) VALUES (_post,cid,_reason) ON CONFLICT DO NOTHING;
  SELECT count(*) INTO n FROM public.civi_reports WHERE post_id=_post AND NOT reviewed;
  IF n >= s.report_threshold THEN UPDATE public.social_posts SET moderation='masquee' WHERE id=_post AND moderation='visible'; END IF;
 ELSIF _command='delete' THEN
  IF p.character_id IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Seul l''auteur peut supprimer'; END IF;
  UPDATE public.social_posts SET moderation='supprimee' WHERE id=_post;
 ELSIF _command='follow' THEN
  IF _target IS NULL OR _target=cid OR NOT EXISTS(SELECT 1 FROM public.characters WHERE id=_target) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  INSERT INTO public.player_follows(follower_id,followed_id) VALUES (cid,_target) ON CONFLICT DO NOTHING;
 ELSIF _command='unfollow' THEN
  DELETE FROM public.player_follows WHERE follower_id=cid AND followed_id=_target;
 ELSIF _command='block' THEN
  IF _target IS NULL OR _target=cid OR NOT EXISTS(SELECT 1 FROM public.characters WHERE id=_target) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  INSERT INTO public.player_blocks(blocker_id,blocked_id) VALUES (cid,_target) ON CONFLICT DO NOTHING;
  DELETE FROM public.player_follows WHERE (follower_id=cid AND followed_id=_target) OR (follower_id=_target AND followed_id=cid);
 ELSIF _command='unblock' THEN
  DELETE FROM public.player_blocks WHERE blocker_id=cid AND blocked_id=_target;
 ELSE RAISE EXCEPTION 'Action inconnue'; END IF;
END $$;

-- Modération : réservée aux comptes de civi_moderators (ajoutés par l'administrateur sur le serveur).
CREATE FUNCTION public.civi_moderation_queue() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.civi_moderators WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Réservé à la modération'; END IF;
 RETURN coalesce((SELECT jsonb_agg(public.civi_post_json(p,cid)||jsonb_build_object('reports',(SELECT jsonb_agg(r.reason) FROM public.civi_reports r WHERE r.post_id=p.id AND NOT r.reviewed)) ORDER BY p.posted_at DESC)
   FROM public.social_posts p WHERE p.moderation='masquee'),'[]'::jsonb);
END $$;
CREATE FUNCTION public.civi_moderate(_post uuid, _decision text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.civi_moderators WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Réservé à la modération'; END IF;
 IF _decision NOT IN ('retablir','supprimer') THEN RAISE EXCEPTION 'Décision inconnue'; END IF;
 UPDATE public.social_posts SET moderation=CASE _decision WHEN 'retablir' THEN 'visible' ELSE 'supprimee' END WHERE id=_post AND moderation='masquee';
 IF NOT FOUND THEN RAISE EXCEPTION 'Rien à modérer'; END IF;
 UPDATE public.civi_reports SET reviewed=true WHERE post_id=_post;
END $$;

REVOKE ALL ON FUNCTION public.civi_city(uuid), public.civi_settle_buzz(uuid), public.civi_post_json(public.social_posts,uuid), public.civi_visible(public.social_posts,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.civi_feed(text,timestamptz,integer), public.civi_publish(text,text,uuid,uuid), public.civi_detail(uuid), public.civi_profile(uuid),
 public.civi_action(text,uuid,uuid,text,text,uuid), public.civi_moderation_queue(), public.civi_moderate(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.civi_feed(text,timestamptz,integer), public.civi_publish(text,text,uuid,uuid), public.civi_detail(uuid), public.civi_profile(uuid),
 public.civi_action(text,uuid,uuid,text,text,uuid), public.civi_moderation_queue(), public.civi_moderate(uuid,text) TO authenticated;

DO $$ BEGIN
 IF (SELECT posts_per_day FROM public.civi_settings)<>10 OR (SELECT report_threshold FROM public.civi_settings)<>3 OR (SELECT buzz_week_cap FROM public.civi_settings)<>5
 THEN RAISE EXCEPTION 'Contrôle : réglages Civi inattendus'; END IF;
END $$;
COMMIT;
