-- 0105 — La Poste (FICTIF, aucun logo officiel).
-- NEW TABLE: post_letters (mailbox, outgoing idempotency and postage ledger).
-- NEW FUNCTIONS: post_deliver (internal), post_state, post_send, post_update.
-- MODIFIED EXISTING OBJECT: guard_player_block (adds post_letters; preserves all branches).
-- REUSED UNMODIFIED: characters, network_is_contact, network_blocked, social_actor,
-- game_now, economy_cash, economy_post (0104 State receipt helper).
-- Whole-euro economy: cumulative postage rounded UP; prepaid cents carry forward.
-- State receives actual debited euros only. No player payments or rewards.
BEGIN;
CREATE TABLE public.post_letters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
 letter_key text NOT NULL CHECK(length(letter_key) BETWEEN 1 AND 200),
 sender_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
 sender text NOT NULL CHECK(length(sender) BETWEEN 1 AND 120),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 120),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
 registered boolean NOT NULL DEFAULT false,
 presented_at timestamptz NOT NULL DEFAULT public.game_now(),
 collected_at timestamptz, read_at timestamptz, archived boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'distribué' CHECK(status IN ('distribué','à retirer','retiré','avisé non réclamé')),
 request_id uuid, postage_cents integer NOT NULL DEFAULT 0 CHECK(postage_cents IN(0,139,536)),
 charged_euros integer NOT NULL DEFAULT 0 CHECK(charged_euros >= 0),
 UNIQUE(character_id,letter_key), UNIQUE(sender_id,request_id)
);
CREATE INDEX post_sender_day ON public.post_letters(sender_id,presented_at);
GRANT SELECT ON public.post_letters TO authenticated;
GRANT ALL ON public.post_letters TO service_role;
ALTER TABLE public.post_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_owner ON public.post_letters FOR SELECT TO authenticated USING
 (EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.guard_player_block() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a uuid; b uuid; BEGIN
  IF TG_TABLE_NAME = 'player_contacts' THEN a := NEW.requester_id; b := NEW.addressee_id;
  ELSIF TG_TABLE_NAME = 'player_follows' THEN a := NEW.follower_id; b := NEW.followed_id;
  ELSIF TG_TABLE_NAME = 'player_transfers' THEN a := NEW.sender_id; b := NEW.recipient_id;
  ELSIF TG_TABLE_NAME = 'together_invites' THEN a := NEW.inviter_id; b := NEW.invitee_id;
  ELSIF TG_TABLE_NAME = 'player_messages' THEN a := NEW.sender_id;
    SELECT CASE WHEN t.a_id = NEW.sender_id THEN t.b_id ELSE t.a_id END INTO b FROM public.player_threads t WHERE t.id = NEW.thread_id;
  ELSIF TG_TABLE_NAME = 'market_offers' THEN a := NEW.buyer_id; b := NEW.seller_id;
  ELSIF TG_TABLE_NAME = 'market_payouts' THEN a := NEW.buyer_id; b := NEW.seller_id;
  ELSIF TG_TABLE_NAME = 'post_letters' THEN a := NEW.sender_id; b := NEW.character_id;
  END IF;
  IF public.network_blocked(a, b) THEN RAISE EXCEPTION 'Interaction impossible avec ce joueur'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER guard_block BEFORE INSERT ON public.post_letters FOR EACH ROW EXECUTE FUNCTION public.guard_player_block();
CREATE FUNCTION public.post_deliver(_character uuid,_key text,_sender text,_subject text,_body text,_registered boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.characters WHERE id=_character FOR UPDATE;
 INSERT INTO public.post_letters(character_id,letter_key,sender,subject,body,registered,status)
 VALUES(_character,_key,_sender,_subject,_body,_registered,CASE WHEN _registered THEN 'à retirer' ELSE 'distribué' END)
 ON CONFLICT(character_id,letter_key) DO NOTHING;
END $$;
CREATE FUNCTION public.post_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor();
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM public.post_deliver(cid,'welcome','La Poste · FICTIF','Bienvenue dans votre boîte aux lettres','Vos courriers officiels arriveront ici. Les recommandés sont à retirer sous 15 jours du jeu.',false);
 UPDATE public.post_letters SET status='avisé non réclamé' WHERE character_id=cid AND status='à retirer' AND presented_at+interval '15 days'<=public.game_now();
 RETURN jsonb_build_object('world_now',public.game_now(),'letters',COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY presented_at DESC,id) FROM public.post_letters l WHERE character_id=cid),'[]'::jsonb));
END $$;
CREATE FUNCTION public.post_send(_target uuid,_subject text,_body text,_registered boolean,_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); cents int; total bigint; charge int; name text;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 IF _request_id IS NULL THEN RAISE EXCEPTION 'Clé requise.'; END IF;
 IF EXISTS(SELECT 1 FROM public.post_letters WHERE sender_id=cid AND request_id=_request_id) THEN RETURN public.post_state(); END IF;
 IF _target=cid OR NOT public.network_is_contact(cid,_target) OR public.network_blocked(cid,_target) THEN RAISE EXCEPTION 'Choisissez un contact autorisé.'; END IF;
 IF _subject IS NULL OR length(trim(_subject)) NOT BETWEEN 1 AND 120 OR _body IS NULL OR length(trim(_body)) NOT BETWEEN 1 AND 4000 OR _registered IS NULL THEN RAISE EXCEPTION 'Objet ou message invalide.'; END IF;
 IF (SELECT count(*) FROM public.post_letters WHERE sender_id=cid AND (presented_at AT TIME ZONE 'UTC')::date=(public.game_now() AT TIME ZONE 'UTC')::date)>=10 THEN RAISE EXCEPTION 'Limite de 10 courriers par jour du jeu.'; END IF;
 cents:=CASE WHEN _registered THEN 536 ELSE 139 END;
 SELECT COALESCE(sum(postage_cents),0) INTO total FROM public.post_letters WHERE sender_id=cid;
 charge:=ceil((total+cents)/100.0)-ceil(total/100.0);
 SELECT first_name||' '||last_name INTO name FROM public.characters WHERE id=cid;
 INSERT INTO public.post_letters(character_id,letter_key,sender_id,sender,subject,body,registered,status,request_id,postage_cents,charged_euros)
 VALUES(_target,'player:'||cid||':'||_request_id,cid,name,trim(_subject),trim(_body),_registered,CASE WHEN _registered THEN 'à retirer' ELSE 'distribué' END,_request_id,cents,charge);
 IF NOT public.economy_cash(cid,'post:'||_request_id,-charge,'Affranchissement — La Poste','poste','{}'::jsonb) THEN RAISE EXCEPTION 'Opération déjà traitée.'; END IF;
 PERFORM public.economy_post('post:'||cid||':'||_request_id,charge,'poste');
 RETURN public.post_state();
END $$;
CREATE FUNCTION public.post_update(_id uuid,_action text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor();
BEGIN
 PERFORM public.post_state();
 IF NOT EXISTS(SELECT 1 FROM public.post_letters WHERE id=_id AND character_id=cid) THEN RAISE EXCEPTION 'Courrier introuvable.'; END IF;
 IF _action NOT IN ('read','unread','archive','restore','collect') OR _action IS NULL THEN RAISE EXCEPTION 'Action invalide.'; END IF;
 UPDATE public.post_letters SET
 read_at=CASE WHEN _action='read' THEN public.game_now() WHEN _action='unread' THEN NULL ELSE read_at END,
 archived=CASE WHEN _action='archive' THEN true WHEN _action='restore' THEN false ELSE archived END,
 collected_at=CASE WHEN _action='collect' AND status='à retirer' THEN public.game_now() ELSE collected_at END,
 status=CASE WHEN _action='collect' AND status='à retirer' THEN 'retiré' ELSE status END
 WHERE id=_id AND character_id=cid;
 RETURN public.post_state();
END $$;
REVOKE ALL ON FUNCTION public.post_deliver(uuid,text,text,text,text,boolean),public.post_state(),public.post_send(uuid,text,text,boolean,uuid),public.post_update(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.post_state(),public.post_send(uuid,text,text,boolean,uuid),public.post_update(uuid,text) TO authenticated,service_role;
COMMIT;
