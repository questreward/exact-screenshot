-- CIVITAS 0131 : prise de rendez-vous avec un conseiller de la Caisse des aides (fictif).
-- Créneaux : jours ouvrés, 9h–11h et 14h–16h (heure de Paris), dans les 7 prochains jours de jeu.
-- Un seul rendez-vous à venir par joueur, sans argent ni récompense. Tout ou rien.
BEGIN;

CREATE TABLE IF NOT EXISTS public.caf_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  motive text NOT NULL CHECK (motive IN ('logement','famille','rsa','dossier','autre')),
  status text NOT NULL DEFAULT 'prevu' CHECK (status IN ('prevu','annule')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, starts_at)
);
CREATE INDEX IF NOT EXISTS caf_appointments_char ON public.caf_appointments (character_id, starts_at DESC);
GRANT SELECT ON public.caf_appointments TO authenticated;
GRANT ALL ON public.caf_appointments TO service_role;
ALTER TABLE public.caf_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mes rendez-vous CAF" ON public.caf_appointments;
CREATE POLICY "Mes rendez-vous CAF" ON public.caf_appointments FOR SELECT TO authenticated
  USING (character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.caf_book(_starts_at timestamptz, _motive text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; local timestamp; nid uuid; BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  local := _starts_at AT TIME ZONE 'Europe/Paris';
  IF _starts_at <= public.game_now() OR _starts_at > public.game_now() + interval '7 days' THEN RAISE EXCEPTION 'Choisis un créneau dans les 7 prochains jours'; END IF;
  IF extract(isodow FROM local) > 5 OR extract(hour FROM local) NOT IN (9,10,11,14,15,16) OR extract(minute FROM local) <> 0 THEN RAISE EXCEPTION 'Ce créneau n''existe pas'; END IF;
  IF EXISTS (SELECT 1 FROM public.caf_appointments WHERE character_id = cid AND status = 'prevu' AND starts_at > public.game_now()) THEN
    RAISE EXCEPTION 'Tu as déjà un rendez-vous à venir'; END IF;
  INSERT INTO public.caf_appointments(character_id, starts_at, motive) VALUES (cid, _starts_at, _motive) RETURNING id INTO nid;
  RETURN nid;
END $$;
REVOKE ALL ON FUNCTION public.caf_book(timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caf_book(timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.caf_cancel(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; BEGIN
  cid := public.prepare_daily_life();
  UPDATE public.caf_appointments SET status = 'annule' WHERE id = _id AND character_id = cid AND status = 'prevu' AND starts_at > public.game_now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Rendez-vous introuvable ou déjà passé'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.caf_cancel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caf_cancel(uuid) TO authenticated;

COMMIT;
