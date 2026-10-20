-- PROPOSITION : ne pas appliquer sans accord distinct sur le SQL exact.
-- Ajouts seulement, aucune fonction d'achat, loyer, crédit ou revente remplacée.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.home_layouts') IS NOT NULL THEN RAISE EXCEPTION '0089 déjà installée : ne pas relancer'; END IF;
  IF to_regclass('public.personal_assets') IS NULL OR to_regclass('public.economy_catalog') IS NULL THEN RAISE EXCEPTION 'Patrimoine requis'; END IF;
END $$;
CREATE TABLE public.furnishing_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), grid_size integer NOT NULL CHECK(grid_size BETWEEN 4 AND 16));
GRANT SELECT ON public.furnishing_settings TO authenticated; GRANT ALL ON public.furnishing_settings TO service_role;
ALTER TABLE public.furnishing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY furnishing_settings_read ON public.furnishing_settings FOR SELECT TO authenticated USING(true);
INSERT INTO public.furnishing_settings VALUES(true,8);
CREATE TABLE public.furnishing_catalog (catalog_id text PRIMARY KEY REFERENCES public.economy_catalog(id), visual text NOT NULL CHECK(visual IN('sofa','bed','shelf','mattress','fridge','washer','appliance','tv')), width integer NOT NULL CHECK(width BETWEEN 1 AND 4), height integer NOT NULL CHECK(height BETWEEN 1 AND 4));
GRANT SELECT ON public.furnishing_catalog TO authenticated; GRANT ALL ON public.furnishing_catalog TO service_role;
ALTER TABLE public.furnishing_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY furnishing_catalog_read ON public.furnishing_catalog FOR SELECT TO authenticated USING(true);
INSERT INTO public.furnishing_catalog VALUES
('shop-kivik','sofa',3,1),('shop-malm','bed',2,3),('shop-billy','shelf',2,1),('shop-matelas','mattress',2,3),
('shop-frigo-bosch','fridge',1,1),('shop-lave-linge','washer',1,1),('shop-micro-ondes','appliance',1,1),
('shop-cafetiere','appliance',1,1),('shop-cookeo','appliance',1,1),('shop-tv-55','tv',2,1);
CREATE TABLE public.home_layouts (home_asset_id uuid PRIMARY KEY REFERENCES public.personal_assets(id) ON DELETE CASCADE, character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE, version integer NOT NULL DEFAULT 0 CHECK(version>=0), room_names jsonb NOT NULL DEFAULT '[]', CHECK(jsonb_typeof(room_names)='array'));
GRANT SELECT ON public.home_layouts TO authenticated; GRANT ALL ON public.home_layouts TO service_role;
ALTER TABLE public.home_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY home_layout_owner ON public.home_layouts FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
CREATE TABLE public.home_placements (asset_id uuid PRIMARY KEY REFERENCES public.personal_assets(id) ON DELETE CASCADE, home_asset_id uuid NOT NULL REFERENCES public.home_layouts(home_asset_id) ON DELETE CASCADE, character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE, room integer NOT NULL CHECK(room>=0), x integer NOT NULL CHECK(x>=0), y integer NOT NULL CHECK(y>=0), rotation integer NOT NULL CHECK(rotation IN(0,90,180,270)));
GRANT SELECT ON public.home_placements TO authenticated; GRANT ALL ON public.home_placements TO service_role;
ALTER TABLE public.home_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY home_placement_owner ON public.home_placements FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
CREATE TABLE public.home_save_operations (character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE, request_id uuid NOT NULL, payload_hash text NOT NULL, version integer NOT NULL, PRIMARY KEY(character_id,request_id));
GRANT SELECT ON public.home_save_operations TO authenticated; GRANT ALL ON public.home_save_operations TO service_role;
ALTER TABLE public.home_save_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY home_save_owner ON public.home_save_operations FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
CREATE FUNCTION public.home_furnishing_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT id INTO cid FROM public.characters WHERE user_id=auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  RETURN jsonb_build_object('available',true,'grid',(SELECT grid_size FROM public.furnishing_settings WHERE id),
  'homes',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'name',ec.name,'rooms',CASE WHEN ec.config->>'rooms' ~ '^[1-9][0-9]?$' THEN (ec.config->>'rooms')::integer ELSE 1 END,
  'version',COALESCE(l.version,0),'room_names',COALESCE(l.room_names,'[]'),
  'placements',COALESCE((SELECT jsonb_agg(jsonb_build_object('asset_id',p.asset_id,'room',p.room,'x',p.x,'y',p.y,'rotation',p.rotation) ORDER BY p.asset_id) FROM public.home_placements p JOIN public.personal_assets i ON i.id=p.asset_id AND i.character_id=cid WHERE p.home_asset_id=a.id AND p.character_id=cid),'[]')) ORDER BY ec.name)
  FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id=a.catalog_id LEFT JOIN public.home_layouts l ON l.home_asset_id=a.id AND l.character_id=cid
  WHERE a.character_id=cid AND ec.config->>'realestate'='true'),'[]'),
  'furniture',COALESCE((SELECT jsonb_agg(jsonb_build_object('asset_id',a.id,'name',ec.name,'visual',f.visual,'width',f.width,'height',f.height,'placed_home',p.home_asset_id) ORDER BY ec.name)
  FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id=a.catalog_id JOIN public.furnishing_catalog f ON f.catalog_id=a.catalog_id LEFT JOIN public.home_placements p ON p.asset_id=a.id AND p.character_id=cid WHERE a.character_id=cid),'[]'));
END $$;
REVOKE ALL ON FUNCTION public.home_furnishing_state() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.home_furnishing_state() TO authenticated,service_role;
CREATE FUNCTION public.home_furnishing_save(_home_id uuid,_version integer,_room_names jsonb,_placements jsonb,_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cid uuid; cfg jsonb; rooms integer; g integer; v integer; h text; old public.home_save_operations; e jsonb; p record; b record; boxes jsonb:='[]'; w integer; ht integer; r integer; px integer; py integer; rm integer; aid uuid;
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
    SELECT f.width,f.height INTO p FROM public.personal_assets a JOIN public.furnishing_catalog f ON f.catalog_id=a.catalog_id WHERE a.id=aid AND a.character_id=cid FOR UPDATE OF a;
    IF NOT FOUND THEN RAISE EXCEPTION 'Objet non possédé ou non plaçable'; END IF;
    IF EXISTS(SELECT 1 FROM public.home_placements WHERE asset_id=aid AND home_asset_id<>_home_id) THEN RAISE EXCEPTION 'Objet placé dans un autre logement : rangez-le d’abord'; END IF;
    IF r NOT IN(0,90,180,270) OR rm>=rooms THEN RAISE EXCEPTION 'Pièce ou rotation invalide'; END IF;
    w:=CASE WHEN r IN(90,270) THEN p.height ELSE p.width END; ht:=CASE WHEN r IN(90,270) THEN p.width ELSE p.height END;
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
REVOKE ALL ON FUNCTION public.home_furnishing_save(uuid,integer,jsonb,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.home_furnishing_save(uuid,integer,jsonb,jsonb,uuid) TO authenticated,service_role;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.furnishing_catalog)<>10 OR (SELECT grid_size FROM public.furnishing_settings WHERE id)<>8 THEN RAISE EXCEPTION 'Configuration 0089 incomplète'; END IF;
  IF EXISTS(SELECT 1 FROM public.home_layouts) OR EXISTS(SELECT 1 FROM public.home_placements) THEN RAISE EXCEPTION 'Aucun aménagement ne doit être offert'; END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
