-- Prospective foreign travel; game-day nights, departure city recorded (no metropolis gate).
BEGIN;
CREATE TABLE IF NOT EXISTS public.foreign_countries (
 id text PRIMARY KEY, name text NOT NULL, flag text NOT NULL, eu boolean NOT NULL,
 mode text NOT NULL CHECK(mode IN ('voiture','train','avion')), fare integer NOT NULL CHECK(fare BETWEEN 60 AND 900)
);
INSERT INTO public.foreign_countries VALUES
 ('es','Espagne','🇪🇸',true,'train',180),('it','Italie','🇮🇹',true,'train',220),
 ('de','Allemagne','🇩🇪',true,'train',160),('be','Belgique','🇧🇪',true,'voiture',60),
 ('pt','Portugal','🇵🇹',true,'avion',240),('gr','Grèce','🇬🇷',true,'avion',300),
 ('uk','Royaume-Uni','🇬🇧',false,'train',200),('ch','Suisse','🇨🇭',false,'train',140),
 ('ma','Maroc','🇲🇦',false,'avion',260),('us','États-Unis','🇺🇸',false,'avion',700),
 ('jp','Japon','🇯🇵',false,'avion',900),('ca','Canada','🇨🇦',false,'avion',650)
 ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.foreign_trips (
 id uuid PRIMARY KEY, character_id uuid NOT NULL REFERENCES public.characters(id),
 country_id text NOT NULL REFERENCES public.foreign_countries(id), departure_city text NOT NULL REFERENCES public.cities(id),
 departed_at timestamptz NOT NULL, returns_at timestamptz NOT NULL, days integer NOT NULL CHECK(days BETWEEN 2 AND 14),
 lodging text NOT NULL CHECK(lodging IN ('auberge','location','hôtel')), factor numeric NOT NULL CHECK(factor>0),
 total integer NOT NULL CHECK(total>=0), leave_year integer NOT NULL, paid_days integer NOT NULL CHECK(paid_days BETWEEN 0 AND 15),
 absence_days integer NOT NULL CHECK(absence_days>=0), incident text,
 status text NOT NULL DEFAULT 'abroad' CHECK(status IN ('abroad','returned')), settled_at timestamptz,
 UNIQUE(character_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS foreign_one_abroad ON public.foreign_trips(character_id) WHERE status='abroad';
CREATE TABLE IF NOT EXISTS public.foreign_postcards (
 id uuid PRIMARY KEY REFERENCES public.foreign_trips(id), character_id uuid NOT NULL REFERENCES public.characters(id),
 country_id text NOT NULL REFERENCES public.foreign_countries(id), text text NOT NULL
);
ALTER TABLE public.foreign_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foreign_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foreign_postcards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='foreign_countries' AND policyname='foreign_read') THEN
 CREATE POLICY foreign_read ON public.foreign_countries FOR SELECT TO authenticated USING(true);
 CREATE POLICY foreign_owner ON public.foreign_trips FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
 CREATE POLICY foreign_owner ON public.foreign_postcards FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
 END IF;
END $$;
REVOKE ALL ON public.foreign_countries,public.foreign_trips,public.foreign_postcards FROM anon,authenticated;
GRANT SELECT ON public.foreign_countries,public.foreign_trips,public.foreign_postcards TO authenticated;
GRANT ALL ON public.foreign_countries,public.foreign_trips,public.foreign_postcards TO service_role;
CREATE OR REPLACE FUNCTION public.foreign_travel_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); r public.foreign_trips; bonus integer; f numeric:=1;
BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM public.prefecture_state();
 IF to_regprocedure('public.real_economy_factor(timestamp with time zone)') IS NOT NULL THEN
 EXECUTE 'SELECT public.real_economy_factor(public.game_now())' INTO f; END IF;
 FOR r IN SELECT * FROM public.foreign_trips WHERE character_id=cid AND status='abroad' AND returns_at<=public.game_now() FOR UPDATE LOOP
  UPDATE public.foreign_trips SET status='returned',settled_at=public.game_now() WHERE id=r.id;
  bonus:=10+((hashtext(r.id::text||':rest')::bigint & 2147483647)%21)::integer;
  UPDATE public.characters SET energy=least(100,energy+bonus) WHERE id=cid;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='characters' AND column_name='mood' AND data_type IN ('integer','smallint','numeric')) THEN
   EXECUTE 'UPDATE public.characters SET mood=least(100,coalesce(mood,0)+$1) WHERE id=$2' USING bonus,cid;
  END IF;
  INSERT INTO public.foreign_postcards VALUES(r.id,cid,r.country_id,'Souvenir de '||(SELECT name FROM public.foreign_countries WHERE id=r.country_id)||' · repos +'||bonus) ON CONFLICT DO NOTHING;
  -- Existing life timeline source, exactly once under the locked trip status.
  INSERT INTO public.career_history(character_id,kind,label) VALUES(cid,'travel','Retour de voyage · '||(SELECT name FROM public.foreign_countries WHERE id=r.country_id));
 END LOOP;
 RETURN jsonb_build_object('now',public.game_now(),'factor',f,
 'countries',(SELECT jsonb_agg(c ORDER BY fare) FROM public.foreign_countries c),
 'documents',jsonb_build_object('cni',EXISTS(SELECT 1 FROM public.character_identity WHERE character_id=cid AND expires_at>=public.game_now()::date AND prefecture_lost_at IS NULL),
 'passport',EXISTS(SELECT 1 FROM public.administrative_documents WHERE character_id=cid AND type_id='passport' AND status='valide' AND valid_until>public.game_now() AND NOT coalesce((details->>'lost')::boolean,false))),
 'employed',EXISTS(SELECT 1 FROM public.employments WHERE character_id=cid AND status='active'),
 'leave_used',coalesce((SELECT sum(paid_days) FROM public.foreign_trips WHERE character_id=cid AND leave_year=extract(year FROM public.game_now())),0),
 'trips',coalesce((SELECT jsonb_agg(t ORDER BY departed_at DESC) FROM public.foreign_trips t WHERE character_id=cid),'[]'),
 'postcards',coalesce((SELECT jsonb_agg(p) FROM public.foreign_postcards p WHERE character_id=cid),'[]'));
END $$;
CREATE OR REPLACE FUNCTION public.foreign_travel_depart(_country text,_days integer,_lodging text,_request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); s jsonb; c public.foreign_countries; city text; nightly integer; price integer; used integer; paid integer:=0; absent integer:=0; seed bigint; incident text; extra integer:=0; t timestamptz:=public.game_now();
BEGIN
 s:=public.foreign_travel_state();
 IF _request IS NULL THEN RAISE EXCEPTION 'Clé requise'; END IF;
 IF EXISTS(SELECT 1 FROM public.foreign_trips WHERE id=_request AND character_id=cid) THEN RETURN s; END IF;
 IF _days IS NULL OR _days NOT BETWEEN 2 AND 14 OR _lodging IS NULL OR _lodging NOT IN ('auberge','location','hôtel') THEN RAISE EXCEPTION 'Séjour invalide'; END IF;
 IF EXISTS(SELECT 1 FROM public.foreign_trips WHERE character_id=cid AND status='abroad') THEN RAISE EXCEPTION 'Vous êtes à l''étranger'; END IF;
 SELECT * INTO c FROM public.foreign_countries WHERE id=_country;
 IF NOT FOUND THEN RAISE EXCEPTION 'Destination inconnue'; END IF;
 IF NOT (s->'documents'->>CASE WHEN c.eu THEN 'cni' ELSE 'passport' END)::boolean THEN RAISE EXCEPTION 'Titre de voyage valide requis'; END IF;
 SELECT city_id INTO city FROM public.characters WHERE id=cid;
 IF city IS NULL THEN RAISE EXCEPTION 'Ville de départ requise'; END IF;
 -- Do not allow existing work/agenda entries to complete during the stay.
 IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=cid AND status IN ('planned','running') AND end_time>t) THEN RAISE EXCEPTION 'Terminez ou annulez vos activités avant de partir'; END IF;
 nightly:=CASE _lodging WHEN 'auberge' THEN 30 WHEN 'location' THEN 60 ELSE 90 END;
 price:=ceil(c.fare*(s->>'factor')::numeric)+ceil(nightly*_days*(s->>'factor')::numeric);
 -- Character/date seed prevents request-key rerolls; only 5 percent of departures have an incident.
 seed:=hashtext(cid::text||':'||t::date)::bigint & 2147483647;
 IF seed%100<5 THEN
  incident:=CASE (seed/100)%3 WHEN 0 THEN CASE WHEN c.mode='avion' THEN 'Vol retardé' ELSE 'Transport retardé' END WHEN 1 THEN 'Bagage perdu' ELSE 'Passeport oublié' END;
  IF incident<>'Bagage perdu' THEN extra:=1; END IF;
 END IF;
 IF (s->>'employed')::boolean THEN
  used:=(s->>'leave_used')::integer; paid:=least(_days+extra,greatest(0,25-used)); absent:=_days+extra-paid;
 END IF;
 INSERT INTO public.foreign_trips(id,character_id,country_id,departure_city,departed_at,returns_at,days,lodging,factor,total,leave_year,paid_days,absence_days,incident)
 VALUES(_request,cid,c.id,city,t,t+make_interval(days=>_days+extra),_days,_lodging,(s->>'factor')::numeric,price,extract(year FROM t),paid,absent,incident);
 PERFORM public.economy_cash(cid,'foreign:'||_request,-price,'Voyage · '||c.name,'voyage');
 IF incident='Bagage perdu' THEN
  PERFORM 1 FROM public.accounts WHERE character_id=cid FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.accounts WHERE character_id=cid AND balance>=30) THEN
   PERFORM public.economy_cash(cid,'foreign:incident:'||_request,-30,'Bagage perdu','voyage');
  END IF;
 END IF;
 IF absent>0 THEN UPDATE public.employments SET progress=greatest(0,progress-least(5,absent)) WHERE character_id=cid AND status='active'; END IF;
 RETURN public.foreign_travel_state();
END $$;
CREATE OR REPLACE FUNCTION public.foreign_travel_guard() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.social_actor(); BEGIN
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid FOR UPDATE;
 PERFORM public.foreign_travel_state();
 IF EXISTS(SELECT 1 FROM public.foreign_trips WHERE character_id=cid AND status='abroad') THEN RAISE EXCEPTION 'Vous êtes à l''étranger'; END IF;
END $$;
-- Patch installed definitions rather than replacing historical bodies. Guard first BEGIN only.
DO $$ DECLARE r record; def text; anchor text; BEGIN
 IF to_regprocedure('public.move_character(uuid)') IS NULL OR to_regprocedure('public.start_life_activity(text,uuid,uuid)') IS NULL OR to_regprocedure('public.cast_election_vote(uuid,uuid)') IS NULL THEN RAISE EXCEPTION '0113: fonctions de base absentes'; END IF;
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='public' AND l.lanname='plpgsql' AND (p.proname IN ('move_character','start_life_activity','business_work','travel_drive_intercity','start_intercity_travel','travel_intercity') OR p.proname LIKE '%vote%') LOOP
  def:=pg_get_functiondef(r.oid);
  IF position('public.foreign_travel_guard()' IN def)>0 THEN CONTINUE; END IF;
  anchor:=substring(def FROM '\m[Bb][Ee][Gg][Ii][Nn]\M');
  IF anchor IS NULL THEN RAISE EXCEPTION '0113: ancre BEGIN absente pour %',r.oid::regprocedure; END IF;
  def:=regexp_replace(def,'\m[Bb][Ee][Gg][Ii][Nn]\M',anchor||' PERFORM public.foreign_travel_guard();');
  EXECUTE def;
 END LOOP;
END $$;
-- Central agenda guard also covers social/civic/political scheduling entry points.
CREATE OR REPLACE FUNCTION public.foreign_agenda_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.characters WHERE id=NEW.character_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.foreign_trips WHERE character_id=NEW.character_id AND status='abroad' AND returns_at>public.game_now()) THEN RAISE EXCEPTION 'Vous êtes à l''étranger'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS foreign_agenda_guard ON public.activities;
CREATE TRIGGER foreign_agenda_guard BEFORE INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.foreign_agenda_guard();
REVOKE ALL ON FUNCTION public.foreign_travel_state(),public.foreign_travel_depart(text,integer,text,uuid),public.foreign_travel_guard(),public.foreign_agenda_guard() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.foreign_travel_state(),public.foreign_travel_depart(text,integer,text,uuid) TO authenticated,service_role;
COMMIT;
