-- 0107 — Titres sécurisés · FICTIF, aucun service ni logo officiel.
-- NEW TABLES: prefecture_settings, prefecture_requests.
-- NEW FUNCTIONS: prefecture_cv, prefecture_state, prefecture_request, prefecture_loss.
-- MODIFIED: character_identity adds prefecture_lost_at; admin_document_types seeds passport.
-- REUSED: character_identity / identity_ensure (CNI), administrative_documents (all titles),
-- economy_catalog.config, personal_assets, post_deliver/post_letters, economy_cash, economy_post.
-- No legacy function replaced. Vehicle titles use one registry type per catalog ID,
-- preserving administrative_documents_one_valid and existing ownership uniqueness.
-- Fees round UP per request: ceil((1376 + 4600 * CV) / 100), no cents carry.
-- CV: config.fiscal_hp first; otherwise config.vehicle_type defaults, then vehicle=5.
-- A missed registered letter remains pending; only collection activates CNI/passport.
BEGIN;
ALTER TABLE public.character_identity ADD COLUMN prefecture_lost_at timestamptz;
CREATE TABLE public.prefecture_settings (
 vehicle_type text PRIMARY KEY, default_cv integer NOT NULL CHECK(default_cv BETWEEN 1 AND 100)
);
INSERT INTO public.prefecture_settings VALUES ('vehicle',5),('car',5),('motorcycle',2),('scooter',1),('van',7);
CREATE TABLE public.prefecture_requests (
 id uuid PRIMARY KEY, character_id uuid NOT NULL REFERENCES public.characters(id),
 type_id text NOT NULL REFERENCES public.admin_document_types(id),
 kind text NOT NULL CHECK(kind IN ('identity','passport','registration')),
 asset_id uuid REFERENCES public.personal_assets(id),
 fee integer NOT NULL CHECK(fee>=0), fiscal_cv integer CHECK(fiscal_cv BETWEEN 1 AND 100),
 requested_at timestamptz NOT NULL DEFAULT public.game_now(), ready_at timestamptz NOT NULL,
 completed_at timestamptz, UNIQUE(character_id,id)
);
CREATE UNIQUE INDEX prefecture_one_pending ON public.prefecture_requests(character_id,type_id) WHERE completed_at IS NULL;
INSERT INTO public.admin_document_types VALUES ('passport','Passeport fictif','Situation personnelle','Titres sécurisés · FICTIF',3650,'Validité conservée pour de futurs voyages fictifs ; aucun voyage disponible.',20);
ALTER TABLE public.prefecture_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefecture_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY prefecture_settings_read ON public.prefecture_settings FOR SELECT TO authenticated USING(true);
CREATE POLICY prefecture_requests_owner ON public.prefecture_requests FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
GRANT SELECT ON public.prefecture_settings,public.prefecture_requests TO authenticated;
GRANT ALL ON public.prefecture_settings,public.prefecture_requests TO service_role;
CREATE FUNCTION public.prefecture_cv(_config jsonb) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN coalesce(_config->>'fiscal_hp','') ~ '^[0-9]{1,2}$' AND (_config->>'fiscal_hp')::integer BETWEEN 1 AND 99 THEN (_config->>'fiscal_hp')::integer
 ELSE coalesce((SELECT default_cv FROM public.prefecture_settings WHERE vehicle_type=_config->>'vehicle_type'),(SELECT default_cv FROM public.prefecture_settings WHERE vehicle_type='vehicle')) END
$$;
CREATE FUNCTION public.prefecture_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); r record; ident public.character_identity; stamp timestamptz;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 ident:=public.identity_ensure(cid);
 FOR r IN SELECT * FROM public.prefecture_requests WHERE character_id=cid AND completed_at IS NULL AND ready_at<=public.game_now() ORDER BY ready_at LOOP
  PERFORM public.post_deliver(cid,'prefecture:'||r.id,'Titres sécurisés · FICTIF','Votre titre est disponible','Votre titre est disponible. Retirez le recommandé à La Poste pour activer votre CNI ou passeport.',r.kind<>'registration');
  SELECT CASE WHEN r.kind='registration' THEN presented_at ELSE collected_at END INTO stamp FROM public.post_letters WHERE character_id=cid AND letter_key='prefecture:'||r.id;
  IF stamp IS NOT NULL THEN
   UPDATE public.administrative_documents SET status='remplace' WHERE character_id=cid AND type_id=r.type_id AND status='valide';
   INSERT INTO public.administrative_documents(character_id,type_id,issued_at,valid_until,details) VALUES(cid,r.type_id,stamp,stamp+interval '10 years',jsonb_build_object('request',r.id,'asset_id',r.asset_id,'fiscal_cv',r.fiscal_cv,'lost',false));
   IF r.kind='identity' THEN
    UPDATE public.character_identity SET issued_at=stamp::date,expires_at=(stamp+interval '10 years')::date,prefecture_lost_at=NULL WHERE character_id=cid;
   END IF;
   UPDATE public.prefecture_requests SET completed_at=stamp WHERE id=r.id;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('now',public.game_now(),'identity',(SELECT jsonb_build_object('number',doc_number,'expires_at',expires_at,'lost',prefecture_lost_at IS NOT NULL) FROM public.character_identity WHERE character_id=cid),
 'documents',coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM public.administrative_documents d WHERE character_id=cid AND (type_id IN('identity','passport') OR type_id LIKE 'registration:%')),'[]'),
 'requests',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY requested_at DESC) FROM public.prefecture_requests q WHERE character_id=cid),'[]'),
 'vehicles',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'name',e.name,'type_id','registration:'||e.id,'cv',public.prefecture_cv(e.config),'fee',ceil((1376+4600*public.prefecture_cv(e.config))/100.0))) FROM public.personal_assets a JOIN public.economy_catalog e ON e.id=a.catalog_id WHERE a.character_id=cid AND e.kind='vehicle'),'[]'));
END $$;
CREATE FUNCTION public.prefecture_request(_kind text,_request uuid,_asset uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); typ text; cv integer; fee integer; cat public.economy_catalog; lost boolean;
BEGIN
 PERFORM public.prefecture_state();
 IF _request IS NULL OR _kind IS NULL OR _kind NOT IN('identity','passport','registration') THEN RAISE EXCEPTION 'Demande invalide.'; END IF;
 IF EXISTS(SELECT 1 FROM public.prefecture_requests WHERE character_id=cid AND id=_request) THEN RETURN public.prefecture_state(); END IF;
 typ:=_kind;
 IF _kind='registration' THEN
  SELECT e.* INTO cat FROM public.personal_assets a JOIN public.economy_catalog e ON e.id=a.catalog_id WHERE a.id=_asset AND a.character_id=cid AND e.kind='vehicle';
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule possédé requis.'; END IF;
  typ:='registration:'||cat.id; cv:=public.prefecture_cv(cat.config); fee:=ceil((1376+4600*cv)/100.0);
  INSERT INTO public.admin_document_types VALUES(typ,'Carte grise · '||cat.name,'Véhicules','Titres sécurisés · FICTIF',3650,'Certificat fictif du véhicule possédé.',21) ON CONFLICT DO NOTHING;
 ELSE
  IF _asset IS NOT NULL THEN RAISE EXCEPTION 'Véhicule inattendu.'; END IF;
  SELECT prefecture_lost_at IS NOT NULL INTO lost FROM public.character_identity WHERE character_id=cid;
  fee:=CASE WHEN _kind='passport' THEN 86 WHEN lost THEN 25 ELSE 0 END;
  IF _kind='identity' AND NOT lost AND EXISTS(SELECT 1 FROM public.character_identity WHERE character_id=cid AND expires_at>=public.game_now()::date) THEN RAISE EXCEPTION 'Votre carte est déjà valide.'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.prefecture_requests WHERE character_id=cid AND type_id=typ AND completed_at IS NULL) THEN RAISE EXCEPTION 'Une demande est déjà en cours.'; END IF;
 IF EXISTS(SELECT 1 FROM public.administrative_documents WHERE character_id=cid AND type_id=typ AND status='valide' AND valid_until>public.game_now()) THEN RAISE EXCEPTION 'Vous possédez déjà ce titre valide.'; END IF;
 INSERT INTO public.prefecture_requests(id,character_id,type_id,kind,asset_id,fee,fiscal_cv,ready_at) VALUES(_request,cid,typ,_kind,_asset,fee,cv,public.game_now()+make_interval(days=>7+((hashtext(_request::text)::bigint & 2147483647)%15)::integer));
 IF fee>0 AND public.economy_cash(cid,'prefecture:'||_request,-fee,'Titre sécurisé · FICTIF','administration') THEN
  PERFORM public.economy_post('prefecture:'||_request,fee,'administration');
 END IF;
 RETURN public.prefecture_state();
END $$;
CREATE FUNCTION public.prefecture_loss(_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); BEGIN
 PERFORM public.prefecture_state();
 IF _kind IS NULL OR _kind NOT IN('identity','passport') THEN RAISE EXCEPTION 'Titre invalide.'; END IF;
 IF EXISTS(SELECT 1 FROM public.prefecture_requests WHERE character_id=cid AND type_id=_kind AND completed_at IS NULL) THEN RAISE EXCEPTION 'Demande déjà en cours.'; END IF;
 IF _kind='identity' THEN UPDATE public.character_identity SET prefecture_lost_at=coalesce(prefecture_lost_at,public.game_now()),expires_at=least(expires_at,public.game_now()::date-1) WHERE character_id=cid;
 ELSIF NOT EXISTS(SELECT 1 FROM public.administrative_documents WHERE character_id=cid AND type_id='passport' AND status='valide') THEN RAISE EXCEPTION 'Aucun passeport à déclarer.';
 END IF;
 UPDATE public.administrative_documents SET status='perime',details=details||'{"lost":true}'::jsonb WHERE character_id=cid AND type_id=_kind AND status='valide';
 RETURN public.prefecture_state(); END $$;
REVOKE ALL ON FUNCTION public.prefecture_cv(jsonb),public.prefecture_state(),public.prefecture_request(text,uuid,uuid),public.prefecture_loss(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prefecture_state(),public.prefecture_request(text,uuid,uuid),public.prefecture_loss(text) TO authenticated,service_role;
COMMIT;
