-- CIVITAS — 0087 : compagnies d'assurance des joueurs
-- Exactement 5 000 € à la création : frais existants inclus, solde en capital.
-- Pas de nouveaux incidents, ni modification des franchises/plafonds/contrats anciens.
-- Modifie par remplacement contrôlé insurance_settle et insurance_state.
-- Ajoute le secteur au réglage des tarifs, sans changer les recettes PNJ des autres services.
-- Tout ou rien ; à appliquer une seule fois après accord.
BEGIN;

CREATE TABLE public.insurer_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  founding_total integer NOT NULL DEFAULT 5000 CHECK (founding_total > 0),
  min_percent integer NOT NULL DEFAULT 70 CHECK (min_percent > 0),
  max_percent integer NOT NULL DEFAULT 150 CHECK (max_percent >= min_percent)
);
GRANT SELECT ON public.insurer_settings TO authenticated;
GRANT ALL ON public.insurer_settings TO service_role;
ALTER TABLE public.insurer_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY insurer_settings_read ON public.insurer_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.insurer_settings (id) VALUES (1);

INSERT INTO public.business_sectors (id,label,description,location_kind,min_capital,base_revenue,per_worker,per_shift,weekly_rent,npc_wage,max_npc,sort_order)
SELECT 'assurance','Compagnie d’assurance','Cotisations des assurés et prise en charge des sinistres.','entreprise',
  s.founding_total-b.founding_fee,0,0,0,0,0,0,13
FROM public.insurer_settings s CROSS JOIN public.business_settings b WHERE s.id=1 AND b.id=1;

ALTER TABLE public.insurance_contracts ADD COLUMN insurer_id uuid REFERENCES public.businesses(id);
CREATE INDEX insurance_contracts_insurer ON public.insurance_contracts(insurer_id);

-- Ne contient ni identité de client, ni type de garantie, ni détail du sinistre.
CREATE TABLE public.insurer_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  kind text NOT NULL CHECK (kind IN ('premium','claim')),
  amount integer NOT NULL CHECK (amount >= 0),
  treasury_amount integer NOT NULL CHECK (treasury_amount >= 0),
  fictive_amount integer NOT NULL CHECK (fictive_amount >= 0),
  world_at timestamptz NOT NULL DEFAULT public.game_now(),
  CHECK (amount = treasury_amount + fictive_amount)
);
-- La clé technique contient des identifiants : elle n'est jamais lisible par les joueurs.
GRANT SELECT (id,business_id,kind,amount,treasury_amount,fictive_amount,world_at) ON public.insurer_ledger TO authenticated;
GRANT ALL ON public.insurer_ledger TO service_role;
ALTER TABLE public.insurer_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY insurer_ledger_owner ON public.insurer_ledger FOR SELECT TO authenticated USING (
  business_id IN (SELECT b.id FROM public.businesses b JOIN public.characters c ON c.id=b.owner_id WHERE c.user_id=auth.uid()));

-- Outils internes : jamais exécutables par un joueur directement.
CREATE FUNCTION public.insurer_premium(_contract uuid,_key text,_amount integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE bid uuid; active boolean; BEGIN
  SELECT insurer_id INTO bid FROM public.insurance_contracts WHERE id=_contract FOR UPDATE;
  IF bid IS NULL THEN RETURN; END IF;
  SELECT status='active' INTO active FROM public.businesses WHERE id=bid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.insurer_ledger WHERE operation_key=_key) THEN RETURN; END IF;
  IF active AND NOT public.business_move(bid,_key,_amount,'service','Cotisation assurance') THEN
    RAISE EXCEPTION 'Cotisation non enregistrée'; END IF;
  INSERT INTO public.insurer_ledger(operation_key,business_id,kind,amount,treasury_amount,fictive_amount)
  VALUES (_key,bid,'premium',_amount,CASE WHEN active THEN _amount ELSE 0 END,CASE WHEN active THEN 0 ELSE _amount END);
END $$;

CREATE FUNCTION public.insurer_claim(_contract uuid,_key text,_amount integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE bid uuid; active boolean; bal integer; funded integer:=0; BEGIN
  SELECT insurer_id INTO bid FROM public.insurance_contracts WHERE id=_contract FOR UPDATE;
  IF bid IS NULL OR _amount<=0 THEN RETURN; END IF;
  SELECT status='active' INTO active FROM public.businesses WHERE id=bid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.insurer_ledger WHERE operation_key=_key) THEN RETURN; END IF;
  IF active THEN
    SELECT balance INTO bal FROM public.business_treasuries WHERE business_id=bid FOR UPDATE;
    funded:=LEAST(_amount,GREATEST(COALESCE(bal,0),0));
    IF funded>0 AND NOT public.business_move(bid,_key,-funded,'service','Prise en charge assurance') THEN
      RAISE EXCEPTION 'Prise en charge non enregistrée'; END IF;
  END IF;
  INSERT INTO public.insurer_ledger(operation_key,business_id,kind,amount,treasury_amount,fictive_amount)
  VALUES (_key,bid,'claim',_amount,funded,_amount-funded);
END $$;

CREATE FUNCTION public.insurer_found(_name text,_request_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE total integer; fee integer; BEGIN
  SELECT founding_total INTO total FROM public.insurer_settings WHERE id=1;
  SELECT founding_fee INTO fee FROM public.business_settings WHERE id=1;
  IF fee>=total THEN RAISE EXCEPTION 'Réglages de création incompatibles'; END IF;
  RETURN public.found_business(_name,'assurance',total-fee,_request_id);
END $$;

CREATE FUNCTION public.insurer_set_price(_percent integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; bid uuid; s public.insurer_settings; BEGIN
  cid:=public.social_actor();
  SELECT * INTO s FROM public.insurer_settings WHERE id=1;
  SELECT id INTO bid FROM public.businesses WHERE owner_id=cid AND status='active' AND sector_id='assurance' FOR UPDATE;
  IF bid IS NULL THEN RAISE EXCEPTION 'Aucune compagnie d’assurance'; END IF;
  IF _percent IS NULL OR _percent NOT BETWEEN s.min_percent AND s.max_percent THEN RAISE EXCEPTION 'Tarif entre % et % %%',s.min_percent,s.max_percent; END IF;
  INSERT INTO public.service_prices(business_id,percent) VALUES (bid,_percent)
  ON CONFLICT (business_id) DO UPDATE SET percent=EXCLUDED.percent;
END $$;

CREATE FUNCTION public.insurer_subscribe(_product text,_business_id uuid,_request_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; c public.characters; s public.insurance_settings; p public.insurance_products;
  b public.businesses; ct uuid; price integer; t timestamptz:=public.game_now(); BEGIN
  cid:=public.social_actor();
  PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
  SELECT id INTO ct FROM public.insurance_contracts WHERE character_id=cid AND request_key=_request_id::text;
  IF ct IS NOT NULL THEN RETURN ct; END IF;
  IF _business_id IS NULL THEN RETURN public.subscribe_insurance(_product,_request_id); END IF;
  PERFORM public.insurance_settle(cid);
  SELECT * INTO c FROM public.characters WHERE id=cid;
  SELECT * INTO s FROM public.insurance_settings WHERE id=1;
  IF NOT s.enabled THEN RAISE EXCEPTION 'Assurances indisponibles'; END IF;
  IF c.age<s.min_age THEN RAISE EXCEPTION 'Assurance possible dès % ans',s.min_age; END IF;
  SELECT * INTO p FROM public.insurance_products WHERE id=_product AND id IN ('home','health','accident','pack');
  IF NOT FOUND THEN RAISE EXCEPTION 'Garantie non proposée par les compagnies de joueurs'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id=_business_id FOR UPDATE;
  IF NOT FOUND OR b.status<>'active' OR b.sector_id<>'assurance' THEN RAISE EXCEPTION 'Assureur indisponible'; END IF;
  IF b.city_id<>c.city_id THEN RAISE EXCEPTION 'Assureur dans une autre ville'; END IF;
  IF b.owner_id=cid THEN RAISE EXCEPTION 'Vous ne pouvez pas être votre propre assureur'; END IF;
  IF EXISTS (SELECT 1 FROM public.insurance_contracts x JOIN public.insurance_products y ON y.id=x.product_id
    WHERE x.character_id=cid AND x.status IN ('active','suspended') AND y.covers && p.covers) THEN
    RAISE EXCEPTION 'Vous êtes déjà assuré pour ce risque'; END IF;
  price:=public.service_amount(p.monthly_price,public.service_percent(b.id));
  INSERT INTO public.insurance_contracts(character_id,product_id,request_key,monthly_price,covered_from,next_due_at,insurer_id)
  VALUES (cid,p.id,_request_id::text,price,t+s.waiting_days*interval '1 day',t+s.month_days*interval '1 day',b.id) RETURNING id INTO ct;
  IF NOT public.bank_pay(cid,'premium:'||ct||':1',price,'Cotisation — '||p.name) THEN RAISE EXCEPTION 'Solde insuffisant pour la première cotisation'; END IF;
  PERFORM public.insurer_premium(ct,'premium:'||ct||':1',price);
  PERFORM public.economy_notify(cid,'insurance-start:'||ct,p.name||' souscrite','Vous êtes couvert dans '||s.waiting_days||' jours de jeu.');
  RETURN ct;
END $$;

-- Remplacements ciblés : toute divergence annule la transaction.
DO $$ DECLARE def text; old text; BEGIN
  def:=pg_get_functiondef('public.insurance_settle(uuid)'::regprocedure);
  old:='ct.months_paid := ct.months_paid + 1;';
  IF position(old IN def)=0 THEN RAISE EXCEPTION 'Cotisations introuvables'; END IF;
  def:=replace(def,old,'PERFORM public.insurer_premium(ct.id, ''premium:'' || ct.id || '':'' || (ct.months_paid + 1), ct.monthly_price); '||old);
  old:='mine := cost - ins;';
  IF position(old IN def)=0 THEN RAISE EXCEPTION 'Prise en charge introuvable'; END IF;
  def:=replace(def,old,'PERFORM public.insurer_claim(cid_contract, ''insurer-claim:'' || _cid || '':'' || w || '':'' || it.id, ins); '||old);
  EXECUTE def;
  def:=pg_get_functiondef('public.insurance_state()'::regprocedure);
  old:='''name'', p.name, ''covers'', p.covers';
  IF position(old IN def)=0 THEN RAISE EXCEPTION 'Contrats introuvables'; END IF;
  def:=replace(def,old,old||', ''insurer'', COALESCE((SELECT b.name FROM public.businesses b WHERE b.id=ct.insurer_id AND b.status=''active''), ''Assureur fictif CIVITAS'')');
  EXECUTE def;
  -- Le réglage commun reconnaît le nouveau secteur ; pas de recettes PNJ inventées.
  def:=pg_get_functiondef('public.service_set_price(integer)'::regprocedure);
  old:='IN (''garage'',''demenagement'',''immobilier'',''concession'',''construction'',''recrutement'')';
  IF position(old IN def)=0 THEN RAISE EXCEPTION '0086 doit être installé avant 0087'; END IF;
  EXECUTE replace(def,old,'IN (''garage'',''demenagement'',''immobilier'',''concession'',''construction'',''recrutement'',''assurance'')');
END $$;

CREATE FUNCTION public.insurer_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; c public.characters; b public.businesses; BEGIN
  cid:=public.social_actor(); SELECT * INTO c FROM public.characters WHERE id=cid;
  SELECT * INTO b FROM public.businesses WHERE owner_id=cid AND sector_id='assurance' AND status='active' FOR UPDATE;
  IF b.id IS NOT NULL THEN PERFORM public.business_settle(b.id); SELECT * INTO b FROM public.businesses WHERE id=b.id; END IF;
  RETURN jsonb_build_object(
    'insurance',public.insurance_state(),
    'settings',(SELECT to_jsonb(s)-'id' FROM public.insurer_settings s WHERE id=1),
    'founding_fee',(SELECT founding_fee FROM public.business_settings WHERE id=1),
    'can_found',NOT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id=cid AND status='active'),
    'providers',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'percent',public.service_percent(x.id)) ORDER BY x.name)
      FROM public.businesses x WHERE x.status='active' AND x.sector_id='assurance' AND x.city_id=c.city_id AND x.owner_id<>cid),'[]'::jsonb),
    'mine',CASE WHEN b.id IS NULL OR b.status<>'active' THEN NULL ELSE jsonb_build_object(
      'id',b.id,'name',b.name,'percent',public.service_percent(b.id),
      'balance',(SELECT balance FROM public.business_treasuries WHERE business_id=b.id),
      'contracts',(SELECT count(*) FROM public.insurance_contracts WHERE insurer_id=b.id AND status='active'),
      'ledger',COALESCE((SELECT jsonb_agg(to_jsonb(x)-'business_id'-'operation_key' ORDER BY x.world_at DESC) FROM
        (SELECT id,kind,amount,treasury_amount,fictive_amount,world_at FROM public.insurer_ledger WHERE business_id=b.id ORDER BY world_at DESC,id LIMIT 30) x),'[]'::jsonb)) END);
END $$;

REVOKE ALL ON FUNCTION public.insurer_premium(uuid,text,integer),public.insurer_claim(uuid,text,integer),
  public.insurer_found(text,uuid),public.insurer_set_price(integer),public.insurer_subscribe(text,uuid,uuid),public.insurer_state() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.insurer_found(text,uuid),public.insurer_set_price(integer),public.insurer_subscribe(text,uuid,uuid),public.insurer_state() TO authenticated;
DO $$ BEGIN
  IF (SELECT min_capital FROM public.business_sectors WHERE id='assurance')+(SELECT founding_fee FROM public.business_settings WHERE id=1)<>5000 THEN RAISE EXCEPTION 'Coût de création incorrect'; END IF;
  IF (SELECT min_percent FROM public.insurer_settings WHERE id=1)<>70 OR (SELECT max_percent FROM public.insurer_settings WHERE id=1)<>150 THEN RAISE EXCEPTION 'Tarifs incorrects'; END IF;
  IF has_function_privilege('authenticated','public.insurer_claim(uuid,text,integer)','EXECUTE') OR has_function_privilege('authenticated','public.insurer_premium(uuid,text,integer)','EXECUTE') THEN RAISE EXCEPTION 'Outil interne exposé'; END IF;
  IF position('insurer_claim' IN pg_get_functiondef('public.insurance_settle(uuid)'::regprocedure))=0 THEN RAISE EXCEPTION 'Sinistres non raccordés'; END IF;
END $$;
COMMIT;