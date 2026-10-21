-- Après 0134. Change seulement la vitesse en conservant l'heure déjà atteinte.
BEGIN;
DO $$
DECLARE w public.world_state; current_clock timestamp;
BEGIN
  SELECT * INTO STRICT w FROM public.world_state WHERE id = 1 FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.world_speed_changes WHERE key = 'clock-x4-vip-travel-x8') THEN
    current_clock := public.game_now() AT TIME ZONE 'UTC';
    INSERT INTO public.world_speed_changes (key, old_speed, new_speed)
      VALUES ('clock-x4-vip-travel-x8', w.time_speed, 4);
    UPDATE public.world_state SET world_date = current_clock::date,
      world_time = current_clock::time, clock_started_at = now(), time_speed = 4 WHERE id = 1;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.game_speed_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE active_vip boolean; travel_installed boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.vip_subscriptions
    WHERE user_id = auth.uid() AND status = 'actif' AND period_end > now()) INTO active_vip;
  SELECT EXISTS (SELECT 1 FROM public.world_speed_changes WHERE key = 'paris-clock-x5-vip-x8')
    AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.activities'::regclass
      AND tgname = 'vip_shorten_travel' AND tgenabled <> 'D' AND NOT tgisinternal)
    INTO travel_installed;
  RETURN jsonb_build_object('speed', (SELECT time_speed FROM public.world_state WHERE id = 1),
    'vip_active', active_vip, 'travel_factor', CASE WHEN travel_installed THEN 8 ELSE 1 END);
END $$;
REVOKE ALL ON FUNCTION public.game_speed_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_speed_status() TO authenticated, service_role;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.world_speed_changes WHERE key = 'clock-x4-vip-travel-x8' AND new_speed = 4)
    THEN RAISE EXCEPTION 'Vitesse ×4 non enregistrée'; END IF;
END $$;
COMMIT;