-- CIVITAS 0123 : objets de style portés, visibles sur le profil public des autres joueurs.
-- Nouvelle table + 2 fonctions. Seuls les objets réellement achetés peuvent être portés.
-- Lecture publique limitée à l'apparence et aux objets portés, jamais en cas de blocage. Tout ou rien.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cosmetic_worn (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (slot IN ('cadre','tenue','fond','badge')),
  item_id text NOT NULL REFERENCES public.cosmetic_items(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id, slot)
);
ALTER TABLE public.cosmetic_worn ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.cosmetic_worn TO service_role;

CREATE OR REPLACE FUNCTION public.cosmetic_slot(_item text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _item LIKE 'cadre-%' THEN 'cadre' WHEN _item LIKE 'tenue-%' THEN 'tenue'
              WHEN _item LIKE 'fond-%' THEN 'fond' WHEN _item LIKE 'badge-%' THEN 'badge' END $$;

-- Porter (_on = true) ou retirer un objet acheté, pour le personnage connecté.
CREATE OR REPLACE FUNCTION public.cosmetic_wear(_item text, _on boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s text := public.cosmetic_slot(_item);
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  IF s IS NULL THEN RAISE EXCEPTION 'Objet inconnu.'; END IF;
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF _on THEN
    IF NOT EXISTS (SELECT 1 FROM public.cosmetic_owned WHERE user_id = auth.uid() AND item_id = _item) THEN
      RAISE EXCEPTION 'Tu ne possèdes pas cet objet.'; END IF;
    INSERT INTO public.cosmetic_worn(character_id, slot, item_id) VALUES (cid, s, _item)
    ON CONFLICT (character_id, slot) DO UPDATE SET item_id = EXCLUDED.item_id, updated_at = now();
  ELSE
    DELETE FROM public.cosmetic_worn WHERE character_id = cid AND slot = s AND item_id = _item;
  END IF;
END $$;

-- Apparence + objets portés d'un joueur (soi-même ou un autre), sauf blocage.
CREATE OR REPLACE FUNCTION public.cosmetic_look(_character uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := public.social_actor(); r jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  IF me <> _character AND public.network_blocked(me, _character) THEN RETURN NULL; END IF;
  SELECT jsonb_build_object('appearance', c.appearance,
    'look', COALESCE((SELECT jsonb_object_agg(w.slot, w.item_id) FROM public.cosmetic_worn w WHERE w.character_id = c.id), '{}'::jsonb))
  INTO r FROM public.characters c WHERE c.id = _character;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.cosmetic_wear(text, boolean), public.cosmetic_look(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cosmetic_wear(text, boolean), public.cosmetic_look(uuid) TO authenticated;

COMMIT;
