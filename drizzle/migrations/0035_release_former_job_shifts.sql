CREATE OR REPLACE FUNCTION public.release_former_job_shifts()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ BEGIN
  UPDATE public.activities
     SET source_key = source_key || ':ancien-emploi:' || id
   WHERE character_id = OLD.character_id
     AND type = 'work' AND status = 'cancelled'
     AND source_key LIKE 'work:%' AND source_key NOT LIKE '%:ancien-emploi:%'
     AND start_time > public.game_now();
  RETURN OLD;
END $function$;

REVOKE ALL ON FUNCTION public.release_former_job_shifts() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER release_former_job_shifts
AFTER DELETE ON public.employments
FOR EACH ROW EXECUTE FUNCTION public.release_former_job_shifts();