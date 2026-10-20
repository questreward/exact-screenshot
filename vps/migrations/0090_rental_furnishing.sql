-- PROPOSITION 0090 : accord distinct sur le SQL exact requis avant installation.
-- Aucun prix, achat, loyer, dépôt ou contrat modifié.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.rental_home_layouts') IS NOT NULL THEN RAISE EXCEPTION '0090 déjà installée : ne pas relancer'; END IF;
 IF to_regclass('public.housing_leases') IS NULL OR to_regclass('public.home_layouts') IS NULL THEN RAISE EXCEPTION '0089 et baux requis'; END IF;
 IF COALESCE((SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.home_furnishing_save(uuid,integer,jsonb,jsonb,uuid)')),'')<>'a088310f4b91d22e839dd4d42d538932' THEN RAISE EXCEPTION '0089 incompatible : aucune modification effectuée'; END IF;
END $$;
CREATE TABLE public.rental_home_layouts (
 lease_id uuid PRIMARY KEY REFERENCES public.housing_leases(id) ON DELETE CASCADE,
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
 version integer NOT NULL DEFAULT 0 CHECK(version>=0), room_names jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(room_names)='array')
);
GRANT SELECT ON public.rental_home_layouts TO authenticated;
GRANT ALL ON public.rental_home_layouts TO service_role;
ALTER TABLE public.rental_home_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY rental_layout_private ON public.rental_home_layouts FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.characters c JOIN public.housing_leases l ON l.character_id=c.id WHERE c.id=rental_home_layouts.character_id AND c.user_id=auth.uid() AND l.id=lease_id AND l.kind='location' AND l.status='actif' AND l.ended_at IS NULL));
CREATE TABLE public.rental_home_placements (
 asset_id uuid PRIMARY KEY REFERENCES public.personal_assets(id) ON DELETE CASCADE,
 lease_id uuid NOT NULL REFERENCES public.rental_home_layouts(lease_id) ON DELETE CASCADE,
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
 room integer NOT NULL CHECK(room>=0), x integer NOT NULL CHECK(x>=0), y integer NOT NULL CHECK(y>=0), rotation integer NOT NULL CHECK(rotation IN(0,90,180,270))
);
GRANT SELECT ON public.rental_home_placements TO authenticated;
GRANT ALL ON public.rental_home_placements TO service_role;
ALTER TABLE public.rental_home_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY rental_placement_private ON public.rental_home_placements FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.characters c JOIN public.housing_leases l ON l.character_id=c.id WHERE c.id=rental_home_placements.character_id AND c.user_id=auth.uid() AND l.id=lease_id AND l.kind='location' AND l.status='actif' AND l.ended_at IS NULL));
CREATE TABLE public.rental_home_save_operations (
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
 lease_id uuid NOT NULL REFERENCES public.housing_leases(id) ON DELETE CASCADE,
 request_id uuid NOT NULL, payload_hash text NOT NULL, version integer NOT NULL,
 PRIMARY KEY(character_id,request_id)
);
GRANT SELECT ON public.rental_home_save_operations TO authenticated;
GRANT ALL ON public.rental_home_save_operations TO service_role;
ALTER TABLE public.rental_home_save_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY rental_operation_private ON public.rental_home_save_operations FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.characters c JOIN public.housing_leases l ON l.character_id=c.id WHERE c.id=rental_home_save_operations.character_id AND c.user_id=auth.uid() AND l.id=lease_id AND l.kind='location' AND l.status='actif' AND l.ended_at IS NULL));
CREATE FUNCTION public.furnishing_state_v2() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cid uuid; base jsonb; homes jsonb; items jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 SELECT id INTO cid FROM public.characters WHERE user_id=auth.uid();
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 base:=public.home_furnishing_state();
 SELECT COALESCE(jsonb_agg(h||jsonb_build_object('kind','propriete')),'[]') INTO homes FROM jsonb_array_elements(base->'homes') h;
 homes:=homes||COALESCE((SELECT jsonb_agg(jsonb_build_object(
 'id','rental:'||l.id::text,'lease_id',l.id,'kind','location','name',l.title,
 'rooms',CASE WHEN ec.config->>'rooms' ~ '^[1-9][0-9]?$' THEN (ec.config->>'rooms')::integer ELSE 1 END,
 'version',COALESCE(rl.version,0),'room_names',COALESCE(rl.room_names,'[]'),
 'placements',COALESCE((SELECT jsonb_agg(jsonb_build_object('asset_id',p.asset_id,'room',p.room,'x',p.x,'y',p.y,'rotation',p.rotation) ORDER BY p.asset_id)
 FROM public.rental_home_placements p JOIN public.personal_assets a ON a.id=p.asset_id AND a.character_id=cid WHERE p.lease_id=l.id AND p.character_id=cid),'[]')) ORDER BY l.id)
 FROM public.housing_leases l LEFT JOIN public.economy_catalog ec ON ec.id=l.property_id
 LEFT JOIN public.rental_home_layouts rl ON rl.lease_id=l.id AND rl.character_id=cid
 WHERE l.character_id=cid AND l.kind='location' AND l.status='actif' AND l.ended_at IS NULL),'[]');
 SELECT COALESCE(jsonb_agg(f||jsonb_build_object('placed_home',COALESCE(
 (SELECT to_jsonb('rental:'||p.lease_id::text) FROM public.rental_home_placements p JOIN public.housing_leases l ON l.id=p.lease_id
 WHERE p.asset_id=(f->>'asset_id')::uuid AND p.character_id=cid AND l.character_id=cid AND l.kind='location' AND l.status='actif' AND l.ended_at IS NULL),f->'placed_home'))),'[]') INTO items FROM jsonb_array_elements(base->'furniture') f;
 RETURN base||jsonb_build_object('homes',homes,'furniture',items,'rentals_available',true);
END $$;
REVOKE ALL ON FUNCTION public.furnishing_state_v2() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.furnishing_state_v2() TO authenticated,service_role;
CREATE FUNCTION public.rental_furnishing_save(_lease_id uuid,_version integer,_room_names jsonb,_placements jsonb,_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cid uuid; cfg jsonb; rooms integer; g integer; v integer; h text; old public.rental_home_save_operations; e jsonb; item_box record; b record; boxes jsonb:='[]'; w integer; ht integer; r integer; px integer; py integer; rm integer; aid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT id INTO cid FROM public.characters WHERE user_id=auth.uid() FOR UPDATE;
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  IF _request_id IS NULL OR _version IS NULL OR _version<0 OR _lease_id IS NULL THEN RAISE EXCEPTION 'Sauvegarde invalide'; END IF;
  SELECT COALESCE(ec.config,'{}') INTO cfg FROM public.housing_leases l LEFT JOIN public.economy_catalog ec ON ec.id=l.property_id WHERE l.id=_lease_id AND l.character_id=cid AND l.kind='location' AND l.status='actif' AND l.ended_at IS NULL FOR UPDATE OF l;
  IF NOT FOUND THEN RAISE EXCEPTION 'Location non active ou non autorisée'; END IF;
  h:=md5(jsonb_build_object('home',_lease_id,'version',_version,'names',_room_names,'placements',_placements)::text);
  SELECT * INTO old FROM public.rental_home_save_operations WHERE character_id=cid AND request_id=_request_id;
  IF FOUND THEN
    IF old.payload_hash<>h THEN RAISE EXCEPTION 'Identifiant de sauvegarde déjà utilisé'; END IF;
    RETURN jsonb_build_object('version',old.version,'already',true);
  END IF;
  rooms:=CASE WHEN cfg->>'rooms' ~ '^[1-9][0-9]?$' THEN (cfg->>'rooms')::integer ELSE 1 END;
  SELECT grid_size INTO g FROM public.furnishing_settings WHERE id;
  IF _room_names IS NULL OR jsonb_typeof(_room_names)<>'array' OR _placements IS NULL OR jsonb_typeof(_placements)<>'array' THEN RAISE EXCEPTION 'Aménagement invalide'; END IF;
  IF jsonb_array_length(_room_names)<>rooms OR jsonb_array_length(_placements)>100 THEN RAISE EXCEPTION 'Nombre de pièces ou objets invalide'; END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(_room_names) LOOP
    IF jsonb_typeof(e)<>'string' OR length(e#>>'{}') NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Nom de pièce invalide'; END IF;
  END LOOP;
  DELETE FROM public.rental_home_placements p USING public.housing_leases l WHERE p.lease_id=l.id AND p.character_id=cid AND (l.status<>'actif' OR l.ended_at IS NOT NULL);
  INSERT INTO public.rental_home_layouts(lease_id,character_id) VALUES(_lease_id,cid) ON CONFLICT DO NOTHING;
  SELECT version INTO v FROM public.rental_home_layouts WHERE lease_id=_lease_id AND character_id=cid FOR UPDATE;
  IF v IS NULL OR v<>_version THEN RAISE EXCEPTION 'Aménagement modifié ailleurs : rechargez avant de sauvegarder'; END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(_placements) LOOP
    IF jsonb_typeof(e)<>'object' OR NOT (e ?& ARRAY['asset_id','room','x','y','rotation']) THEN RAISE EXCEPTION 'Objet invalide'; END IF;
    aid:=(e->>'asset_id')::uuid;
    IF NOT (e->>'room' ~ '^[0-9]+$' AND e->>'x' ~ '^[0-9]+$' AND e->>'y' ~ '^[0-9]+$' AND e->>'rotation' ~ '^[0-9]+$') THEN RAISE EXCEPTION 'Position invalide'; END IF;
    rm:=(e->>'room')::integer; px:=(e->>'x')::integer; py:=(e->>'y')::integer; r:=(e->>'rotation')::integer;
    SELECT f.width,f.height INTO item_box FROM public.personal_assets a JOIN public.furnishing_catalog f ON f.catalog_id=a.catalog_id WHERE a.id=aid AND a.character_id=cid FOR UPDATE OF a;
    IF NOT FOUND THEN RAISE EXCEPTION 'Objet non possédé ou non plaçable'; END IF;
    IF EXISTS(SELECT 1 FROM public.home_placements WHERE asset_id=aid) OR EXISTS(SELECT 1 FROM public.rental_home_placements p JOIN public.housing_leases l ON l.id=p.lease_id WHERE p.asset_id=aid AND p.lease_id<>_lease_id AND l.status='actif' AND l.ended_at IS NULL) THEN RAISE EXCEPTION 'Objet placé dans un autre logement : rangez-le d’abord'; END IF;
    IF r NOT IN(0,90,180,270) OR rm>=rooms THEN RAISE EXCEPTION 'Pièce ou rotation invalide'; END IF;
    w:=CASE WHEN r IN(90,270) THEN item_box.height ELSE item_box.width END; ht:=CASE WHEN r IN(90,270) THEN item_box.width ELSE item_box.height END;
    IF px+w>g OR py+ht>g THEN RAISE EXCEPTION 'Objet hors de la pièce'; END IF;
    FOR b IN SELECT * FROM jsonb_to_recordset(boxes) AS z(asset_id uuid,room integer,x integer,y integer,w integer,h integer) LOOP
      IF b.asset_id=aid THEN RAISE EXCEPTION 'Objet placé deux fois'; END IF;
      IF b.room=rm AND px<b.x+b.w AND b.x<px+w AND py<b.y+b.h AND b.y<py+ht THEN RAISE EXCEPTION 'Objets superposés'; END IF;
    END LOOP;
    boxes:=boxes||jsonb_build_array(jsonb_build_object('asset_id',aid,'room',rm,'x',px,'y',py,'w',w,'h',ht));
  END LOOP;
  DELETE FROM public.rental_home_placements WHERE lease_id=_lease_id AND character_id=cid;
  INSERT INTO public.rental_home_placements(asset_id,lease_id,character_id,room,x,y,rotation)
  SELECT z.asset_id,_lease_id,cid,z.room,z.x,z.y,z.rotation FROM jsonb_to_recordset(_placements) AS z(asset_id uuid,room integer,x integer,y integer,rotation integer);
  UPDATE public.rental_home_layouts SET version=version+1,room_names=_room_names WHERE lease_id=_lease_id AND character_id=cid RETURNING version INTO v;
  INSERT INTO public.rental_home_save_operations VALUES(cid,_lease_id,_request_id,h,v);
  RETURN jsonb_build_object('version',v,'already',false);
END $$;
REVOKE ALL ON FUNCTION public.rental_furnishing_save(uuid,integer,jsonb,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rental_furnishing_save(uuid,integer,jsonb,jsonb,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.home_furnishing_save(_home_id uuid,_version integer,_room_names jsonb,_placements jsonb,_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cid uuid; cfg jsonb; rooms integer; g integer; v integer; h text; old public.home_save_operations; e jsonb; item_box record; b record; boxes jsonb:='[]'; w integer; ht integer; r integer; px integer; py integer; rm integer; aid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT id INTO cid FROM public.characters WHERE user_id=auth.uid() FOR UPDATE;
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  IF _request_id IS NULL OR _version IS NULL OR _version<0 OR _home_id IS NULL THEN RAISE EXCEPTION 'Sauvegarde invalide'; END IF;
  SELECT ec.config INTO cfg FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id=a.catalog_id WHERE a.id=_home_id AND a.character_id=cid AND ec.config->>'realestate'='true' FOR UPDATE OF a;
  IF NOT FOUND THEN RAISE EXCEPTION 'Logement non possédé'; END IF;
  h:=md5(jsonb_build_object('home',_home_id,'version',_version,'names',_room_names,'placements',_placements)::text);
  SELECT * INTO old FROM public.home_save_operations WHERE character_id=cid AND request_id=_request_id;
  IF FOUND THEN
    IF old.payload_hash<>h THEN RAISE EXCEPTION 'Identifiant de sauvegarde déjà utilisé'; END IF;
    RETURN jsonb_build_object('version',old.version,'already',true);
  END IF;
  rooms:=CASE WHEN cfg->>'rooms' ~ '^[1-9][0-9]?$' THEN (cfg->>'rooms')::integer ELSE 1 END;
  SELECT grid_size INTO g FROM public.furnishing_settings WHERE id;
  IF _room_names IS NULL OR jsonb_typeof(_room_names)<>'array' OR _placements IS NULL OR jsonb_typeof(_placements)<>'array' THEN RAISE EXCEPTION 'Aménagement invalide'; END IF;
  IF jsonb_array_length(_room_names)<>rooms OR jsonb_array_length(_placements)>100 THEN RAISE EXCEPTION 'Nombre de pièces ou objets invalide'; END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(_room_names) LOOP
    IF jsonb_typeof(e)<>'string' OR length(e#>>'{}') NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Nom de pièce invalide'; END IF;
  END LOOP;
  INSERT INTO public.home_layouts(home_asset_id,character_id) VALUES(_home_id,cid) ON CONFLICT DO NOTHING;
  SELECT version INTO v FROM public.home_layouts WHERE home_asset_id=_home_id AND character_id=cid FOR UPDATE;
  IF v IS NULL OR v<>_version THEN RAISE EXCEPTION 'Aménagement modifié ailleurs : rechargez avant de sauvegarder'; END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(_placements) LOOP
    IF jsonb_typeof(e)<>'object' OR NOT (e ?& ARRAY['asset_id','room','x','y','rotation']) THEN RAISE EXCEPTION 'Objet invalide'; END IF;
    aid:=(e->>'asset_id')::uuid;
    IF NOT (e->>'room' ~ '^[0-9]+$' AND e->>'x' ~ '^[0-9]+$' AND e->>'y' ~ '^[0-9]+$' AND e->>'rotation' ~ '^[0-9]+$') THEN RAISE EXCEPTION 'Position invalide'; END IF;
    rm:=(e->>'room')::integer; px:=(e->>'x')::integer; py:=(e->>'y')::integer; r:=(e->>'rotation')::integer;
    SELECT f.width,f.height INTO item_box FROM public.personal_assets a JOIN public.furnishing_catalog f ON f.catalog_id=a.catalog_id WHERE a.id=aid AND a.character_id=cid FOR UPDATE OF a;
    IF NOT FOUND THEN RAISE EXCEPTION 'Objet non possédé ou non plaçable'; END IF;
    IF EXISTS(SELECT 1 FROM public.rental_home_placements p JOIN public.housing_leases l ON l.id=p.lease_id WHERE p.asset_id=aid AND l.status='actif' AND l.ended_at IS NULL) THEN RAISE EXCEPTION 'Objet placé dans une location : rangez-le d’abord'; END IF;
    IF EXISTS(SELECT 1 FROM public.home_placements WHERE asset_id=aid AND home_asset_id<>_home_id) THEN RAISE EXCEPTION 'Objet placé dans un autre logement : rangez-le d’abord'; END IF;
    IF r NOT IN(0,90,180,270) OR rm>=rooms THEN RAISE EXCEPTION 'Pièce ou rotation invalide'; END IF;
    w:=CASE WHEN r IN(90,270) THEN item_box.height ELSE item_box.width END; ht:=CASE WHEN r IN(90,270) THEN item_box.width ELSE item_box.height END;
    IF px+w>g OR py+ht>g THEN RAISE EXCEPTION 'Objet hors de la pièce'; END IF;
    FOR b IN SELECT * FROM jsonb_to_recordset(boxes) AS z(asset_id uuid,room integer,x integer,y integer,w integer,h integer) LOOP
      IF b.asset_id=aid THEN RAISE EXCEPTION 'Objet placé deux fois'; END IF;
      IF b.room=rm AND px<b.x+b.w AND b.x<px+w AND py<b.y+b.h AND b.y<py+ht THEN RAISE EXCEPTION 'Objets superposés'; END IF;
    END LOOP;
    boxes:=boxes||jsonb_build_array(jsonb_build_object('asset_id',aid,'room',rm,'x',px,'y',py,'w',w,'h',ht));
  END LOOP;
  DELETE FROM public.home_placements WHERE home_asset_id=_home_id AND character_id=cid;
  INSERT INTO public.home_placements(asset_id,home_asset_id,character_id,room,x,y,rotation)
  SELECT z.asset_id,_home_id,cid,z.room,z.x,z.y,z.rotation FROM jsonb_to_recordset(_placements) AS z(asset_id uuid,room integer,x integer,y integer,rotation integer);
  UPDATE public.home_layouts SET version=version+1,room_names=_room_names WHERE home_asset_id=_home_id AND character_id=cid RETURNING version INTO v;
  INSERT INTO public.home_save_operations VALUES(cid,_request_id,h,v);
  RETURN jsonb_build_object('version',v,'already',false);
END $$;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.rental_home_layouts) OR EXISTS(SELECT 1 FROM public.rental_home_placements) OR EXISTS(SELECT 1 FROM public.rental_home_save_operations) THEN RAISE EXCEPTION 'Aucun aménagement offert'; END IF;
 IF to_regprocedure('public.furnishing_state_v2()') IS NULL OR to_regprocedure('public.rental_furnishing_save(uuid,integer,jsonb,jsonb,uuid)') IS NULL THEN RAISE EXCEPTION '0090 incomplète'; END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
