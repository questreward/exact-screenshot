-- 0091 — Jauges de quartier (cadre de vie, tranquillité, animation).
-- Présentation uniquement : aucune écriture d'argent, de loyer, d'indicateur de ville ni de règle existante.
-- Effets appliqués une seule fois (clé unique), uniquement pour les faits postérieurs à l'installation.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.district_gauges') IS NOT NULL THEN RAISE EXCEPTION '0091 déjà installée : ne pas relancer'; END IF;
  IF to_regclass('public.crises') IS NULL OR to_regclass('public.citizen_projects') IS NULL OR to_regclass('public.public_issues') IS NULL THEN
    RAISE EXCEPTION 'Prérequis manquants (0067, 0068, signalements)'; END IF;
END $$;

CREATE TABLE public.district_gauge_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  started_at timestamptz NOT NULL,
  base integer NOT NULL CHECK (base BETWEEN 0 AND 100),
  works_done integer NOT NULL, issue_weekly integer NOT NULL,
  crisis_start integer NOT NULL, crisis_end integer NOT NULL,
  event_gain integer NOT NULL, event_week_cap integer NOT NULL, quiet_week integer NOT NULL,
  drift integer NOT NULL, max_catchup_weeks integer NOT NULL CHECK (max_catchup_weeks BETWEEN 1 AND 52),
  issue_min_severity integer NOT NULL CHECK (issue_min_severity BETWEEN 1 AND 5)
);
GRANT SELECT ON public.district_gauge_settings TO authenticated; GRANT ALL ON public.district_gauge_settings TO service_role;
ALTER TABLE public.district_gauge_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY district_gauge_settings_read ON public.district_gauge_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.district_gauge_settings VALUES (true, public.game_now(), 50, 8, 1, 15, 10, 3, 12, 2, 1, 12, 4);

CREATE TABLE public.district_gauges (
  district_id text NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  gauge text NOT NULL CHECK (gauge IN ('cadre','tranquillite','animation')),
  value integer NOT NULL CHECK (value BETWEEN 0 AND 100),
  settled_week integer NOT NULL,
  PRIMARY KEY (district_id, gauge)
);
GRANT SELECT ON public.district_gauges TO authenticated; GRANT ALL ON public.district_gauges TO service_role;
ALTER TABLE public.district_gauges ENABLE ROW LEVEL SECURITY;
CREATE POLICY district_gauges_read ON public.district_gauges FOR SELECT TO authenticated USING (true);

CREATE TABLE public.district_gauge_log (
  effect_key text PRIMARY KEY,
  district_id text NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  gauge text NOT NULL, week integer NOT NULL, delta integer NOT NULL, reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE INDEX district_gauge_log_district ON public.district_gauge_log (district_id, created_at DESC);
GRANT SELECT ON public.district_gauge_log TO authenticated; GRANT ALL ON public.district_gauge_log TO service_role;
ALTER TABLE public.district_gauge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY district_gauge_log_read ON public.district_gauge_log FOR SELECT TO authenticated USING (true);

CREATE FUNCTION public.district_gauge_week(_at timestamptz) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT floor(extract(epoch FROM (_at - s.started_at)) / 604800)::integer FROM public.district_gauge_settings s $$;

-- Applique un effet une seule fois ; enregistre le changement réel après plafonnement 0–100.
CREATE FUNCTION public.district_gauge_apply(_key text, _district text, _gauge text, _week integer, _delta integer, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old integer; _new integer;
BEGIN
  IF _delta = 0 OR EXISTS (SELECT 1 FROM district_gauge_log WHERE effect_key = _key) THEN RETURN false; END IF;
  SELECT value INTO _old FROM district_gauges WHERE district_id = _district AND gauge = _gauge FOR UPDATE;
  IF _old IS NULL THEN RETURN false; END IF;
  _new := greatest(0, least(100, _old + _delta));
  INSERT INTO district_gauge_log(effect_key, district_id, gauge, week, delta, reason) VALUES (_key, _district, _gauge, _week, _new - _old, _reason);
  UPDATE district_gauges SET value = _new WHERE district_id = _district AND gauge = _gauge;
  RETURN true;
END $$;

CREATE FUNCTION public.district_gauges_settle(_city text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s district_gauge_settings; _now timestamptz := game_now(); _cur integer; _from integer; r record; w integer; g text; _used integer; _v integer;
BEGIN
  SELECT * INTO s FROM district_gauge_settings; _cur := district_gauge_week(_now);
  PERFORM pg_advisory_xact_lock(hashtext('district_gauges:' || _city));
  INSERT INTO district_gauges(district_id, gauge, value, settled_week)
    SELECT d.id, x.g, s.base, _cur FROM districts d CROSS JOIN (VALUES ('cadre'),('tranquillite'),('animation')) x(g) WHERE d.city_id = _city
  ON CONFLICT DO NOTHING;

  FOR r IN SELECT p.id, p.title, coalesce(p.district_id, l.district_id) AS district_id, p.completed_at FROM public_decisions p JOIN locations l ON l.id = p.location_id
           WHERE p.city_id = _city AND p.workflow = 'completed' AND p.completed_at >= s.started_at AND p.completed_at <= _now LOOP
    PERFORM district_gauge_apply('dec:' || r.id, r.district_id, 'cadre', district_gauge_week(r.completed_at), s.works_done, 'Travaux terminés : ' || r.title);
  END LOOP;
  FOR r IN SELECT id, title, district_id, closed_at FROM citizen_projects
           WHERE city_id = _city AND district_id IS NOT NULL AND status = 'termine' AND closed_at >= s.started_at AND closed_at <= _now LOOP
    PERFORM district_gauge_apply('cp:' || r.id, r.district_id, 'cadre', district_gauge_week(r.closed_at), s.works_done, 'Projet citoyen terminé : ' || r.title);
  END LOOP;
  FOR r IN SELECT id, district_id, starts_at, status, closed_at FROM crises
           WHERE city_id = _city AND district_id IS NOT NULL AND starts_at >= s.started_at AND starts_at <= _now LOOP
    PERFORM district_gauge_apply('crs:' || r.id, r.district_id, 'tranquillite', district_gauge_week(r.starts_at), -s.crisis_start, 'Début d''une crise');
    IF r.status = 'terminee' AND r.closed_at IS NOT NULL AND r.closed_at <= _now THEN
      PERFORM district_gauge_apply('cre:' || r.id, r.district_id, 'tranquillite', district_gauge_week(r.closed_at), s.crisis_end, 'Fin de la crise');
    END IF;
  END LOOP;
  FOR r IN SELECT e.id, e.title, l.district_id, e.starts_at FROM events e JOIN locations l ON l.id = e.location_id JOIN districts d ON d.id = l.district_id
           WHERE d.city_id = _city AND e.character_id IS NULL AND e.status = 'published' AND e.starts_at >= s.started_at AND e.starts_at <= _now
           ORDER BY e.starts_at, e.id LOOP
    w := district_gauge_week(r.starts_at);
    SELECT coalesce(sum(delta), 0) INTO _used FROM district_gauge_log WHERE district_id = r.district_id AND gauge = 'animation' AND week = w AND effect_key LIKE 'ev:%';
    IF _used < s.event_week_cap THEN
      PERFORM district_gauge_apply('ev:' || r.id, r.district_id, 'animation', w, least(s.event_gain, s.event_week_cap - _used), 'Événement : ' || r.title);
    END IF;
  END LOOP;

  FOR r IN SELECT d.id, min(gg.settled_week) AS settled FROM districts d JOIN district_gauges gg ON gg.district_id = d.id WHERE d.city_id = _city GROUP BY d.id LOOP
    _from := greatest(r.settled + 1, _cur - s.max_catchup_weeks + 1);
    FOR w IN _from .. _cur - 1 LOOP  -- seules les semaines terminées sont réglées
      SELECT count(*) INTO _v FROM public_issues i JOIN locations l ON l.id = i.location_id
        WHERE coalesce(i.district_id, l.district_id) = r.id AND i.status <> 'resolved' AND i.severity >= s.issue_min_severity;
      PERFORM district_gauge_apply('wk-iss:' || r.id || ':' || w, r.id, 'cadre', w, -s.issue_weekly * _v, _v || ' signalement(s) grave(s) non résolu(s)');
      IF NOT EXISTS (SELECT 1 FROM district_gauge_log WHERE district_id = r.id AND gauge = 'animation' AND week = w AND effect_key LIKE 'ev:%') THEN
        PERFORM district_gauge_apply('wk-quiet:' || r.id || ':' || w, r.id, 'animation', w, -s.quiet_week, 'Semaine sans événement');
      END IF;
      FOREACH g IN ARRAY ARRAY['cadre','tranquillite','animation'] LOOP
        SELECT value INTO _v FROM district_gauges WHERE district_id = r.id AND gauge = g;
        PERFORM district_gauge_apply('wk-drift:' || r.id || ':' || g || ':' || w, r.id, g, w, sign(s.base - _v)::integer * least(s.drift, abs(s.base - _v)), 'Retour progressif à l''équilibre');
      END LOOP;
    END LOOP;
    UPDATE district_gauges SET settled_week = greatest(settled_week, _cur - 1) WHERE district_id = r.id;
  END LOOP;
END $$;

CREATE FUNCTION public.district_gauges_state(_city text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL AND current_user <> 'service_role' THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF NOT EXISTS (SELECT 1 FROM cities WHERE id = _city) THEN RAISE EXCEPTION 'Ville inconnue'; END IF;
  PERFORM district_gauges_settle(_city);
  RETURN jsonb_build_object(
    'gauges', coalesce((SELECT jsonb_agg(jsonb_build_object('district_id', g.district_id, 'gauge', g.gauge, 'value', g.value) ORDER BY g.district_id, g.gauge)
      FROM district_gauges g JOIN districts d ON d.id = g.district_id WHERE d.city_id = _city), '[]'),
    'history', coalesce((SELECT jsonb_agg(h ORDER BY h.created_at DESC) FROM (
      SELECT l.district_id, l.gauge, l.delta, l.reason, l.created_at FROM district_gauge_log l JOIN districts d ON d.id = l.district_id
      WHERE d.city_id = _city ORDER BY l.created_at DESC LIMIT 60) h), '[]'));
END $$;

REVOKE ALL ON FUNCTION public.district_gauge_week(timestamptz), public.district_gauge_apply(text,text,text,integer,integer,text), public.district_gauges_settle(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.district_gauge_week(timestamptz), public.district_gauge_apply(text,text,text,integer,integer,text), public.district_gauges_settle(text) TO service_role;
REVOKE ALL ON FUNCTION public.district_gauges_state(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.district_gauges_state(text) TO authenticated, service_role;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.district_gauge_settings) <> 1 THEN RAISE EXCEPTION 'Contrôle : réglages'; END IF;
END $$;
COMMIT;
