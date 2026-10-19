-- CIVITAS — AGENCES DE RECRUTEMENT. Proposition, non appliquée au VPS.
-- Prérequis : 0051 (embauches), 0054 (blocages), 0081–0085 (services).
-- Touchés : business_sectors (1 secteur), service_settings (2 réglages),
-- service_settle/service_set_price/service_state (listes vérifiées).
-- Ajouts : recherches volontaires, mandats sur offres, propositions, placements.
-- business_join et business_hire_npc restent inchangées ; les wrappers les réutilisent.
-- Prime caisse employeur → caisse agence, aucune dépense du candidat.
BEGIN;

INSERT INTO public.business_sectors
  (id,label,description,location_kind,min_capital,base_revenue,per_worker,per_shift,weekly_rent,npc_wage,max_npc,sort_order)
VALUES ('recrutement','Agence de recrutement','Mise en relation de candidats volontaires et d’entreprises.','entreprise',1500,120,130,70,120,110,5,11);
ALTER TABLE public.service_settings
  ADD COLUMN recruit_fee integer NOT NULL DEFAULT 200 CHECK (recruit_fee > 0),
  ADD COLUMN recruit_npc_ticket integer NOT NULL DEFAULT 150 CHECK (recruit_npc_ticket > 0);

CREATE TABLE public.recruit_seekers (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT public.game_now()
);
GRANT SELECT ON public.recruit_seekers TO authenticated;
GRANT ALL ON public.recruit_seekers TO service_role;
ALTER TABLE public.recruit_seekers ENABLE ROW LEVEL SECURITY;
CREATE POLICY recruit_seekers_owner ON public.recruit_seekers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

CREATE TABLE public.recruit_mandates (
  offer_id uuid PRIMARY KEY REFERENCES public.business_offers(id),
  agency_id uuid REFERENCES public.businesses(id),
  employer_id uuid NOT NULL REFERENCES public.businesses(id),
  fee integer NOT NULL CHECK (fee > 0),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
GRANT SELECT ON public.recruit_mandates TO authenticated;
GRANT ALL ON public.recruit_mandates TO service_role;
ALTER TABLE public.recruit_mandates ENABLE ROW LEVEL SECURITY;
CREATE POLICY recruit_mandates_parties ON public.recruit_mandates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id=b.owner_id
    WHERE b.id IN (agency_id,employer_id) AND c.user_id=auth.uid()));

CREATE TABLE public.recruit_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.recruit_mandates(offer_id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  UNIQUE (offer_id,character_id)
);
GRANT SELECT ON public.recruit_proposals TO authenticated;
GRANT ALL ON public.recruit_proposals TO service_role;
ALTER TABLE public.recruit_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY recruit_proposals_parties ON public.recruit_proposals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.recruit_mandates m JOIN public.businesses b ON b.id IN (m.agency_id,m.employer_id)
      JOIN public.characters c ON c.id=b.owner_id WHERE m.offer_id=recruit_proposals.offer_id AND c.user_id=auth.uid()));

CREATE TABLE public.recruit_placements (
  offer_id uuid PRIMARY KEY REFERENCES public.recruit_mandates(offer_id),
  character_id uuid REFERENCES public.characters(id),
  npc_id uuid REFERENCES public.social_npcs(id),
  employee_id uuid REFERENCES public.business_employees(id),
  amount integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  CHECK ((character_id IS NOT NULL AND npc_id IS NULL AND employee_id IS NOT NULL)
      OR (character_id IS NULL AND npc_id IS NOT NULL AND employee_id IS NULL))
);
GRANT SELECT ON public.recruit_placements TO authenticated;
GRANT ALL ON public.recruit_placements TO service_role;
ALTER TABLE public.recruit_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY recruit_placements_parties ON public.recruit_placements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.recruit_mandates m JOIN public.businesses b ON b.id IN (m.agency_id,m.employer_id)
      JOIN public.characters c ON c.id=b.owner_id WHERE m.offer_id=recruit_placements.offer_id AND c.user_id=auth.uid()));

CREATE FUNCTION public.recruit_seek(_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; BEGIN
  cid:=public.social_actor();
  IF _active IS NULL THEN RAISE EXCEPTION 'Choix requis'; END IF;
  IF _active AND EXISTS (SELECT 1 FROM public.business_employees WHERE character_id=cid AND status='active')
    THEN RAISE EXCEPTION 'Vous travaillez déjà dans une entreprise de joueur'; END IF;
  INSERT INTO public.recruit_seekers(character_id,active) VALUES(cid,_active)
  ON CONFLICT(character_id) DO UPDATE SET active=excluded.active,updated_at=public.game_now();
END $$;

CREATE FUNCTION public.recruit_mandate(_offer uuid,_agency uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; o public.business_offers; b public.businesses; a public.businesses; fee integer; BEGIN
  cid:=public.social_actor();
  SELECT * INTO o FROM public.business_offers WHERE id=_offer AND open FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre fermée'; END IF;
  b:=public.business_owned(cid,o.business_id);
  IF EXISTS (SELECT 1 FROM public.recruit_mandates WHERE offer_id=_offer) THEN RAISE EXCEPTION 'Offre déjà confiée'; END IF;
  SELECT recruit_fee INTO fee FROM public.service_settings WHERE id=1;
  IF _agency IS NOT NULL THEN
    SELECT * INTO a FROM public.businesses WHERE id=_agency AND status='active' AND sector_id='recrutement' FOR UPDATE;
    IF NOT FOUND OR a.city_id<>b.city_id OR a.owner_id=cid THEN RAISE EXCEPTION 'Agence indisponible'; END IF;
    IF public.network_blocked(cid,a.owner_id) THEN RAISE EXCEPTION 'Mise en relation indisponible'; END IF;
    fee:=public.service_amount(fee,public.service_percent(a.id));
  END IF;
  INSERT INTO public.recruit_mandates(offer_id,agency_id,employer_id,fee) VALUES(o.id,_agency,b.id,fee);
END $$;

CREATE FUNCTION public.recruit_propose(_offer uuid,_candidate uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; m public.recruit_mandates; a public.businesses; b public.businesses; c public.characters; BEGIN
  cid:=public.social_actor();
  SELECT * INTO m FROM public.recruit_mandates WHERE offer_id=_offer FOR UPDATE;
  IF NOT FOUND OR m.agency_id IS NULL THEN RAISE EXCEPTION 'Mandat introuvable'; END IF;
  a:=public.business_owned(cid,m.agency_id);
  SELECT * INTO b FROM public.businesses WHERE id=m.employer_id AND status='active';
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.business_offers WHERE id=_offer AND open)
    THEN RAISE EXCEPTION 'Offre fermée'; END IF;
  SELECT * INTO c FROM public.characters WHERE id=_candidate;
  IF NOT FOUND OR c.city_id<>b.city_id OR c.id=b.owner_id OR c.id=cid
    OR NOT EXISTS(SELECT 1 FROM public.recruit_seekers WHERE character_id=c.id AND active)
    OR EXISTS(SELECT 1 FROM public.business_employees WHERE character_id=c.id AND status='active')
    THEN RAISE EXCEPTION 'Candidat indisponible'; END IF;
  IF public.network_blocked(cid,c.id) OR public.network_blocked(b.owner_id,c.id)
    OR public.network_blocked(cid,b.owner_id) THEN RAISE EXCEPTION 'Mise en relation indisponible'; END IF;
  INSERT INTO public.recruit_proposals(offer_id,character_id) VALUES(_offer,_candidate)
    ON CONFLICT(offer_id,character_id) DO NOTHING;
END $$;

-- Interne : les wrappers ont verrouillé le mandat ; ordre stable des deux caisses.
CREATE FUNCTION public.recruit_pay(_offer uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.recruit_mandates; key text:='recruit:'||_offer; BEGIN
  SELECT * INTO m FROM public.recruit_mandates WHERE offer_id=_offer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mandat introuvable'; END IF;
  IF m.agency_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=m.agency_id AND status='active')
    THEN RAISE EXCEPTION 'Agence fermée'; END IF;
  PERFORM 1 FROM public.business_treasuries WHERE business_id IN (m.employer_id,m.agency_id) ORDER BY business_id FOR UPDATE;
  IF NOT public.business_move(m.employer_id,key,-m.fee,'service','Prime de recrutement')
    THEN RAISE EXCEPTION 'Caisse employeur insuffisante'; END IF;
  IF m.agency_id IS NOT NULL AND NOT public.business_move(m.agency_id,key,m.fee,'service','Placement réussi')
    THEN RAISE EXCEPTION 'Prime non encaissée'; END IF;
  RETURN m.fee;
END $$;

CREATE FUNCTION public.recruit_accept(_offer uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; m public.recruit_mandates; p public.recruit_placements; b public.businesses; a public.businesses; eid uuid; fee integer; BEGIN
  cid:=public.social_actor();
  SELECT * INTO m FROM public.recruit_mandates WHERE offer_id=_offer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mandat introuvable'; END IF;
  SELECT * INTO p FROM public.recruit_placements WHERE offer_id=_offer;
  IF FOUND THEN
    IF p.character_id=cid THEN RETURN jsonb_build_object('already',true); END IF;
    RAISE EXCEPTION 'Offre déjà pourvue';
  END IF;
  SELECT * INTO b FROM public.businesses WHERE id=m.employer_id;
  IF m.agency_id IS NOT NULL THEN
    SELECT * INTO a FROM public.businesses WHERE id=m.agency_id;
    IF NOT EXISTS(SELECT 1 FROM public.recruit_proposals WHERE offer_id=_offer AND character_id=cid)
      THEN RAISE EXCEPTION 'Proposition requise'; END IF;
    IF public.network_blocked(cid,a.owner_id) OR public.network_blocked(b.owner_id,a.owner_id)
      THEN RAISE EXCEPTION 'Mise en relation indisponible'; END IF;
  END IF;
  IF public.network_blocked(cid,b.owner_id) THEN RAISE EXCEPTION 'Mise en relation indisponible'; END IF;
  fee:=public.recruit_pay(_offer);
  eid:=public.business_join(_offer); -- contrôles, contrat et notification existants
  INSERT INTO public.recruit_placements(offer_id,character_id,employee_id,amount) VALUES(_offer,cid,eid,fee);
  UPDATE public.recruit_seekers SET active=false WHERE character_id=cid;
  RETURN jsonb_build_object('already',false);
END $$;

CREATE FUNCTION public.recruit_hire_npc(_offer uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; m public.recruit_mandates; b public.businesses; a public.businesses; nid uuid; fee integer; BEGIN
  cid:=public.social_actor();
  SELECT * INTO m FROM public.recruit_mandates WHERE offer_id=_offer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mandat introuvable'; END IF;
  b:=public.business_owned(cid,m.employer_id);
  IF EXISTS(SELECT 1 FROM public.recruit_placements WHERE offer_id=_offer) THEN RETURN jsonb_build_object('already',true); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.business_offers WHERE id=_offer AND open FOR UPDATE) THEN RAISE EXCEPTION 'Offre fermée'; END IF;
  IF m.agency_id IS NOT NULL THEN
    SELECT * INTO a FROM public.businesses WHERE id=m.agency_id;
    IF public.network_blocked(cid,a.owner_id) THEN RAISE EXCEPTION 'Mise en relation indisponible'; END IF;
  END IF;
  fee:=public.recruit_pay(_offer);
  nid:=public.business_hire_npc(b.id); -- mêmes limites, salaire PNJ et sélection qu'avant
  UPDATE public.business_offers SET open=false WHERE id=_offer;
  INSERT INTO public.recruit_placements(offer_id,npc_id,amount) VALUES(_offer,nid,fee);
  RETURN jsonb_build_object('already',false,'amount',fee);
END $$;

CREATE FUNCTION public.recruit_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; c public.characters; mine public.businesses; BEGIN
  cid:=public.social_actor(); SELECT * INTO c FROM public.characters WHERE id=cid;
  SELECT * INTO mine FROM public.businesses WHERE owner_id=cid AND status='active';
  IF mine.sector_id='recrutement' THEN PERFORM public.service_settle(mine.id); END IF;
  RETURN jsonb_build_object(
    'seeking',COALESCE((SELECT active FROM public.recruit_seekers WHERE character_id=cid),false),
    'fee',(SELECT recruit_fee FROM public.service_settings WHERE id=1),
    'agencies',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'percent',public.service_percent(b.id)))
      FROM public.businesses b WHERE b.city_id=c.city_id AND b.status='active' AND b.sector_id='recrutement'
        AND b.owner_id<>cid AND NOT public.network_blocked(cid,b.owner_id)),'[]'::jsonb),
    'offers',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',o.id,'title',o.title,'salary',o.weekly_salary,'business',b.name,
      'agency',COALESCE(a.name,'Agence fictive CIVITAS'),'mine',b.owner_id=cid,'delegated',m.offer_id IS NOT NULL,
      'fee',m.fee,'proposed',EXISTS(SELECT 1 FROM public.recruit_proposals p WHERE p.offer_id=o.id AND p.character_id=cid)))
      FROM public.business_offers o JOIN public.businesses b ON b.id=o.business_id
      LEFT JOIN public.recruit_mandates m ON m.offer_id=o.id LEFT JOIN public.businesses a ON a.id=m.agency_id
      WHERE o.open AND b.status='active' AND b.city_id=c.city_id AND NOT public.network_blocked(cid,b.owner_id)
        AND (a.id IS NULL OR (a.status='active' AND NOT public.network_blocked(cid,a.owner_id)))),'[]'::jsonb),
    'mine',CASE WHEN mine.sector_id='recrutement' THEN jsonb_build_object('id',mine.id,'name',mine.name,
      'percent',public.service_percent(mine.id),'balance',(SELECT balance FROM public.business_treasuries WHERE business_id=mine.id),
      'candidates',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ch.id,'name',ch.first_name))
        FROM public.recruit_seekers s JOIN public.characters ch ON ch.id=s.character_id WHERE s.active AND ch.city_id=c.city_id
          AND ch.id<>cid AND NOT public.network_blocked(cid,ch.id)
          AND NOT EXISTS(SELECT 1 FROM public.business_employees e WHERE e.character_id=ch.id AND e.status='active')),'[]'::jsonb),
      'mandates',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',o.id,'title',o.title,'business',b.name,'fee',m.fee))
        FROM public.recruit_mandates m JOIN public.business_offers o ON o.id=m.offer_id JOIN public.businesses b ON b.id=m.employer_id
        WHERE m.agency_id=mine.id AND o.open AND b.status='active' AND NOT public.network_blocked(cid,b.owner_id)),'[]'::jsonb),
      'weeks',COALESCE((SELECT jsonb_agg(to_jsonb(w)) FROM (SELECT week,clients,revenue FROM public.service_npc_weeks
        WHERE business_id=mine.id ORDER BY week DESC LIMIT 8) w),'[]'::jsonb)) ELSE NULL END,
    'placements',COALESCE((SELECT jsonb_agg(jsonb_build_object('title',o.title,'business',b.name,'amount',p.amount,'at',p.created_at,
      'candidate',COALESCE(ch.first_name,n.first_name||' (habitant fictif)'))) FROM public.recruit_placements p
      JOIN public.recruit_mandates m ON m.offer_id=p.offer_id JOIN public.business_offers o ON o.id=p.offer_id
      JOIN public.businesses b ON b.id=m.employer_id LEFT JOIN public.businesses a ON a.id=m.agency_id
      LEFT JOIN public.characters ch ON ch.id=p.character_id LEFT JOIN public.social_npcs n ON n.id=p.npc_id
      WHERE p.character_id=cid OR b.owner_id=cid OR a.owner_id=cid),'[]'::jsonb));
END $$;

DO $$ DECLARE f text; def text; old text:='IN (''garage'',''demenagement'',''immobilier'',''concession'',''construction'')'; BEGIN
  FOREACH f IN ARRAY ARRAY['public.service_settle(uuid)','public.service_set_price(integer)','public.service_state()'] LOOP
    def:=pg_get_functiondef(f::regprocedure);
    IF position(old IN def)=0 THEN RAISE EXCEPTION 'Liste des secteurs introuvable dans %',f; END IF;
    def:=replace(def,old,'IN (''garage'',''demenagement'',''immobilier'',''concession'',''construction'',''recrutement'')');
    IF f='public.service_settle(uuid)' THEN
      IF position('WHEN ''construction'' THEN s.build_npc_ticket' IN def)=0 THEN RAISE EXCEPTION 'Ticket construction introuvable'; END IF;
      def:=replace(def,'WHEN ''construction'' THEN s.build_npc_ticket','WHEN ''construction'' THEN s.build_npc_ticket WHEN ''recrutement'' THEN s.recruit_npc_ticket');
    END IF;
    EXECUTE def;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.recruit_pay(uuid),public.recruit_seek(boolean),public.recruit_mandate(uuid,uuid),
  public.recruit_propose(uuid,uuid),public.recruit_accept(uuid),public.recruit_hire_npc(uuid),public.recruit_state() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.recruit_seek(boolean),public.recruit_mandate(uuid,uuid),public.recruit_propose(uuid,uuid),
  public.recruit_accept(uuid),public.recruit_hire_npc(uuid),public.recruit_state() TO authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.business_sectors WHERE id='recrutement')<>1 THEN RAISE EXCEPTION 'Secteur manquant'; END IF;
  IF position('recruit_npc_ticket' IN pg_get_functiondef('public.service_settle(uuid)'::regprocedure))=0 THEN RAISE EXCEPTION 'Clients fictifs non branchés'; END IF;
  IF has_function_privilege('authenticated','public.recruit_pay(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Paiement interne exposé'; END IF;
END $$;
COMMIT;