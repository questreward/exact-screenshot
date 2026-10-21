-- CIVITAS 0128 : un candidat choisit le lieu de son meeting sur la carte et invite les habitants ;
-- il peut aussi publier une annonce de campagne dans les actualités politiques.
-- Aucun gain de soutien, d'argent ou de réputation : ces actions sont visibles, pas récompensées.
-- Limites : 1 meeting et 1 annonce par jour de jeu et par candidature, pendant la campagne seulement. Tout ou rien.
BEGIN;

DO $$ BEGIN
  IF to_regprocedure('public.election_news(uuid,text,text,text,uuid)') IS NULL OR to_regprocedure('public.publish_world_event(uuid)') IS NULL THEN
    RAISE EXCEPTION '0128: le bloc Élections doit être installé d''abord'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.campaign_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL UNIQUE,
  candidacy_id uuid NOT NULL REFERENCES public.candidacies(id) ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id),
  starts_at timestamptz NOT NULL,
  title text NOT NULL,
  invited integer NOT NULL DEFAULT 0 CHECK (invited >= 0),
  news_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_meetings TO authenticated;
GRANT ALL ON public.campaign_meetings TO service_role;
ALTER TABLE public.campaign_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Meetings publics" ON public.campaign_meetings;
CREATE POLICY "Meetings publics" ON public.campaign_meetings FOR SELECT TO authenticated USING (true);

-- Shared guard: the signed-in character owns a validated candidacy in an election currently in campaign.
CREATE OR REPLACE FUNCTION public.campaign_owner(_candidacy_id uuid) RETURNS public.candidacies
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; ca public.candidacies; e public.elections; BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO ca FROM public.candidacies WHERE id = _candidacy_id AND character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidature introuvable'; END IF;
  IF ca.status <> 'validated' THEN RAISE EXCEPTION 'Ta candidature doit être validée'; END IF;
  SELECT * INTO e FROM public.elections WHERE id = ca.election_id;
  IF public.game_now() < e.campaign_starts_at OR public.game_now() >= e.vote_starts_at THEN RAISE EXCEPTION 'La campagne n''est pas ouverte'; END IF;
  RETURN ca;
END $$;
REVOKE ALL ON FUNCTION public.campaign_owner(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.plan_campaign_meeting(_candidacy_id uuid, _location_id uuid, _hours_ahead integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ca public.candidacies; e public.elections; l public.locations; key text; at timestamptz; ev uuid; nid uuid; n integer; mid uuid; BEGIN
  ca := public.campaign_owner(_candidacy_id);
  SELECT * INTO e FROM public.elections WHERE id = ca.election_id;
  IF _hours_ahead IS NULL OR _hours_ahead < 1 OR _hours_ahead > 48 THEN RAISE EXCEPTION 'Choisis un horaire entre 1 h et 48 h'; END IF;
  at := date_trunc('hour', public.game_now()) + _hours_ahead * interval '1 hour';
  IF at >= e.vote_starts_at THEN RAISE EXCEPTION 'Le meeting doit avoir lieu avant le vote'; END IF;
  SELECT * INTO l FROM public.locations WHERE id = _location_id AND city_id = e.city_id AND accessible;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ce lieu n''est pas dans la ville de l''élection'; END IF;
  key := 'meeting:' || ca.id || ':' || (public.game_now() AT TIME ZONE 'Europe/Paris')::date;
  IF EXISTS (SELECT 1 FROM public.campaign_meetings WHERE operation_key = key) THEN RAISE EXCEPTION 'Tu as déjà organisé un meeting aujourd''hui'; END IF;
  INSERT INTO public.events(event_key, title, description, news_body, city_id, starts_at, scope, category, importance, source_id, location_id, organization_id, target_kind)
  VALUES ('election:' || e.id || ':' || key, 'Meeting de ' || ca.display_name || ' — ' || l.name,
          ca.display_name || ' tiendra un meeting de campagne à ' || l.name || '. Les habitants sont invités.',
          ca.display_name || ' tiendra un meeting de campagne à ' || l.name || '. Les habitants sont invités.',
          e.city_id, at, 'local', 'Politique', 55, 'civitas-matin', l.id, ca.organization_id, 'city')
  RETURNING id INTO ev;
  nid := public.publish_world_event(ev);
  UPDATE public.news SET election_id = e.id, related_entities = related_entities || jsonb_build_object('political', true) WHERE id = nid;
  INSERT INTO public.notifications(user_id, title, body, news_id, world_at)
  SELECT ch.user_id, '📣 Invitation à un meeting', ca.display_name || ' t''invite à son meeting à ' || l.name || '.', nid, public.game_now()
  FROM public.characters ch WHERE ch.city_id = e.city_id AND ch.id <> ca.character_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.campaign_meetings(operation_key, candidacy_id, election_id, location_id, starts_at, title, invited, news_id)
  VALUES (key, ca.id, e.id, l.id, at, 'Meeting — ' || l.name, n, nid) RETURNING id INTO mid;
  RETURN jsonb_build_object('id', mid, 'invited', n, 'starts_at', at);
END $$;
REVOKE ALL ON FUNCTION public.plan_campaign_meeting(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plan_campaign_meeting(uuid, uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.publish_campaign_announcement(_candidacy_id uuid, _text text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ca public.candidacies; key text; t text; BEGIN
  ca := public.campaign_owner(_candidacy_id);
  t := btrim(coalesce(_text, ''));
  IF length(t) < 10 OR length(t) > 280 THEN RAISE EXCEPTION 'Ton annonce doit faire entre 10 et 280 caractères'; END IF;
  key := 'announce:' || ca.id || ':' || (public.game_now() AT TIME ZONE 'Europe/Paris')::date;
  IF EXISTS (SELECT 1 FROM public.events WHERE event_key = 'election:' || ca.election_id || ':' || key) THEN RAISE EXCEPTION 'Tu as déjà publié une annonce aujourd''hui'; END IF;
  RETURN public.election_news(ca.election_id, key, 'Annonce de campagne — ' || ca.display_name, t, ca.id);
END $$;
REVOKE ALL ON FUNCTION public.publish_campaign_announcement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_campaign_announcement(uuid, text) TO authenticated, service_role;

COMMIT;
