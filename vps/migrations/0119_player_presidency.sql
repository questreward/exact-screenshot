-- 0119 — Présidence de la République jouable.
-- Ajouts : réglages, élections présidentielles (parrainages + 2 tours), candidatures, parrainages,
-- bulletins secrets, fonction présidentielle (intérim, Premier ministre), actes, référendums et votes.
-- Pouvoirs réels : renvoi d'une loi pendant les 24 h avant entrée en vigueur (nouvelle version,
-- nouvel examen), dissolution (législatives anticipées via le calendrier national existant).
-- Le gouvernement fictif (PNJ) et les registres nationaux ne sont pas modifiés autrement.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.pr_settings') IS NOT NULL THEN RAISE EXCEPTION '0119 déjà installée : ne pas relancer'; END IF;
 IF to_regclass('public.national_laws') IS NULL OR to_regclass('public.national_law_versions') IS NULL OR to_regclass('public.national_elections') IS NULL
 OR to_regclass('public.national_legislatures') IS NULL OR to_regclass('public.legislative_elections') IS NULL
 OR to_regprocedure('public.national_publish(text,text,text)') IS NULL OR to_regprocedure('public.social_actor()') IS NULL
 THEN RAISE EXCEPTION 'Prérequis politique nationale (0045/0058) requis'; END IF;
END $$;

CREATE TABLE public.pr_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK (id), installed_at timestamptz NOT NULL DEFAULT public.game_now(),
 min_age integer NOT NULL DEFAULT 18, sponsors_required integer NOT NULL DEFAULT 5 CHECK (sponsors_required > 0),
 candidacy_days integer NOT NULL DEFAULT 7, mandate_days integer NOT NULL DEFAULT 35 CHECK (mandate_days > 0),
 referendum_days integer NOT NULL DEFAULT 2, speech_limit integer NOT NULL DEFAULT 2000, question_limit integer NOT NULL DEFAULT 300
);
INSERT INTO public.pr_settings DEFAULT VALUES;

-- Calendrier : candidatures/parrainages (7 j), 1er tour (1 j), 2nd tour (1 j), mandat 35 j (1 semaine = 1 an).
CREATE TABLE public.pr_elections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), predecessor uuid UNIQUE REFERENCES public.pr_elections(id),
 opens_at timestamptz NOT NULL, round1_at timestamptz NOT NULL, round2_at timestamptz NOT NULL, closes_at timestamptz NOT NULL UNIQUE,
 ends_at timestamptz NOT NULL, round1_counted boolean NOT NULL DEFAULT false, settled boolean NOT NULL DEFAULT false,
 finalists uuid[], winner uuid REFERENCES public.characters(id), results jsonb,
 CHECK (opens_at < round1_at AND round1_at < round2_at AND round2_at < closes_at AND closes_at < ends_at)
);
CREATE UNIQUE INDEX pr_first_election ON public.pr_elections ((true)) WHERE predecessor IS NULL;
INSERT INTO public.pr_elections(opens_at,round1_at,round2_at,closes_at,ends_at)
SELECT installed_at, installed_at+candidacy_days*interval '1 day', installed_at+(candidacy_days+1)*interval '1 day',
 installed_at+(candidacy_days+2)*interval '1 day', installed_at+(candidacy_days+2+mandate_days)*interval '1 day' FROM public.pr_settings;

CREATE TABLE public.pr_candidates (
 election_id uuid REFERENCES public.pr_elections(id), character_id uuid REFERENCES public.characters(id),
 created_at timestamptz NOT NULL DEFAULT public.game_now(), PRIMARY KEY (election_id, character_id)
);
CREATE TABLE public.pr_sponsors (
 election_id uuid NOT NULL, sponsor uuid REFERENCES public.characters(id), candidate uuid NOT NULL,
 PRIMARY KEY (election_id, sponsor), FOREIGN KEY (election_id, candidate) REFERENCES public.pr_candidates(election_id, character_id)
);
CREATE TABLE public.pr_ballots (
 election_id uuid NOT NULL, round integer NOT NULL CHECK (round IN (1,2)), voter uuid REFERENCES public.characters(id), candidate uuid NOT NULL,
 PRIMARY KEY (election_id, round, voter), FOREIGN KEY (election_id, candidate) REFERENCES public.pr_candidates(election_id, character_id)
);
CREATE TABLE public.pr_office (
 id boolean PRIMARY KEY DEFAULT true CHECK (id), interim uuid REFERENCES public.characters(id),
 prime_minister uuid REFERENCES public.characters(id), pm_named_at timestamptz
);
INSERT INTO public.pr_office DEFAULT VALUES;
CREATE TABLE public.pr_acts (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('premier_ministre','promulgation','renvoi','dissolution','discours','referendum')),
 president uuid NOT NULL REFERENCES public.characters(id), law_id uuid, body text, created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE UNIQUE INDEX pr_one_decision_per_law ON public.pr_acts (law_id) WHERE kind IN ('promulgation','renvoi');
CREATE TABLE public.pr_referendums (
 id uuid PRIMARY KEY, question text NOT NULL, president uuid NOT NULL REFERENCES public.characters(id),
 opens_at timestamptz NOT NULL, closes_at timestamptz NOT NULL, settled boolean NOT NULL DEFAULT false, yes integer, no integer
);
CREATE UNIQUE INDEX pr_one_open_referendum ON public.pr_referendums ((true)) WHERE NOT settled;
CREATE TABLE public.pr_referendum_votes (
 referendum_id uuid REFERENCES public.pr_referendums(id), voter uuid REFERENCES public.characters(id),
 vote boolean NOT NULL, PRIMARY KEY (referendum_id, voter)
);

GRANT SELECT ON public.pr_settings TO authenticated;
GRANT ALL ON public.pr_settings, public.pr_elections, public.pr_candidates, public.pr_sponsors, public.pr_ballots, public.pr_office,
 public.pr_acts, public.pr_referendums, public.pr_referendum_votes TO service_role;
REVOKE ALL ON public.pr_elections, public.pr_candidates, public.pr_sponsors, public.pr_ballots, public.pr_office,
 public.pr_acts, public.pr_referendums, public.pr_referendum_votes FROM PUBLIC, anon, authenticated;
ALTER TABLE public.pr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_office ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_referendums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_referendum_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read pr settings" ON public.pr_settings FOR SELECT TO authenticated USING (true);

CREATE FUNCTION public.pr_name(_cid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT first_name||' '||last_name FROM public.characters WHERE id=_cid $$;

CREATE FUNCTION public.pr_president() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce((SELECT winner FROM public.pr_elections WHERE settled AND winner IS NOT NULL AND closes_at<=public.game_now() AND ends_at>public.game_now()
   ORDER BY closes_at DESC LIMIT 1), (SELECT interim FROM public.pr_office)) $$;

-- Dépouillements et référendums, réglés à la lecture ; verrou unique sur pr_settings.
CREATE FUNCTION public.pr_settle() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.pr_settings; e public.pr_elections; total integer; top record; fin uuid[]; w uuid; r public.pr_referendums; y integer; n integer; res jsonb; BEGIN
 SELECT * INTO s FROM public.pr_settings WHERE id FOR UPDATE;
 LOOP
  SELECT * INTO e FROM public.pr_elections WHERE NOT settled AND round2_at<=public.game_now() ORDER BY closes_at LIMIT 1 FOR UPDATE;
  EXIT WHEN NOT FOUND;
  IF NOT e.round1_counted THEN
   SELECT jsonb_agg(jsonb_build_object('character_id',c.character_id,'name',public.pr_name(c.character_id),'votes',
     (SELECT count(*) FROM public.pr_ballots b WHERE b.election_id=e.id AND b.round=1 AND b.candidate=c.character_id)) ORDER BY c.created_at)
    INTO res FROM public.pr_candidates c WHERE c.election_id=e.id
     AND (SELECT count(*) FROM public.pr_sponsors p WHERE p.election_id=e.id AND p.candidate=c.character_id) >= s.sponsors_required;
   SELECT count(*) INTO total FROM public.pr_ballots WHERE election_id=e.id AND round=1;
   SELECT array_agg(x.cid ORDER BY x.v DESC, x.t) INTO fin FROM (
     SELECT c.character_id cid, c.created_at t, (SELECT count(*) FROM public.pr_ballots b WHERE b.election_id=e.id AND b.round=1 AND b.candidate=c.character_id) v
     FROM public.pr_candidates c WHERE c.election_id=e.id
      AND (SELECT count(*) FROM public.pr_sponsors p WHERE p.election_id=e.id AND p.candidate=c.character_id) >= s.sponsors_required
     ORDER BY v DESC, t LIMIT 2) x;
   w := NULL;
   IF fin IS NOT NULL AND total > 0 AND (SELECT count(*) FROM public.pr_ballots WHERE election_id=e.id AND round=1 AND candidate=fin[1])*2 > total THEN w := fin[1];
   ELSIF fin IS NOT NULL AND array_length(fin,1)=1 THEN w := fin[1]; END IF;
   UPDATE public.pr_elections SET round1_counted=true, finalists=CASE WHEN w IS NULL THEN fin END,
    results=jsonb_build_object('round1',coalesce(res,'[]'::jsonb)), winner=w, settled=(w IS NOT NULL OR fin IS NULL) WHERE id=e.id;
   PERFORM public.national_publish('pr-round1:'||e.id,'Présidentielle : résultats du 1er tour',
    CASE WHEN w IS NOT NULL THEN public.pr_name(w)||' est élu(e) dès le premier tour.'
         WHEN fin IS NULL THEN 'Aucun candidat n''a réuni ses parrainages : l''intérim se poursuit et un nouveau scrutin est ouvert.'
         ELSE public.pr_name(fin[1])||' et '||public.pr_name(fin[2])||' sont qualifiés pour le second tour.' END);
   CONTINUE;
  END IF;
  EXIT WHEN e.closes_at > public.game_now();
  SELECT x.cid INTO w FROM (SELECT unnest(e.finalists) cid, generate_subscripts(e.finalists,1) i) x
   ORDER BY (SELECT count(*) FROM public.pr_ballots b WHERE b.election_id=e.id AND b.round=2 AND b.candidate=x.cid) DESC, x.i LIMIT 1;
  UPDATE public.pr_elections SET settled=true, winner=w, results=results||jsonb_build_object('round2',(SELECT jsonb_agg(jsonb_build_object('character_id',f,'name',public.pr_name(f),
    'votes',(SELECT count(*) FROM public.pr_ballots b WHERE b.election_id=e.id AND b.round=2 AND b.candidate=f))) FROM unnest(e.finalists) f)) WHERE id=e.id;
  PERFORM public.national_publish('pr-round2:'||e.id,'Présidentielle : résultat du second tour',public.pr_name(w)||' est élu(e) Président(e) de la République.');
 END LOOP;
 -- Successeur unique : à la fin du mandat si élu, sinon nouveau scrutin immédiat.
 FOR e IN SELECT * FROM public.pr_elections p WHERE p.settled AND NOT EXISTS(SELECT 1 FROM public.pr_elections q WHERE q.predecessor=p.id) LOOP
  INSERT INTO public.pr_elections(predecessor,opens_at,round1_at,round2_at,closes_at,ends_at)
  SELECT e.id, b, b+s.candidacy_days*interval '1 day', b+(s.candidacy_days+1)*interval '1 day', b+(s.candidacy_days+2)*interval '1 day', b+(s.candidacy_days+2+s.mandate_days)*interval '1 day'
  FROM (SELECT CASE WHEN e.winner IS NULL THEN greatest(e.round2_at, e.closes_at) ELSE e.ends_at-(s.candidacy_days+2)*interval '1 day' END b) z
  ON CONFLICT DO NOTHING;
 END LOOP;
 FOR r IN SELECT * FROM public.pr_referendums WHERE NOT settled AND closes_at<=public.game_now() FOR UPDATE LOOP
  SELECT count(*) FILTER (WHERE vote), count(*) FILTER (WHERE NOT vote) INTO y, n FROM public.pr_referendum_votes WHERE referendum_id=r.id;
  UPDATE public.pr_referendums SET settled=true, yes=y, no=n WHERE id=r.id;
  PERFORM public.national_publish('pr-referendum:'||r.id,'Résultat du référendum',r.question||' — Oui : '||y||', Non : '||n||'. '||CASE WHEN y>n THEN 'Le OUI l''emporte.' ELSE 'Le NON l''emporte.' END);
 END LOOP;
END $$;

CREATE FUNCTION public.pr_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); s public.pr_settings; p uuid; e public.pr_elections; age integer; BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM public.pr_settle();
 SELECT * INTO s FROM public.pr_settings WHERE id; p := public.pr_president();
 SELECT c.age INTO age FROM public.characters c WHERE c.id=cid;
 SELECT * INTO e FROM public.pr_elections WHERE NOT settled ORDER BY closes_at LIMIT 1;
 RETURN jsonb_build_object('now',public.game_now(),'actor',cid,'eligible',coalesce(age,0)>=s.min_age,
  'president',p,'president_name',public.pr_name(p),'is_president',p=cid,
  'interim',(SELECT interim FROM public.pr_office) IS NOT DISTINCT FROM p AND NOT EXISTS(SELECT 1 FROM public.pr_elections WHERE settled AND winner=p AND ends_at>public.game_now()),
  'prime_minister',(SELECT public.pr_name(prime_minister) FROM public.pr_office),
  'settings',to_jsonb(s),
  'election',CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object('id',e.id,'opens_at',e.opens_at,'round1_at',e.round1_at,'round2_at',e.round2_at,'closes_at',e.closes_at,
    'round1_counted',e.round1_counted,'results',e.results,
    'finalists',(SELECT jsonb_agg(jsonb_build_object('character_id',f,'name',public.pr_name(f))) FROM unnest(e.finalists) f),
    'candidates',coalesce((SELECT jsonb_agg(jsonb_build_object('character_id',c.character_id,'name',public.pr_name(c.character_id),
       'sponsors',(SELECT count(*) FROM public.pr_sponsors x WHERE x.election_id=e.id AND x.candidate=c.character_id)) ORDER BY c.created_at)
       FROM public.pr_candidates c WHERE c.election_id=e.id),'[]'::jsonb),
    'my_sponsor',(SELECT candidate FROM public.pr_sponsors WHERE election_id=e.id AND sponsor=cid),
    'voted',coalesce((SELECT jsonb_agg(round) FROM public.pr_ballots WHERE election_id=e.id AND voter=cid),'[]'::jsonb)) END,
  'last_results',(SELECT jsonb_build_object('closes_at',closes_at,'winner',public.pr_name(winner),'results',results) FROM public.pr_elections WHERE settled ORDER BY closes_at DESC LIMIT 1),
  'referendum',(SELECT jsonb_build_object('id',r.id,'question',r.question,'closes_at',r.closes_at,'voted',EXISTS(SELECT 1 FROM public.pr_referendum_votes v WHERE v.referendum_id=r.id AND v.voter=cid))
     FROM public.pr_referendums r WHERE NOT r.settled LIMIT 1),
  'acts',coalesce((SELECT jsonb_agg(jsonb_build_object('kind',a.kind,'president',public.pr_name(a.president),'body',a.body,'created_at',a.created_at) ORDER BY a.created_at DESC)
     FROM (SELECT * FROM public.pr_acts ORDER BY created_at DESC LIMIT 30) a),'[]'::jsonb),
  'pending_laws',CASE WHEN p=cid THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id',l.id,'title',v.title,'adopted_at',l.adopted_at,'in_force_at',l.adopted_at+interval '24 hours'))
     FROM public.national_laws l JOIN public.national_law_versions v ON v.law_id=l.id AND v.version=l.current_version
     WHERE l.status='adopted' AND public.game_now()<l.adopted_at+interval '24 hours' AND NOT EXISTS(SELECT 1 FROM public.pr_acts a WHERE a.law_id=l.id)),'[]'::jsonb) ELSE '[]'::jsonb END,
  'players',CASE WHEN p=cid THEN coalesce((SELECT jsonb_agg(jsonb_build_object('character_id',c.id,'name',c.first_name||' '||c.last_name) ORDER BY c.last_name)
     FROM (SELECT * FROM public.characters WHERE age>=s.min_age AND id<>cid ORDER BY last_name LIMIT 300) c),'[]'::jsonb) ELSE '[]'::jsonb END,
  'can_dissolve',p=cid AND NOT EXISTS(SELECT 1 FROM public.pr_acts a WHERE a.kind='dissolution' AND a.created_at>=public.game_now()-s.mandate_days*interval '1 day')
     AND NOT EXISTS(SELECT 1 FROM public.national_elections WHERE counted_at IS NULL AND status<>'cancelled'));
END $$;

-- Actions : candidate, sponsor, vote, pm, promulgate, refer_back, dissolve, speech, referendum, referendum_vote.
CREATE FUNCTION public.pr_action(_action text, _target uuid DEFAULT NULL, _body text DEFAULT NULL, _yes boolean DEFAULT NULL, _request uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := public.social_actor(); s public.pr_settings; e public.pr_elections; p uuid; age integer; b text := btrim(coalesce(_body,''));
 l public.national_laws; prev public.national_elections; st timestamptz; neid uuid; v_rules jsonb; t timestamptz := public.game_now(); BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage connecté requis'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM public.pr_settle();
 SELECT * INTO s FROM public.pr_settings WHERE id; p := public.pr_president();
 SELECT c.age INTO age FROM public.characters c WHERE c.id=cid;
 SELECT * INTO e FROM public.pr_elections WHERE NOT settled ORDER BY closes_at LIMIT 1;
 IF _action IN ('candidate','sponsor','vote') THEN
  IF coalesce(age,0) < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans', s.min_age; END IF;
  IF e.id IS NULL OR t < e.opens_at THEN RAISE EXCEPTION 'Aucune présidentielle ouverte'; END IF;
 END IF;
 IF _action='candidate' THEN
  IF t >= e.round1_at THEN RAISE EXCEPTION 'Les candidatures sont closes'; END IF;
  INSERT INTO public.pr_candidates(election_id,character_id) VALUES (e.id,cid) ON CONFLICT DO NOTHING;
 ELSIF _action='sponsor' THEN
  IF t >= e.round1_at THEN RAISE EXCEPTION 'Les parrainages sont clos'; END IF;
  IF _target=cid THEN RAISE EXCEPTION 'On ne peut pas se parrainer soi-même'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.pr_candidates WHERE election_id=e.id AND character_id=_target) THEN RAISE EXCEPTION 'Candidat introuvable'; END IF;
  IF EXISTS(SELECT 1 FROM public.pr_sponsors WHERE election_id=e.id AND sponsor=cid) THEN RAISE EXCEPTION 'Parrainage unique et définitif déjà donné'; END IF;
  INSERT INTO public.pr_sponsors(election_id,sponsor,candidate) VALUES (e.id,cid,_target);
 ELSIF _action='vote' THEN
  IF EXISTS(SELECT 1 FROM public.pr_ballots WHERE election_id=e.id AND voter=cid AND round=CASE WHEN e.round1_counted THEN 2 ELSE 1 END) THEN RAISE EXCEPTION 'Vous avez déjà voté à ce tour'; END IF;
  IF t >= e.round1_at AND t < e.round2_at AND NOT e.round1_counted THEN
   IF (SELECT count(*) FROM public.pr_sponsors WHERE election_id=e.id AND candidate=_target) < s.sponsors_required THEN RAISE EXCEPTION 'Ce candidat n''a pas ses parrainages'; END IF;
   INSERT INTO public.pr_ballots(election_id,round,voter,candidate) VALUES (e.id,1,cid,_target);
  ELSIF t >= e.round2_at AND t < e.closes_at AND e.round1_counted THEN
   IF NOT (_target = ANY(e.finalists)) THEN RAISE EXCEPTION 'Ce candidat n''est pas au second tour'; END IF;
   INSERT INTO public.pr_ballots(election_id,round,voter,candidate) VALUES (e.id,2,cid,_target);
  ELSE RAISE EXCEPTION 'Le bureau de vote est fermé'; END IF;
 ELSE
  IF p IS DISTINCT FROM cid AND _action<>'referendum_vote' THEN RAISE EXCEPTION 'Réservé au Président de la République'; END IF;
  IF _request IS NULL AND _action<>'referendum_vote' THEN RAISE EXCEPTION 'Requête invalide'; END IF;
  IF _action<>'referendum_vote' AND EXISTS(SELECT 1 FROM public.pr_acts WHERE id=_request) THEN RETURN public.pr_state(); END IF;
  IF _action='pm' THEN
   IF _target IS NULL OR _target=cid OR NOT EXISTS(SELECT 1 FROM public.characters WHERE id=_target AND age>=s.min_age) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
   UPDATE public.pr_office SET prime_minister=_target, pm_named_at=t WHERE id;
   INSERT INTO public.pr_acts(id,kind,president,body) VALUES (_request,'premier_ministre',cid,public.pr_name(_target)||' est nommé(e) Premier ministre.');
   PERFORM public.national_publish('pr-pm:'||_request,'Nomination du Premier ministre',public.pr_name(cid)||' nomme '||public.pr_name(_target)||' Premier ministre.');
  ELSIF _action IN ('promulgate','refer_back') THEN
   SELECT * INTO l FROM public.national_laws WHERE id=_target FOR UPDATE;
   IF NOT FOUND OR l.status<>'adopted' OR t >= l.adopted_at+interval '24 hours' THEN RAISE EXCEPTION 'Loi hors délai de promulgation'; END IF;
   IF _action='promulgate' THEN
    INSERT INTO public.pr_acts(id,kind,president,law_id,body) SELECT _request,'promulgation',cid,l.id,'Promulgation : '||v.title FROM public.national_law_versions v WHERE v.law_id=l.id AND v.version=l.current_version;
    PERFORM public.national_publish('pr-promulgation:'||l.id,'Loi promulguée',(SELECT title FROM public.national_law_versions WHERE law_id=l.id AND version=l.current_version)||' est promulguée par '||public.pr_name(cid)||'.');
   ELSE
    -- Nouvelle délibération (art. 10) : même texte, nouvelle version, nouvel examen par les deux chambres.
    INSERT INTO public.national_law_versions(law_id,version,template_id,title,description,category,effects,cost,delay_minutes,budget_allocations)
    SELECT law_id,version+1,template_id,title,description,category,effects,cost,delay_minutes,budget_allocations FROM public.national_law_versions WHERE law_id=l.id AND version=l.current_version;
    UPDATE public.national_laws SET current_version=current_version+1, status='examining', adopted_at=NULL WHERE id=l.id;
    INSERT INTO public.pr_acts(id,kind,president,law_id,body) SELECT _request,'renvoi',cid,l.id,'Nouvelle délibération demandée : '||v.title FROM public.national_law_versions v WHERE v.law_id=l.id AND v.version=l.current_version;
    PERFORM public.national_publish('pr-renvoi:'||l.id,'Loi renvoyée au Parlement',public.pr_name(cid)||' demande une nouvelle délibération : le texte repasse devant l''Assemblée puis le Sénat.');
   END IF;
  ELSIF _action='dissolve' THEN
   IF EXISTS(SELECT 1 FROM public.pr_acts WHERE kind='dissolution' AND created_at>=t-s.mandate_days*interval '1 day') THEN RAISE EXCEPTION 'Une seule dissolution par période de mandat'; END IF;
   PERFORM pg_advisory_xact_lock(151515);
   IF EXISTS(SELECT 1 FROM public.national_elections WHERE counted_at IS NULL AND status<>'cancelled') THEN RAISE EXCEPTION 'Une élection nationale est déjà en cours'; END IF;
   SELECT * INTO prev FROM public.national_elections WHERE status<>'cancelled' ORDER BY candidacies_at DESC LIMIT 1;
   IF prev.id IS NULL THEN RAISE EXCEPTION 'Aucune Assemblée à dissoudre'; END IF;
   st := date_trunc('minute', t) + interval '1 minute';
   SELECT rules INTO v_rules FROM public.national_settings WHERE id=1;
   v_rules := v_rules || jsonb_build_object('model','real577','party_snapshot',coalesce(prev.rules->'party_snapshot','{}'::jsonb),'dissolution',true);
   INSERT INTO public.national_elections(name,candidacies_at,candidacies_end_at,vote_at,vote_end_at,term_end_at,rules,predecessor_id)
   VALUES ('Élections législatives anticipées', st, st+interval '7 days', st+interval '8 days', st+interval '10 days', st+interval '38 days', v_rules, prev.id) RETURNING id INTO neid;
   INSERT INTO public.legislative_elections(national_election_id) VALUES (neid);
   UPDATE public.national_legislatures SET ends_at=st+interval '10 days' WHERE ends_at>st+interval '10 days' AND starts_at<st+interval '10 days';
   UPDATE public.national_governments SET ends_at=st+interval '10 days' WHERE ends_at>st+interval '10 days' AND starts_at<st+interval '10 days';
   UPDATE public.national_offices SET ends_at=st+interval '10 days' WHERE ends_at>st+interval '10 days' AND starts_at<st+interval '10 days';
   INSERT INTO public.pr_acts(id,kind,president,body) VALUES (_request,'dissolution',cid,'Dissolution de l''Assemblée nationale');
   PERFORM public.national_publish('pr-dissolution:'||neid,'Dissolution de l''Assemblée nationale',public.pr_name(cid)||' dissout l''Assemblée. Législatives anticipées : candidatures pendant 7 jours, puis deux tours.');
  ELSIF _action='speech' THEN
   IF b='' OR char_length(b)>s.speech_limit THEN RAISE EXCEPTION 'Allocution de 1 à % caractères', s.speech_limit; END IF;
   INSERT INTO public.pr_acts(id,kind,president,body) VALUES (_request,'discours',cid,b);
   PERFORM public.national_publish('pr-speech:'||_request,'Allocution du Président de la République',public.pr_name(cid)||' : « '||left(b,1800)||' »');
  ELSIF _action='referendum' THEN
   IF b='' OR char_length(b)>s.question_limit THEN RAISE EXCEPTION 'Question de 1 à % caractères', s.question_limit; END IF;
   IF EXISTS(SELECT 1 FROM public.pr_referendums WHERE NOT settled) THEN RAISE EXCEPTION 'Un référendum est déjà en cours'; END IF;
   INSERT INTO public.pr_referendums(id,question,president,opens_at,closes_at) VALUES (_request,b,cid,t,t+s.referendum_days*interval '1 day');
   INSERT INTO public.pr_acts(id,kind,president,body) VALUES (_request,'referendum',cid,b);
   PERFORM public.national_publish('pr-referendum-open:'||_request,'Référendum national',b||' — vote ouvert à tous les citoyens pendant '||s.referendum_days||' jours.');
  ELSIF _action='referendum_vote' THEN
   IF coalesce(age,0) < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans', s.min_age; END IF;
   IF _yes IS NULL OR NOT EXISTS(SELECT 1 FROM public.pr_referendums WHERE id=_target AND NOT settled AND closes_at>t) THEN RAISE EXCEPTION 'Référendum fermé'; END IF;
   IF EXISTS(SELECT 1 FROM public.pr_referendum_votes WHERE referendum_id=_target AND voter=cid) THEN RAISE EXCEPTION 'Vous avez déjà voté'; END IF;
   INSERT INTO public.pr_referendum_votes(referendum_id,voter,vote) VALUES (_target,cid,_yes);
  ELSE RAISE EXCEPTION 'Action inconnue'; END IF;
 END IF;
 RETURN public.pr_state();
END $$;

REVOKE ALL ON FUNCTION public.pr_name(uuid), public.pr_president(), public.pr_settle() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pr_state(), public.pr_action(text,uuid,text,boolean,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pr_state(), public.pr_action(text,uuid,text,boolean,uuid) TO authenticated;
COMMIT;
