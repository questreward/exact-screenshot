-- 0116 — RSA fictif : droits privés, déclaration du trimestre précédent,
-- règlement prospectif sur lecture, sans rappel des mois suspendus.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.rsa_settings') IS NOT NULL THEN RAISE EXCEPTION '0116 déjà installée : ne pas relancer'; END IF;
 IF to_regprocedure('public.economy_post(text,bigint,text)') IS NULL OR to_regprocedure('public.real_economy_factor(timestamp with time zone)') IS NULL
 OR to_regprocedure('public.aging_settle(uuid)') IS NULL OR to_regclass('public.unemployment_declarations') IS NULL
 OR to_regclass('public.student_profiles') IS NULL THEN RAISE EXCEPTION 'Prérequis RSA manquants'; END IF;
END $$;
CREATE TABLE public.rsa_settings (
 id integer PRIMARY KEY CHECK(id=1), base numeric NOT NULL CHECK(base>0),
 couple_rate numeric NOT NULL CHECK(couple_rate>=0), child_rate numeric NOT NULL CHECK(child_rate>=0),
 extra_child_rate numeric NOT NULL CHECK(extra_child_rate>=0), housing_rate numeric NOT NULL CHECK(housing_rate BETWEEN 0 AND 1),
 reference_factor numeric NOT NULL CHECK(reference_factor>0)
);
INSERT INTO public.rsa_settings VALUES(1,646,.5,.3,.4,.12,public.real_economy_factor(public.game_now()));
CREATE TABLE public.rsa_claims (
 character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
 requested_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.rsa_declarations (
 character_id uuid NOT NULL REFERENCES public.rsa_claims(character_id) ON DELETE CASCADE,
 quarter date NOT NULL CHECK(quarter=date_trunc('quarter',quarter)::date),
 salary numeric NOT NULL CHECK(salary BETWEEN 0 AND 100000000),
 unemployment numeric NOT NULL CHECK(unemployment BETWEEN 0 AND 100000000),
 pension numeric NOT NULL CHECK(pension BETWEEN 0 AND 100000000),
 free_housing boolean NOT NULL, declared_at timestamptz NOT NULL DEFAULT public.game_now(),
 PRIMARY KEY(character_id,quarter)
);
CREATE TABLE public.rsa_payments (
 character_id uuid NOT NULL REFERENCES public.rsa_claims(character_id) ON DELETE CASCADE,
 month date NOT NULL CHECK(month=date_trunc('month',month)::date),
 amount integer NOT NULL CHECK(amount>=0), calculation jsonb NOT NULL,
 paid_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(character_id,month)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['rsa_settings','rsa_claims','rsa_declarations','rsa_payments'] LOOP
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 IF t='rsa_settings' THEN
 EXECUTE format('CREATE POLICY rsa_read ON public.%I FOR SELECT TO authenticated USING(true)',t);
 ELSE
 EXECUTE format('CREATE POLICY rsa_owner ON public.%I FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()))',t);
 END IF;
 END LOOP;
END $$;
CREATE FUNCTION public.rsa_calculate(_cid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.rsa_settings; d public.rsa_declarations; kids integer; paired boolean; eligible boolean; reason text;
 b numeric; gross numeric; housing numeric; resources numeric; q date:=date_trunc('quarter',public.game_now() AT TIME ZONE 'UTC')::date;
BEGIN
 SELECT * INTO cfg FROM public.rsa_settings WHERE id=1;
 SELECT count(*) INTO kids FROM public.children WHERE (parent_a=_cid OR parent_b=_cid) AND status='home'
 AND born_at+make_interval(days=>18*(SELECT child_days_per_year FROM public.family_settings WHERE id=1))>public.game_now();
 SELECT EXISTS(SELECT 1 FROM public.couples WHERE (a_id=_cid OR b_id=_cid) AND status='couple') INTO paired;
 reason:=CASE
 WHEN EXISTS(SELECT 1 FROM public.study_enrollments WHERE character_id=_cid) OR EXISTS(SELECT 1 FROM public.student_profiles WHERE character_id=_cid AND program_id IS NOT NULL) THEN 'Les étudiants sont exclus.'
 WHEN (SELECT age FROM public.characters WHERE id=_cid)<25 AND kids=0 THEN '25 ans ou un enfant à charge requis.'
 WHEN NOT EXISTS(SELECT 1 FROM public.career_ledger WHERE character_id=_cid AND kind='licenciement') THEN 'Inscription à Espace Emploi requise.'
 ELSE NULL END;
 eligible:=reason IS NULL;
 SELECT * INTO d FROM public.rsa_declarations WHERE character_id=_cid AND quarter=q;
 b:=round(cfg.base*public.real_economy_factor(public.game_now())/cfg.reference_factor,2);
 gross:=round(b*(1+CASE WHEN paired THEN cfg.couple_rate ELSE 0 END+least(kids,2)*cfg.child_rate+greatest(kids-2,0)*cfg.extra_child_rate),2);
 resources:=coalesce((d.salary+d.unemployment+d.pension)/3,0);
 housing:=CASE WHEN coalesce(d.free_housing,false) OR EXISTS(SELECT 1 FROM public.administrative_procedures WHERE character_id=_cid AND type_id='housing_aid' AND status='acceptee' AND (result->>'ends_at')::timestamptz>public.game_now()) THEN round(b*cfg.housing_rate,2) ELSE 0 END;
 RETURN jsonb_build_object('eligible',eligible,'reason',reason,'quarter',q,'resource_start',(q-interval '3 months')::date,'resource_end',q-1,
 'declared',d.character_id IS NOT NULL,'base',b,'couple',paired,'children',kids,'gross',gross,'resources',round(resources,2),'housing',housing,
 'amount',CASE WHEN eligible AND d.character_id IS NOT NULL THEN greatest(0,floor(gross-resources-housing)) ELSE 0 END);
END $$;
CREATE FUNCTION public.rsa_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); calc jsonb; m date:=date_trunc('month',public.game_now() AT TIME ZONE 'UTC')::date; a integer; k text;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Non autorisé'; END IF;
 PERFORM public.aging_settle(cid);
 PERFORM public.economy_settle();
 calc:=public.rsa_calculate(cid);
 IF EXISTS(SELECT 1 FROM public.rsa_claims WHERE character_id=cid) AND (calc->>'eligible')::boolean AND (calc->>'declared')::boolean THEN
 a:=(calc->>'amount')::integer; k:='rsa:'||cid||':'||m;
 INSERT INTO public.rsa_payments(character_id,month,amount,calculation) VALUES(cid,m,a,calc) ON CONFLICT DO NOTHING;
 IF FOUND AND a>0 THEN
  PERFORM public.economy_post(k,-a::bigint,'rsa');
  IF NOT public.economy_cash(cid,k,a,'RSA — '||m,'aide') THEN RAISE EXCEPTION 'Incohérence du paiement RSA'; END IF;
 END IF;
 END IF;
 RETURN jsonb_build_object('world_now',public.game_now(),'requested',EXISTS(SELECT 1 FROM public.rsa_claims WHERE character_id=cid),'calculation',calc,
 'payments',coalesce((SELECT jsonb_agg(to_jsonb(p)-'character_id' ORDER BY month DESC) FROM public.rsa_payments p WHERE character_id=cid),'[]'::jsonb));
END $$;
CREATE FUNCTION public.rsa_apply() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); calc jsonb;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Non autorisé'; END IF;
 PERFORM public.aging_settle(cid); calc:=public.rsa_calculate(cid);
 IF NOT (calc->>'eligible')::boolean THEN RAISE EXCEPTION '%',calc->>'reason'; END IF;
 INSERT INTO public.rsa_claims(character_id) VALUES(cid) ON CONFLICT DO NOTHING;
 RETURN public.rsa_state();
END $$;
CREATE FUNCTION public.rsa_declare(_quarter date,_salary numeric,_unemployment numeric,_pension numeric,_free_housing boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); prior public.rsa_declarations;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Non autorisé'; END IF;
 IF _quarter IS DISTINCT FROM date_trunc('quarter',public.game_now() AT TIME ZONE 'UTC')::date THEN RAISE EXCEPTION 'Trimestre courant requis'; END IF;
 IF _salary IS NULL OR _unemployment IS NULL OR _pension IS NULL OR _free_housing IS NULL
 OR _salary NOT BETWEEN 0 AND 100000000 OR _unemployment NOT BETWEEN 0 AND 100000000 OR _pension NOT BETWEEN 0 AND 100000000 THEN RAISE EXCEPTION 'Ressources invalides'; END IF;
 SELECT * INTO prior FROM public.rsa_declarations WHERE character_id=cid AND quarter=_quarter;
 IF FOUND THEN
 IF (prior.salary,prior.unemployment,prior.pension,prior.free_housing) IS DISTINCT FROM (_salary,_unemployment,_pension,_free_housing) THEN RAISE EXCEPTION 'Déclaration déjà enregistrée'; END IF;
 ELSE
 INSERT INTO public.rsa_declarations(character_id,quarter,salary,unemployment,pension,free_housing) VALUES(cid,_quarter,_salary,_unemployment,_pension,_free_housing);
 END IF;
 RETURN public.rsa_state();
END $$;
REVOKE ALL ON FUNCTION public.rsa_calculate(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_calculate(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.rsa_state(),public.rsa_apply(),public.rsa_declare(date,numeric,numeric,numeric,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_state(),public.rsa_apply(),public.rsa_declare(date,numeric,numeric,numeric,boolean) TO authenticated,service_role;
DO $$ DECLARE t text; BEGIN
 IF (SELECT count(*) FROM public.rsa_settings)<>1 THEN RAISE EXCEPTION 'Configuration RSA absente'; END IF;
 FOREACH t IN ARRAY ARRAY['rsa_settings','rsa_claims','rsa_declarations','rsa_payments'] LOOP
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass) OR EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated')) r(n) CROSS JOIN (VALUES('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(n) WHERE has_table_privilege(r.n,'public.'||t,p.n)) THEN RAISE EXCEPTION 'Permissions RSA invalides : %',t; END IF;
 END LOOP;
 IF has_function_privilege('authenticated','public.rsa_calculate(uuid)','EXECUTE') OR has_function_privilege('anon','public.rsa_state()','EXECUTE') THEN RAISE EXCEPTION 'RPC RSA exposée'; END IF;
END $$;
COMMIT;
