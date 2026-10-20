-- 0106 — Banque Horizon · FICTIF (no official logos or real banking).
-- NEW TABLE: online_bank_fees (monthly paid/skipped settlement, no debt).
-- NEW FUNCTIONS: online_bank_state, online_bank_card, online_bank_transfer.
-- MODIFIED: bank_profiles adds fictional RIB and card flag; no legacy function changed.
-- REUSED: accounts, transactions, economy_operations, economy_cash, player_transfers,
-- transfer_collect, guard_player_block trigger, network_is_contact, post_deliver.
-- Card ceiling/block are INFORMATIONAL: legacy purchases remain untouched.
-- Fees begin on first read, current UTC game calendar month only; missed months skipped.
-- Insufficient funds: skip permanently for that month, no overdraft/debt/State receipt.
-- Private fictional bank fees are not State income: economy_post intentionally unused.
BEGIN;
ALTER TABLE public.bank_profiles ADD COLUMN online_iban text UNIQUE,
 ADD COLUMN online_card_blocked boolean NOT NULL DEFAULT false;
CREATE TABLE public.online_bank_fees (
 character_id uuid NOT NULL REFERENCES public.characters(id), month date NOT NULL,
 paid integer NOT NULL CHECK(paid IN(0,2)), PRIMARY KEY(character_id,month)
);
ALTER TABLE public.online_bank_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY online_bank_fees_owner ON public.online_bank_fees FOR SELECT TO authenticated USING
 (EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
GRANT SELECT ON public.online_bank_fees TO authenticated;
GRANT ALL ON public.online_bank_fees TO service_role;
CREATE FUNCTION public.online_bank_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); m date:=date_trunc('month',public.game_now() AT TIME ZONE 'UTC')::date;
 bal bigint; opening bigint; closing bigint; rows jsonb; statements jsonb:='[]'; r record; spent bigint; rib text; n bigint; fee int;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 INSERT INTO public.bank_profiles(character_id,score) VALUES(cid,70) ON CONFLICT DO NOTHING;
 SELECT online_iban INTO rib FROM public.bank_profiles WHERE character_id=cid;
 IF rib IS NULL THEN
  n:=mod(('x'||substr(md5(cid::text),1,12))::bit(48)::bigint,100000000000);
  LOOP
   rib:='FR760000000000'||lpad(n::text,11,'0')||'00';
   BEGIN UPDATE public.bank_profiles SET online_iban=rib WHERE character_id=cid; EXIT;
   EXCEPTION WHEN unique_violation THEN n:=mod(n+1,100000000000); END;
  END LOOP;
 END IF;
 PERFORM public.transfer_collect(cid);
 SELECT sum(balance) INTO bal FROM public.accounts WHERE character_id=cid;
 IF bal IS NULL THEN RAISE EXCEPTION 'Compte introuvable.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.online_bank_fees WHERE character_id=cid AND month=m) THEN
  PERFORM 1 FROM public.accounts WHERE character_id=cid FOR UPDATE;
  SELECT CASE WHEN min(balance)>=2 THEN 2 ELSE 0 END INTO fee FROM public.accounts WHERE character_id=cid;
  INSERT INTO public.online_bank_fees VALUES(cid,m,fee);
  IF fee=2 THEN PERFORM public.economy_cash(cid,'online-bank-fee:'||m,-2,'Tenue de compte — FICTIF','banque'); END IF;
 END IF;
 SELECT sum(balance) INTO bal FROM public.accounts WHERE character_id=cid;
 PERFORM public.post_deliver(cid,'online-bank-welcome','Banque Horizon · FICTIF','Votre carte et votre RIB fictifs',rib||' · BIC FICTFRPPXXX. Plafond indicatif : 1 500 €/mois. Aucun usage bancaire réel.');
 FOR r IN SELECT DISTINCT date_trunc('month',coalesce(t.world_at,t.created_at) AT TIME ZONE 'UTC')::date AS month
 FROM public.transactions t JOIN public.accounts a ON a.id=t.account_id WHERE a.character_id=cid
 UNION SELECT m ORDER BY month DESC LOOP
  SELECT bal-coalesce(sum(t.amount) FILTER(WHERE coalesce(t.world_at,t.created_at)>=r.month::timestamp AT TIME ZONE 'UTC'),0),
   bal-coalesce(sum(t.amount) FILTER(WHERE coalesce(t.world_at,t.created_at)>=(r.month+interval '1 month') AT TIME ZONE 'UTC'),0)
  INTO opening,closing FROM public.transactions t JOIN public.accounts a ON a.id=t.account_id WHERE a.character_id=cid;
  SELECT coalesce(jsonb_agg(jsonb_build_object('at',coalesce(t.world_at,t.created_at),'label',t.label,'amount',t.amount,'category',t.category) ORDER BY coalesce(t.world_at,t.created_at),t.id),'[]') INTO rows
  FROM public.transactions t JOIN public.accounts a ON a.id=t.account_id WHERE a.character_id=cid AND date_trunc('month',coalesce(t.world_at,t.created_at) AT TIME ZONE 'UTC')::date=r.month;
  statements:=statements||jsonb_build_array(jsonb_build_object('month',r.month,'opening',opening,'closing',closing,'movements',rows));
  IF r.month<m THEN PERFORM public.post_deliver(cid,'online-bank-statement:'||r.month,'Banque Horizon · FICTIF','Relevé mensuel disponible','Votre relevé du '||r.month||' est consultable et imprimable dans votre espace Banque.'); END IF;
 END LOOP;
 SELECT coalesce(-sum(o.amount),0) INTO spent FROM public.economy_operations o WHERE o.character_id=cid AND o.status='done' AND o.amount<0 AND o.kind IN('achat') AND date_trunc('month',o.occurred_at AT TIME ZONE 'UTC')::date=m;
 RETURN jsonb_build_object('balance',bal,'iban',rib,'bic','FICTFRPPXXX','blocked',(SELECT online_card_blocked FROM public.bank_profiles WHERE character_id=cid),'spent',spent,'ceiling',1500,'fee',2,'statements',statements,'fees',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY month DESC) FROM public.online_bank_fees f WHERE character_id=cid),'[]'));
END $$;
CREATE FUNCTION public.online_bank_card(_blocked boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); BEGIN
 IF _blocked IS NULL THEN RAISE EXCEPTION 'État requis.'; END IF;
 PERFORM public.online_bank_state();
 UPDATE public.bank_profiles SET online_card_blocked=_blocked WHERE character_id=cid;
 RETURN public.online_bank_state(); END $$;
CREATE FUNCTION public.online_bank_transfer(_target uuid,_amount integer,_request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); tid uuid; BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 IF _request IS NULL THEN RAISE EXCEPTION 'Clé requise.'; END IF;
 IF EXISTS(SELECT 1 FROM public.player_transfers WHERE sender_id=cid AND request_key=_request::text) THEN RETURN public.online_bank_state(); END IF;
 IF _amount IS NULL OR _amount NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Montant : 1 à 5 000 €.'; END IF;
 IF _target IS NULL OR _target=cid OR NOT public.network_is_contact(cid,_target) OR public.network_blocked(cid,_target) THEN RAISE EXCEPTION 'Contact autorisé requis.'; END IF;
 IF (SELECT count(*) FROM public.player_transfers WHERE sender_id=cid AND created_at>public.game_now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'Limite de 10 virements par jour du jeu.'; END IF;
 INSERT INTO public.player_transfers(sender_id,recipient_id,request_key,amount,note) VALUES(cid,_target,_request::text,_amount,'Banque Horizon · FICTIF') RETURNING id INTO tid;
 PERFORM public.economy_cash(cid,'transfer-out:'||tid,-_amount,'Virement bancaire','virement',jsonb_build_object('transfer',tid));
 RETURN public.online_bank_state(); END $$;
REVOKE ALL ON FUNCTION public.online_bank_state(),public.online_bank_card(boolean),public.online_bank_transfer(uuid,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.online_bank_state(),public.online_bank_card(boolean),public.online_bank_transfer(uuid,integer,uuid) TO authenticated,service_role;
COMMIT;
