CREATE UNIQUE INDEX IF NOT EXISTS job_applications_one_pending_per_job
  ON public.job_applications (character_id, job_id) WHERE status = 'pending';

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_character_id_job_id_key;

CREATE OR REPLACE FUNCTION public.apply_job(_job_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE cid uuid; c public.characters; j public.jobs; BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF c.path_id NOT IN ('young_worker','early_career') AND COALESCE(c.progression->>'career_active','false') <> 'true' THEN
    RAISE EXCEPTION 'Réservé aux parcours professionnels'; END IF;
  IF EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid) THEN
    RAISE EXCEPTION 'Vous avez déjà un emploi'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = _job_id AND city_id = c.city_id AND location_id IS NOT NULL;
  IF NOT FOUND OR c.age < j.min_age THEN RAISE EXCEPTION 'Offre inaccessible'; END IF;
  IF EXISTS (SELECT 1 FROM public.job_applications WHERE character_id = cid AND job_id = j.id AND status = 'pending') THEN
    RAISE EXCEPTION 'Candidature déjà en cours pour cette offre'; END IF;
  INSERT INTO public.job_applications (character_id, job_id, applied_at, response_at)
  VALUES (cid, j.id, public.game_now(), public.game_now() + (SELECT response_minutes FROM public.life_settings WHERE id = 1) * interval '1 minute');
END $function$;