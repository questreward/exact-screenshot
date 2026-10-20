-- 0108 — Fictional tax space; extends 0096, 0104 and 0105. Manual atomic install.
-- New tables: tax_space_notices, tax_space_messages. New functions listed below.
-- Existing: income_tax_close_year annual positive balances now belong to notices,
-- not profile debt; monthly withholding and automatic declaration +10% stay unchanged.
-- Existing returns are historical (amount=0): their debt stays in the legacy profile,
-- avoiding charging an already paid balance twice. New returns support payment choice.
-- Property formula: housing_types.daily_cost * 30 when configured type_id is rentable;
-- otherwise catalog price / 240 (20 years theoretical rent), rounded to whole euros.
-- Real estate uses config.realestate, not kind=housing (moving services).
-- Receipts go to State: catalog city slugs are not authoritative municipal pot IDs.
-- Unpaid instalments remain due, retry on read, no negative cash; as in 0096,
-- no additional late-payment fee (10% applies only to automatic annual declarations).
BEGIN;
CREATE TABLE public.tax_space_notices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
 notice_key text NOT NULL, year integer NOT NULL, kind text NOT NULL CHECK(kind IN ('revenu','foncier')),
 label text NOT NULL, amount integer NOT NULL CHECK(amount>=0),
 paid integer NOT NULL DEFAULT 0 CHECK(paid>=0 AND paid<=amount),
 instalments integer CHECK(instalments IN (1,10)), chosen_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT public.game_now(), UNIQUE(character_id,notice_key)
);
CREATE TABLE public.tax_space_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
 category text NOT NULL CHECK(category IN ('revenu','foncier','paiement')),
 body text NOT NULL CHECK(length(body) BETWEEN 10 AND 2000),
 created_at timestamptz NOT NULL DEFAULT public.game_now(),
 reply_at timestamptz NOT NULL DEFAULT public.game_now()+interval '2 days', answer text
);
ALTER TABLE public.tax_space_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_space_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tax_space_notices_owner ON public.tax_space_notices FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
CREATE POLICY tax_space_messages_owner ON public.tax_space_messages FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
GRANT SELECT ON public.tax_space_notices,public.tax_space_messages TO authenticated;
GRANT ALL ON public.tax_space_notices,public.tax_space_messages TO service_role;
INSERT INTO public.tax_space_notices(character_id,notice_key,year,kind,label,amount)
 SELECT character_id,'revenu:'||year,year,'revenu','Revenus '||year||' · historique, règlement 0096',0 FROM public.income_tax_returns;
CREATE FUNCTION public.tax_space_return_notice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.tax_space_notices(character_id,notice_key,year,kind,label,amount)
 VALUES(NEW.character_id,'revenu:'||NEW.year,NEW.year,'revenu','Revenus '||NEW.year,greatest(NEW.balance,0)) ON CONFLICT DO NOTHING;
 PERFORM public.post_deliver(NEW.character_id,'tax-space:revenu:'||NEW.year,'Espace fiscal · FICTIF','Avis d’imposition '||NEW.year,'Votre avis est disponible dans /impots. Impôt : '||NEW.tax||' €, majoration : '||NEW.late_fee||' €, prélèvements : '||NEW.withheld||' €, solde : '||NEW.balance||' €. Document fictif.');
 RETURN NEW;
END $$;
CREATE TRIGGER tax_space_return_created AFTER INSERT ON public.income_tax_returns FOR EACH ROW EXECUTE FUNCTION public.tax_space_return_notice();
CREATE OR REPLACE FUNCTION public.income_tax_close_year(_cid uuid, _year integer, _kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.income_tax_settings; inc int; wh int; r jsonb; fee int := 0; bal int; BEGIN
  SELECT * INTO s FROM public.income_tax_settings WHERE id = 1;
  IF EXISTS (SELECT 1 FROM public.income_tax_returns WHERE character_id = _cid AND year = _year) THEN RETURN; END IF;
  SELECT COALESCE(sum(income), 0), COALESCE(sum(withheld), 0) INTO inc, wh FROM public.income_tax_months WHERE character_id = _cid AND month LIKE _year || '-%';
  r := public.income_tax_compute(inc);
  IF _kind = 'automatique' THEN fee := round((r->>'tax')::int * s.late_pct / 100.0)::int; END IF;
  bal := (r->>'tax')::int + fee - wh;
  INSERT INTO public.income_tax_returns (character_id, year, income, abatement, taxable, tax, late_fee, withheld, balance, kind)
    VALUES (_cid, _year, inc, (r->>'abatement')::int, (r->>'taxable')::int, (r->>'tax')::int, fee, wh, bal, _kind);
  IF bal > 0 THEN NULL; -- positive annual balances are collected by tax_space_notices
  ELSIF bal < 0 THEN PERFORM public.economy_cash(_cid, 'tax:refund:' || _year, -bal, 'Remboursement d''impôt ' || _year, 'impot', '{}'::jsonb);
  END IF;
END $$;

CREATE FUNCTION public.tax_space_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); n public.tax_space_notices; a record; yr int:=extract(year FROM public.game_now()); due int; cash int; pay int; k text;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM public.income_tax_settle(cid);
 FOR a IN SELECT pa.id,ec.name,COALESCE((SELECT ht.daily_cost*30 FROM public.housing_types ht WHERE ht.id=ec.config->>'type_id' AND ht.id<>'owner'),round(ec.price/240.0)::int) AS rent
 FROM public.personal_assets pa JOIN public.economy_catalog ec ON ec.id=pa.catalog_id WHERE pa.character_id=cid AND ec.config->>'realestate'='true' LOOP
 INSERT INTO public.tax_space_notices(character_id,notice_key,year,kind,label,amount) VALUES(cid,'foncier:'||yr||':'||a.id,yr,'foncier',a.name,greatest(a.rent,0)) ON CONFLICT DO NOTHING;
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
 PERFORM public.economy_post(k,pay,'impot');
 END IF;
 END IF;
 END IF;
 END LOOP;
 UPDATE public.tax_space_messages SET answer=CASE category WHEN 'revenu' THEN 'Consultez votre déclaration et le barème dans Impôts. Une déclaration automatique comporte 10 % de majoration.' WHEN 'foncier' THEN 'La taxe correspond à un mois de loyer théorique : coût quotidien × 30, sinon prix catalogue ÷ 240.' ELSE 'Choisissez un paiement unique ou dix mensualités. Un impayé reste dû et sera réessayé à la prochaine consultation.' END WHERE character_id=cid AND answer IS NULL AND reply_at<=public.game_now();
 RETURN jsonb_build_object('notices',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY year DESC,created_at DESC) FROM public.tax_space_notices t WHERE character_id=cid),'[]'::jsonb),'messages',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY created_at DESC) FROM public.tax_space_messages t WHERE character_id=cid),'[]'::jsonb));
END $$;
CREATE FUNCTION public.tax_space_choose(_id uuid,_count integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); BEGIN
 IF cid IS NULL OR _count IS NULL OR _count NOT IN (1,10) THEN RAISE EXCEPTION 'Choix invalide.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 UPDATE public.tax_space_notices SET instalments=_count,chosen_at=public.game_now() WHERE id=_id AND character_id=cid AND instalments IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Avis indisponible ou choix déjà enregistré.'; END IF;
 RETURN public.tax_space_state();
END $$;
CREATE FUNCTION public.tax_space_send(_category text,_body text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 IF _category IS NULL OR _category NOT IN ('revenu','foncier','paiement') OR _body IS NULL OR length(trim(_body)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Message invalide (10 à 2000 caractères).'; END IF;
 IF (SELECT count(*) FROM public.tax_space_messages WHERE character_id=cid AND created_at>=date_trunc('day',public.game_now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=3 THEN RAISE EXCEPTION 'Maximum 3 questions par jour du jeu.'; END IF;
 INSERT INTO public.tax_space_messages(character_id,category,body) VALUES(cid,_category,trim(_body));
 RETURN public.tax_space_state();
END $$;
REVOKE ALL ON FUNCTION public.tax_space_return_notice(),public.tax_space_state(),public.tax_space_choose(uuid,integer),public.tax_space_send(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tax_space_state(),public.tax_space_choose(uuid,integer),public.tax_space_send(text,text) TO authenticated,service_role;
COMMIT;
