-- 0110 — Real, prospective economy. No historical payments are rewritten.
-- Patches use pg_get_functiondef so later installed protections remain intact;
-- every anchor is checked, and the entire install rolls back on schema drift.
BEGIN;
CREATE TABLE IF NOT EXISTS public.economy_annual_factors (
 year integer PRIMARY KEY, factor numeric NOT NULL CHECK(factor>0),
 cumulative numeric NOT NULL CHECK(cumulative>0)
);
INSERT INTO public.economy_annual_factors SELECT extract(year FROM public.game_now())::int,1,1 ON CONFLICT DO NOTHING;
ALTER TABLE public.economy_annual_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS economy_annual_read ON public.economy_annual_factors;
CREATE POLICY economy_annual_read ON public.economy_annual_factors FOR SELECT TO authenticated USING(true);
GRANT SELECT ON public.economy_annual_factors TO authenticated;
GRANT ALL ON public.economy_annual_factors TO service_role;
CREATE OR REPLACE FUNCTION public.real_economy_factor(_at timestamptz) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce((SELECT cumulative FROM public.economy_annual_factors WHERE year<=extract(year FROM _at AT TIME ZONE 'UTC') ORDER BY year DESC LIMIT 1),1)
$$;
CREATE OR REPLACE FUNCTION public.real_economy_price(_city text,_kind text,_base numeric) RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT greatest(0,round(_base*public.economy_price_index(_city,_kind)/100))::integer
$$;
CREATE OR REPLACE FUNCTION public.bank_card_check(_character uuid,_amount_cents bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE spent bigint;
BEGIN
 IF _amount_cents IS NULL OR _amount_cents<0 THEN RAISE EXCEPTION 'Montant de carte invalide.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=_character AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Non autorisé'; END IF;
 IF EXISTS(SELECT 1 FROM public.bank_profiles WHERE character_id=_character AND online_card_blocked) THEN RAISE EXCEPTION 'Carte bloquée : achat refusé.'; END IF;
 SELECT coalesce(-sum(amount),0)*100 INTO spent FROM public.economy_operations
 WHERE character_id=_character AND status='done' AND amount<0 AND kind='achat'
 AND date_trunc('month',occurred_at AT TIME ZONE 'UTC')=date_trunc('month',public.game_now() AT TIME ZONE 'UTC');
 IF spent+_amount_cents>150000 THEN RAISE EXCEPTION 'Achat refusé : plafond de carte de 1 500 € par mois dépassé.'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.real_economy_salary(_cid uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pay numeric;
BEGIN
 PERFORM public.economy_settle();
 SELECT j.salary+e.salary_bonus INTO pay FROM public.employments e JOIN public.jobs j ON j.id=e.job_id WHERE e.character_id=_cid;
 RETURN greatest(coalesce(pay,0),ceil(1400*public.economy_index('smic')))::int;
END $$;
CREATE OR REPLACE FUNCTION public.real_economy_work_pay(_cid uuid,_id uuid,_reward integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE monthly int; pay int; tips int; m text:=to_char(public.game_now() AT TIME ZONE 'UTC','YYYY-MM');
BEGIN
 PERFORM 1 FROM public.characters WHERE id=_cid FOR UPDATE;
 monthly:=public.real_economy_salary(_cid);
 pay:=greatest(_reward,ceil(monthly::numeric/(SELECT paid_shifts_month FROM public.life_settings WHERE id=1))::int);
 IF public.economy_cash(_cid,'salary:'||_id,pay,'Salaire — vacation','salaire') THEN
  IF EXISTS(SELECT 1 FROM public.employments e JOIN public.jobs j ON j.id=e.job_id WHERE e.character_id=_cid AND lower(j.title)='serveur') THEN
   SELECT floor(monthly*.15*least(100,greatest(0,coalesce((SELECT reputation FROM public.social_stats WHERE character_id=_cid),0)))/100)::int INTO tips;
   PERFORM public.economy_cash(_cid,'waiter-tips:'||m,tips,'Pourboires — '||m,'pourboire');
  END IF;
 END IF;
END $$;
ALTER TABLE public.housing_leases ADD COLUMN IF NOT EXISTS economy_base_monthly integer,
 ADD COLUMN IF NOT EXISTS economy_rent_index numeric,
 ADD COLUMN IF NOT EXISTS economy_revised_at timestamptz;
-- Baseline existing contracts unchanged; first revision is at the next anniversary.
UPDATE public.housing_leases SET economy_base_monthly=monthly,economy_rent_index=100,
 economy_revised_at=started_at WHERE economy_base_monthly IS NULL;
CREATE OR REPLACE FUNCTION public.real_economy_lease() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE city text; idx numeric;
BEGIN
 IF NEW.kind<>'location' THEN RETURN NEW; END IF;
 SELECT city_id INTO city FROM public.characters WHERE id=NEW.character_id;
 idx:=public.economy_price_index(city,'rent');
 NEW.economy_base_monthly:=NEW.monthly; NEW.economy_rent_index:=idx;
 NEW.monthly:=round(NEW.monthly*idx/100)::int;
 NEW.economy_revised_at:=NEW.started_at;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS real_economy_lease ON public.housing_leases;
CREATE TRIGGER real_economy_lease BEFORE INSERT ON public.housing_leases FOR EACH ROW EXECUTE FUNCTION public.real_economy_lease();
CREATE OR REPLACE FUNCTION public.real_economy_rent(_cid uuid,_type text,_date date) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.housing_leases; anniversary timestamptz; idx numeric; city text;
BEGIN
 SELECT * INTO l FROM public.housing_leases WHERE character_id=_cid AND status='actif' AND kind='location' ORDER BY started_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN (SELECT daily_cost FROM public.housing_types WHERE id=_type); END IF;
 anniversary:=l.started_at+make_interval(years=>greatest(0,extract(year FROM age(_date::timestamp,l.started_at AT TIME ZONE 'UTC'))::int));
 IF anniversary>l.economy_revised_at AND _date>=(anniversary AT TIME ZONE 'UTC')::date THEN
  SELECT city_id INTO city FROM public.characters WHERE id=_cid;
  idx:=public.economy_price_index(city,'rent');
  UPDATE public.housing_leases SET monthly=round(l.economy_base_monthly*idx/100)::int,
    economy_rent_index=idx,economy_revised_at=anniversary WHERE id=l.id RETURNING * INTO l;
 END IF;
 RETURN ceil(l.monthly/30.0)::int;
END $$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.economy_settle()'::regprocedure);
 IF position('  IF extract(month FROM m)=1 THEN
   INSERT INTO public.economy_annual_factors(year,factor,cumulative)
   SELECT extract(year FROM m)::int,
    s.cpi/coalesce((SELECT em.cpi FROM public.economy_months em WHERE em.month=(m-interval ''1 year'')::date),(SELECT em.cpi FROM public.economy_months em ORDER BY month LIMIT 1),s.cpi),
    coalesce((SELECT cumulative FROM public.economy_annual_factors ORDER BY year DESC LIMIT 1),1)*
    s.cpi/coalesce((SELECT em.cpi FROM public.economy_months em WHERE em.month=(m-interval ''1 year'')::date),(SELECT em.cpi FROM public.economy_months em ORDER BY month LIMIT 1),s.cpi)
   ON CONFLICT DO NOTHING;
   IF FOUND THEN
    UPDATE public.jobs j SET salary=round(j.salary*(SELECT factor FROM public.economy_annual_factors WHERE year=extract(year FROM m)::int))::int
    WHERE j.title IN (SELECT title FROM public.more_jobs_catalog WHERE category IN (''Fonction publique'',''Éducation'')) OR j.title IN (''Agent municipal'',''Secrétaire de mairie'');
   END IF;
   UPDATE public.jobs SET salary=greatest(salary,ceil(1400*s.smic_index)::int);
   s.aids_index:=s.cpi; s.state_pay_index:=s.cpi;
  END IF;' IN def)=0 THEN
  IF position('  IF extract(month FROM m)=1 THEN s.aids_index:=s.cpi; s.state_pay_index:=s.cpi; END IF;' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.economy_settle()'; END IF;
  EXECUTE replace(def,'  IF extract(month FROM m)=1 THEN s.aids_index:=s.cpi; s.state_pay_index:=s.cpi; END IF;','  IF extract(month FROM m)=1 THEN
   INSERT INTO public.economy_annual_factors(year,factor,cumulative)
   SELECT extract(year FROM m)::int,
    s.cpi/coalesce((SELECT em.cpi FROM public.economy_months em WHERE em.month=(m-interval ''1 year'')::date),(SELECT em.cpi FROM public.economy_months em ORDER BY month LIMIT 1),s.cpi),
    coalesce((SELECT cumulative FROM public.economy_annual_factors ORDER BY year DESC LIMIT 1),1)*
    s.cpi/coalesce((SELECT em.cpi FROM public.economy_months em WHERE em.month=(m-interval ''1 year'')::date),(SELECT em.cpi FROM public.economy_months em ORDER BY month LIMIT 1),s.cpi)
   ON CONFLICT DO NOTHING;
   IF FOUND THEN
    UPDATE public.jobs j SET salary=round(j.salary*(SELECT factor FROM public.economy_annual_factors WHERE year=extract(year FROM m)::int))::int
    WHERE j.title IN (SELECT title FROM public.more_jobs_catalog WHERE category IN (''Fonction publique'',''Éducation'')) OR j.title IN (''Agent municipal'',''Secrétaire de mairie'');
   END IF;
   UPDATE public.jobs SET salary=greatest(salary,ceil(1400*s.smic_index)::int);
   s.aids_index:=s.cpi; s.state_pay_index:=s.cpi;
  END IF;');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.shop_buy(text,uuid)'::regprocedure);
 IF position('  PERFORM public.bank_card_check(cid,price::bigint*100);
  ref := ''CIV-''' IN def)=0 THEN
  IF position('  ref := ''CIV-''' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.shop_buy(text,uuid)'; END IF;
  EXECUTE replace(def,'  ref := ''CIV-''','  PERFORM public.bank_card_check(cid,price::bigint*100);
  ref := ''CIV-''');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.store_buy(text,text,uuid)'::regprocedure);
 IF position('  PERFORM public.bank_card_check(cid,price::bigint*100);
  ref := ''CIV-''' IN def)=0 THEN
  IF position('  ref := ''CIV-''' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.store_buy(text,text,uuid)'; END IF;
  EXECUTE replace(def,'  ref := ''CIV-''','  PERFORM public.bank_card_check(cid,price::bigint*100);
  ref := ''CIV-''');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.travel_drive_intercity(text,text)'::regprocedure);
 IF position('fuel := public.real_economy_price(pos.city_id,''fuel'',greatest(1, round(mins * ds.fuel_per_hour / 60.0)::int));' IN def)=0 THEN
  IF position('fuel := greatest(1, round(mins * ds.fuel_per_hour / 60.0)::int);' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.travel_drive_intercity(text,text)'; END IF;
  EXECUTE replace(def,'fuel := greatest(1, round(mins * ds.fuel_per_hour / 60.0)::int);','fuel := public.real_economy_price(pos.city_id,''fuel'',greatest(1, round(mins * ds.fuel_per_hour / 60.0)::int));');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.security_settle(uuid)'::regprocedure);
 IF position('monthly := greatest(ceil(1400*public.economy_index(''smic'')),round(monthly*public.real_economy_factor(wk::timestamp AT TIME ZONE ''UTC'')));
        weekly := round(monthly * 12 / 52.0);' IN def)=0 THEN
  IF position('weekly := round(monthly * 12 / 52.0);' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.security_settle(uuid)'; END IF;
  EXECUTE replace(def,'weekly := round(monthly * 12 / 52.0);','monthly := greatest(ceil(1400*public.economy_index(''smic'')),round(monthly*public.real_economy_factor(wk::timestamp AT TIME ZONE ''UTC'')));
        weekly := round(monthly * 12 / 52.0);');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.retirement_settle(uuid)'::regprocedure);
 IF position('round(p.monthly_pension*public.real_economy_factor(m::timestamp AT TIME ZONE ''UTC'')/public.real_economy_factor(p.retired_at))::int,' IN def)=0 THEN
  IF position('p.monthly_pension,' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.retirement_settle(uuid)'; END IF;
  EXECUTE replace(def,'p.monthly_pension,','round(p.monthly_pension*public.real_economy_factor(m::timestamp AT TIME ZONE ''UTC'')/public.real_economy_factor(p.retired_at))::int,');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.retirement_settle(uuid)'::regprocedure);
 IF position('round(p.monthly_pension*public.real_economy_factor(m::timestamp AT TIME ZONE ''UTC'')/public.real_economy_factor(p.retired_at))::int) ON CONFLICT' IN def)=0 THEN
  IF position('p.monthly_pension) ON CONFLICT' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.retirement_settle(uuid)'; END IF;
  EXECUTE replace(def,'p.monthly_pension) ON CONFLICT','round(p.monthly_pension*public.real_economy_factor(m::timestamp AT TIME ZONE ''UTC'')/public.real_economy_factor(p.retired_at))::int) ON CONFLICT');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.retirement_settle(uuid)'::regprocedure);
 IF position('  PERFORM public.economy_settle();
  SELECT * INTO s FROM public.retirement_settings' IN def)=0 THEN
  IF position('  SELECT * INTO s FROM public.retirement_settings' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.retirement_settle(uuid)'; END IF;
  EXECUTE replace(def,'  SELECT * INTO s FROM public.retirement_settings','  PERFORM public.economy_settle();
  SELECT * INTO s FROM public.retirement_settings');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.settle_administration(uuid)'::regprocedure);
 IF position('round((p.result->>''amount'')::integer*public.real_economy_factor((p.result->>''starts_at'')::timestamptz+n*interval ''30 days'')/public.real_economy_factor((p.result->>''starts_at'')::timestamptz))::integer' IN def)=0 THEN
  IF position('(p.result->>''amount'')::integer' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.settle_administration(uuid)'; END IF;
  EXECUTE replace(def,'(p.result->>''amount'')::integer','round((p.result->>''amount'')::integer*public.real_economy_factor((p.result->>''starts_at'')::timestamptz+n*interval ''30 days'')/public.real_economy_factor((p.result->>''starts_at'')::timestamptz))::integer');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.settle_administration(uuid)'::regprocedure);
 IF position('  PERFORM public.economy_settle();
  SELECT * INTO s FROM public.admin_settings' IN def)=0 THEN
  IF position('  SELECT * INTO s FROM public.admin_settings' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.settle_administration(uuid)'; END IF;
  EXECUTE replace(def,'  SELECT * INTO s FROM public.admin_settings','  PERFORM public.economy_settle();
  SELECT * INTO s FROM public.admin_settings');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.start_life_activity(text,uuid,uuid)'::regprocedure);
 IF position('IF a.type=''eat'' THEN a.money_cost:=public.real_economy_price(c.city_id,''food'',a.money_cost); PERFORM public.bank_card_check(cid,a.money_cost::bigint*100); END IF; IF c.energy<a.energy_cost THEN' IN def)=0 THEN
  IF position('IF c.energy<a.energy_cost THEN' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.start_life_activity(text,uuid,uuid)'; END IF;
  EXECUTE replace(def,'IF c.energy<a.energy_cost THEN','IF a.type=''eat'' THEN a.money_cost:=public.real_economy_price(c.city_id,''food'',a.money_cost); PERFORM public.bank_card_check(cid,a.money_cost::bigint*100); END IF; IF c.energy<a.energy_cost THEN');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.settle_daily_life(uuid)'::regprocedure);
 IF position('PERFORM public.real_economy_work_pay(c.id,a.id,a.reward);' IN def)=0 THEN
  IF position('PERFORM public.economy_cash(c.id,''salary:''||a.id,a.reward,''Salaire — ''||a.title,''salaire'');' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.settle_daily_life(uuid)'; END IF;
  EXECUTE replace(def,'PERFORM public.economy_cash(c.id,''salary:''||a.id,a.reward,''Salaire — ''||a.title,''salaire'');','PERFORM public.real_economy_work_pay(c.id,a.id,a.reward);');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.pay_housing_attempt()'::regprocedure);
 IF position('cost := public.real_economy_rent(cid,h.type_id,d);' IN def)=0 THEN
  IF position('SELECT daily_cost INTO cost FROM public.housing_types WHERE id = h.type_id;' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.pay_housing_attempt()'; END IF;
  EXECUTE replace(def,'SELECT daily_cost INTO cost FROM public.housing_types WHERE id = h.type_id;','cost := public.real_economy_rent(cid,h.type_id,d);');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.settle_personal_economy(uuid)'::regprocedure);
 IF position('cost:=public.real_economy_rent(_cid,h.type_id,d); key:=''rent:''||d;' IN def)=0 THEN
  IF position('key:=''rent:''||d;' IN def)=0 THEN RAISE EXCEPTION '0110: ancre absente : %', 'public.settle_personal_economy(uuid)'; END IF;
  EXECUTE replace(def,'key:=''rent:''||d;','cost:=public.real_economy_rent(_cid,h.type_id,d); key:=''rent:''||d;');
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.student_settle(uuid)'::regprocedure);
 IF position('public.real_economy_factor(m::timestamp' IN def)=0 THEN
  IF position('amount := s.scholarship[p.scholarship_level];' IN def)=0 THEN RAISE EXCEPTION '0110: student_settle anchor missing'; END IF;
  def:=replace(def,'amount := s.scholarship[p.scholarship_level];','amount := round(s.scholarship[p.scholarship_level]*public.real_economy_factor(m::timestamp AT TIME ZONE ''UTC''))::int;');
  def:=replace(def,'  SELECT * INTO s FROM public.student_settings','  PERFORM public.economy_settle(); SELECT * INTO s FROM public.student_settings');
  EXECUTE def;
 END IF;
END $patch$;
DO $patch$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.settle_career(uuid)'::regprocedure);
 IF position('public.real_economy_factor(wk_start)' IN def)=0 THEN
  IF position($a$wk_start := lay.created_at + w * interval '7 days';$a$ IN def)=0 THEN RAISE EXCEPTION '0110: settle_career anchor missing'; END IF;
  def:=replace(def,$a$wk_start := lay.created_at + w * interval '7 days';$a$,$a$wk_start := lay.created_at + w * interval '7 days'; amount := round(floor((lay.payload->>'salary')::integer * s.unemployment_rate / 4.33)*public.real_economy_factor(wk_start)/public.real_economy_factor(lay.created_at))::int;$a$);
  def:=replace(def,'  -- Chômage :','  PERFORM public.economy_settle();
  -- Chômage :');
  EXECUTE def;
 END IF;
END $patch$;

-- Internal helpers are never player-callable. Existing RPC grants are preserved.
REVOKE ALL ON FUNCTION public.real_economy_factor(timestamptz),public.real_economy_price(text,text,numeric),
 public.bank_card_check(uuid,bigint),public.real_economy_salary(uuid),public.real_economy_work_pay(uuid,uuid,integer),
 public.real_economy_lease(),public.real_economy_rent(uuid,text,date) FROM PUBLIC,authenticated;
COMMIT;
