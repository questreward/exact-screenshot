-- Run on the isolated fixture after aging_fixture + 0100.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%', m; END IF; END $$;
SET LOCAL test.uid = '00000000-0000-0000-0000-000000000001';
SELECT pg_temp.ok((SELECT base_age FROM public.character_aging) = 20, 'existing character anchored');
SELECT pg_temp.ok((public.aging_state()->>'age')::int = 20, 'no aging right after install');
-- 2 mois et demi réels écoulés -> +2 ans, deux anniversaires, une seule fois
UPDATE public.character_aging SET anchor_at = now() - interval '2 months 15 days';
SELECT pg_temp.ok((public.aging_state()->>'age')::int = 22, '1 year per real month');
SELECT public.aging_state();
SELECT pg_temp.ok((SELECT age FROM public.characters) = 22 AND (SELECT count(*) FROM public.birthday_log) = 2, 'idempotent');
-- Jamais de retour en arrière
UPDATE public.character_aging SET anchor_at = now();
SELECT pg_temp.ok((public.aging_state()->>'age')::int = 22, 'never younger');
-- Plafond
UPDATE public.character_aging SET anchor_at = now() - interval '200 months';
SELECT pg_temp.ok((public.aging_state()->>'age')::int = 99, 'max age');
-- Nouveau personnage : point de départ créé automatiquement
INSERT INTO public.characters (id, user_id, age) VALUES ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000002', 17);
SELECT pg_temp.ok((SELECT base_age FROM public.character_aging WHERE character_id = '00000000-0000-0000-0000-0000000000c2') = 17, 'new character anchored');
ROLLBACK;
SELECT 'aging OK';
