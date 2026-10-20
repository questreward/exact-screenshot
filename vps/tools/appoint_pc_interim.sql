-- Usage administrateur uniquement : psql -X -v ON_ERROR_STOP=1 -v email='compte@example.fr' -f appoint_pc_interim.sql
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('cp.admin_email', :'email', true);
DO $$ DECLARE cid uuid; BEGIN
 PERFORM 1 FROM public.cp_settings WHERE id FOR UPDATE;
 IF public.game_now()>=(SELECT min(closes_at) FROM public.cp_elections) THEN RAISE EXCEPTION 'La première élection est terminée'; END IF;
 SELECT c.id INTO cid FROM public.characters c JOIN auth.users u ON u.id=c.user_id WHERE lower(u.email)=lower(current_setting('cp.admin_email'));
 IF cid IS NULL THEN RAISE EXCEPTION 'Aucun personnage pour ce compte'; END IF;
 IF NOT public.cp_volunteer(cid) THEN RAISE EXCEPTION 'Le personnage doit être bénévole Protection civile en service'; END IF;
 IF EXISTS(SELECT 1 FROM public.cp_office WHERE interim IS NOT NULL AND interim<>cid) THEN RAISE EXCEPTION 'Un autre intérim est déjà nommé'; END IF;
 UPDATE public.cp_office SET interim=cid WHERE id;
END $$;
COMMIT;
