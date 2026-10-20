-- Présidence nationale : les RPC sont la seule surface d'accès aux données privées.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.cp_settings') IS NOT NULL THEN RAISE EXCEPTION '0117 déjà installée : ne pas relancer'; END IF;
 IF to_regclass('public.volunteer_attachments') IS NULL OR to_regclass('public.state_ledger') IS NULL
 OR to_regprocedure('public.security_start_shift(uuid)') IS NULL
 OR to_regprocedure('public.economy_post(text,bigint,text)') IS NULL
 OR to_regprocedure('public.economy_notify(uuid,text,text,text)') IS NULL
 OR (SELECT count(*) FROM public.volunteer_branches)<>5 THEN RAISE EXCEPTION 'Prérequis 0094/0104/0114 et cinq antennes requis'; END IF;
END $$;
CREATE TABLE public.cp_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), installed_at timestamptz NOT NULL DEFAULT public.game_now(),
 indemnity integer NOT NULL DEFAULT 300 CHECK(indemnity>=0), subsidy integer NOT NULL DEFAULT 300 CHECK(subsidy>=0),
 candidacy_days integer NOT NULL DEFAULT 7 CHECK(candidacy_days>0), vote_days integer NOT NULL DEFAULT 7 CHECK(vote_days>0),
 mandate_years integer NOT NULL DEFAULT 1 CHECK(mandate_years=1), operations_per_week integer NOT NULL DEFAULT 1 CHECK(operations_per_week=1),
 message_limit integer NOT NULL DEFAULT 2000 CHECK(message_limit BETWEEN 1 AND 10000), operation_slots integer NOT NULL DEFAULT 10 CHECK(operation_slots>0)
);
INSERT INTO public.cp_settings DEFAULT VALUES;
CREATE TABLE public.cp_elections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), predecessor uuid UNIQUE REFERENCES public.cp_elections(id),
 opens_at timestamptz NOT NULL, vote_at timestamptz NOT NULL, closes_at timestamptz NOT NULL UNIQUE,
 ends_at timestamptz NOT NULL, settled boolean NOT NULL DEFAULT false, winner uuid REFERENCES public.characters(id),
 CHECK(opens_at<vote_at AND vote_at<closes_at AND closes_at<ends_at)
);
CREATE UNIQUE INDEX cp_first_election ON public.cp_elections ((true)) WHERE predecessor IS NULL;
INSERT INTO public.cp_elections(opens_at,vote_at,closes_at,ends_at)
SELECT installed_at,installed_at+candidacy_days*interval '1 day',installed_at+(candidacy_days+vote_days)*interval '1 day',
 installed_at+(candidacy_days+vote_days)*interval '1 day'+interval '1 year' FROM public.cp_settings;
CREATE TABLE public.cp_candidates (
 election_id uuid REFERENCES public.cp_elections(id), character_id uuid REFERENCES public.characters(id),
 PRIMARY KEY(election_id,character_id)
);
CREATE TABLE public.cp_ballots (
 election_id uuid NOT NULL, voter uuid REFERENCES public.characters(id), candidate uuid NOT NULL,
 PRIMARY KEY(election_id,voter), FOREIGN KEY(election_id,candidate) REFERENCES public.cp_candidates(election_id,character_id)
);
CREATE TABLE public.cp_office (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), interim uuid REFERENCES public.characters(id)
);
INSERT INTO public.cp_office DEFAULT VALUES;
CREATE TABLE public.cp_heads (city_id text PRIMARY KEY REFERENCES public.volunteer_branches(city_id), character_id uuid NOT NULL REFERENCES public.characters(id));
CREATE TABLE public.cp_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), week date NOT NULL UNIQUE, city_id text NOT NULL REFERENCES public.volunteer_branches(city_id),
 author uuid NOT NULL REFERENCES public.characters(id), created_at timestamptz NOT NULL DEFAULT public.game_now(), expires_at timestamptz NOT NULL,
 slots integer NOT NULL CHECK(slots>0)
);
CREATE TABLE public.cp_operation_shifts (
 operation_id uuid REFERENCES public.cp_operations(id), character_id uuid REFERENCES public.characters(id),
 shift_id uuid NOT NULL UNIQUE REFERENCES public.security_shifts(id), PRIMARY KEY(operation_id,character_id)
);
CREATE TABLE public.cp_messages (
 id uuid PRIMARY KEY, author uuid NOT NULL REFERENCES public.characters(id), city_id text REFERENCES public.volunteer_branches(city_id),
 body text NOT NULL, created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.cp_treasury (id boolean PRIMARY KEY DEFAULT true CHECK(id), balance bigint NOT NULL DEFAULT 0 CHECK(balance>=0));
INSERT INTO public.cp_treasury DEFAULT VALUES;
CREATE TABLE public.cp_ledger (
 entry_key text PRIMARY KEY, month date NOT NULL, amount integer NOT NULL, character_id uuid REFERENCES public.characters(id),
 created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.cp_months (month date PRIMARY KEY, president uuid REFERENCES public.characters(id), paid integer NOT NULL CHECK(paid>=0));

CREATE FUNCTION public.cp_volunteer(_cid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.security_careers WHERE character_id=_cid AND service='protection_civile' AND status='service') $$;
CREATE FUNCTION public.cp_president() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN public.game_now() < (SELECT min(closes_at) FROM public.cp_elections)
 THEN (SELECT interim FROM public.cp_office) ELSE
 (SELECT winner FROM public.cp_elections WHERE closes_at<=public.game_now() AND ends_at>public.game_now() ORDER BY closes_at DESC LIMIT 1) END $$;
CREATE FUNCTION public.cp_settle() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.cp_elections; s public.cp_settings; p uuid; m date; k text; paid integer:=0; BEGIN
 -- All public RPCs lock the caller first, then this singleton. Never lock another character.
 SELECT * INTO s FROM public.cp_settings WHERE id FOR UPDATE;
 LOOP
  SELECT * INTO e FROM public.cp_elections WHERE NOT settled AND closes_at<=public.game_now() ORDER BY closes_at LIMIT 1 FOR UPDATE;
  EXIT WHEN NOT FOUND;
  SELECT c.character_id INTO p FROM public.cp_candidates c WHERE c.election_id=e.id AND public.cp_volunteer(c.character_id)
  ORDER BY (SELECT count(*) FROM public.cp_ballots b WHERE b.election_id=e.id AND b.candidate=c.character_id) DESC,c.character_id LIMIT 1;
  UPDATE public.cp_elections SET settled=true,winner=p WHERE id=e.id;
  INSERT INTO public.cp_elections(predecessor,opens_at,vote_at,closes_at,ends_at)
  VALUES(e.id,e.ends_at-(s.candidacy_days+s.vote_days)*interval '1 day',e.ends_at-s.vote_days*interval '1 day',e.ends_at,e.ends_at+interval '1 year') ON CONFLICT DO NOTHING;
 END LOOP;
 -- Current month only: skipped months/insufficient funds never become debt or arrears.
 m:=date_trunc('month',public.game_now() AT TIME ZONE 'UTC')::date;
 IF EXISTS(SELECT 1 FROM public.cp_months WHERE month=m) THEN RETURN; END IF;
 p:=public.cp_president();
 PERFORM 1 FROM public.cp_treasury WHERE id FOR UPDATE;
 k:='cp:subsidy:'||m;
 INSERT INTO public.cp_ledger(entry_key,month,amount) VALUES(k,m,s.subsidy);
 PERFORM public.economy_post(k,-s.subsidy::bigint,'protection_civile');
 UPDATE public.cp_treasury SET balance=balance+s.subsidy WHERE id;
 -- Incoming indemnity collected only by its signed-in payee, like economy_cash.
 INSERT INTO public.cp_months VALUES(m,p,0);
END $$;
CREATE FUNCTION public.cp_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); p uuid; m date; s public.cp_settings; BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM public.security_settle(cid);
 PERFORM public.cp_settle();
 SELECT * INTO s FROM public.cp_settings;
 p:=public.cp_president(); m:=date_trunc('month',public.game_now() AT TIME ZONE 'UTC')::date;
 IF p=cid AND EXISTS(SELECT 1 FROM public.cp_months WHERE month=m AND president=cid)
 AND NOT EXISTS(SELECT 1 FROM public.cp_ledger WHERE entry_key='cp:indemnity:'||m) THEN
  -- Record even an insufficient attempt: no retry debt within the month.
  IF (SELECT balance FROM public.cp_treasury WHERE id)>=s.indemnity THEN
   IF public.economy_cash(cid,'cp:indemnity:'||m,s.indemnity,'Indemnité présidence Protection civile','protection_civile','{}') THEN
    UPDATE public.cp_treasury SET balance=balance-s.indemnity WHERE id;
    INSERT INTO public.cp_ledger VALUES('cp:indemnity:'||m,m,-s.indemnity,cid,public.game_now());
    UPDATE public.cp_months SET paid=s.indemnity WHERE month=m;
   END IF;
  ELSE
   INSERT INTO public.cp_ledger VALUES('cp:indemnity:'||m,m,0,cid,public.game_now());
  END IF;
 END IF;
 RETURN jsonb_build_object('now',public.game_now(),'actor',cid,'eligible',public.cp_volunteer(cid),'president',p,'is_president',p=cid,
 'settings',to_jsonb(s),'elections',(SELECT jsonb_agg(to_jsonb(e) ORDER BY closes_at DESC) FROM (SELECT * FROM public.cp_elections ORDER BY closes_at DESC LIMIT 2) e),
 'candidates',COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.cp_candidates c JOIN public.cp_elections e ON e.id=c.election_id WHERE NOT e.settled),'[]'::jsonb),
 'voted',COALESCE((SELECT jsonb_agg(election_id) FROM public.cp_ballots WHERE voter=cid),'[]'::jsonb),
 'branches',(SELECT jsonb_agg(to_jsonb(b)) FROM public.volunteer_branches b),
 'dashboard',CASE WHEN p=cid THEN (SELECT jsonb_agg(to_jsonb(d)) FROM (
 SELECT b.city_id,b.label,(SELECT count(*) FROM public.security_careers c WHERE public.cp_volunteer(c.character_id) AND (SELECT city_id FROM public.volunteer_attachments a WHERE a.character_id=c.character_id ORDER BY ordinal DESC LIMIT 1)=b.city_id) volunteers,
 (SELECT count(*) FROM public.security_shifts sh WHERE sh.service='protection_civile' AND sh.settled AND (SELECT city_id FROM public.volunteer_attachments a WHERE a.character_id=sh.character_id AND a.attached_at<=sh.starts_at ORDER BY ordinal DESC LIMIT 1)=b.city_id) completed,
 (SELECT count(*) FROM public.cp_operation_shifts os JOIN public.cp_operations o ON o.id=os.operation_id WHERE o.city_id=b.city_id) operation_services FROM public.volunteer_branches b) d) ELSE '[]'::jsonb END,
 'nominees',CASE WHEN p=cid THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('character_id',c.character_id,'city_id',(SELECT city_id FROM public.volunteer_attachments a WHERE a.character_id=c.character_id ORDER BY ordinal DESC LIMIT 1))) FROM public.security_careers c WHERE public.cp_volunteer(c.character_id)),'[]'::jsonb) ELSE '[]'::jsonb END,
 'heads',COALESCE((SELECT jsonb_agg(to_jsonb(h)) FROM public.cp_heads h WHERE public.cp_volunteer(h.character_id) AND h.city_id=(SELECT city_id FROM public.volunteer_attachments a WHERE a.character_id=h.character_id ORDER BY ordinal DESC LIMIT 1)),'[]'::jsonb),
 'operations',COALESCE((SELECT jsonb_agg(to_jsonb(o)) FROM public.cp_operations o WHERE expires_at>public.game_now()),'[]'::jsonb),
 'messages',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT * FROM public.cp_messages WHERE public.cp_volunteer(cid) AND (city_id IS NULL OR city_id=(SELECT city_id FROM public.volunteer_attachments WHERE character_id=cid ORDER BY ordinal DESC LIMIT 1)) ORDER BY created_at DESC,id LIMIT 50) x),'[]'::jsonb),
 'balance',CASE WHEN p=cid THEN (SELECT balance FROM public.cp_treasury) ELSE NULL END);
END $$;
CREATE FUNCTION public.cp_action(_action text,_election uuid DEFAULT NULL,_target uuid DEFAULT NULL,_city text DEFAULT NULL,_body text DEFAULT NULL,_request uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); e public.cp_elections; s public.cp_settings; o public.cp_operations; r record; sh uuid; BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM public.security_settle(cid); PERFORM public.cp_settle(); SELECT * INTO s FROM public.cp_settings;
 IF _action IN ('candidate','vote') THEN
  IF NOT public.cp_volunteer(cid) THEN RAISE EXCEPTION 'Bénévole Protection civile en service requis'; END IF;
  SELECT * INTO e FROM public.cp_elections WHERE id=_election;
  IF NOT FOUND OR e.settled THEN RAISE EXCEPTION 'Scrutin indisponible'; END IF;
  IF _action='candidate' THEN
   IF public.game_now()<e.opens_at OR public.game_now()>=e.vote_at THEN RAISE EXCEPTION 'Candidatures fermées'; END IF;
   INSERT INTO public.cp_candidates VALUES(e.id,cid) ON CONFLICT DO NOTHING;
  ELSE
   IF public.game_now()<e.vote_at OR public.game_now()>=e.closes_at THEN RAISE EXCEPTION 'Vote fermé'; END IF;
   IF EXISTS(SELECT 1 FROM public.cp_ballots WHERE election_id=e.id AND voter=cid) THEN RAISE EXCEPTION 'Vote déjà enregistré et immuable'; END IF;
   INSERT INTO public.cp_ballots VALUES(e.id,cid,_target);
  END IF;
 ELSIF _action='join' THEN
  SELECT * INTO o FROM public.cp_operations WHERE id=_target FOR UPDATE;
  IF NOT FOUND OR o.expires_at<=public.game_now() OR NOT public.cp_volunteer(cid) OR o.city_id IS DISTINCT FROM (SELECT city_id FROM public.characters WHERE id=cid) THEN RAISE EXCEPTION 'Opération locale active requise'; END IF;
  IF EXISTS(SELECT 1 FROM public.cp_operation_shifts WHERE operation_id=o.id AND character_id=cid) THEN RETURN public.cp_state(); END IF;
  IF (SELECT count(*) FROM public.cp_operation_shifts WHERE operation_id=o.id)>=o.slots THEN RAISE EXCEPTION 'Opération complète'; END IF;
  IF _request IS NULL OR EXISTS(SELECT 1 FROM public.security_shifts WHERE request_id=_request) THEN RAISE EXCEPTION 'Nouvelle référence de service requise'; END IF;
  PERFORM public.security_start_shift(_request);
  SELECT id INTO STRICT sh FROM public.security_shifts WHERE character_id=cid AND request_id=_request AND service='protection_civile';
  INSERT INTO public.cp_operation_shifts VALUES(o.id,cid,sh);
 ELSE
  IF cid IS DISTINCT FROM public.cp_president() THEN RAISE EXCEPTION 'Présidence nationale requise'; END IF;
  IF _action='head' THEN
   IF _target IS NULL THEN DELETE FROM public.cp_heads WHERE city_id=_city;
   ELSE
    IF NOT public.cp_volunteer(_target) OR _city IS DISTINCT FROM (SELECT city_id FROM public.volunteer_attachments WHERE character_id=_target ORDER BY ordinal DESC LIMIT 1) THEN RAISE EXCEPTION 'Bénévole en service rattaché à cette antenne requis'; END IF;
    INSERT INTO public.cp_heads VALUES(_city,_target) ON CONFLICT(city_id) DO UPDATE SET character_id=excluded.character_id;
   END IF;
  ELSIF _action='operation' THEN
   INSERT INTO public.cp_operations(week,city_id,author,expires_at,slots) VALUES(date_trunc('week',public.game_now() AT TIME ZONE 'UTC')::date,_city,cid,(date_trunc('week',public.game_now() AT TIME ZONE 'UTC')+interval '1 week') AT TIME ZONE 'UTC',s.operation_slots);
  ELSIF _action='message' THEN
   IF _request IS NULL OR _body IS NULL OR char_length(btrim(_body)) NOT BETWEEN 1 AND s.message_limit THEN RAISE EXCEPTION 'Message ou référence invalide'; END IF;
   IF EXISTS(SELECT 1 FROM public.cp_messages WHERE id=_request) THEN
    IF NOT EXISTS(SELECT 1 FROM public.cp_messages WHERE id=_request AND author=cid AND city_id IS NOT DISTINCT FROM _city AND body=btrim(_body)) THEN RAISE EXCEPTION 'Référence déjà utilisée'; END IF;
   ELSE
    INSERT INTO public.cp_messages(id,author,city_id,body) VALUES(_request,cid,_city,btrim(_body));
    FOR r IN SELECT character_id FROM public.security_careers WHERE public.cp_volunteer(character_id) AND (_city IS NULL OR _city=(SELECT city_id FROM public.volunteer_attachments WHERE character_id=security_careers.character_id ORDER BY ordinal DESC LIMIT 1)) LOOP
     PERFORM public.economy_notify(r.character_id,'cp:message:'||_request||':'||r.character_id,'Protection civile',btrim(_body));
    END LOOP;
   END IF;
  ELSE RAISE EXCEPTION 'Action inconnue'; END IF;
 END IF;
 RETURN public.cp_state();
END $$;
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['cp_settings','cp_elections','cp_candidates','cp_ballots','cp_office','cp_heads','cp_operations','cp_operation_shifts','cp_messages','cp_treasury','cp_ledger','cp_months'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',n);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',n);
 END LOOP;
END $$;
-- No SELECT policies: even own ballots cannot be retrieved. RPC returns only has-voted.
REVOKE ALL ON FUNCTION public.cp_volunteer(uuid),public.cp_president(),public.cp_settle(),public.cp_state(),public.cp_action(text,uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cp_state(),public.cp_action(text,uuid,uuid,text,text,uuid) TO authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname LIKE 'cp_%' AND relkind='r' AND NOT relrowsecurity) THEN RAISE EXCEPTION 'RLS requise'; END IF;
 IF has_table_privilege('authenticated','public.cp_ballots','SELECT') OR has_function_privilege('authenticated','public.cp_settle()','EXECUTE') THEN RAISE EXCEPTION 'Privilèges privés invalides'; END IF;
END $$;
COMMIT;
