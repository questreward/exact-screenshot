ALTER TABLE public.elections ADD COLUMN predecessor_election_id uuid REFERENCES public.elections(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX election_single_successor ON public.elections(predecessor_election_id) WHERE predecessor_election_id IS NOT NULL;
ALTER TABLE public.municipal_mandates ADD COLUMN closed_at timestamptz;
GRANT SELECT(closed_at) ON public.municipal_mandates TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_municipal_calendar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prev public.elections; n integer;
BEGIN
PERFORM pg_advisory_xact_lock(hashtextextended('civic:'||NEW.city_id,0));
IF TG_OP='UPDATE' AND NEW.city_id IS DISTINCT FROM OLD.city_id THEN RAISE EXCEPTION 'Ville du calendrier immuable'; END IF;
SELECT count(*) INTO n FROM public.elections WHERE city_id=NEW.city_id AND id<>NEW.id;
IF n>=2 THEN RAISE EXCEPTION 'Une première élection et une seule réélection sont autorisées'; END IF;
IF EXISTS(SELECT 1 FROM public.elections e WHERE e.city_id=NEW.city_id AND e.id<>NEW.id AND tstzrange(e.starts_at,e.count_at,'[)') && tstzrange(NEW.starts_at,NEW.count_at,'[)')) THEN RAISE EXCEPTION 'Une élection existe déjà sur ce créneau dans cette ville'; END IF;
IF NEW.predecessor_election_id IS NOT NULL THEN
SELECT * INTO prev FROM public.elections WHERE id=NEW.predecessor_election_id;
IF NOT FOUND OR prev.city_id<>NEW.city_id OR prev.id=NEW.id OR prev.predecessor_election_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.municipal_mandates m WHERE m.election_id=prev.id AND m.ends_at<=NEW.starts_at) THEN RAISE EXCEPTION 'Réélection municipale inaccessible'; END IF;
ELSIF n>0 THEN RAISE EXCEPTION 'La seconde élection doit être liée au mandat précédent'; END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_municipal_calendar() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER municipal_calendar_guard BEFORE INSERT OR UPDATE OF city_id,starts_at,count_at,predecessor_election_id ON public.elections FOR EACH ROW EXECUTE FUNCTION public.guard_municipal_calendar();

CREATE OR REPLACE FUNCTION public.prepare_municipal_reelection(_mandate uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.municipal_mandates;e public.elections; existing public.elections; successor uuid;
BEGIN
SELECT * INTO m FROM public.municipal_mandates WHERE id=_mandate;
IF NOT FOUND OR m.ends_at>public.game_now() THEN RETURN NULL; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('civic:'||m.city_id,0));
SELECT * INTO e FROM public.elections WHERE id=m.election_id;
IF e.predecessor_election_id IS NOT NULL THEN RETURN NULL; END IF;
SELECT id INTO successor FROM public.elections WHERE predecessor_election_id=e.id;
IF successor IS NOT NULL THEN RETURN successor; END IF;
SELECT * INTO existing FROM public.elections WHERE city_id=m.city_id AND id<>e.id ORDER BY starts_at LIMIT 1;
IF FOUND THEN
IF existing.starts_at>=m.ends_at AND existing.predecessor_election_id IS NULL THEN UPDATE public.elections SET predecessor_election_id=e.id WHERE id=existing.id; RETURN existing.id; END IF;
RETURN NULL;
END IF;
INSERT INTO public.elections(election_key,name,type,city_id,institution_id,location_id,description,starts_at,candidacy_ends_at,campaign_starts_at,debate_at,vote_starts_at,vote_ends_at,count_at,rules,round,eligible_voters,predecessor_election_id)
VALUES('reelection:'||e.id,'Réélection municipale — '||(SELECT name FROM public.cities WHERE id=m.city_id),e.type,e.city_id,e.institution_id,e.location_id,e.description,m.ends_at,m.ends_at+(e.candidacy_ends_at-e.starts_at),m.ends_at+(e.campaign_starts_at-e.starts_at),m.ends_at+(e.debate_at-e.starts_at),m.ends_at+(e.vote_starts_at-e.starts_at),m.ends_at+(e.vote_ends_at-e.starts_at),m.ends_at+(e.count_at-e.starts_at),e.rules,e.round,e.eligible_voters,e.id) RETURNING id INTO successor;
INSERT INTO public.candidacies(election_id,npc_id,organization_id,display_name,status,slogan,program,program_score,base_reputation,base_influence,support,visibility,campaign_reputation,budget)
SELECT successor,npc_id,organization_id,display_name,'validated',slogan,program,program_score,base_reputation,base_influence,20,0,base_reputation,LEAST(COALESCE((e.rules->>'budget_cap')::integer,3000),COALESCE((e.rules->>'initial_budget')::integer,1200)) FROM public.candidacies WHERE election_id=e.id AND npc_id IS NOT NULL AND status IN('completed','validated');
RETURN successor;
END $$;
REVOKE ALL ON FUNCTION public.prepare_municipal_reelection(uuid) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.prepare_municipal_reelection(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mandate_politics_at_end(_mandate uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.municipal_mandates;cid uuid; r record;rep integer;inf integer;cap integer;
BEGIN
SELECT * INTO m FROM public.municipal_mandates WHERE id=_mandate;
SELECT character_id INTO cid FROM public.candidacies WHERE id=m.candidacy_id;
rep:=COALESCE((m.opening_politics->>'reputation')::integer,0);inf:=COALESCE((m.opening_politics->>'influence')::integer,0);
SELECT stat_cap INTO cap FROM public.political_settings WHERE id=1;
FOR r IN SELECT * FROM (
SELECT pr.occurred_at,pr.reward_key,pr.reputation,pr.influence FROM public.political_rewards pr WHERE pr.character_id=cid AND pr.occurred_at>m.governance_initialized_at AND pr.occurred_at<=m.ends_at
UNION ALL
SELECT d.completed_at,'governance:'||d.id,CASE WHEN d.failure THEN -3 ELSE COALESCE((d.rule_snapshot->>'reputation_gain')::integer,3) END,CASE WHEN d.failure THEN -1 ELSE COALESCE((d.rule_snapshot->>'influence_gain')::integer,1) END FROM public.public_decisions d WHERE d.mandate_id=m.id AND d.funded_at IS NOT NULL AND d.completed_at>m.governance_initialized_at AND d.completed_at<=m.ends_at AND NOT EXISTS(SELECT 1 FROM public.political_rewards pr WHERE pr.character_id=cid AND pr.reward_key='governance:'||d.id)
) x ORDER BY occurred_at,reward_key LOOP rep:=GREATEST(0,LEAST(cap,rep+r.reputation));inf:=GREATEST(0,LEAST(cap,inf+r.influence));END LOOP;
RETURN jsonb_build_object('reputation',rep,'influence',inf);
END $$;
REVOKE ALL ON FUNCTION public.mandate_politics_at_end(uuid) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.mandate_politics_at_end(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.finish_municipal_mandates(_city text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.municipal_mandates;d public.public_decisions;
BEGIN
PERFORM pg_advisory_xact_lock(hashtextextended('civic:'||_city,0));
FOR m IN SELECT * FROM public.municipal_mandates WHERE city_id=_city AND ends_at<=public.game_now() ORDER BY ends_at,id FOR UPDATE LOOP
IF m.closed_at IS NULL THEN
UPDATE public.municipal_mandates SET status='ended',closed_at=m.ends_at,closing_politics=public.mandate_politics_at_end(m.id),final_report=COALESCE(final_report,'{}')||jsonb_build_object('as_of',m.ends_at,'decisions',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',dd.id,'title',dd.title,'workflow',CASE WHEN dd.completed_at<=m.ends_at THEN dd.workflow WHEN dd.funded_at<=m.ends_at THEN 'running' WHEN dd.voted_at<=m.ends_at THEN CASE WHEN (dd.council_result->>'adopted')::boolean THEN 'approved' ELSE 'rejected' END ELSE 'proposed' END) ORDER BY dd.voted_at,dd.id) FROM public.public_decisions dd WHERE dd.mandate_id=m.id AND dd.voted_at<=m.ends_at AND dd.council_result IS NOT NULL),'[]')) WHERE id=m.id;
UPDATE public.activities a SET status='cancelled' FROM public.governance_actions ga JOIN public.public_decisions dd ON dd.id=ga.decision_id WHERE a.id=ga.activity_id AND dd.mandate_id=m.id AND a.status='planned';
END IF;
PERFORM public.prepare_municipal_reelection(m.id);
END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.finish_municipal_mandates(text) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.finish_municipal_mandates(text) TO service_role;

DO $$ DECLARE def text;BEGIN
SELECT pg_get_functiondef('public.refresh_governance_city(text)'::regprocedure) INTO def;
IF position('END LOOP;'||chr(10)||'END' in def)=0 THEN RAISE EXCEPTION 'Clôture introuvable'; END IF;
def:=replace(def,'END LOOP;'||chr(10)||'END','END LOOP; PERFORM public.finish_municipal_mandates(_city);'||chr(10)||'END');EXECUTE def;
SELECT pg_get_functiondef('public.election_state()'::regprocedure) INTO def;
def:=replace(def,'FOR eid IN SELECT id FROM public.elections','PERFORM public.refresh_governance_city(c.city_id); FOR eid IN SELECT id FROM public.elections');EXECUTE def;
SELECT pg_get_functiondef('public.settle_governance_politics(uuid)'::regprocedure) INTO def;
def:=replace(def,'mm.status=''ended'' AND mm.closing_politics IS NULL','mm.status=''ended'' AND mm.closing_politics IS NULL AND mm.ends_at>public.game_now()');EXECUTE def;
END $$;

CREATE OR REPLACE FUNCTION public.guard_frozen_mandate_report() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF OLD.closed_at IS NOT NULL AND (NEW.final_report IS DISTINCT FROM OLD.final_report OR NEW.closing_indicators IS DISTINCT FROM OLD.closing_indicators OR NEW.closing_politics IS DISTINCT FROM OLD.closing_politics OR NEW.closed_at IS DISTINCT FROM OLD.closed_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.status IS DISTINCT FROM OLD.status) THEN RAISE EXCEPTION 'Le bilan final du mandat est figé'; END IF;RETURN NEW;END $$;
REVOKE ALL ON FUNCTION public.guard_frozen_mandate_report() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER frozen_mandate_report BEFORE UPDATE ON public.municipal_mandates FOR EACH ROW EXECUTE FUNCTION public.guard_frozen_mandate_report();