DO $$ DECLARE def text; BEGIN
SELECT pg_get_functiondef('public.settle_daily_life(uuid)'::regprocedure) INTO def;
def:=replace(def,'IF a.reward>0 THEN UPDATE public.accounts SET balance=balance+a.reward WHERE character_id=c.id; INSERT INTO public.transactions(account_id,amount,label) SELECT id,a.reward,''Salaire — ''||a.title FROM public.accounts WHERE character_id=c.id; END IF;','IF a.reward>0 THEN PERFORM public.economy_cash(c.id,''salary:''||a.id,a.reward,''Salaire — ''||a.title,''salaire''); END IF;');
def:=replace(def,'FOR app IN SELECT','SELECT * INTO c FROM public.characters WHERE id=_character_id; FOR app IN SELECT'); EXECUTE def;
SELECT pg_get_functiondef('public.personal_economy_action(text,uuid,jsonb)'::regprocedure) INTO def;
def:=replace(def,'IF _input->>''kind'' NOT IN','IF _input->>''kind'' IS NULL OR _input->>''metric'' IS NULL OR _input->>''kind'' NOT IN');
EXECUTE def;
END $$;
CREATE FUNCTION public.guard_economy_activity_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.type='economy' AND (NEW.status<>'running' OR NEW.economy_payload->>'action' NOT IN('training','move','travel') OR NEW.economy_payload->>'action' IS NULL) THEN RAISE EXCEPTION 'Activité personnelle invalide'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.guard_economy_activity_insert() FROM PUBLIC;
CREATE TRIGGER economy_insert_guard BEFORE INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.guard_economy_activity_insert();