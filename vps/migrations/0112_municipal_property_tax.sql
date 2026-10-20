-- 0112: prospective municipal property receipts; existing notices/paid totals stay frozen.
-- tax_space_state replaced from latest definition, 0108; same cash/instalment engine.
-- Council uses existing simulated groups and support thresholds (>=50 votes yes).
-- Created: municipal_property_tax_rates; municipal_property_tax_receipt,
-- municipal_property_tax_set_rate, municipal_property_tax_state (SECURITY DEFINER).
-- Extended: tax_space_notices with frozen city_id/base_amount/rate_pct.
-- Modified: tax_space_state only (0108 latest): annual rate at creation, one
-- dwelling per notice; property cash deltas to municipal_ledger/treasuries;
-- income receipts still use economy_post. economy_receipt/State tables untouched.
-- Limits: council vote uses base_support (fictional council), not a new player
-- ballot/activity workflow; only mayor can submit, via petition_mayor helper.
-- Historical missing city must be resolved before install: fail atomically rather
-- than credit the resident city or State. No old amount/paid/State ledger changes.
-- Validation: 65 Vitest files / 301 tests pass; VPS SQL not executed here.
-- Manual tsgo not run: environment forbids manual typechecks (automatic harness).

BEGIN;
CREATE TABLE IF NOT EXISTS public.municipal_property_tax_rates (
 city_id text NOT NULL REFERENCES public.cities(id), year integer NOT NULL,
 rate_pct integer NOT NULL CHECK(rate_pct BETWEEN 80 AND 120),
 voted_at timestamptz NOT NULL DEFAULT public.game_now(),
 voted_by uuid NOT NULL REFERENCES public.characters(id), council_result jsonb NOT NULL,
 PRIMARY KEY(city_id,year)
);
ALTER TABLE public.municipal_property_tax_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS municipal_property_rates_read ON public.municipal_property_tax_rates;
CREATE POLICY municipal_property_rates_read ON public.municipal_property_tax_rates FOR SELECT TO authenticated USING(true);
REVOKE ALL ON public.municipal_property_tax_rates FROM anon,authenticated;
GRANT SELECT ON public.municipal_property_tax_rates TO authenticated;
GRANT ALL ON public.municipal_property_tax_rates TO service_role;
ALTER TABLE public.tax_space_notices ADD COLUMN IF NOT EXISTS city_id text REFERENCES public.cities(id),
 ADD COLUMN IF NOT EXISTS base_amount integer CHECK(base_amount>=0),
 ADD COLUMN IF NOT EXISTS rate_pct integer CHECK(rate_pct BETWEEN 80 AND 120);
-- 0108 already emits one notice per dwelling. Freeze city even if subsequently sold.
UPDATE public.tax_space_notices n SET city_id=ec.config->>'city',base_amount=n.amount,rate_pct=100
 FROM public.personal_assets pa JOIN public.economy_catalog ec ON ec.id=pa.catalog_id
 WHERE n.kind='foncier' AND n.city_id IS NULL AND n.notice_key='foncier:'||n.year||':'||pa.id
 AND EXISTS(SELECT 1 FROM public.cities c WHERE c.id=ec.config->>'city');
-- Sold assets can still be recovered from the immutable notice label/catalog name.
UPDATE public.tax_space_notices n SET city_id=(SELECT min(ec.config->>'city') FROM public.economy_catalog ec
 WHERE ec.name=n.label AND ec.config->>'realestate'='true'),base_amount=n.amount,rate_pct=100
 WHERE n.kind='foncier' AND n.city_id IS NULL AND
 (SELECT count(DISTINCT ec.config->>'city') FROM public.economy_catalog ec JOIN public.cities c ON c.id=ec.config->>'city'
 WHERE ec.name=n.label AND ec.config->>'realestate'='true')=1;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.tax_space_notices WHERE kind='foncier' AND city_id IS NULL) THEN
 RAISE EXCEPTION '0112: commune historique introuvable; corriger le rattachement avant installation (aucun paiement redirigé arbitrairement)';
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.tax_space_notices'::regclass AND conname='tax_space_property_city_required') THEN
 ALTER TABLE public.tax_space_notices ADD CONSTRAINT tax_space_property_city_required CHECK(kind<>'foncier' OR city_id IS NOT NULL);
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.municipal_property_tax_receipt(_city text,_key text,_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF _amount IS NULL OR _amount<=0 THEN RAISE EXCEPTION 'Recette invalide'; END IF;
 PERFORM 1 FROM public.municipal_treasuries WHERE city_id=_city FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trésorerie municipale absente pour %',_city; END IF;
 INSERT INTO public.municipal_ledger(city_id,entry_key,category,amount,label)
 VALUES(_city,_key,'Recettes',_amount,'Taxe foncière reçue') ON CONFLICT(entry_key) DO NOTHING;
 IF FOUND THEN UPDATE public.municipal_treasuries SET balance=balance+_amount,income=income+_amount WHERE city_id=_city; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.municipal_property_tax_set_rate(_city text,_rate integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); yr integer:=extract(year FROM public.game_now()); mid uuid; total integer; yes_count integer;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM 1 FROM public.cities WHERE id=_city FOR UPDATE;
 IF NOT FOUND OR public.petition_mayor(_city) IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Action réservée au maire de cette commune'; END IF;
 IF _rate IS NULL OR _rate NOT BETWEEN 80 AND 120 THEN RAISE EXCEPTION 'Taux entre 80 et 120 %%'; END IF;
 SELECT m.id INTO mid FROM public.municipal_mandates m WHERE m.city_id=_city AND m.status='active'
 AND m.starts_at<=public.game_now() AND m.ends_at>public.game_now() ORDER BY m.starts_at DESC LIMIT 1 FOR UPDATE;
 SELECT COALESCE(sum(seats),0),COALESCE(sum(seats) FILTER(WHERE base_support>=50),0) INTO total,yes_count
 FROM public.municipal_council_groups WHERE mandate_id=mid;
 IF total=0 OR yes_count<=total/2 THEN RAISE EXCEPTION 'Le conseil simulé ne donne pas de majorité à ce vote'; END IF;
 INSERT INTO public.municipal_property_tax_rates(city_id,year,rate_pct,voted_by,council_result)
 VALUES(_city,yr+1,_rate,cid,jsonb_build_object('yes',yes_count,'total',total,'adopted',true));
 -- Unique city/year disallows a second vote, including across mandate changes.
END $$;
CREATE OR REPLACE FUNCTION public.municipal_property_tax_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); city text; yr integer:=extract(year FROM public.game_now()); BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 SELECT city_id INTO city FROM public.characters WHERE id=cid;
 RETURN jsonb_build_object('city_id',city,'city_name',(SELECT name FROM public.cities WHERE id=city),'year',yr,
 'received',COALESCE((SELECT sum(amount) FROM public.municipal_ledger WHERE city_id=city AND label='Taxe foncière reçue'),0),
 'current_rate',COALESCE((SELECT rate_pct FROM public.municipal_property_tax_rates WHERE city_id=city AND year=yr),100),
 'next_rate',COALESCE((SELECT rate_pct FROM public.municipal_property_tax_rates WHERE city_id=city AND year=yr+1),100),
 'next_voted',EXISTS(SELECT 1 FROM public.municipal_property_tax_rates WHERE city_id=city AND year=yr+1),
 'is_mayor',public.petition_mayor(city)=cid);
END $$;
CREATE OR REPLACE FUNCTION public.tax_space_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); n public.tax_space_notices; a record; yr int:=extract(year FROM public.game_now()); due int; cash int; pay int; k text;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM public.income_tax_settle(cid);
 FOR a IN SELECT pa.id,ec.name,ec.config->>'city' AS city,COALESCE((SELECT ht.daily_cost*30 FROM public.housing_types ht WHERE ht.id=ec.config->>'type_id' AND ht.id<>'owner'),round(ec.price/240.0)::int) AS rent
 FROM public.personal_assets pa JOIN public.economy_catalog ec ON ec.id=pa.catalog_id WHERE pa.character_id=cid AND ec.config->>'realestate'='true' LOOP
 INSERT INTO public.tax_space_notices(character_id,notice_key,year,kind,label,amount,city_id,base_amount,rate_pct) VALUES(cid,'foncier:'||yr||':'||a.id,yr,'foncier',a.name,round(greatest(a.rent,0)*COALESCE((SELECT rate_pct FROM public.municipal_property_tax_rates WHERE city_id=a.city AND year=yr),100)/100.0)::int,a.city,greatest(a.rent,0),COALESCE((SELECT rate_pct FROM public.municipal_property_tax_rates WHERE city_id=a.city AND year=yr),100)) ON CONFLICT DO NOTHING;
 END LOOP;
 FOR n IN SELECT * FROM public.tax_space_notices WHERE character_id=cid ORDER BY created_at,id FOR UPDATE LOOP
 PERFORM public.post_deliver(cid,'tax-space:'||n.notice_key,'Espace fiscal · FICTIF',n.label||' — avis '||n.year,'Avis fictif : '||n.amount||' €. Consultez et imprimez votre avis dans /impots.');
 IF n.instalments IS NOT NULL AND n.paid<n.amount THEN
 due:=CASE WHEN n.instalments=1 THEN n.amount ELSE
 (n.amount/10)*least(10,1+greatest(0,(extract(year FROM age(public.game_now(),n.chosen_at))*12+extract(month FROM age(public.game_now(),n.chosen_at)))::int))
 +least(n.amount%10,least(10,1+greatest(0,(extract(year FROM age(public.game_now(),n.chosen_at))*12+extract(month FROM age(public.game_now(),n.chosen_at)))::int))) END;
 SELECT balance INTO cash FROM public.accounts WHERE character_id=cid ORDER BY created_at LIMIT 1 FOR UPDATE;
 pay:=least(greatest(due-n.paid,0),greatest(COALESCE(cash,0),0));
 IF pay>0 THEN
 k:='tax-space:'||n.id||':'||n.paid;
 IF public.economy_cash(cid,k,-pay,n.label,'impot','{}'::jsonb) THEN
 UPDATE public.tax_space_notices SET paid=paid+pay WHERE id=n.id;
 IF n.kind='foncier' THEN
   PERFORM public.municipal_property_tax_receipt(n.city_id,k,pay);
 ELSE
   PERFORM public.economy_post(k,pay,'impot');
 END IF;
 END IF;
 END IF;
 END IF;
 END LOOP;
 UPDATE public.tax_space_messages SET answer=CASE category WHEN 'revenu' THEN 'Consultez votre déclaration et le barème dans Impôts. Une déclaration automatique comporte 10 % de majoration.' WHEN 'foncier' THEN 'La base est un mois de loyer théorique (coût quotidien × 30, sinon prix ÷ 240), multiplié par le taux communal annuel. Les futurs règlements vont à la commune du logement.' ELSE 'Choisissez un paiement unique ou dix mensualités. Un impayé reste dû et sera réessayé à la prochaine consultation.' END WHERE character_id=cid AND answer IS NULL AND reply_at<=public.game_now();
 RETURN jsonb_build_object('notices',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY year DESC,created_at DESC) FROM public.tax_space_notices t WHERE character_id=cid),'[]'::jsonb),'messages',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY created_at DESC) FROM public.tax_space_messages t WHERE character_id=cid),'[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.municipal_property_tax_receipt(text,text,integer),public.municipal_property_tax_set_rate(text,integer),public.municipal_property_tax_state() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.municipal_property_tax_set_rate(text,integer),public.municipal_property_tax_state() TO authenticated,service_role;
COMMIT;
