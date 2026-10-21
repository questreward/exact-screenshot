-- 0133 : temps du jeu deux fois plus rapide pour tous + trajets 4 fois plus courts pour les VIP.
-- Installation atomique. Rejouable sans effet : la vitesse n'est doublée qu'une seule fois (clé unique).
BEGIN;

CREATE TABLE IF NOT EXISTS public.world_speed_changes (
  key text PRIMARY KEY,
  old_speed numeric NOT NULL,
  new_speed numeric NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.world_speed_changes TO service_role;
ALTER TABLE public.world_speed_changes ENABLE ROW LEVEL SECURITY;

-- Ré-ancrage : l'heure du jeu reprend exactement où elle en est, puis avance deux fois plus vite.
WITH ins AS (
  INSERT INTO public.world_speed_changes (key, old_speed, new_speed)
  SELECT 'x2-lancement', time_speed, time_speed * 2 FROM public.world_state WHERE id = 1
  ON CONFLICT (key) DO NOTHING
  RETURNING new_speed
), cur AS (
  SELECT world_date + world_time + (extract(epoch FROM (now() - clock_started_at)) * time_speed) * interval '1 second' AS ts
  FROM public.world_state WHERE id = 1
)
UPDATE public.world_state w
SET world_date = cur.ts::date, world_time = cur.ts::time, clock_started_at = now(), time_speed = ins.new_speed
FROM ins, cur WHERE w.id = 1;

-- VIP : les voyages entre villes (train, car, voiture) durent 4 fois moins (au moins 5 minutes de jeu).
-- Le coût, l'énergie et le carburant restent identiques ; seul le temps d'attente change.
CREATE OR REPLACE FUNCTION public.vip_shorten_travel() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'intercity_travel' AND NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.vip_subscriptions v JOIN public.characters c ON c.user_id = v.user_id
                 WHERE c.id = NEW.character_id AND v.status = 'actif' AND v.period_end > now()) THEN
    NEW.end_time := NEW.start_time + greatest(interval '5 minutes', (NEW.end_time - NEW.start_time) / 4);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.vip_shorten_travel() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS vip_shorten_travel ON public.activities;
CREATE TRIGGER vip_shorten_travel BEFORE INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.vip_shorten_travel();

-- Contrôles d'intégrité avant validation.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.world_speed_changes WHERE key = 'x2-lancement') THEN RAISE EXCEPTION 'Vitesse non enregistrée'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vip_shorten_travel') THEN RAISE EXCEPTION 'Déclencheur VIP absent'; END IF;
END $$;

COMMIT;
