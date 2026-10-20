-- Run only on the isolated world_scenes_fixture database after 0088.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF; END $$;
INSERT INTO public.events
SELECT ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid, 'Fixture ' || i,
  'Élections', 65, NULL, CASE WHEN i = 7 THEN public.game_now() + interval '1 day' ELSE public.game_now() END, 'local',
  CASE WHEN i = 4 THEN 'cancelled' ELSE 'published' END,
  CASE WHEN i = 2 THEN '00000000-0000-0000-0000-000000000002'::uuid ELSE NULL END,
  CASE WHEN i = 3 THEN 'organization' WHEN i = 8 THEN 'location' WHEN i = 9 THEN 'participation' ELSE 'city' END
FROM generate_series(1,9) i;
INSERT INTO public.news SELECT id, id, CASE WHEN title = 'Fixture 5' THEN 'draft' ELSE 'published' END,
  CASE WHEN title = 'Fixture 6' THEN public.game_now() + interval '1 day' ELSE public.game_now() END FROM public.events;
INSERT INTO public.tv_segments SELECT id, id, 'news' FROM public.news;
SELECT pg_temp.assert_true(public.tv_state(NULL) = '{"legacy":true}'::jsonb, 'legacy function unchanged');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.events) = 9, 'no event changed');
SELECT pg_temp.assert_true(public.scene_importance_level(0) = 1, 'level 1');
SELECT pg_temp.assert_true(public.scene_importance_level(25) = 2, 'level 2');
SELECT pg_temp.assert_true(public.scene_importance_level(50) = 3, 'level 3');
SELECT pg_temp.assert_true(public.scene_importance_level(65) = 4, 'level 4');
SELECT pg_temp.assert_true(public.scene_importance_level(85) = 5, 'level 5');
SELECT pg_temp.assert_true((public.tv_scenes_state(ARRAY(SELECT id FROM public.tv_segments)) -> '00000000-0000-0000-0000-000000000001' ->> 'importance')::integer = 65, 'importance preserved');
SELECT pg_temp.assert_true(jsonb_object_length = 1, 'personal, restricted, cancelled, draft and future excluded')
FROM (SELECT count(*) jsonb_object_length FROM jsonb_object_keys(public.tv_scenes_state(ARRAY(SELECT id FROM public.tv_segments)))) x;
SELECT pg_temp.assert_true(public.tv_scenes_state('{}'::uuid[]) = '{}'::jsonb, 'empty edition safe');
SELECT pg_temp.assert_true(NOT has_function_privilege('anon','public.tv_scenes_state(uuid[])','EXECUTE'), 'anon forbidden');
SELECT pg_temp.assert_true(has_function_privilege('authenticated','public.tv_scenes_state(uuid[])','EXECUTE'), 'player projection accessible');
UPDATE public.tv_segments SET kind = 'interview';
SELECT pg_temp.assert_true(public.tv_scenes_state(ARRAY(SELECT id FROM public.tv_segments)) = '{}'::jsonb, 'never fabricate interview event');
DO $$ BEGIN
  BEGIN
    PERFORM public.tv_scenes_state(array_fill('00000000-0000-0000-0000-000000000001'::uuid, ARRAY[101]));
    RAISE EXCEPTION 'limit did not reject';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Trop de sujets' THEN RAISE; END IF; END;
END $$;
SET LOCAL test.actor = 'signed-out';
DO $$ BEGIN
  BEGIN PERFORM public.tv_scenes_state('{}'::uuid[]); RAISE EXCEPTION 'anonymous actor accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Personnage requis' THEN RAISE; END IF; END;
END $$;
ROLLBACK;