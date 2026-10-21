-- 0134 : heure française à l'installation, vitesse exacte ×5, voyages VIP ÷8.
-- Nécessite 0133. Rejouer ne remet pas l'horloge à zéro et ne multiplie pas la vitesse.
-- Attention : ce changement de date ne déplace PAS les échéances déjà enregistrées.
BEGIN;

DO $$
DECLARE w public.world_state; paris_now timestamp;
BEGIN
  SELECT * INTO STRICT w FROM public.world_state WHERE id = 1 FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.world_speed_changes WHERE key = 'paris-clock-x5-vip-x8') THEN
    -- L'horloge du jeu stocke une date/heure civile, représentée en UTC par game_now.
    -- On y place donc l'heure murale de Paris, sans dépendre du fuseau du serveur.
    paris_now := clock_timestamp() AT TIME ZONE 'Europe/Paris';
    INSERT INTO public.world_speed_changes (key, old_speed, new_speed)
      VALUES ('paris-clock-x5-vip-x8', w.time_speed, 5);
    UPDATE public.world_state
      SET world_date = paris_now::date, world_time = paris_now::time,
          clock_started_at = clock_timestamp(), time_speed = 5
      WHERE id = 1;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.vip_shorten_travel() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'intercity_travel' AND NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.vip_subscriptions v JOIN public.characters c ON c.user_id = v.user_id
                 WHERE c.id = NEW.character_id AND v.status = 'actif' AND v.period_end > now()) THEN
    NEW.end_time := NEW.start_time + greatest(interval '5 minutes', (NEW.end_time - NEW.start_time) / 8);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.vip_shorten_travel() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS vip_shorten_travel ON public.activities;
CREATE TRIGGER vip_shorten_travel BEFORE INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.vip_shorten_travel();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.world_speed_changes WHERE key = 'paris-clock-x5-vip-x8' AND new_speed = 5) THEN
    RAISE EXCEPTION 'Nouvelle vitesse non enregistrée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.activities'::regclass AND tgname = 'vip_shorten_travel' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Déclencheur VIP absent';
  END IF;
END $$;
COMMIT;