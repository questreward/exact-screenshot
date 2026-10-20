-- 0104 — Unified economy, prospective indices and public Conjoncture.
-- NEW TABLES: economy_settings, economy_months, economy_city_prices,
-- economy_city_history, state_treasury, state_ledger.
-- NEW FUNCTIONS: economy_post, economy_receipt, economy_settle, economy_index,
-- economy_price_index, economy_state. All internal functions revoked from players.
-- EXISTING OBJECTS MODIFIED: AFTER triggers only on income_tax_profiles (actual
-- paid_total delta, NOT assessed withholding), transport_ledger (paid fines only),
-- security_ledger, student_ledger, retirement_payments, career_ledger (outlays).
-- events receives uniquely keyed macro news; publish_world_event reuses news/TV.
-- No existing function bodies, municipal pots, historical payments or prices changed.
-- WIRED: confirmed tax/fine receipts; security pay, scholarships, unemployment and
-- pensions fund State outlays (zero cash financed by explicit debt). No backfill.
-- DISPLAY / prospective API ONLY: SMIC, aids/pensions/state-pay revaluation and
-- food/rent/fuel indices. Legacy payment/purchase RPCs deliberately unchanged;
-- CAF, other state jobs, works, other fees/purchases are NOT routed by this migration.
-- Growth is a population-growth proxy, unemployment is player non-employment.
-- Catch-up freezes the latest observed unemployment/population; crisis timing uses
-- event intervals, never headlines. No fictional 12-month pre-install history.
BEGIN;
CREATE TABLE public.economy_settings (
 id integer PRIMARY KEY CHECK(id=1), baseline_annual numeric NOT NULL DEFAULT .02 CHECK(baseline_annual>=0),
 crisis_monthly numeric NOT NULL DEFAULT .004 CHECK(crisis_monthly>=0),
 unemployment_pressure numeric NOT NULL DEFAULT .0005 CHECK(unemployment_pressure>=0),
 fuel_shock numeric NOT NULL DEFAULT .10 CHECK(fuel_shock BETWEEN .05 AND .15),
 last_month date NOT NULL, cpi numeric NOT NULL DEFAULT 1 CHECK(cpi>0),
 smic_index numeric NOT NULL DEFAULT 1 CHECK(smic_index>=1), aids_index numeric NOT NULL DEFAULT 1 CHECK(aids_index>=1),
 state_pay_index numeric NOT NULL DEFAULT 1 CHECK(state_pay_index>=1), unemployment numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.economy_months (
 month date PRIMARY KEY, inflation numeric NOT NULL, cpi numeric NOT NULL, smic numeric NOT NULL,
 unemployment numeric NOT NULL, growth numeric NOT NULL, budget bigint NOT NULL, debt bigint NOT NULL
);
CREATE TABLE public.economy_city_prices (
 city_id text PRIMARY KEY REFERENCES public.cities(id), population bigint NOT NULL CHECK(population>=0),
 food numeric NOT NULL DEFAULT 100 CHECK(food BETWEEN 80 AND 130),
 rent numeric NOT NULL DEFAULT 100 CHECK(rent BETWEEN 80 AND 130),
 fuel numeric NOT NULL DEFAULT 100 CHECK(fuel BETWEEN 80 AND 130)
);
CREATE TABLE public.economy_city_history (
 city_id text REFERENCES public.cities(id), month date REFERENCES public.economy_months(month),
 food numeric NOT NULL CHECK(food BETWEEN 80 AND 130), rent numeric NOT NULL CHECK(rent BETWEEN 80 AND 130),
 fuel numeric NOT NULL CHECK(fuel BETWEEN 80 AND 130), PRIMARY KEY(city_id,month)
);
CREATE TABLE public.state_treasury (
 id integer PRIMARY KEY CHECK(id=1), balance bigint NOT NULL DEFAULT 0 CHECK(balance>=0),
 debt bigint NOT NULL DEFAULT 0 CHECK(debt>=0), income bigint NOT NULL DEFAULT 0 CHECK(income>=0),
 expenses bigint NOT NULL DEFAULT 0 CHECK(expenses>=0)
);
CREATE TABLE public.state_ledger (
 entry_key text PRIMARY KEY, amount bigint NOT NULL, category text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT public.game_now()
);
INSERT INTO public.state_treasury(id) VALUES(1);
INSERT INTO public.economy_settings(id,last_month) VALUES(1,date_trunc('month',public.game_now() AT TIME ZONE 'UTC')::date);
INSERT INTO public.economy_city_prices(city_id,population)
 SELECT c.id,c.population+(SELECT count(*) FROM public.character_positions p WHERE p.city_id=c.id) FROM public.cities c;
INSERT INTO public.economy_months SELECT last_month,0,1,1400,0,0,0,0 FROM public.economy_settings;
INSERT INTO public.economy_city_history SELECT city_id,s.last_month,food,rent,fuel FROM public.economy_city_prices CROSS JOIN public.economy_settings s;
GRANT SELECT ON public.economy_settings,public.economy_months,public.economy_city_prices,public.economy_city_history,public.state_treasury TO authenticated;
GRANT ALL ON public.economy_settings,public.economy_months,public.economy_city_prices,public.economy_city_history,public.state_treasury,public.state_ledger TO service_role;
ALTER TABLE public.economy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_city_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_city_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY economy_settings_read ON public.economy_settings FOR SELECT TO authenticated USING(true);
CREATE POLICY economy_months_read ON public.economy_months FOR SELECT TO authenticated USING(true);
CREATE POLICY economy_city_read ON public.economy_city_prices FOR SELECT TO authenticated USING(true);
CREATE POLICY economy_city_history_read ON public.economy_city_history FOR SELECT TO authenticated USING(true);
CREATE POLICY state_treasury_read ON public.state_treasury FOR SELECT TO authenticated USING(true);

CREATE FUNCTION public.economy_post(_key text,_amount bigint,_category text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.state_treasury; shortage bigint;
BEGIN
 SELECT * INTO t FROM public.state_treasury WHERE id=1 FOR UPDATE;
 INSERT INTO public.state_ledger(entry_key,amount,category) VALUES(_key,_amount,_category) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN; END IF;
 shortage:=greatest(0,-_amount-t.balance);
 UPDATE public.state_treasury SET balance=greatest(0,balance+_amount),debt=debt+shortage,
 income=income+greatest(0,_amount),expenses=expenses+greatest(0,-_amount) WHERE id=1;
END $$;
CREATE FUNCTION public.economy_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE amount bigint:=0; k text;
BEGIN
 IF TG_TABLE_NAME='income_tax_profiles' THEN
   amount:=NEW.paid_total-OLD.paid_total; k:=NEW.paid_total::text;
 ELSIF TG_TABLE_NAME='transport_ledger' THEN
   IF NEW.kind NOT IN ('radar','amende_transport','controle') THEN RETURN NEW; END IF;
   amount:=greatest(0,NEW.amount-NEW.unpaid); k:=NEW.key;
 ELSIF TG_TABLE_NAME='security_ledger' THEN
   IF NEW.kind NOT IN ('salaire','indemnite') THEN RETURN NEW; END IF;
   amount:=-greatest(0,NEW.amount); k:=NEW.key;
 ELSIF TG_TABLE_NAME='student_ledger' THEN
   IF NEW.kind<>'bourse' THEN RETURN NEW; END IF;
   amount:=-greatest(0,NEW.amount); k:=NEW.key;
 ELSIF TG_TABLE_NAME='career_ledger' THEN
   IF NEW.kind<>'chomage' THEN RETURN NEW; END IF;
   amount:=-greatest(0,(NEW.payload->>'amount')::bigint); k:=NEW.key;
 ELSE amount:=-greatest(0,NEW.amount); k:=NEW.month;
 END IF;
 IF amount<>0 THEN PERFORM public.economy_post(TG_TABLE_NAME||':'||NEW.character_id||':'||k,amount,TG_TABLE_NAME); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER economy_tax_receipt AFTER UPDATE OF paid_total ON public.income_tax_profiles FOR EACH ROW WHEN(NEW.paid_total>OLD.paid_total) EXECUTE FUNCTION public.economy_receipt();
CREATE TRIGGER economy_transport_receipt AFTER INSERT ON public.transport_ledger FOR EACH ROW EXECUTE FUNCTION public.economy_receipt();
CREATE TRIGGER economy_security_outlay AFTER INSERT ON public.security_ledger FOR EACH ROW EXECUTE FUNCTION public.economy_receipt();
CREATE TRIGGER economy_student_outlay AFTER INSERT ON public.student_ledger FOR EACH ROW EXECUTE FUNCTION public.economy_receipt();
CREATE TRIGGER economy_pension_outlay AFTER INSERT ON public.retirement_payments FOR EACH ROW EXECUTE FUNCTION public.economy_receipt();
CREATE TRIGGER economy_unemployment_outlay AFTER INSERT ON public.career_ledger FOR EACH ROW EXECUTE FUNCTION public.economy_receipt();

CREATE FUNCTION public.economy_settle() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.economy_settings; m date; target date:=date_trunc('month',public.game_now() AT TIME ZONE 'UTC')::date;
 u numeric; r numeric; pop bigint; oldpop bigint; growth numeric; crisis boolean; eid uuid;
BEGIN
 SELECT * INTO s FROM public.economy_settings WHERE id=1 FOR UPDATE;
 SELECT coalesce(100.0*count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM public.employments e WHERE e.character_id=c.id))/nullif(count(*),0),0) INTO u FROM public.characters c;
 INSERT INTO public.economy_city_prices(city_id,population) SELECT c.id,c.population+(SELECT count(*) FROM public.character_positions p WHERE p.city_id=c.id) FROM public.cities c ON CONFLICT DO NOTHING;
 m:=(s.last_month+interval '1 month')::date;
 WHILE m<=target LOOP
  SELECT EXISTS(SELECT 1 FROM public.events e WHERE e.status IN ('scheduled','published','active') AND e.game_category IN ('crise','penurie','crisis','shortage') AND e.starts_at<(m+interval '1 month') AT TIME ZONE 'UTC' AND e.ends_at>m::timestamp AT TIME ZONE 'UTC') INTO crisis;
  r:=power(1+s.baseline_annual,1.0/12)-1+greatest(0,s.unemployment-u)*s.unemployment_pressure+CASE WHEN crisis THEN s.crisis_monthly ELSE 0 END;
  s.cpi:=s.cpi*(1+r);
  IF extract(month FROM m)=1 OR s.cpi/s.smic_index>1.02 THEN s.smic_index:=s.cpi; END IF;
  IF extract(month FROM m)=1 THEN s.aids_index:=s.cpi; s.state_pay_index:=s.cpi; END IF;
  SELECT sum(population) INTO oldpop FROM public.economy_city_prices;
  SELECT sum(c.population+(SELECT count(*) FROM public.character_positions p WHERE p.city_id=c.id)) INTO pop FROM public.cities c;
  growth:=coalesce(100.0*(pop-oldpop)/nullif(oldpop,0),0);
  UPDATE public.economy_city_prices p SET food=least(130,greatest(80,p.food*(1+r))),fuel=least(130,greatest(80,p.fuel*(1+r))),
   rent=least(130,greatest(80,p.rent*(1+least(.03,greatest(0,(c.population+(SELECT count(*) FROM public.character_positions cp WHERE cp.city_id=c.id)-p.population)::numeric/greatest(1,p.population)))))),
   population=c.population+(SELECT count(*) FROM public.character_positions cp WHERE cp.city_id=c.id) FROM public.cities c WHERE c.id=p.city_id;
  INSERT INTO public.economy_months SELECT m,r*100,s.cpi,round(1400*s.smic_index,2),u,growth,income-expenses,debt FROM public.state_treasury WHERE id=1 ON CONFLICT DO NOTHING;
  INSERT INTO public.economy_city_history SELECT city_id,m,food,rent,fuel FROM public.economy_city_prices ON CONFLICT DO NOTHING;
  IF r>=.005 OR abs(u-s.unemployment)>=2 OR abs(growth)>=3 THEN
   INSERT INTO public.events(event_key,title,description,news_body,starts_at,scope,category,importance,source_id,target_kind)
    VALUES('economy:'||m,'Conjoncture : les indicateurs évoluent',format('Inflation mensuelle : %s %%. SMIC : %s €. Chômage : %s %%.',round(r*100,2),round(1400*s.smic_index,2),round(u,2)),format('Inflation mensuelle : %s %%. SMIC : %s €.',round(r*100,2),round(1400*s.smic_index,2)),public.game_now(),'national','Économie',75,'civitas-matin','general') ON CONFLICT(event_key) DO NOTHING;
   SELECT id INTO eid FROM public.events WHERE event_key='economy:'||m;
   PERFORM public.publish_world_event(eid);
  END IF;
  s.unemployment:=u; s.last_month:=m; m:=(m+interval '1 month')::date;
 END LOOP;
 UPDATE public.economy_settings SET last_month=s.last_month,cpi=s.cpi,smic_index=s.smic_index,aids_index=s.aids_index,state_pay_index=s.state_pay_index,unemployment=u WHERE id=1;
END $$;
CREATE FUNCTION public.economy_index(_kind text) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.economy_settle();
 IF _kind NOT IN ('smic','aids','state_pay') OR _kind IS NULL THEN RAISE EXCEPTION 'Indice inconnu.'; END IF;
 RETURN (SELECT CASE _kind WHEN 'smic' THEN smic_index WHEN 'aids' THEN aids_index ELSE state_pay_index END FROM public.economy_settings WHERE id=1);
END $$;
CREATE FUNCTION public.economy_price_index(_city text,_kind text) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v numeric; shock numeric;
BEGIN
 PERFORM public.economy_settle();
 IF _kind NOT IN ('food','rent','fuel') OR _kind IS NULL THEN RAISE EXCEPTION 'Prix inconnu.'; END IF;
 SELECT CASE _kind WHEN 'food' THEN food WHEN 'rent' THEN rent ELSE fuel END INTO v FROM public.economy_city_prices WHERE city_id=_city;
 IF v IS NULL THEN RAISE EXCEPTION 'Ville inconnue.'; END IF;
 IF _kind='fuel' AND EXISTS(SELECT 1 FROM public.events e WHERE e.status IN ('scheduled','published','active') AND e.game_category IN ('crise','penurie','crisis','shortage') AND (e.city_id IS NULL OR e.city_id=_city) AND e.starts_at<=public.game_now() AND public.game_now()<e.starts_at+interval '7 days' AND e.ends_at>public.game_now()) THEN
  SELECT fuel_shock INTO shock FROM public.economy_settings WHERE id=1; v:=v*(1+shock);
 END IF;
 RETURN least(130,greatest(80,v));
END $$;
CREATE FUNCTION public.economy_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.economy_settle();
 RETURN jsonb_build_object('smic',round(1400*(SELECT smic_index FROM public.economy_settings WHERE id=1),2),
 'treasury',(SELECT to_jsonb(t)-'id' FROM public.state_treasury t WHERE id=1),
 'history',coalesce((SELECT jsonb_agg(to_jsonb(h) ORDER BY month DESC) FROM (SELECT * FROM public.economy_months ORDER BY month DESC LIMIT 12) h),'[]'::jsonb),
 'cities',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'food',public.economy_price_index(c.id,'food'),'rent',public.economy_price_index(c.id,'rent'),'fuel',public.economy_price_index(c.id,'fuel')) ORDER BY c.name) FROM public.cities c),'[]'::jsonb),
 'city_history',coalesce((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.month DESC,h.city_id) FROM public.economy_city_history h WHERE month>=(SELECT last_month-interval '11 months' FROM public.economy_settings WHERE id=1)),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.economy_post(text,bigint,text),public.economy_receipt(),public.economy_settle(),public.economy_index(text),public.economy_price_index(text,text),public.economy_state() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.economy_index(text),public.economy_price_index(text,text),public.economy_state() TO authenticated,service_role;
COMMIT;
