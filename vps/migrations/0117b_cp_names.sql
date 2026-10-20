-- 0117b — Noms affichés dans la Présidence de la Protection civile.
-- Ajout d'une seule fonction en lecture : prénom + nom des personnages liés à la Protection civile
-- (président, candidats, responsables d'antenne, bénévoles en service). Aucune table ni règle modifiée.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.cp_settings') IS NULL THEN RAISE EXCEPTION '0117 requise'; END IF;
 IF to_regprocedure('public.cp_names(uuid[])') IS NOT NULL THEN RAISE EXCEPTION '0117b déjà installée : ne pas relancer'; END IF;
END $$;
CREATE FUNCTION public.cp_names(_ids uuid[]) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_object_agg(c.id, c.first_name||' '||c.last_name),'{}'::jsonb)
 FROM public.characters c
 WHERE auth.uid() IS NOT NULL AND c.id = ANY(_ids[1:200]) AND (
  c.id = public.cp_president() OR public.cp_volunteer(c.id)
  OR EXISTS(SELECT 1 FROM public.cp_candidates k WHERE k.character_id=c.id)
  OR EXISTS(SELECT 1 FROM public.cp_heads h WHERE h.character_id=c.id)) $$;
REVOKE ALL ON FUNCTION public.cp_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cp_names(uuid[]) TO authenticated;
COMMIT;
