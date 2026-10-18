ALTER TABLE public.employments ADD COLUMN salary_bonus integer NOT NULL DEFAULT 0, ADD COLUMN promotion_level integer NOT NULL DEFAULT 0;
CREATE FUNCTION public.economy_cash(_cid uuid,_key text,_amount integer,_label text,_category text,_payload jsonb DEFAULT '{}') RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE acc public.accounts; BEGIN
IF NOT EXISTS(SELECT 1 FROM public.characters WHERE id=_cid AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
IF EXISTS(SELECT 1 FROM public.economy_operations WHERE character_id=_cid AND operation_key=_key) THEN RETURN false; END IF;
SELECT * INTO acc FROM public.accounts WHERE character_id=_cid FOR UPDATE;
IF NOT FOUND OR acc.balance+_amount<0 THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
INSERT INTO public.economy_operations(character_id,operation_key,kind,amount,payload) VALUES(_cid,_key,_category,_amount,_payload);
UPDATE public.accounts SET balance=balance+_amount WHERE id=acc.id;
IF _amount<>0 THEN INSERT INTO public.transactions(account_id,amount,label,category,operation_key,world_at) VALUES(acc.id,_amount,_label,_category,_key,public.game_now()); END IF;
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.economy_cash(uuid,text,integer,text,text,jsonb) FROM PUBLIC;
CREATE FUNCTION public.economy_notify(_cid uuid,_key text,_title text,_body text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.economy_operations(character_id,operation_key,kind) VALUES(_cid,'notify:'||_key,'notification') ON CONFLICT DO NOTHING;
IF FOUND THEN INSERT INTO public.notifications(user_id,title,body,world_at) SELECT user_id,_title,_body,public.game_now() FROM public.characters WHERE id=_cid; END IF; END $$;
REVOKE ALL ON FUNCTION public.economy_notify(uuid,text,text,text) FROM PUBLIC;
CREATE FUNCTION public.economy_progress(_cid uuid,_metric text) RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE v integer; BEGIN
IF NOT EXISTS(SELECT 1 FROM public.characters WHERE id=_cid AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
CASE _metric WHEN 'cash' THEN SELECT a.balance+COALESCE((SELECT sum(saved) FROM public.economy_goals WHERE character_id=_cid AND kind='saving'),0) INTO v FROM public.accounts a WHERE a.character_id=_cid;
WHEN 'assets' THEN SELECT COALESCE(sum(purchase_price),0) INTO v FROM public.personal_assets WHERE character_id=_cid;
WHEN 'vehicle' THEN SELECT count(*) INTO v FROM public.personal_assets a JOIN public.economy_catalog c ON c.id=a.catalog_id WHERE a.character_id=_cid AND c.kind='vehicle';
WHEN 'training' THEN SELECT count(*) INTO v FROM public.economy_operations WHERE character_id=_cid AND kind='training_complete';
WHEN 'move' THEN SELECT count(*) INTO v FROM public.economy_operations WHERE character_id=_cid AND kind='move_complete';
WHEN 'job' THEN SELECT count(*) INTO v FROM public.employments WHERE character_id=_cid;
WHEN 'studies' THEN SELECT progress INTO v FROM public.study_enrollments WHERE character_id=_cid;
WHEN 'social' THEN SELECT reputation INTO v FROM public.social_stats WHERE character_id=_cid;
WHEN 'politics' THEN SELECT reputation INTO v FROM public.political_stats WHERE character_id=_cid;
ELSE v:=0; END CASE; RETURN COALESCE(v,0); END $$;
REVOKE ALL ON FUNCTION public.economy_progress(uuid,text) FROM PUBLIC;
CREATE FUNCTION public.settle_personal_economy(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c public.characters; b public.personal_budgets; h public.character_housing; cost integer; d date; asset record; key text; g public.economy_goals; t timestamptz:=public.game_now(); amount integer; BEGIN
SELECT * INTO c FROM public.characters WHERE id=_cid AND user_id=auth.uid() FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Non autorisé'; END IF;
INSERT INTO public.personal_budgets(character_id) VALUES(_cid) ON CONFLICT DO NOTHING;
SELECT * INTO b FROM public.personal_budgets WHERE character_id=_cid;
IF b.auto_rent AND b.next_rent IS NOT NULL THEN
SELECT * INTO h FROM public.character_housing WHERE character_id=_cid FOR UPDATE; SELECT daily_cost INTO cost FROM public.housing_types WHERE id=h.type_id;
d:=b.next_rent; WHILE d<=(t AT TIME ZONE 'UTC')::date LOOP
key:='rent:'||d;
IF h.last_paid_date IS DISTINCT FROM d AND NOT EXISTS(SELECT 1 FROM public.economy_operations WHERE character_id=_cid AND operation_key=key) THEN
IF (SELECT balance FROM public.accounts WHERE character_id=_cid)>=cost THEN PERFORM public.economy_cash(_cid,key,-cost,'Logement — '||d,'logement'); UPDATE public.character_housing SET last_paid_date=d WHERE character_id=_cid;
ELSE INSERT INTO public.economy_operations(character_id,operation_key,kind,amount,status) VALUES(_cid,key,'logement',-cost,'failed') ON CONFLICT DO NOTHING; PERFORM public.economy_notify(_cid,key,'Logement non payé','Solde insuffisant. Aucune dette créée.'); END IF; END IF; d:=d+1; END LOOP;
UPDATE public.personal_budgets SET next_rent=d WHERE character_id=_cid;
PERFORM public.economy_notify(_cid,'rent-reminder:'||d,'Prochaine dépense de logement','Le prochain paiement est prévu demain dans le monde.'); END IF;
FOR asset IN SELECT a.*,ec.config,ec.name FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id=a.catalog_id WHERE a.character_id=_cid AND a.next_maintenance<=t FOR UPDATE OF a LOOP
WHILE asset.next_maintenance<=t LOOP key:='maintenance:'||asset.id||':'||asset.next_maintenance; cost:=COALESCE((asset.config->>'maintenance')::integer,0);
IF NOT EXISTS(SELECT 1 FROM public.economy_operations WHERE character_id=_cid AND operation_key=key) THEN
IF (SELECT balance FROM public.accounts WHERE character_id=_cid)>=cost THEN PERFORM public.economy_cash(_cid,key,-cost,'Entretien — '||asset.name,'transport'); UPDATE public.personal_assets SET condition='Bon état' WHERE id=asset.id;
ELSE INSERT INTO public.economy_operations(character_id,operation_key,kind,amount,status) VALUES(_cid,key,'transport',-cost,'failed') ON CONFLICT DO NOTHING; UPDATE public.personal_assets SET condition='Entretien nécessaire' WHERE id=asset.id; PERFORM public.economy_notify(_cid,'maintenance:'||asset.id,'Entretien non payé','Solde insuffisant : véhicule indisponible jusqu’à entretien.'); END IF; END IF;
asset.next_maintenance:=asset.next_maintenance+GREATEST(1,COALESCE((asset.config->>'maintenance_days')::integer,7))*interval '1 day'; END LOOP;
UPDATE public.personal_assets SET next_maintenance=asset.next_maintenance WHERE id=asset.id; END LOOP;
FOR g IN SELECT * FROM public.economy_goals WHERE character_id=_cid LOOP
amount:=CASE WHEN g.kind='saving' THEN g.saved ELSE public.economy_progress(_cid,g.metric) END;
IF amount>=g.target AND NOT g.notified THEN UPDATE public.economy_goals SET status='achieved',notified=true WHERE id=g.id; PERFORM public.economy_notify(_cid,'goal:'||g.id,CASE WHEN g.kind='saving' THEN 'Objectif d’épargne atteint' ELSE 'Projet de vie accompli' END,g.name);
ELSIF amount>=g.target*0.8 AND amount<g.target THEN PERFORM public.economy_notify(_cid,'goal-near:'||g.id,'Objectif presque atteint',g.name); END IF; END LOOP;
IF (SELECT balance FROM public.accounts WHERE character_id=_cid)<50 THEN PERFORM public.economy_notify(_cid,'low:'||(t AT TIME ZONE 'UTC')::date,'Solde faible','Votre disponible est inférieur à 50 €.'); END IF;
END $$; REVOKE ALL ON FUNCTION public.settle_personal_economy(uuid) FROM PUBLIC;
CREATE FUNCTION public.economy_activity_completed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p jsonb:=NEW.economy_payload; cat public.economy_catalog; cid uuid:=NEW.character_id; key text:='complete:'||NEW.id; g integer; skill text; BEGIN
IF NEW.type<>'economy' OR NEW.status<>'completed' OR OLD.status<>'running' THEN RETURN NEW; END IF;
IF EXISTS(SELECT 1 FROM public.economy_operations WHERE character_id=cid AND operation_key=key) THEN RETURN NEW; END IF;
SELECT * INTO cat FROM public.economy_catalog WHERE id=p->>'catalog_id';
IF p->>'action'='training' THEN
skill:=p->>'skill'; g:=(p->>'gain')::integer;
UPDATE public.characters SET progression=jsonb_set(progression,ARRAY[skill],to_jsonb(COALESCE((progression->>skill)::integer,0)+g)) WHERE id=cid;
INSERT INTO public.economy_operations(character_id,operation_key,kind,payload) VALUES(cid,key,'training_complete',p);
INSERT INTO public.career_history(character_id,kind,label) VALUES(cid,'formation',cat.name);
PERFORM public.economy_notify(cid,key,'Formation terminée',cat.name||' — '||skill||' +'||g);
ELSIF p->>'action'='move' THEN
UPDATE public.character_housing SET type_id=p->>'type_id',location_id=(p->>'location_id')::uuid WHERE character_id=cid;
INSERT INTO public.economy_operations(character_id,operation_key,kind,payload) VALUES(cid,key,'move_complete',p);
PERFORM public.economy_notify(cid,key,'Déménagement terminé','Votre nouveau logement est actif.');
ELSIF p->>'action'='travel' THEN
UPDATE public.character_positions cp SET location_id=l.id,district_id=l.district_id,updated_at=now() FROM public.locations l WHERE l.id=(p->>'location_id')::uuid AND cp.character_id=cid AND l.city_id=cp.city_id;
INSERT INTO public.economy_operations(character_id,operation_key,kind,payload) VALUES(cid,key,'travel_complete',p);
END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.economy_activity_completed() FROM PUBLIC;
CREATE TRIGGER economy_completion AFTER UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.economy_activity_completed();
CREATE FUNCTION public.personal_economy_action(_command text,_request_id uuid,_input jsonb DEFAULT '{}') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cid uuid; c public.characters; cat public.economy_catalog; goal public.economy_goals; n integer; key text; lid uuid; aid uuid; t timestamptz:=public.game_now(); payload jsonb; target public.locations; asset public.personal_assets; emp public.employments; j public.jobs; BEGIN
cid:=public.prepare_daily_life(); SELECT * INTO c FROM public.characters WHERE id=cid FOR UPDATE; key:='request:'||_request_id;
IF EXISTS(SELECT 1 FROM public.economy_operations WHERE character_id=cid AND operation_key=key) THEN RETURN; END IF;
IF _command='goal' THEN
IF (SELECT count(*) FROM public.economy_goals WHERE character_id=cid AND status='active')>=8 THEN RAISE EXCEPTION 'Huit objectifs actifs maximum'; END IF;
IF _input->>'kind' NOT IN('saving','project') OR _input->>'metric' NOT IN('cash','assets','vehicle','training','move','job','studies','social','politics') THEN RAISE EXCEPTION 'Objectif inconnu'; END IF;
INSERT INTO public.economy_goals(character_id,name,kind,target,metric,target_date,request_id) VALUES(cid,btrim(_input->>'name'),_input->>'kind',(_input->>'target')::integer,_input->>'metric',NULLIF(_input->>'date','')::date,_request_id);
ELSIF _command IN('save','withdraw') THEN
n:=(_input->>'amount')::integer; IF n IS NULL OR n<=0 THEN RAISE EXCEPTION 'Montant positif requis'; END IF;
SELECT * INTO goal FROM public.economy_goals WHERE id=(_input->>'goal_id')::uuid AND character_id=cid AND kind='saving' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Objectif introuvable'; END IF;
IF _command='withdraw' AND goal.saved<n THEN RAISE EXCEPTION 'Épargne insuffisante'; END IF;
IF _command='save' AND goal.saved+n>goal.target THEN RAISE EXCEPTION 'Montant supérieur à la cible'; END IF;
PERFORM public.economy_cash(cid,key,CASE WHEN _command='save' THEN -n ELSE n END,CASE WHEN _command='save' THEN 'Épargne — ' ELSE 'Retrait épargne — ' END||goal.name,'epargne',_input);
UPDATE public.economy_goals SET saved=saved+CASE WHEN _command='save' THEN n ELSE -n END,status=CASE WHEN saved+CASE WHEN _command='save' THEN n ELSE -n END>=target THEN 'achieved' ELSE 'active' END WHERE id=goal.id;
ELSIF _command='budget' THEN
FOR n IN SELECT value::integer FROM jsonb_each_text(COALESCE(_input->'planned','{}')) LOOP IF n<0 OR n>1000000 THEN RAISE EXCEPTION 'Budget invalide'; END IF; END LOOP;
UPDATE public.personal_budgets SET planned=COALESCE(_input->'planned',planned),auto_rent=COALESCE((_input->>'auto_rent')::boolean,auto_rent),next_rent=CASE WHEN (_input->>'auto_rent')::boolean AND NOT auto_rent THEN (t AT TIME ZONE 'UTC')::date+1 ELSE next_rent END WHERE character_id=cid;
ELSIF _command IN('buy','training','move','travel','maintain') THEN
SELECT * INTO cat FROM public.economy_catalog WHERE id=_input->>'catalog_id'; IF NOT FOUND THEN RAISE EXCEPTION 'Choix inconnu'; END IF;
IF c.age<COALESCE((cat.config->>'min_age')::integer,16) THEN RAISE EXCEPTION 'Âge insuffisant'; END IF;
IF cat.config ? 'license' AND COALESCE((c.progression->>(cat.config->>'license'))::integer,0)<1 THEN RAISE EXCEPTION 'Permis requis'; END IF;
IF _command='buy' THEN
IF cat.kind NOT IN('item','vehicle') THEN RAISE EXCEPTION 'Achat invalide'; END IF;
IF EXISTS(SELECT 1 FROM public.personal_assets WHERE character_id=cid AND catalog_id=cat.id) THEN RETURN; END IF;
PERFORM public.economy_cash(cid,key,-cat.price,'Achat — '||cat.name,cat.category);
INSERT INTO public.personal_assets(character_id,catalog_id,purchase_price,next_maintenance) VALUES(cid,cat.id,cat.price,CASE WHEN cat.kind='vehicle' THEN t+COALESCE((cat.config->>'maintenance_days')::integer,7)*interval '1 day' END);
ELSIF _command='maintain' THEN
SELECT * INTO asset FROM public.personal_assets WHERE character_id=cid AND catalog_id=cat.id FOR UPDATE; IF NOT FOUND OR asset.condition<>'Entretien nécessaire' THEN RAISE EXCEPTION 'Aucun entretien nécessaire'; END IF;
PERFORM public.economy_cash(cid,key,-COALESCE((cat.config->>'maintenance')::integer,0),'Entretien — '||cat.name,'transport'); UPDATE public.personal_assets SET condition='Bon état',next_maintenance=t+7*interval '1 day' WHERE id=asset.id;
ELSE
IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=cid AND status='running') THEN RAISE EXCEPTION 'Une activité est déjà en cours'; END IF;
IF _command='training' THEN
IF cat.kind<>'training' THEN RAISE EXCEPTION 'Formation inconnue'; END IF;
IF COALESCE((c.progression->>(cat.config->>'skill'))::integer,0)<COALESCE((cat.config->>'required')::integer,0) THEN RAISE EXCEPTION 'Compétence insuffisante'; END IF;
IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=cid AND type='economy' AND economy_payload->>'catalog_id'=cat.id AND status IN('running','completed')) THEN RAISE EXCEPTION 'Formation déjà suivie'; END IF;
SELECT id INTO lid FROM public.locations WHERE city_id=c.city_id AND kind=cat.location_kind AND accessible AND district_id IS NOT NULL ORDER BY name LIMIT 1;
payload:=jsonb_build_object('action','training','catalog_id',cat.id,'skill',cat.config->>'skill','gain',(cat.config->>'gain')::integer);
ELSIF _command='move' THEN
IF cat.kind<>'housing' THEN RAISE EXCEPTION 'Logement inconnu'; END IF;
SELECT * INTO target FROM public.locations WHERE id=(_input->>'location_id')::uuid AND city_id=c.city_id AND kind='logement' AND accessible AND district_id IS NOT NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Logement indisponible'; END IF;
IF EXISTS(SELECT 1 FROM public.character_housing WHERE character_id=cid AND type_id=cat.id AND location_id=target.id) THEN RAISE EXCEPTION 'Déjà votre logement'; END IF;
lid:=(SELECT location_id FROM public.character_positions WHERE character_id=cid); payload:=jsonb_build_object('action','move','catalog_id',cat.id,'type_id',cat.id,'location_id',target.id);
ELSE
IF cat.kind<>'vehicle' THEN RAISE EXCEPTION 'Véhicule inconnu'; END IF;
SELECT * INTO asset FROM public.personal_assets WHERE character_id=cid AND catalog_id=cat.id AND condition='Bon état'; IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule indisponible'; END IF;
SELECT * INTO target FROM public.locations WHERE id=(_input->>'location_id')::uuid AND city_id=c.city_id AND accessible AND district_id IS NOT NULL; IF NOT FOUND OR target.id=(SELECT location_id FROM public.character_positions WHERE character_id=cid) THEN RAISE EXCEPTION 'Destination inaccessible'; END IF;
lid:=(SELECT location_id FROM public.character_positions WHERE character_id=cid); cat.duration_minutes:=COALESCE((cat.config->>'travel_minutes')::integer,10); cat.energy_cost:=0; cat.price:=COALESCE((cat.config->>'usage')::integer,0); payload:=jsonb_build_object('action','travel','catalog_id',cat.id,'location_id',target.id);
END IF;
IF lid IS NULL THEN RAISE EXCEPTION 'Lieu indisponible'; END IF;
IF _command='training' AND lid<>(SELECT location_id FROM public.character_positions WHERE character_id=cid) THEN RAISE EXCEPTION 'Rejoignez le centre de formation'; END IF;
IF c.energy<cat.energy_cost THEN RAISE EXCEPTION 'Énergie insuffisante'; END IF;
IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=cid AND status='planned' AND start_time<t+cat.duration_minutes*interval '1 minute' AND end_time>t) THEN RAISE EXCEPTION 'Cette activité chevauche votre agenda'; END IF;
PERFORM public.economy_cash(cid,key,-cat.price,CASE _command WHEN 'training' THEN 'Formation — ' WHEN 'move' THEN 'Déménagement — ' ELSE 'Trajet — ' END||cat.name,cat.category);
UPDATE public.characters SET energy=energy-cat.energy_cost WHERE id=cid;
INSERT INTO public.activities(character_id,type,title,start_time,end_time,location_id,energy_cost,money_cost,status,source_key,economy_payload) VALUES(cid,'economy',CASE _command WHEN 'training' THEN 'Formation — ' WHEN 'move' THEN 'Déménagement — ' ELSE 'Trajet — ' END||cat.name,t,t+cat.duration_minutes*interval '1 minute',lid,cat.energy_cost,cat.price,'running',key,payload) RETURNING id INTO aid;
END IF;
ELSIF _command='quit' THEN
IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=cid AND status='running') THEN RAISE EXCEPTION 'Terminez votre activité'; END IF;
SELECT * INTO emp FROM public.employments WHERE character_id=cid; IF NOT FOUND THEN RAISE EXCEPTION 'Aucun emploi'; END IF;
INSERT INTO public.career_history(character_id,kind,label) SELECT cid,'départ',title FROM public.jobs WHERE id=emp.job_id;
UPDATE public.activities SET status='cancelled' WHERE character_id=cid AND type='work' AND status='planned';
DELETE FROM public.employments WHERE character_id=cid; UPDATE public.characters SET situation='En recherche d’emploi' WHERE id=cid;
ELSIF _command='career' THEN
IF c.age<18 OR c.path_id<>'student' OR COALESCE((SELECT progress FROM public.study_enrollments WHERE character_id=cid),0)<100 THEN RAISE EXCEPTION '18 ans et niveau académique 2 requis'; END IF;
IF c.progression->>'career_active'='true' THEN RETURN; END IF;
UPDATE public.characters SET progression=progression||'{"career_active":true}',situation='Jeune actif — en recherche d’emploi' WHERE id=cid;
INSERT INTO public.career_history(character_id,kind,label) VALUES(cid,'parcours','Étudiant → Jeune actif');
UPDATE public.activities SET status='cancelled' WHERE character_id=cid AND type='course' AND status='planned';
ELSIF _command='promotion' THEN
SELECT * INTO emp FROM public.employments WHERE character_id=cid FOR UPDATE; SELECT * INTO j FROM public.jobs WHERE id=emp.job_id;
IF NOT FOUND OR emp.promotion_level>=1 OR emp.progress<100 OR COALESCE((c.progression->>'Communication')::integer,0)<2 THEN RAISE EXCEPTION 'Promotion : 100 points d’expérience et Communication niveau 2 requis'; END IF;
UPDATE public.employments SET salary_bonus=200,promotion_level=1 WHERE character_id=cid;
UPDATE public.activities SET reward=(j.salary+200)/(SELECT paid_shifts_month FROM public.life_settings WHERE id=1) WHERE character_id=cid AND type='work' AND status='planned';
INSERT INTO public.career_history(character_id,kind,label) VALUES(cid,'promotion',j.title||' confirmé — +200 € / mois');
UPDATE public.characters SET situation=j.title||' confirmé' WHERE id=cid;
ELSE RAISE EXCEPTION 'Action inconnue'; END IF;
INSERT INTO public.economy_operations(character_id,operation_key,kind,payload) VALUES(cid,key,_command,_input) ON CONFLICT DO NOTHING;
PERFORM public.settle_personal_economy(cid); END $$;
REVOKE ALL ON FUNCTION public.personal_economy_action(text,uuid,jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.personal_economy_action(text,uuid,jsonb) TO authenticated;
DO $$ DECLARE def text; BEGIN
SELECT pg_get_functiondef('public.prepare_daily_life()'::regprocedure) INTO def;
def:=replace(def,'RETURN c.id;','PERFORM public.settle_personal_economy(c.id); RETURN c.id;');
def:=replace(def,'j.salary/s.paid_shifts_month','(j.salary+emp.salary_bonus)/s.paid_shifts_month');
def:=replace(def,'IF e.character_id IS NOT NULL THEN','IF e.character_id IS NOT NULL AND COALESCE(c.progression->>''career_active'',''false'')<>''true'' THEN'); EXECUTE def;
SELECT pg_get_functiondef('public.start_life_activity(text,uuid,uuid)'::regprocedure) INTO def;
def:=replace(def,'''governance''','''governance'',''economy''');
def:=replace(def,'a.reward:=j.salary/s.paid_shifts_month;','a.reward:=(j.salary+COALESCE((SELECT salary_bonus FROM public.employments WHERE character_id=cid),0))/s.paid_shifts_month;'); EXECUTE def;
SELECT pg_get_functiondef('public.apply_job(uuid)'::regprocedure) INTO def;
def:=replace(def,'c.path_id NOT IN(''young_worker'',''early_career'')','c.path_id NOT IN(''young_worker'',''early_career'') AND COALESCE(c.progression->>''career_active'',''false'')<>''true'''); EXECUTE def;
SELECT pg_get_functiondef('public.settle_daily_life(uuid)'::regprocedure) INTO def;
def:=replace(def,'c.path_id IN(''young_worker'',''early_career'')','(c.path_id IN(''young_worker'',''early_career'') OR c.progression->>''career_active''=''true'')');
def:=replace(def,'accepted:=','accepted:= (j.economy_skill IS NULL OR COALESCE((c.progression->>j.economy_skill)::integer,0)>=j.economy_level) AND ');
EXECUTE def;
END $$;