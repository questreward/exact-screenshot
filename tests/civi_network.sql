-- Rules validated by Alex: 10 posts/day, 3 reports hide a post, buzz capped at +5 influence/week.
\ir tools/civi_network_fixture.sql
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean,m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%',m; END IF; END $$;
CREATE FUNCTION pg_temp.refuse(q text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'UNEXPECTED SUCCESS'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='UNEXPECTED SUCCESS' THEN RAISE; END IF; END $$;
CREATE FUNCTION pg_temp.as_user(i int) RETURNS void LANGUAGE sql AS $$ SELECT set_config('test.uid','00000000-0000-0000-0000-0000000001'||lpad(i::text,2,'0'),true) $$;
-- 10 publications par jour, la 11e est refusée ; même requête rejouée = même publication
SELECT pg_temp.as_user(1);
SELECT public.civi_publish('post '||i,NULL,NULL,('00000000-0000-0000-0000-0000000010'||lpad(i::text,2,'0'))::uuid) FROM generate_series(1,10) i;
SELECT pg_temp.ok(public.civi_publish('post 1',NULL,NULL,'00000000-0000-0000-0000-000000001001')=(SELECT id FROM public.social_posts WHERE body='post 1'),'Requête rejouée sans doublon');
SELECT pg_temp.refuse($$SELECT public.civi_publish('onze',NULL,NULL,gen_random_uuid())$$);
SELECT pg_temp.refuse($$SELECT public.civi_publish(repeat('x',281),NULL,NULL,gen_random_uuid())$$);
SELECT pg_temp.ok((public.civi_feed()->>'posts_today')::int=10,'Compteur du jour');
-- 3 signalements masquent la publication, 2 ne suffisent pas
CREATE TEMP TABLE target AS SELECT id FROM public.social_posts WHERE body='post 2';
SELECT pg_temp.as_user(2); SELECT public.civi_action('report',(SELECT id FROM target),_reason:='spam');
SELECT pg_temp.as_user(3); SELECT public.civi_action('report',(SELECT id FROM target),_reason:='spam');
SELECT pg_temp.ok((SELECT moderation FROM public.social_posts WHERE id=(SELECT id FROM target))='visible','Deux signalements : visible');
SELECT pg_temp.as_user(4); SELECT public.civi_action('report',(SELECT id FROM target),_reason:='insulte');
SELECT pg_temp.ok((SELECT moderation FROM public.social_posts WHERE id=(SELECT id FROM target))='masquee','Trois signalements : masquée');
SELECT pg_temp.refuse($$SELECT public.civi_moderate((SELECT id FROM target),'retablir')$$);
INSERT INTO public.civi_moderators VALUES ('00000000-0000-0000-0000-000000000104');
SELECT public.civi_moderate((SELECT id FROM target),'retablir');
SELECT pg_temp.ok((SELECT moderation FROM public.social_posts WHERE id=(SELECT id FROM target))='visible','Modérateur rétablit');
-- Buzz : 10 J'aime d'autres joueurs = +1 ; plafond +5 par semaine, jamais deux fois la même publication
DO $$ DECLARE p record; u int; BEGIN
 FOR p IN SELECT id FROM public.social_posts WHERE character_id='00000000-0000-0000-0000-000000000001' LOOP
  FOR u IN 2..11 LOOP INSERT INTO public.social_post_reactions VALUES (p.id,('00000000-0000-0000-0000-0000000000'||lpad(u::text,2,'0'))::uuid,'like'); END LOOP;
 END LOOP; END $$;
SELECT pg_temp.as_user(1); SELECT public.civi_feed(); SELECT public.civi_feed();
SELECT pg_temp.ok((SELECT influence FROM public.social_stats WHERE character_id='00000000-0000-0000-0000-000000000001')=5,'Buzz plafonné à +5 par semaine');
UPDATE public.fake_clock SET t=t+interval '7 days'; SELECT public.civi_feed();
SELECT pg_temp.ok((SELECT influence FROM public.social_stats WHERE character_id='00000000-0000-0000-0000-000000000001')=10,'Semaine suivante : 5 autres publications');
SELECT public.civi_feed();
SELECT pg_temp.ok((SELECT count(*) FROM public.civi_buzz)=10,'Chaque publication récompensée une seule fois');
-- Blocage : plus de publication visible, plus d'abonnement possible
SELECT pg_temp.as_user(2); SELECT public.civi_action('follow',_target:='00000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(jsonb_array_length(public.civi_feed('abonnements')->'posts')>0,'Abonnement visible');
SELECT public.civi_action('block',_target:='00000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(jsonb_array_length(public.civi_feed('abonnements')->'posts')=0,'Bloqué : publications cachées');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM public.player_follows WHERE follower_id='00000000-0000-0000-0000-000000000002'),'Blocage retire l''abonnement');
SELECT pg_temp.as_user(1); SELECT pg_temp.refuse($$SELECT public.civi_profile('00000000-0000-0000-0000-000000000002')$$);
-- Republier : pas sa propre publication
SELECT pg_temp.refuse($$SELECT public.civi_publish('',NULL,(SELECT id FROM target),gen_random_uuid())$$);
SELECT 'CIVI TESTS OK';
ROLLBACK;
