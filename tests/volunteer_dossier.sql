-- Isolated fixture only; after 0093 and 0114.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean,m text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION '%',m; END IF; END $$;
CREATE FUNCTION pg_temp.refuse(q text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE q; RAISE EXCEPTION 'UNEXPECTED SUCCESS'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='UNEXPECTED SUCCESS' THEN RAISE; END IF; END $$;
SET LOCAL test.uid='00000000-0000-0000-0000-000000000001';
SELECT public.security_apply('protection_civile','libre','{}',gen_random_uuid());
SELECT public.volunteer_attach('paris','00000000-0000-0000-0000-000000001001');
SELECT public.volunteer_attach('paris','00000000-0000-0000-0000-000000001001');
SELECT pg_temp.ok((SELECT count(*)=1 FROM public.volunteer_attachments),'Rattachement exactement une fois');
SELECT public.volunteer_attach('lyon',gen_random_uuid());
SELECT public.security_quit();
SELECT pg_temp.ok(jsonb_array_length(public.volunteer_dossier_state()->'attachments')=2,'Historique conservé au départ');
SELECT pg_temp.refuse($$SELECT public.volunteer_attach('paris',gen_random_uuid())$$);
INSERT INTO public.security_shifts(id,character_id,request_id,service,starts_at,ends_at,hours,mission_id,settled)
VALUES ('00000000-0000-0000-0000-000000002001','00000000-0000-0000-0000-0000000000c1',gen_random_uuid(),'protection_civile',public.game_now(),public.game_now(),4,'pc-poste',false),
('00000000-0000-0000-0000-000000002002','00000000-0000-0000-0000-0000000000c1',gen_random_uuid(),'police',public.game_now(),public.game_now(),4,'pol-patrouille',true);
SELECT pg_temp.refuse($$SELECT public.volunteer_save_note('00000000-0000-0000-0000-000000002001','Test')$$);
SELECT pg_temp.refuse($$SELECT public.volunteer_save_note('00000000-0000-0000-0000-000000002002','Test')$$);
UPDATE public.security_shifts SET settled=true WHERE id='00000000-0000-0000-0000-000000002001';
SELECT public.volunteer_save_note('00000000-0000-0000-0000-000000002001','Observation personnelle');
SELECT public.volunteer_save_note('00000000-0000-0000-0000-000000002001','Observation personnelle');
SELECT pg_temp.ok((SELECT count(*)=1 FROM public.volunteer_notes),'Note exactement une fois');
SELECT pg_temp.refuse($$SELECT public.volunteer_save_note('00000000-0000-0000-0000-000000002001','Autre texte')$$);
SET LOCAL test.uid='00000000-0000-0000-0000-000000000002';
SELECT pg_temp.refuse($$SELECT public.volunteer_save_note('00000000-0000-0000-0000-000000002001','Intrusion')$$);
SELECT pg_temp.ok(jsonb_array_length(public.volunteer_dossier_state()->'notes')=0,'Notes privées dans RPC');
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON public.characters,public.fake_clock TO authenticated;
SET LOCAL ROLE authenticated;
SELECT pg_temp.ok((SELECT count(*)=0 FROM public.volunteer_notes),'Notes privées RLS');
SELECT pg_temp.ok((SELECT count(*)=0 FROM public.volunteer_attachments),'Historique privé RLS');
RESET ROLE;
SELECT pg_temp.ok((SELECT count(*)=2 FROM public.volunteer_branches),'Une antenne par ville');
SELECT pg_temp.ok((SELECT count(*)=0 FROM public.cash),'Aucun paiement supplémentaire');
ROLLBACK;
