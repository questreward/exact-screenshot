-- Bloc 14 – Monde vivant, déplacements et Carte
-- PROPOSITION NON APPLIQUÉE. Additif uniquement : aucune suppression, aucun DROP,
-- aucune modification de game_now(), de l'horloge ni des véhicules personnels.

-- 1. Colonnes ajoutées (défaut 0 / vide : aucun effet rétroactif)
ALTER TABLE public.world_event_templates
  ADD COLUMN IF NOT EXISTS travel_delay_minutes integer NOT NULL DEFAULT 0 CHECK (travel_delay_minutes BETWEEN 0 AND 120),
  ADD COLUMN IF NOT EXISTS city_effect_indicator text,
  ADD COLUMN IF NOT EXISTS city_effect_values jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS travel_delay_minutes integer NOT NULL DEFAULT 0 CHECK (travel_delay_minutes BETWEEN 0 AND 120);

ALTER TABLE public.world_event_settings
  ADD COLUMN IF NOT EXISTS travel_delay_cap_minutes integer NOT NULL DEFAULT 40 CHECK (travel_delay_cap_minutes BETWEEN 0 AND 240);

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS travel_delay_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_event_ids uuid[] NOT NULL DEFAULT '{}';

-- 2. Réglage des deux modèles concernés (seules lignes de configuration modifiées)
UPDATE public.world_event_templates SET travel_delay_minutes = 20 WHERE id = 'street-works';
UPDATE public.world_event_templates
  SET city_effect_indicator = 'satisfaction',
      city_effect_values = '{"none":0,"low":1,"medium":2,"strong":3}'::jsonb
  WHERE id = 'national-campaign';

-- 3. Registre des effets nationaux par ville : unicité stricte (événement, ville)
CREATE TABLE public.world_event_city_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  city_id text NOT NULL REFERENCES public.cities(id),
  indicator text NOT NULL,
  level text NOT NULL CHECK (level IN ('none','low','medium','strong')),
  amount integer NOT NULL DEFAULT 0 CHECK (amount BETWEEN 0 AND 10),
  applied_at timestamptz NOT NULL,
  UNIQUE (event_id, city_id)
);
GRANT SELECT ON public.world_event_city_effects TO authenticated;
GRANT ALL ON public.world_event_city_effects TO service_role;
ALTER TABLE public.world_event_city_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY world_event_city_effects_read ON public.world_event_city_effects
  FOR SELECT TO authenticated USING (true);

-- 4. Calcul interne du retard (non appelable par les joueurs)
CREATE OR REPLACE FUNCTION public.transport_delay(_city text, _from uuid, _to uuid, _at timestamptz)
RETURNS TABLE(minutes integer, event_ids uuid[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT LEAST(COALESCE(SUM(e.travel_delay_minutes),0)::integer,
               COALESCE((SELECT travel_delay_cap_minutes FROM public.world_event_settings WHERE id=1),40)),
         COALESCE(array_agg(e.id ORDER BY e.starts_at, e.id), '{}')
  FROM public.events e
  WHERE e.travel_delay_minutes > 0
    AND e.character_id IS NULL
    AND e.status <> 'cancelled'
    AND e.city_id = _city
    AND e.starts_at <= _at
    AND (e.ends_at IS NULL OR e.ends_at > _at)
    AND (e.location_id IS NULL OR e.location_id IN (_from, _to));
$$;
REVOKE ALL ON FUNCTION public.transport_delay(text, uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;

-- 5. Aperçu avant confirmation (lecture seule, joueur connecté)
CREATE OR REPLACE FUNCTION public.transport_delay_preview(_target_location_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.character_positions; r public.life_rules; d record;
BEGIN
  SELECT cp.* INTO p FROM public.character_positions cp JOIN public.characters c ON c.id=cp.character_id WHERE c.user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  SELECT * INTO r FROM public.life_rules WHERE id='transport';
  SELECT * INTO d FROM public.transport_delay(p.city_id, p.location_id, _target_location_id, public.game_now());
  RETURN jsonb_build_object('base_minutes', r.duration_minutes, 'delay_minutes', d.minutes,
    'total_minutes', r.duration_minutes + d.minutes,
    'events', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'minutes',e.travel_delay_minutes))
                        FROM public.events e WHERE e.id = ANY(d.event_ids)), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.transport_delay_preview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transport_delay_preview(uuid) TO authenticated;

-- 6. Recopie du retard du modèle vers l'événement, uniquement à sa création
CREATE OR REPLACE FUNCTION public.world_event_copy_travel_delay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.template_id IS NOT NULL AND NEW.character_id IS NULL THEN
    SELECT COALESCE(t.travel_delay_minutes,0) INTO NEW.travel_delay_minutes FROM public.world_event_templates t WHERE t.id=NEW.template_id;
  ELSE
    NEW.travel_delay_minutes := 0;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.world_event_copy_travel_delay() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER world_event_travel_delay BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.world_event_copy_travel_delay();

-- 7. Effets nationaux par ville (interne, idempotent)
CREATE OR REPLACE FUNCTION public.world_event_city_effects_apply(_event_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e public.events; t public.world_event_templates; ci record; lvl text; pts integer; cur integer; n integer := 0; k text;
BEGIN
  SELECT * INTO e FROM public.events WHERE id=_event_id;
  IF NOT FOUND OR e.scope <> 'national' OR e.character_id IS NOT NULL OR e.template_id IS NULL OR e.status='cancelled' THEN RETURN 0; END IF;
  SELECT * INTO t FROM public.world_event_templates WHERE id=e.template_id;
  IF t.city_effect_indicator IS NULL THEN RETURN 0; END IF;
  FOR ci IN SELECT id FROM public.cities ORDER BY id LOOP
    SELECT value INTO cur FROM public.city_indicators WHERE city_id=ci.id AND indicator=t.city_effect_indicator FOR UPDATE;
    lvl := CASE WHEN cur IS NULL OR cur >= 70 THEN 'none' WHEN cur >= 50 THEN 'low' WHEN cur >= 30 THEN 'medium' ELSE 'strong' END;
    pts := COALESCE((t.city_effect_values->>lvl)::integer, 0);
    INSERT INTO public.world_event_city_effects(event_id, city_id, indicator, level, amount, applied_at)
      VALUES (e.id, ci.id, t.city_effect_indicator, lvl, pts, public.game_now())
      ON CONFLICT (event_id, city_id) DO NOTHING;
    IF FOUND THEN
      n := n + 1;
      IF pts > 0 AND cur IS NOT NULL THEN
        k := 'wevent-city:' || e.id || ':' || ci.id;
        UPDATE public.city_indicators SET value = LEAST(100, value + pts) WHERE city_id=ci.id AND indicator=t.city_effect_indicator;
        INSERT INTO public.indicator_history(city_id, indicator, before_value, after_value, effect_key, occurred_at)
          VALUES (ci.id, t.city_effect_indicator, cur, LEAST(100, cur + pts), k, public.game_now())
          ON CONFLICT (effect_key, indicator) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.world_event_city_effects_apply(uuid) FROM PUBLIC, anon, authenticated;

-- 8. publish_world_event : corps identique + appel des effets par ville
CREATE OR REPLACE FUNCTION public.publish_world_event(_event_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e public.events; nid uuid;
BEGIN SELECT * INTO e FROM public.events WHERE id=_event_id FOR UPDATE;
IF NOT FOUND OR e.status='cancelled' OR e.starts_at IS NULL OR e.starts_at>public.game_now() THEN RETURN NULL; END IF;
IF e.source_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.news_sources WHERE id=e.source_id AND status='active') THEN RETURN NULL; END IF;
INSERT INTO public.news(title,summary,body,image,category,source_id,published_at,city_id,region,scope,importance,event_id,location_id,organization_id)
VALUES(COALESCE(e.news_title,e.title),COALESCE(e.news_summary,e.description),COALESCE(e.news_body,e.description),e.image,e.category,e.source_id,e.starts_at,e.city_id,e.region,e.scope,e.importance,e.id,e.location_id,e.organization_id)
ON CONFLICT(event_id) DO NOTHING;
SELECT id INTO nid FROM public.news WHERE event_id=e.id;
UPDATE public.events SET status='published' WHERE id=e.id AND status<>'published'; PERFORM public.notify_news(nid);
PERFORM public.world_event_city_effects_apply(e.id);
RETURN nid;
END $function$;

-- 9. start_life_activity : seul ajout = retard figé pour le transport public
CREATE OR REPLACE FUNCTION public.start_life_activity(_type text DEFAULT NULL::text, _activity_id uuid DEFAULT NULL::uuid, _target_location_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE cid uuid; c public.characters; p public.character_positions; l public.locations; target public.locations; a public.activities; r public.life_rules; t timestamptz:=public.game_now(); acc public.accounts; s public.life_settings; j public.jobs; result_id uuid; dly record; BEGIN cid:=public.prepare_daily_life(); SELECT * INTO c FROM public.characters WHERE id=cid FOR UPDATE; SELECT * INTO p FROM public.character_positions WHERE character_id=cid; SELECT * INTO l FROM public.locations WHERE id=p.location_id; SELECT * INTO s FROM public.life_settings WHERE id=1; IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=cid AND status='running') THEN RAISE EXCEPTION 'Une activité est déjà en cours'; END IF;
IF _activity_id IS NOT NULL THEN SELECT * INTO a FROM public.activities WHERE activities.id=_activity_id AND character_id=cid AND status='planned' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Activité introuvable'; END IF; SELECT * INTO r FROM public.life_rules WHERE life_rules.id=a.type; IF t<a.start_time OR t>a.start_time+interval '30 minutes' THEN RAISE EXCEPTION 'Commencez pendant les 30 premières minutes du créneau'; END IF; IF a.type IN('social','governance','economy') THEN a.end_time:=t+(a.end_time-a.start_time); ELSE a.end_time:=t+r.duration_minutes*interval '1 minute'; END IF; a.start_time:=t;
ELSE SELECT * INTO r FROM public.life_rules WHERE life_rules.id=_type; IF NOT FOUND OR _type IN('course','social','governance','economy') THEN RAISE EXCEPTION 'Action inconnue'; END IF; a.type:=r.id; a.title:=r.title; a.location_id:=l.id; a.energy_cost:=r.energy_cost; a.energy_gain:=r.energy_gain; a.money_cost:=r.money_cost; a.progression_gain:=r.progression_gain; a.reward:=0; IF a.type IN('social','governance','economy') THEN a.end_time:=t+(a.end_time-a.start_time); ELSE a.end_time:=t+r.duration_minutes*interval '1 minute'; END IF; a.start_time:=t; END IF;
IF a.location_id<>p.location_id OR NOT l.accessible OR NOT l.kind=ANY(r.allowed_kinds) THEN RAISE EXCEPTION 'Rejoignez le lieu de cette activité'; END IF;
IF a.type IN('study','course') AND NOT EXISTS(SELECT 1 FROM public.study_enrollments WHERE character_id=cid) THEN RAISE EXCEPTION 'Inscrivez-vous dans une filière'; END IF;
IF a.type='work' THEN SELECT j2.* INTO j FROM public.jobs j2 JOIN public.employments e ON e.job_id=j2.id WHERE e.character_id=cid; IF NOT FOUND OR j.location_id<>l.id THEN RAISE EXCEPTION 'Rejoignez votre emploi'; END IF; IF extract(isodow FROM t AT TIME ZONE 'UTC')>5 OR (t AT TIME ZONE 'UTC')::time<make_time(s.work_start,0,0) OR ((t+r.duration_minutes*interval '1 minute') AT TIME ZONE 'UTC')::time>make_time(s.work_end,0,0) THEN RAISE EXCEPTION 'Travail du lundi au vendredi, de 08:00 à 18:00'; END IF; IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=cid AND type='work' AND status IN('running','completed') AND (start_time AT TIME ZONE 'UTC')::date=(t AT TIME ZONE 'UTC')::date) THEN RAISE EXCEPTION 'Une vacation rémunérée par jour'; END IF; a.reward:=(j.salary+COALESCE((SELECT salary_bonus FROM public.employments WHERE character_id=cid),0))/s.paid_shifts_month; a.title:=j.title; END IF;
IF a.type='rest' AND NOT EXISTS(SELECT 1 FROM public.character_housing WHERE character_id=cid AND location_id=l.id) THEN RAISE EXCEPTION 'Rejoignez votre logement'; END IF;
IF a.type='transport' THEN SELECT * INTO target FROM public.locations WHERE locations.id=_target_location_id AND city_id=p.city_id AND accessible AND district_id IS NOT NULL; IF NOT FOUND OR target.id=l.id OR NOT EXISTS(SELECT 1 FROM public.districts WHERE districts.id=target.district_id AND available) THEN RAISE EXCEPTION 'Destination inaccessible'; END IF; a.target_location_id:=target.id;
  SELECT * INTO dly FROM public.transport_delay(p.city_id, l.id, target.id, t); a.travel_delay_minutes:=COALESCE(dly.minutes,0); a.travel_event_ids:=COALESCE(dly.event_ids,'{}'); a.end_time:=a.end_time+a.travel_delay_minutes*interval '1 minute'; END IF;
IF c.energy<a.energy_cost THEN RAISE EXCEPTION 'Énergie insuffisante'; END IF; SELECT * INTO acc FROM public.accounts WHERE character_id=cid FOR UPDATE; IF NOT FOUND OR acc.balance<a.money_cost THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=cid AND status='planned' AND activities.id IS DISTINCT FROM _activity_id AND start_time<a.end_time AND end_time>a.start_time) THEN RAISE EXCEPTION 'Cette activité chevauche votre agenda'; END IF;
UPDATE public.characters SET energy=energy-a.energy_cost,updated_at=now() WHERE characters.id=cid; IF a.money_cost>0 THEN UPDATE public.accounts SET balance=balance-a.money_cost WHERE accounts.id=acc.id; INSERT INTO public.transactions(account_id,amount,label) VALUES(acc.id,-a.money_cost,a.title); END IF;
IF _activity_id IS NULL THEN INSERT INTO public.activities(character_id,type,title,start_time,end_time,location_id,target_location_id,energy_cost,energy_gain,money_cost,reward,progression_gain,status,travel_delay_minutes,travel_event_ids) VALUES(cid,a.type,a.title,t,a.end_time,a.location_id,a.target_location_id,a.energy_cost,a.energy_gain,a.money_cost,a.reward,a.progression_gain,'running',COALESCE(a.travel_delay_minutes,0),COALESCE(a.travel_event_ids,'{}')) RETURNING activities.id INTO result_id; ELSE UPDATE public.activities SET status='running',start_time=a.start_time,end_time=a.end_time,reward=a.reward WHERE activities.id=a.id RETURNING activities.id INTO result_id; END IF; RETURN result_id; END $function$;

-- 10. world_events_state : mêmes filtres, ajout de 3 champs en lecture
--     travel_delay_minutes, city_effect (ville du joueur), marker (lieu public actif)
--     [Le corps complet sera recopié à l'identique avec uniquement ces 3 clés
--      ajoutées dans jsonb_build_object :]
--  'travel_delay_minutes', CASE WHEN e.character_id IS NULL THEN e.travel_delay_minutes ELSE 0 END,
--  'city_effect', (SELECT jsonb_build_object('level',ce.level,'amount',ce.amount,'indicator',ce.indicator)
--                  FROM public.world_event_city_effects ce WHERE ce.event_id=e.id AND ce.city_id=pos.city_id),
--  'marker', e.character_id IS NULL AND e.location_id IS NOT NULL AND e.status='published'
--            AND e.starts_at <= now_t AND (e.ends_at IS NULL OR e.ends_at > now_t)
