CREATE FUNCTION public.pay_housing_attempt()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  cid uuid;
  h public.character_housing;
  acc public.accounts;
  cost integer;
  d date := (public.game_now() AT TIME ZONE 'UTC')::date;
  base_key text := 'rent:' || d;
  retry_key text := 'rent:' || d || ':retry';
  payment_key text;
  previous_failure boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non connecté';
  END IF;
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  SELECT * INTO h FROM public.character_housing WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Logement introuvable'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.economy_operations WHERE character_id = cid AND operation_key = base_key AND status = 'failed') INTO previous_failure;
  IF EXISTS (SELECT 1 FROM public.economy_operations WHERE character_id = cid AND operation_key IN (base_key, retry_key) AND status = 'done')
    OR EXISTS (SELECT 1 FROM public.transactions WHERE account_id = acc.id AND operation_key IN (base_key, retry_key))
    OR (h.last_paid_date = d AND NOT previous_failure) THEN
    RETURN jsonb_build_object('status', 'already_paid', 'rent_date', d);
  END IF;
  SELECT daily_cost INTO cost FROM public.housing_types WHERE id = h.type_id;
  IF cost IS NULL OR cost < 0 THEN RAISE EXCEPTION 'Coût du logement invalide'; END IF;
  IF acc.balance < cost THEN
    INSERT INTO public.economy_operations (character_id, operation_key, kind, amount, status, payload)
    VALUES (cid, base_key, 'logement', -cost, 'failed', jsonb_build_object('rent_date', d, 'reason', 'insufficient_funds'))
    ON CONFLICT (character_id, operation_key) DO NOTHING;
    RETURN jsonb_build_object('status', 'insufficient_funds', 'rent_date', d, 'amount', cost);
  END IF;
  payment_key := CASE WHEN previous_failure THEN retry_key ELSE base_key END;
  IF NOT public.economy_cash(cid, payment_key, -cost, 'Logement — ' || d, 'logement',
    jsonb_build_object('rent_date', d, 'previous_failure_key', CASE WHEN previous_failure THEN base_key ELSE NULL END)) THEN
    RAISE EXCEPTION 'Paiement non enregistré';
  END IF;
  UPDATE public.character_housing SET last_paid_date = d WHERE character_id = cid;
  RETURN jsonb_build_object('status', 'paid', 'rent_date', d, 'amount', cost, 'operation_key', payment_key);
END;
$function$;
REVOKE ALL ON FUNCTION public.pay_housing_attempt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_housing_attempt() TO authenticated;
CREATE OR REPLACE FUNCTION public.pay_housing()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  PERFORM public.pay_housing_attempt();
END;
$function$;