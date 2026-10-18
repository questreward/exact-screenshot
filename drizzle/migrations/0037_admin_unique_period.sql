CREATE FUNCTION public.admin_unique_period()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN
  IF NEW.type_id <> 'tax_declaration' THEN
    NEW.period := NEW.period || ':' || left(replace(NEW.id::text, '-', ''), 8);
  END IF;
  RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public.admin_unique_period() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER admin_unique_period
BEFORE INSERT ON public.administrative_procedures
FOR EACH ROW EXECUTE FUNCTION public.admin_unique_period();