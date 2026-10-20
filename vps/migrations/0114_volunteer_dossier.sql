-- 0114 — Antennes fictives, historique de rattachement et notes privées Protection civile.
-- 3 nouvelles tables, 3 nouvelles fonctions ; aucun règlement existant remplacé.
-- Aucune écriture d'argent, énergie, formation, déplacement ou récompense.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.volunteer_branches') IS NOT NULL THEN
    RAISE EXCEPTION '0114 déjà installée : ne pas relancer';
  END IF;
  IF to_regclass('public.security_shifts') IS NULL OR to_regclass('public.security_careers') IS NULL
     OR to_regprocedure('public.social_actor()') IS NULL THEN
    RAISE EXCEPTION 'Prérequis secours manquants';
  END IF;
END $$;
CREATE TABLE public.volunteer_branches (
  city_id text PRIMARY KEY REFERENCES public.cities(id),
  label text NOT NULL
);
GRANT SELECT ON public.volunteer_branches TO authenticated;
GRANT ALL ON public.volunteer_branches TO service_role;
ALTER TABLE public.volunteer_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY volunteer_branches_read ON public.volunteer_branches FOR SELECT TO authenticated USING (true);
INSERT INTO public.volunteer_branches(city_id,label)
SELECT id, 'Antenne CIVITAS — ' || name FROM public.cities;

CREATE TABLE public.volunteer_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  city_id text NOT NULL REFERENCES public.volunteer_branches(city_id),
  request_id uuid NOT NULL,
  attached_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE(character_id, request_id)
);
GRANT SELECT ON public.volunteer_attachments TO authenticated;
GRANT ALL ON public.volunteer_attachments TO service_role;
ALTER TABLE public.volunteer_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY volunteer_attachments_owner ON public.volunteer_attachments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

CREATE TABLE public.volunteer_notes (
  shift_id uuid PRIMARY KEY REFERENCES public.security_shifts(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (char_length(btrim(note)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
GRANT SELECT ON public.volunteer_notes TO authenticated;
GRANT ALL ON public.volunteer_notes TO service_role;
ALTER TABLE public.volunteer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY volunteer_notes_owner ON public.volunteer_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

CREATE FUNCTION public.volunteer_dossier_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
  RETURN jsonb_build_object(
    'branches', COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.label) FROM public.volunteer_branches b),'[]'::jsonb),
    'attachments', COALESCE((SELECT jsonb_agg(to_jsonb(a) - 'character_id' - 'request_id' ORDER BY a.attached_at DESC,a.id DESC) FROM public.volunteer_attachments a WHERE a.character_id=cid),'[]'::jsonb),
    'notes', COALESCE((SELECT jsonb_agg(to_jsonb(n) - 'character_id' ORDER BY n.created_at DESC) FROM public.volunteer_notes n WHERE n.character_id=cid),'[]'::jsonb)
  );
END $$;
CREATE FUNCTION public.volunteer_attach(_city text, _request uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); prior public.volunteer_attachments; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
  PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
  IF _request IS NULL THEN RAISE EXCEPTION 'Référence requise'; END IF;
  SELECT * INTO prior FROM public.volunteer_attachments WHERE character_id=cid AND request_id=_request;
  IF FOUND THEN
    IF prior.city_id IS DISTINCT FROM _city THEN RAISE EXCEPTION 'Référence déjà utilisée'; END IF;
    RETURN public.volunteer_dossier_state();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.security_careers WHERE character_id=cid AND service='protection_civile' AND status IN ('formation','service')) THEN
    RAISE EXCEPTION 'Engagement Protection civile actif requis';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.volunteer_branches WHERE city_id=_city) THEN RAISE EXCEPTION 'Antenne inconnue'; END IF;
  -- Un même choix répété ne crée pas une nouvelle ligne historique.
  IF (SELECT city_id FROM public.volunteer_attachments WHERE character_id=cid ORDER BY attached_at DESC,id DESC LIMIT 1) IS DISTINCT FROM _city THEN
    INSERT INTO public.volunteer_attachments(character_id,city_id,request_id) VALUES(cid,_city,_request);
  END IF;
  RETURN public.volunteer_dossier_state();
END $$;
CREATE FUNCTION public.volunteer_save_note(_shift uuid, _note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); sh public.security_shifts; existing text; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
  PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
  SELECT * INTO sh FROM public.security_shifts WHERE id=_shift AND character_id=cid FOR UPDATE;
  IF NOT FOUND OR sh.service <> 'protection_civile' OR NOT sh.settled THEN
    RAISE EXCEPTION 'Service Protection civile personnel clôturé requis';
  END IF;
  IF _note IS NULL OR char_length(btrim(_note)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Note : 1 à 2000 caractères'; END IF;
  SELECT note INTO existing FROM public.volunteer_notes WHERE shift_id=_shift;
  IF FOUND THEN
    IF existing IS DISTINCT FROM btrim(_note) THEN RAISE EXCEPTION 'La note enregistrée est conservée'; END IF;
  ELSE
    INSERT INTO public.volunteer_notes(shift_id,character_id,note) VALUES(_shift,cid,btrim(_note));
  END IF;
  RETURN public.volunteer_dossier_state();
END $$;
REVOKE ALL ON FUNCTION public.volunteer_dossier_state() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.volunteer_attach(text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.volunteer_save_note(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.volunteer_dossier_state(),public.volunteer_attach(text,uuid),public.volunteer_save_note(uuid,text) TO authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.volunteer_branches) <> (SELECT count(*) FROM public.cities) THEN RAISE EXCEPTION 'Une antenne par ville requise'; END IF;
  IF has_table_privilege('authenticated','public.volunteer_notes','INSERT') OR has_table_privilege('authenticated','public.volunteer_attachments','UPDATE') THEN RAISE EXCEPTION 'Écriture directe interdite'; END IF;
END $$;
COMMIT;
