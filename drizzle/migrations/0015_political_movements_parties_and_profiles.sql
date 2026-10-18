ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS symbol text, ADD COLUMN IF NOT EXISTS scope text CHECK (scope IS NULL OR scope IN ('local','regional','national'));
ALTER TABLE public.social_npcs ADD COLUMN IF NOT EXISTS political_role text, ADD COLUMN IF NOT EXISTS reputation integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS influence integer NOT NULL DEFAULT 0;
ALTER TABLE public.organization_events ADD COLUMN IF NOT EXISTS political_kind text, ADD COLUMN IF NOT EXISTS political_reputation_gain integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS political_influence_gain integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS political_engagement_gain integer NOT NULL DEFAULT 0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS political_reputation_gain integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS political_influence_gain integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS political_engagement_gain integer NOT NULL DEFAULT 0;

CREATE TABLE public.political_settings(id integer PRIMARY KEY DEFAULT 1 CHECK(id=1), opinion_interest_gain integer NOT NULL DEFAULT 2, join_interest_gain integer NOT NULL DEFAULT 3, join_engagement_gain integer NOT NULL DEFAULT 3, activity_interest_gain integer NOT NULL DEFAULT 2, influence_reputation_threshold integer NOT NULL DEFAULT 50, influence_reputation_bonus integer NOT NULL DEFAULT 1, single_party boolean NOT NULL DEFAULT true, stat_cap integer NOT NULL DEFAULT 100);
CREATE TABLE public.political_axes(id text PRIMARY KEY, label text NOT NULL, low_label text NOT NULL, high_label text NOT NULL, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.political_topics(id text PRIMARY KEY, label text NOT NULL, description text NOT NULL, axis_id text NOT NULL REFERENCES public.political_axes(id), sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.political_stances(id text PRIMARY KEY, label text NOT NULL, target integer, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.political_roles(id text PRIMARY KEY, label text NOT NULL, rank integer NOT NULL UNIQUE, min_progress integer NOT NULL DEFAULT 0, min_reputation integer NOT NULL DEFAULT 0, player_start boolean NOT NULL DEFAULT false);
CREATE TABLE public.political_profiles(organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE, ideology jsonb NOT NULL, core_values text[] NOT NULL DEFAULT '{}', priorities text[] NOT NULL DEFAULT '{}', slogan text NOT NULL DEFAULT '');
CREATE TABLE public.political_branches(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, city_id text NOT NULL REFERENCES public.cities(id), location_id uuid NOT NULL REFERENCES public.locations(id), kind text NOT NULL CHECK(kind IN('siege','permanence','reunion')), UNIQUE(organization_id,city_id,kind));
CREATE TABLE public.political_stats(character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE, interest integer NOT NULL DEFAULT 0 CHECK(interest BETWEEN 0 AND 100), engagement integer NOT NULL DEFAULT 0 CHECK(engagement BETWEEN 0 AND 100), reputation integer NOT NULL DEFAULT 0 CHECK(reputation BETWEEN 0 AND 100), influence integer NOT NULL DEFAULT 0 CHECK(influence BETWEEN 0 AND 100));
CREATE TABLE public.political_opinions(character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE, topic_id text NOT NULL REFERENCES public.political_topics(id), stance text NOT NULL REFERENCES public.political_stances(id), updated_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(character_id,topic_id));
CREATE TABLE public.political_rewards(character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE, reward_key text NOT NULL, kind text NOT NULL, reputation integer NOT NULL DEFAULT 0, influence integer NOT NULL DEFAULT 0, engagement integer NOT NULL DEFAULT 0, interest integer NOT NULL DEFAULT 0, label text NOT NULL DEFAULT '', occurred_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY(character_id,reward_key));

GRANT SELECT ON public.political_settings, public.political_axes, public.political_topics, public.political_stances, public.political_roles, public.political_profiles, public.political_branches TO authenticated;
GRANT SELECT ON public.political_stats, public.political_opinions, public.political_rewards TO authenticated;
GRANT ALL ON public.political_settings, public.political_axes, public.political_topics, public.political_stances, public.political_roles, public.political_profiles, public.political_branches, public.political_stats, public.political_opinions, public.political_rewards TO service_role;
ALTER TABLE public.political_settings ENABLE ROW LEVEL SECURITY; ALTER TABLE public.political_axes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.political_topics ENABLE ROW LEVEL SECURITY; ALTER TABLE public.political_stances ENABLE ROW LEVEL SECURITY; ALTER TABLE public.political_roles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.political_profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.political_branches ENABLE ROW LEVEL SECURITY; ALTER TABLE public.political_stats ENABLE ROW LEVEL SECURITY; ALTER TABLE public.political_opinions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.political_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Political settings readable" ON public.political_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Political axes readable" ON public.political_axes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Political topics readable" ON public.political_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Political stances readable" ON public.political_stances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Political roles readable" ON public.political_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Political profiles readable" ON public.political_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Political branches readable" ON public.political_branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own political stats" ON public.political_stats FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
CREATE POLICY "Own political opinions" ON public.political_opinions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
CREATE POLICY "Own political rewards" ON public.political_rewards FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));

CREATE FUNCTION public.award_political(_cid uuid,_key text,_kind text,_rep integer,_inf integer,_eng integer,_interest integer,_label text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.political_settings; st public.political_stats; bonus integer:=0; BEGIN
SELECT * INTO s FROM public.political_settings WHERE id=1;
INSERT INTO public.political_stats(character_id) VALUES(_cid) ON CONFLICT DO NOTHING;
SELECT * INTO st FROM public.political_stats WHERE character_id=_cid FOR UPDATE;
IF _inf>0 AND st.reputation>=s.influence_reputation_threshold THEN bonus:=s.influence_reputation_bonus; END IF;
INSERT INTO public.political_rewards(character_id,reward_key,kind,reputation,influence,engagement,interest,label) VALUES(_cid,_key,_kind,_rep,_inf+bonus,_eng,_interest,_label) ON CONFLICT DO NOTHING;
IF NOT FOUND THEN RETURN false; END IF;
UPDATE public.political_stats SET reputation=LEAST(s.stat_cap,reputation+_rep), influence=LEAST(s.stat_cap,influence+_inf+bonus), engagement=LEAST(s.stat_cap,engagement+_eng), interest=LEAST(s.stat_cap,interest+_interest) WHERE character_id=_cid;
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.award_political(uuid,text,text,integer,integer,integer,integer,text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.political_activity_reward() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.political_settings; uid uuid; BEGIN
IF TG_OP='INSERT' THEN
  IF NEW.organization_event_id IS NOT NULL THEN SELECT e.political_reputation_gain,e.political_influence_gain,e.political_engagement_gain INTO NEW.political_reputation_gain,NEW.political_influence_gain,NEW.political_engagement_gain FROM public.organization_events e JOIN public.organizations o ON o.id=e.organization_id WHERE e.id=NEW.organization_event_id AND o.kind IN('movement','party'); ELSE NEW.political_reputation_gain:=0; NEW.political_influence_gain:=0; NEW.political_engagement_gain:=0; END IF;
  NEW.political_reputation_gain:=COALESCE(NEW.political_reputation_gain,0); NEW.political_influence_gain:=COALESCE(NEW.political_influence_gain,0); NEW.political_engagement_gain:=COALESCE(NEW.political_engagement_gain,0);
  RETURN NEW; END IF;
IF OLD.status='running' AND NEW.status='completed' AND NEW.end_time<=public.game_now() AND (NEW.political_reputation_gain>0 OR NEW.political_influence_gain>0 OR NEW.political_engagement_gain>0) THEN
  SELECT * INTO s FROM public.political_settings WHERE id=1;
  IF public.award_political(NEW.character_id,'activity:'||NEW.id,'activity',NEW.political_reputation_gain,NEW.political_influence_gain,NEW.political_engagement_gain,s.activity_interest_gain,NEW.title) THEN
    SELECT user_id INTO uid FROM public.characters WHERE id=NEW.character_id;
    INSERT INTO public.notifications(user_id,title,body) VALUES(uid,'Activité politique terminée',NEW.title||' : +'||NEW.political_reputation_gain||' réputation politique, +'||NEW.political_influence_gain||' influence politique');
  END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER political_activity_snapshot BEFORE INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.political_activity_reward();
CREATE TRIGGER political_activity_reward AFTER UPDATE OF status ON public.activities FOR EACH ROW EXECUTE FUNCTION public.political_activity_reward();
REVOKE ALL ON FUNCTION public.political_activity_reward() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.organization_directory(_city_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$ BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF; RETURN COALESCE((SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('location',to_jsonb(l),'city_name',ci.name,'member_count',(SELECT count(*) FROM public.memberships m WHERE m.organization_id=o.id AND m.status='active')+(SELECT count(*) FROM public.social_npcs n WHERE n.organization_id=o.id),'members',COALESCE((SELECT jsonb_agg(jsonb_build_object('first_name',n.first_name,'last_name',n.last_name,'role','member','fictional',true)) FROM public.social_npcs n WHERE n.organization_id=o.id),'[]'::jsonb)||COALESCE((SELECT jsonb_agg(jsonb_build_object('first_name',c.first_name,'last_name',c.last_name,'role',m.role,'fictional',false)) FROM public.memberships m JOIN public.characters c ON c.id=m.character_id WHERE m.organization_id=o.id AND m.status='active' AND c.user_id=auth.uid()),'[]'::jsonb),'events',COALESCE((SELECT jsonb_agg(to_jsonb(e)||jsonb_build_object('participant_count',(SELECT count(*) FROM public.activities a WHERE a.organization_event_id=e.id AND a.status IN('planned','running') AND a.start_time>=public.game_now()))) FROM public.organization_events e WHERE e.organization_id=o.id AND e.status='active'),'[]'::jsonb)) ORDER BY o.kind,o.name) FROM public.organizations o JOIN public.locations l ON l.id=o.location_id JOIN public.cities ci ON ci.id=o.city_id WHERE o.city_id=_city_id AND o.status='active' AND o.visibility='public' AND o.kind NOT IN('movement','party')),'[]'::jsonb); END $function$;

CREATE OR REPLACE FUNCTION public.change_membership(_organization_id uuid, _join boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$ DECLARE cid uuid; c public.characters; o public.organizations; m public.memberships; BEGIN cid:=public.social_actor(); SELECT * INTO c FROM public.characters WHERE id=cid; SELECT * INTO o FROM public.organizations WHERE id=_organization_id AND status='active' AND visibility='public' AND location_id IS NOT NULL; IF NOT FOUND OR o.kind IN('movement','party') OR o.city_id<>c.city_id THEN RAISE EXCEPTION 'Organisation inaccessible depuis votre ville'; END IF; SELECT * INTO m FROM public.memberships WHERE character_id=cid AND organization_id=o.id FOR UPDATE;
IF _join THEN IF m.status='suspended' THEN RAISE EXCEPTION 'Cette adhésion est suspendue'; END IF; IF m.status='active' THEN RAISE EXCEPTION 'Vous êtes déjà membre'; END IF; IF o.kind='student' AND c.path_id<>'student' THEN RAISE EXCEPTION 'Cette association est réservée aux étudiants'; END IF; INSERT INTO public.memberships(character_id,organization_id,role,status,joined_at) VALUES(cid,o.id,'member','active',public.game_now()) ON CONFLICT(character_id,organization_id) DO UPDATE SET status='active',role='member',joined_at=EXCLUDED.joined_at,left_at=NULL; ELSE IF m.id IS NULL OR m.status<>'active' THEN RAISE EXCEPTION 'Aucune adhésion active'; END IF; IF EXISTS(SELECT 1 FROM public.activities a JOIN public.organization_events e ON e.id=a.organization_event_id WHERE a.character_id=cid AND e.organization_id=o.id AND a.status='running') THEN RAISE EXCEPTION 'Terminez l’activité avant de quitter'; END IF; UPDATE public.memberships SET status='former',left_at=public.game_now() WHERE id=m.id; UPDATE public.activities a SET status='cancelled' FROM public.organization_events e WHERE a.organization_event_id=e.id AND e.organization_id=o.id AND a.character_id=cid AND a.status='planned'; END IF;
INSERT INTO public.membership_history(character_id,organization_id,action,occurred_at) VALUES(cid,o.id,CASE WHEN _join THEN 'joined' ELSE 'left' END,public.game_now()); INSERT INTO public.notifications(user_id,title,body) VALUES(c.user_id,CASE WHEN _join THEN 'Adhésion confirmée' ELSE 'Organisation quittée' END,o.name); END $function$;

CREATE FUNCTION public.change_political_membership(_organization_id uuid,_join boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; c public.characters; o public.organizations; m public.memberships; s public.political_settings; other text; BEGIN
cid:=public.social_actor(); SELECT * INTO c FROM public.characters WHERE id=cid; SELECT * INTO s FROM public.political_settings WHERE id=1;
SELECT * INTO o FROM public.organizations WHERE id=_organization_id AND kind IN('movement','party') AND status='active' AND visibility='public';
IF NOT FOUND THEN RAISE EXCEPTION 'Organisation politique introuvable'; END IF;
SELECT * INTO m FROM public.memberships WHERE character_id=cid AND organization_id=o.id FOR UPDATE;
IF _join THEN
  IF m.status='active' THEN RAISE EXCEPTION 'Vous êtes déjà membre'; END IF;
  IF m.status='suspended' THEN RAISE EXCEPTION 'Cette adhésion est suspendue'; END IF;
  IF o.scope='local' AND o.city_id<>c.city_id THEN RAISE EXCEPTION 'Ce mouvement local accueille uniquement les habitants de sa ville'; END IF;
  IF o.kind='party' AND s.single_party THEN SELECT po.name INTO other FROM public.memberships pm JOIN public.organizations po ON po.id=pm.organization_id WHERE pm.character_id=cid AND pm.status='active' AND po.kind='party' AND po.id<>o.id LIMIT 1; IF other IS NOT NULL THEN RAISE EXCEPTION 'Vous êtes déjà membre du parti %. Quittez-le avant d’en rejoindre un autre', other; END IF; END IF;
  INSERT INTO public.memberships(character_id,organization_id,role,status,joined_at) VALUES(cid,o.id,'member','active',public.game_now()) ON CONFLICT(character_id,organization_id) DO UPDATE SET status='active',role='member',joined_at=EXCLUDED.joined_at,left_at=NULL;
  PERFORM public.award_political(cid,'join:'||o.id,'join',0,0,s.join_engagement_gain,s.join_interest_gain,o.name);
ELSE
  IF m.id IS NULL OR m.status<>'active' THEN RAISE EXCEPTION 'Aucune adhésion active'; END IF;
  IF EXISTS(SELECT 1 FROM public.activities a JOIN public.organization_events e ON e.id=a.organization_event_id WHERE a.character_id=cid AND e.organization_id=o.id AND a.status='running') THEN RAISE EXCEPTION 'Terminez l’activité avant de quitter'; END IF;
  UPDATE public.memberships SET status='former',left_at=public.game_now() WHERE id=m.id;
  UPDATE public.activities a SET status='cancelled' FROM public.organization_events e WHERE a.organization_event_id=e.id AND e.organization_id=o.id AND a.character_id=cid AND a.status='planned';
END IF;
INSERT INTO public.membership_history(character_id,organization_id,action,occurred_at) VALUES(cid,o.id,CASE WHEN _join THEN 'joined' ELSE 'left' END,public.game_now());
INSERT INTO public.notifications(user_id,title,body) VALUES(c.user_id,CASE WHEN _join THEN 'Adhésion politique confirmée' ELSE 'Organisation politique quittée' END,o.name||CASE WHEN _join THEN ' — rôle : Membre' ELSE '' END);
END $$;

CREATE FUNCTION public.reserve_political_event(_event_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; c public.characters; e public.organization_events; o public.organizations; start_at timestamptz; aid uuid; t timestamptz:=public.game_now(); key text; BEGIN
cid:=public.social_actor(); SELECT * INTO c FROM public.characters WHERE id=cid;
SELECT * INTO e FROM public.organization_events WHERE id=_event_id AND status='active'; IF NOT FOUND THEN RAISE EXCEPTION 'Activité introuvable'; END IF;
SELECT * INTO o FROM public.organizations WHERE id=e.organization_id AND kind IN('movement','party') AND status='active'; IF NOT FOUND THEN RAISE EXCEPTION 'Activité politique introuvable'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.memberships WHERE character_id=cid AND organization_id=o.id AND status='active') THEN RAISE EXCEPTION 'Rejoignez cette organisation pour participer'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.locations l JOIN public.districts d ON d.id=l.district_id WHERE l.id=e.location_id AND l.city_id=c.city_id AND l.accessible AND d.available) THEN RAISE EXCEPTION 'Cette activité a lieu dans une autre ville'; END IF;
start_at:=((t AT TIME ZONE 'UTC')::date+make_time(e.start_hour,0,0)) AT TIME ZONE 'UTC'; IF start_at<t THEN start_at:=start_at+interval '1 day'; END IF;
IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=cid AND status IN('planned','running') AND start_time<start_at+e.duration_minutes*interval '1 minute' AND end_time>start_at) THEN RAISE EXCEPTION 'Cette activité chevauche votre agenda'; END IF;
key:='pol:'||e.id||':'||(start_at AT TIME ZONE 'UTC')::date;
IF EXISTS(SELECT 1 FROM public.activities a WHERE a.character_id=cid AND a.source_key=key) THEN RAISE EXCEPTION 'Vous avez déjà réservé ce rendez-vous pour cette journée'; END IF;
INSERT INTO public.activities(character_id,type,title,start_time,end_time,location_id,energy_cost,organization_event_id,social_relation_gain,social_reputation_gain,social_influence_gain,source_key) VALUES(cid,'social',e.title,start_at,start_at+e.duration_minutes*interval '1 minute',e.location_id,e.energy_cost,e.id,e.relation_gain,e.reputation_gain,e.influence_gain,key) RETURNING id INTO aid;
INSERT INTO public.social_participations(activity_id,character_id,event_id) VALUES(aid,cid,e.id);
INSERT INTO public.notifications(user_id,title,body) VALUES(c.user_id,'Activité politique ajoutée',e.title||' — '||o.name||' · dans votre agenda');
RETURN aid; END $$;

CREATE FUNCTION public.set_political_opinion(_topic_id text,_stance text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; s public.political_settings; BEGIN
cid:=public.social_actor(); SELECT * INTO s FROM public.political_settings WHERE id=1;
IF NOT EXISTS(SELECT 1 FROM public.political_topics WHERE id=_topic_id) THEN RAISE EXCEPTION 'Sujet inconnu'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.political_stances WHERE id=_stance) THEN RAISE EXCEPTION 'Position inconnue'; END IF;
INSERT INTO public.political_opinions(character_id,topic_id,stance,updated_at) VALUES(cid,_topic_id,_stance,public.game_now()) ON CONFLICT(character_id,topic_id) DO UPDATE SET stance=EXCLUDED.stance,updated_at=EXCLUDED.updated_at;
IF _stance<>'undefined' THEN PERFORM public.award_political(cid,'opinion:'||_topic_id,'opinion',0,0,0,s.opinion_interest_gain,(SELECT label FROM public.political_topics WHERE id=_topic_id)); END IF;
END $$;

CREATE FUNCTION public.political_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; c public.characters; BEGIN
cid:=public.social_actor(); SELECT * INTO c FROM public.characters WHERE id=cid;
INSERT INTO public.political_stats(character_id) VALUES(cid) ON CONFLICT DO NOTHING;
RETURN jsonb_build_object(
'world_now',public.game_now(),'city_id',c.city_id,
'settings',(SELECT to_jsonb(s) FROM public.political_settings s WHERE id=1),
'axes',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.sort_order),'[]') FROM public.political_axes a),
'topics',(SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.sort_order),'[]') FROM public.political_topics t),
'stances',(SELECT COALESCE(jsonb_agg(to_jsonb(st) ORDER BY st.sort_order),'[]') FROM public.political_stances st),
'roles',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.rank),'[]') FROM public.political_roles r),
'stats',(SELECT to_jsonb(ps) FROM public.political_stats ps WHERE character_id=cid),
'opinions',(SELECT COALESCE(jsonb_agg(to_jsonb(po)),'[]') FROM public.political_opinions po WHERE character_id=cid),
'organizations',(SELECT COALESCE(jsonb_agg(to_jsonb(o)||jsonb_build_object('ideology',p.ideology,'core_values',p.core_values,'priorities',p.priorities,'slogan',p.slogan,'city_name',ci.name,'location',to_jsonb(l),
  'branches',(SELECT COALESCE(jsonb_agg(jsonb_build_object('kind',b.kind,'city_id',b.city_id,'city_name',bc.name,'location',to_jsonb(bl)) ORDER BY (b.kind='siege') DESC,bc.sort_order),'[]') FROM public.political_branches b JOIN public.cities bc ON bc.id=b.city_id JOIN public.locations bl ON bl.id=b.location_id WHERE b.organization_id=o.id),
  'member_count',(SELECT count(*) FROM public.memberships m WHERE m.organization_id=o.id AND m.status='active')+(SELECT count(*) FROM public.social_npcs n WHERE n.organization_id=o.id),
  'leaders',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',n.id,'first_name',n.first_name,'last_name',n.last_name,'role',n.political_role,'city_id',n.city_id) ORDER BY n.influence DESC),'[]') FROM public.social_npcs n WHERE n.organization_id=o.id AND n.political_role IN('Dirigeant','Porte-parole','Responsable de mouvement')),
  'events',(SELECT COALESCE(jsonb_agg(to_jsonb(e)||jsonb_build_object('location',to_jsonb(el),'city_name',ec.name,'participant_count',(SELECT count(*) FROM public.activities a WHERE a.organization_event_id=e.id AND a.status IN('planned','running'))) ORDER BY ec.sort_order,e.start_hour),'[]') FROM public.organization_events e JOIN public.locations el ON el.id=e.location_id JOIN public.cities ec ON ec.id=el.city_id WHERE e.organization_id=o.id AND e.status='active')
 ) ORDER BY o.kind DESC,o.name),'[]') FROM public.organizations o JOIN public.political_profiles p ON p.organization_id=o.id JOIN public.locations l ON l.id=o.location_id JOIN public.cities ci ON ci.id=o.city_id WHERE o.kind IN('movement','party') AND o.status='active' AND o.visibility='public'),
'personalities',(SELECT COALESCE(jsonb_agg(to_jsonb(n)||jsonb_build_object('location',to_jsonb(l),'city_name',ci.name,'organization',(SELECT jsonb_build_object('id',o.id,'name',o.name,'kind',o.kind,'symbol',o.symbol) FROM public.organizations o WHERE o.id=n.organization_id),'relation',(SELECT jsonb_build_object('score',r.score,'level',public.social_level(r.score)) FROM public.social_relations r WHERE r.character_id=cid AND r.npc_id=n.id)) ORDER BY ci.sort_order,n.influence DESC),'[]') FROM public.social_npcs n JOIN public.locations l ON l.id=n.location_id JOIN public.cities ci ON ci.id=n.city_id WHERE n.political_role IS NOT NULL),
'memberships',(SELECT COALESCE(jsonb_agg(to_jsonb(m)||jsonb_build_object('name',o.name,'kind',o.kind,'symbol',o.symbol)),'[]') FROM public.memberships m JOIN public.organizations o ON o.id=m.organization_id WHERE m.character_id=cid AND o.kind IN('movement','party')),
'history',(SELECT COALESCE(jsonb_agg(h ORDER BY h->>'occurred_at' DESC),'[]') FROM (
  SELECT jsonb_build_object('kind',mh.action,'label',o.name,'occurred_at',mh.occurred_at) h FROM public.membership_history mh JOIN public.organizations o ON o.id=mh.organization_id WHERE mh.character_id=cid AND o.kind IN('movement','party')
  UNION ALL SELECT jsonb_build_object('kind',pr.kind,'label',pr.label,'occurred_at',pr.occurred_at,'reputation',pr.reputation,'influence',pr.influence,'engagement',pr.engagement) FROM public.political_rewards pr WHERE pr.character_id=cid AND pr.kind='activity') x),
'activities',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'start_time',a.start_time,'end_time',a.end_time,'status',a.status,'organization_event_id',a.organization_event_id,'organization_id',e.organization_id) ORDER BY a.start_time DESC),'[]') FROM public.activities a JOIN public.organization_events e ON e.id=a.organization_event_id JOIN public.organizations o ON o.id=e.organization_id WHERE a.character_id=cid AND o.kind IN('movement','party'))
); END $$;

REVOKE ALL ON FUNCTION public.change_political_membership(uuid,boolean), public.reserve_political_event(uuid), public.set_political_opinion(text,text), public.political_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_political_membership(uuid,boolean), public.reserve_political_event(uuid), public.set_political_opinion(text,text), public.political_state() TO authenticated;

INSERT INTO public.political_settings(id) VALUES(1);
INSERT INTO public.political_axes(id,label,low_label,high_label,sort_order) VALUES
('services_publics','Services publics','Services réduits','Services renforcés',1),
('marche','Économie de marché','Économie encadrée','Marché libre',2),
('ecologie','Écologie','Priorité à la croissance','Priorité à l’environnement',3),
('libertes','Libertés','Encadrement','Libertés individuelles',4),
('securite','Sécurité','Approche préventive','Fermeté',5),
('institutions','Institutions','Stabilité','Réforme démocratique',6),
('territoires','Territoires','Décisions centrales','Décisions locales',7),
('europe','Europe','Souveraineté nationale','Coopération européenne',8);
INSERT INTO public.political_topics(id,label,description,axis_id,sort_order) VALUES
('services_publics','Services publics','Renforcer écoles, hôpitaux et guichets publics','services_publics',1),
('logement','Logement','Aider davantage l’accès au logement','services_publics',2),
('environnement','Environnement','Protéger la nature et le climat','ecologie',3),
('transports','Transports','Développer les transports en commun','ecologie',4),
('securite','Sécurité','Renforcer la sécurité au quotidien','securite',5),
('economie','Entreprises','Faciliter la création d’entreprises','marche',6),
('depenses','Baisse des dépenses','Réduire certaines dépenses publiques','marche',7),
('education','Éducation','Investir dans l’éducation et la formation','services_publics',8),
('participation','Participation','Donner plus de pouvoir aux habitants','territoires',9);
INSERT INTO public.political_stances(id,label,target,sort_order) VALUES('undefined','Non définie',NULL,0),('weak','Faible',35,1),('moderate','Modérée',65,2),('strong','Forte',95,3);
INSERT INTO public.political_roles(id,label,rank,min_progress,min_reputation,player_start) VALUES
('supporter','Sympathisant',1,0,0,false),('member','Membre',2,0,0,true),('activist','Militant',3,5,20,false),('local_lead','Responsable local',4,12,45,false),('cadre','Cadre',5,25,70,false),('leader','Dirigeant',6,999,100,false);

INSERT INTO public.organizations(id,name,kind,city_id,description,location_id,status,visibility,reputation,influence,symbol,scope)
SELECT v.id::uuid,v.name,v.kind,v.city,v.descr,(SELECT id FROM public.locations WHERE city_id=v.city AND kind=v.lk AND district_id IS NOT NULL ORDER BY name LIMIT 1),'active','public',v.rep,v.inf,v.sym,v.scope FROM (VALUES
('7a7a0000-0000-4000-8000-000000000001','Parti de l’Avenir Commun','party','paris','Parti fictif centré sur la solidarité, l’accès au logement et des services publics présents partout.','place',62,58,'◆','national'),
('7a7a0000-0000-4000-8000-000000000002','Alliance pour l’Initiative','party','paris','Parti fictif qui mise sur l’esprit d’entreprise, l’innovation et une fiscalité allégée.','cafe',58,61,'▲','national'),
('7a7a0000-0000-4000-8000-000000000003','Union Territoires & Nature','party','paris','Parti fictif qui place l’environnement, les transports et les décisions locales au premier plan.','parc',55,49,'✿','national'),
('7a7a0000-0000-4000-8000-000000000004','Parti de la Concorde','party','paris','Parti fictif attaché à la sécurité, à la stabilité des institutions et aux traditions locales.','place',53,52,'●','national'),
('7a7a0000-0000-4000-8000-000000000011','Mouvement Civique','movement','paris','Mouvement fictif qui veut rapprocher les citoyens de la décision publique.','cafe',44,36,'◎','national'),
('7a7a0000-0000-4000-8000-000000000012','Horizon Citoyen','movement','lyon','Mouvement fictif lyonnais pour une démocratie de proximité et des quartiers plus vivants.','place',41,30,'☀','regional'),
('7a7a0000-0000-4000-8000-000000000013','Génération Commune','movement','lille','Mouvement fictif de jeunes engagés pour l’éducation, l’emploi et le logement des jeunes.','universite',38,27,'✦','national'),
('7a7a0000-0000-4000-8000-000000000014','Renouveau Local','movement','marseille','Mouvement fictif marseillais centré sur la sécurité du quotidien et les commerces de quartier.','cafe',35,22,'⬢','local'),
('7a7a0000-0000-4000-8000-000000000015','Écologie & Territoires','movement','bordeaux','Mouvement fictif pour la transition écologique des villes et des campagnes.','parc',40,28,'❀','regional')
) v(id,name,kind,city,descr,lk,rep,inf,sym,scope);

INSERT INTO public.political_profiles(organization_id,ideology,core_values,priorities,slogan) VALUES
('7a7a0000-0000-4000-8000-000000000001','{"services_publics":85,"marche":35,"ecologie":70,"libertes":60,"securite":45,"institutions":65,"territoires":70,"europe":70}',ARRAY['Solidarité','Égalité','Proximité'],ARRAY['Logement','Emploi','Services publics'],'Personne ne reste au bord du chemin.'),
('7a7a0000-0000-4000-8000-000000000002','{"services_publics":40,"marche":82,"ecologie":45,"libertes":72,"securite":62,"institutions":50,"territoires":55,"europe":62}',ARRAY['Liberté','Responsabilité','Innovation'],ARRAY['Entreprises','Innovation','Fiscalité'],'Oser, créer, réussir.'),
('7a7a0000-0000-4000-8000-000000000003','{"services_publics":65,"marche":42,"ecologie":92,"libertes":58,"securite":38,"institutions":75,"territoires":86,"europe":58}',ARRAY['Écologie','Démocratie','Proximité'],ARRAY['Environnement','Transports','Urbanisme'],'Des villes qui respirent.'),
('7a7a0000-0000-4000-8000-000000000004','{"services_publics":55,"marche":60,"ecologie":35,"libertes":38,"securite":88,"institutions":35,"territoires":48,"europe":28}',ARRAY['Sécurité','Tradition','Responsabilité'],ARRAY['Sécurité','Ordre public','Patrimoine'],'Protéger ce qui nous rassemble.'),
('7a7a0000-0000-4000-8000-000000000011','{"services_publics":62,"marche":55,"ecologie":60,"libertes":70,"securite":50,"institutions":90,"territoires":72,"europe":65}',ARRAY['Démocratie','Transparence','Proximité'],ARRAY['Participation','Transparence','Vie locale'],'La décision, c’est aussi vous.'),
('7a7a0000-0000-4000-8000-000000000012','{"services_publics":70,"marche":45,"ecologie":68,"libertes":62,"securite":46,"institutions":78,"territoires":90,"europe":60}',ARRAY['Proximité','Solidarité','Démocratie'],ARRAY['Vie de quartier','Logement','Transports'],'Lyon se construit ensemble.'),
('7a7a0000-0000-4000-8000-000000000013','{"services_publics":78,"marche":50,"ecologie":72,"libertes":75,"securite":40,"institutions":70,"territoires":60,"europe":76}',ARRAY['Égalité','Innovation','Solidarité'],ARRAY['Éducation','Emploi des jeunes','Logement'],'Notre génération, notre avenir.'),
('7a7a0000-0000-4000-8000-000000000014','{"services_publics":52,"marche":66,"ecologie":40,"libertes":45,"securite":80,"institutions":45,"territoires":82,"europe":35}',ARRAY['Sécurité','Proximité','Tradition'],ARRAY['Sécurité','Commerces','Propreté'],'Marseille d’abord, quartier par quartier.'),
('7a7a0000-0000-4000-8000-000000000015','{"services_publics":66,"marche":38,"ecologie":95,"libertes":60,"securite":35,"institutions":72,"territoires":84,"europe":64}',ARRAY['Écologie','Solidarité','Responsabilité'],ARRAY['Climat','Agriculture locale','Mobilités'],'La transition, partout et pour tous.');

INSERT INTO public.political_branches(organization_id,city_id,location_id,kind)
SELECT o.id,ci.id,(SELECT l.id FROM public.locations l WHERE l.city_id=ci.id AND l.kind=(SELECT kind FROM public.locations WHERE id=o.location_id) AND l.district_id IS NOT NULL ORDER BY l.name LIMIT 1),CASE WHEN ci.id=o.city_id THEN 'siege' ELSE 'permanence' END
FROM public.organizations o CROSS JOIN public.cities ci WHERE o.kind='party' AND o.id::text LIKE '7a7a0000-%';
INSERT INTO public.political_branches(organization_id,city_id,location_id,kind) SELECT o.id,o.city_id,o.location_id,'siege' FROM public.organizations o WHERE o.kind='movement' AND o.id::text LIKE '7a7a0000-%';

INSERT INTO public.organization_events(organization_id,title,description,location_id,start_hour,duration_minutes,energy_cost,relation_gain,reputation_gain,influence_gain,status,political_kind,political_reputation_gain,political_influence_gain,political_engagement_gain)
SELECT b.organization_id,k.title||' — '||ci.name,k.descr||' Organisée par '||o.name||'.',b.location_id,k.hour,k.dur,k.energy,6,2,0,'active',k.kind,k.rep,k.inf,k.eng
FROM public.political_branches b JOIN public.organizations o ON o.id=b.organization_id JOIN public.cities ci ON ci.id=b.city_id
JOIN LATERAL (SELECT * FROM (VALUES
 (0,'reunion_locale','Réunion locale','Les adhérents échangent sur les priorités de la ville.',19,60,10,6,3,5),
 (1,'debat','Débat public','Un débat ouvert entre adhérents et habitants.',20,75,12,8,4,4),
 (2,'tractage','Tractage','Distribution de documents d’information sur le marché.',10,60,15,4,2,6),
 (3,'conference','Conférence','Une intervenante présente les idées de l’organisation.',18,60,6,5,2,3),
 (4,'rencontre_citoyenne','Rencontre citoyenne','Les habitants posent leurs questions aux militants.',17,60,8,6,3,4)
) x(n,kind,title,descr,hour,dur,energy,rep,inf,eng) WHERE x.n=(abs(hashtext(b.organization_id::text||b.city_id))%5)) k ON true
WHERE b.organization_id::text LIKE '7a7a0000-%';
INSERT INTO public.organization_events(organization_id,title,description,location_id,start_hour,duration_minutes,energy_cost,relation_gain,reputation_gain,influence_gain,status,political_kind,political_reputation_gain,political_influence_gain,political_engagement_gain)
SELECT o.id,k.title,k.descr||' Organisée par '||o.name||'.',o.location_id,k.hour,k.dur,k.energy,6,2,0,'active',k.kind,k.rep,k.inf,k.eng
FROM public.organizations o CROSS JOIN (VALUES
 ('reunion','Réunion du mouvement','Point d’étape ouvert à tous les membres.',19,60,10,6,3,5),
 ('evenement_public','Événement public','Un rassemblement festif pour présenter le projet du mouvement.',15,90,12,7,4,5)
) k(kind,title,descr,hour,dur,energy,rep,inf,eng) WHERE o.kind='movement' AND o.id::text LIKE '7a7a0000-%';

INSERT INTO public.social_npcs(first_name,last_name,age,city_id,district_id,location_id,profession,description,traits,organization_id,political_role,reputation,influence)
SELECT (ARRAY['Camille','Hugo','Inès','Mathis','Léa','Rayan','Chloé','Nolan','Sarah','Théo','Manon','Yanis','Clara','Adam','Jade','Louis','Nina','Samir','Eva','Paul','Lina','Maël','Alice','Karim','Zoé','Bastien','Mila','Elias','Rose','Victor'])[1+(r.n%30)],
(ARRAY['Morel','Benali','Fontaine','Garnier','Lambert','Rousseau','Chevalier','Mercier','Diallo','Lefort','Marchand','Perrin','Robin','Henry','Colin','Vidal','Aubert','Renaud','Brun','Caron','Faure','Leroy','Masson','Picard','Roche','Sanchez','Tessier','Vasseur','Weber','Barre'])[1+((r.n*7)%30)],
r.age,r.city_id,l.district_id,r.location_id,r.role,r.descr,ARRAY['engagé'],r.org,r.role,r.rep,r.inf
FROM (
 SELECT row_number() OVER (ORDER BY q.sort, q.org, q.city_id) AS n, q.* FROM (
  SELECT 1 sort,o.id org,o.city_id,o.location_id,'Dirigeant' role,'À la tête de '||o.name||' (personnage fictif).' descr,52 age,80 rep,85 inf FROM public.organizations o WHERE o.kind='party' AND o.id::text LIKE '7a7a0000-%'
  UNION ALL SELECT 2,o.id,o.city_id,o.location_id,'Porte-parole','Porte-parole de '||o.name||' (personnage fictif), souvent dans les médias.',38,70,72 FROM public.organizations o WHERE o.kind='party' AND o.id::text LIKE '7a7a0000-%'
  UNION ALL SELECT 3,b.organization_id,b.city_id,b.location_id,'Responsable local','Anime la permanence locale de '||o.name||' (personnage fictif).',34+(abs(hashtext(b.city_id))%15),45,40 FROM public.political_branches b JOIN public.organizations o ON o.id=b.organization_id WHERE o.kind='party' AND o.id::text LIKE '7a7a0000-%'
  UNION ALL SELECT 4,o.id,o.city_id,o.location_id,'Responsable de mouvement','Figure fondatrice de '||o.name||' (personnage fictif).',41,50,45 FROM public.organizations o WHERE o.kind='movement' AND o.id::text LIKE '7a7a0000-%'
  UNION ALL SELECT 5,o.id,o.city_id,o.location_id,'Militant','Membre actif de '||o.name||' (personnage fictif), présent à chaque réunion.',24,20,10 FROM public.organizations o WHERE o.kind='movement' AND o.id::text LIKE '7a7a0000-%'
  UNION ALL SELECT 6,('7a7a0000-0000-4000-8000-00000000000'||(1+abs(hashtext(ci.id))%4))::uuid,ci.id,(SELECT id FROM public.locations WHERE city_id=ci.id AND kind='mairie' AND district_id IS NOT NULL LIMIT 1),'Élu municipal fictif','Conseiller de quartier à '||ci.name||' (personnage fictif).',47,55,50 FROM public.cities ci
  UNION ALL SELECT 7,NULL::uuid,ci.id,(SELECT id FROM public.locations WHERE city_id=ci.id AND kind='cafe' AND district_id IS NOT NULL LIMIT 1),'Journaliste politique','Suit la vie politique de '||ci.name||' (personnage fictif).',33,40,30 FROM public.cities ci
 ) q
) r JOIN public.locations l ON l.id=r.location_id;

INSERT INTO public.news(title,body,summary,image,category,source_id,author,city_id,region,scope,importance,status,published_at,location_id,organization_id,related_entities)
SELECT v.title,replace(v.body,'|',chr(10)||chr(10)),v.summary,NULL,'Politique',v.src,v.author,v.city,(SELECT region FROM public.cities WHERE id=v.city),v.scope,v.imp,'published',public.game_now()-(v.hours||' hours')::interval,
 (SELECT location_id FROM public.organizations WHERE id=v.org::uuid),v.org::uuid,
 jsonb_build_object('political',true,'personalities',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.id,'name',n.first_name||' '||n.last_name,'role',n.political_role)) FROM public.social_npcs n WHERE n.organization_id=v.org::uuid AND n.political_role=v.role AND (v.role<>'Responsable local' OR n.city_id=v.city)),'[]'))
FROM (VALUES
('L’Avenir Commun présente son plan logement','Le Parti de l’Avenir Commun, organisation fictive, a présenté un plan pour faciliter l’accès au logement des jeunes.|Sa porte-parole défend des loyers encadrés et davantage de résidences étudiantes. Les autres partis jugent le coût trop élevé.','Le parti fictif propose de nouvelles résidences et un encadrement des loyers.','france-direct','Rédaction France Direct','paris','national',75,3,'7a7a0000-0000-4000-8000-000000000001','Porte-parole'),
('L’Alliance pour l’Initiative veut simplifier la création d’entreprise','L’Alliance pour l’Initiative, parti fictif, propose un guichet unique pour les créateurs d’entreprise.|Son dirigeant promet moins de formalités. Des syndicats fictifs s’inquiètent pour la protection des salariés.','Un guichet unique et moins de formalités, selon ce parti fictif.','observateur','L’Observateur Civitas','paris','national',70,6,'7a7a0000-0000-4000-8000-000000000002','Dirigeant'),
('Débat animé à Lyon sur les transports','La permanence lyonnaise de l’Union Territoires & Nature a réuni habitants et militants autour du futur réseau de tramway.|Le responsable local plaide pour des lignes de nuit ; des commerçants craignent des travaux trop longs.','Habitants et militants débattent du futur tramway lyonnais.','journal-lyon','Le Journal de Lyon','lyon','local',65,2,'7a7a0000-0000-4000-8000-000000000003','Responsable local'),
('Horizon Citoyen réunit ses premiers membres','Le mouvement fictif Horizon Citoyen a tenu une réunion publique Place centrale.|Sa figure fondatrice veut donner plus de place aux habitants dans les décisions de quartier.','Le mouvement lyonnais fictif tient sa première grande réunion.','journal-lyon','Le Journal de Lyon','lyon','regional',60,8,'7a7a0000-0000-4000-8000-000000000012','Responsable de mouvement'),
('Génération Commune mobilise les étudiants lillois','Le mouvement fictif Génération Commune organise des rencontres à l’université pour parler emploi et logement des jeunes.','Rencontres à l’université autour des préoccupations des jeunes.','tribune-nord','La Tribune du Nord','lille','national',58,5,'7a7a0000-0000-4000-8000-000000000013','Responsable de mouvement'),
('Controverse autour des propositions de la Concorde','Le Parti de la Concorde, organisation fictive, propose davantage de patrouilles de nuit.|La proposition divise : certains habitants approuvent, d’autres craignent une surveillance excessive.','Une proposition sur la sécurité nocturne fait débat.','civitas-matin','Civitas Matin','paris','national',68,10,'7a7a0000-0000-4000-8000-000000000004','Porte-parole'),
('Renouveau Local s’implante dans les quartiers marseillais','Le mouvement fictif Renouveau Local ouvre un point de rencontre au Café des voisins pour parler propreté et commerces.','Le mouvement local fictif veut peser sur la vie des quartiers.','civitas-matin','Civitas Matin','marseille','local',55,12,'7a7a0000-0000-4000-8000-000000000014','Responsable de mouvement')
) v(title,body,summary,src,author,city,scope,imp,hours,org,role);
