-- 0092 — Actualisation mensuelle (type France Travail).
-- Touché : nouvelle table de réglages + déclarations ; settle_career remplacée à l'identique sauf une condition
-- (une semaine de chômage n'est versée que si le mois a été actualisé). Semaines antérieures à l'installation inchangées.
-- Aucun montant modifié (57 %, 26 semaines restent ceux de career_settings).
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.unemployment_declarations') IS NOT NULL THEN RAISE EXCEPTION '0092 déjà installée : ne pas relancer'; END IF;
  IF to_regprocedure('public.settle_career(uuid)') IS NULL OR to_regclass('public.career_ledger') IS NULL THEN RAISE EXCEPTION 'Carrière 0075 requise'; END IF;
  IF (SELECT md5(btrim(regexp_replace(prosrc,'\s+',' ','g'))) FROM pg_proc WHERE oid='public.settle_career(uuid)'::regprocedure) <> '83a825c7f7eccdad2d23fe93c8afd8e7' THEN
    RAISE EXCEPTION 'settle_career a été modifiée depuis 0075 : installation annulée'; END IF;
END $$;

CREATE TABLE public.unemployment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  installed_at timestamptz NOT NULL,
  open_day integer NOT NULL CHECK (open_day BETWEEN 20 AND 28),
  close_day integer NOT NULL CHECK (close_day BETWEEN 1 AND 20)
);
GRANT SELECT ON public.unemployment_settings TO authenticated; GRANT ALL ON public.unemployment_settings TO service_role;
ALTER TABLE public.unemployment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY unemployment_settings_read ON public.unemployment_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.unemployment_settings VALUES (true, public.game_now(), 28, 15);

CREATE TABLE public.unemployment_declarations (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  still_searching boolean NOT NULL,
  worked boolean NOT NULL,
  request_id uuid NOT NULL UNIQUE,
  declared_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, period)
);
GRANT SELECT ON public.unemployment_declarations TO authenticated; GRANT ALL ON public.unemployment_declarations TO service_role;
ALTER TABLE public.unemployment_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY unemployment_declarations_owner ON public.unemployment_declarations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE FUNCTION public.unemployment_period(_at timestamptz) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT to_char(_at AT TIME ZONE 'UTC', 'YYYY-MM') $$;

-- Période déclarable à l'instant _at (du open_day du mois au close_day du mois suivant), sinon NULL.
CREATE FUNCTION public.unemployment_open_period(_at timestamptz) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN extract(day FROM _at AT TIME ZONE 'UTC') >= s.open_day THEN public.unemployment_period(_at)
              WHEN extract(day FROM _at AT TIME ZONE 'UTC') <= s.close_day THEN public.unemployment_period(_at - interval '1 month')
              ELSE NULL END FROM public.unemployment_settings s $$;

CREATE FUNCTION public.unemployment_week_ok(_cid uuid, _week timestamptz) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _week < s.installed_at OR EXISTS (SELECT 1 FROM public.unemployment_declarations d
    WHERE d.character_id = _cid AND d.period = public.unemployment_period(_week) AND d.still_searching)
  FROM public.unemployment_settings s $$;

CREATE OR REPLACE FUNCTION public.settle_career(_cid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.career_settings; emp public.employments; j public.jobs; t timestamptz := public.game_now();
  lay public.career_ledger; w integer; amount integer; wk_start timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cid AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT * INTO s FROM public.career_settings WHERE id = 1;
  SELECT * INTO emp FROM public.employments WHERE character_id = _cid FOR UPDATE;
  IF FOUND AND emp.started_at < t - s.layoff_days * interval '1 day'
     AND NOT EXISTS (SELECT 1 FROM public.activities WHERE character_id = _cid AND type = 'work' AND status IN ('running','completed')
                     AND end_time > t - s.layoff_days * interval '1 day')
     AND NOT EXISTS (SELECT 1 FROM public.activities WHERE character_id = _cid AND type = 'work' AND status = 'running') THEN
    SELECT * INTO j FROM public.jobs WHERE id = emp.job_id;
    INSERT INTO public.career_ledger (character_id, key, kind, payload)
    VALUES (_cid, 'licenciement:' || emp.job_id || ':' || emp.started_at, 'licenciement',
            jsonb_build_object('job', j.title, 'salary', j.salary + emp.salary_bonus, 'at', t))
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      INSERT INTO public.career_history (character_id, kind, label) VALUES (_cid, 'licenciement', j.title);
      UPDATE public.activities SET status = 'cancelled' WHERE character_id = _cid AND type = 'work' AND status = 'planned';
      DELETE FROM public.employments WHERE character_id = _cid;
      UPDATE public.characters SET situation = 'En recherche d’emploi' WHERE id = _cid;
      PERFORM public.economy_notify(_cid, 'career:licenciement:' || emp.job_id || ':' || emp.started_at, 'Licenciement',
        'Sans vacation depuis ' || s.layoff_days || ' jours, vous avez été licencié de « ' || j.title || ' ». Vous touchez l''allocation chômage.');
    END IF;
  END IF;

  -- Chômage : dernier licenciement, tant que sans emploi
  SELECT * INTO lay FROM public.career_ledger WHERE character_id = _cid AND kind = 'licenciement' ORDER BY created_at DESC LIMIT 1;
  IF FOUND AND NOT EXISTS (SELECT 1 FROM public.employments WHERE character_id = _cid) THEN
    amount := floor((lay.payload->>'salary')::integer * s.unemployment_rate / 4.33)::integer;
    FOR w IN 1..s.unemployment_weeks LOOP
      wk_start := lay.created_at + w * interval '7 days';
      EXIT WHEN wk_start > t;
      IF amount > 0 AND public.unemployment_week_ok(_cid, wk_start) AND NOT EXISTS (SELECT 1 FROM public.career_history WHERE character_id = _cid AND kind IN ('embauche','changement') AND occurred_at > lay.created_at AND occurred_at < wk_start) THEN
        INSERT INTO public.career_ledger (character_id, key, kind, payload)
        VALUES (_cid, 'chomage:' || lay.key || ':' || w, 'chomage', jsonb_build_object('week', w, 'amount', amount))
        ON CONFLICT DO NOTHING;
        IF FOUND THEN
          PERFORM public.economy_cash(_cid, 'career:chomage:' || lay.key || ':' || w, amount, 'Allocation chômage — semaine ' || w, 'aide');
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;

CREATE FUNCTION public.unemployment_declare(_request_id uuid, _still_searching boolean, _worked boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; p text; t timestamptz := public.game_now();
BEGIN
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid() FOR UPDATE;
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage requis'; END IF;
  IF EXISTS (SELECT 1 FROM public.unemployment_declarations WHERE request_id = _request_id) THEN
    RETURN (SELECT period FROM public.unemployment_declarations WHERE request_id = _request_id AND character_id = cid); END IF;
  IF EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid) THEN RAISE EXCEPTION 'Vous avez un emploi : pas d''actualisation à faire'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.career_ledger WHERE character_id = cid AND kind = 'licenciement') THEN RAISE EXCEPTION 'Aucune inscription comme demandeur d''emploi indemnisé'; END IF;
  p := public.unemployment_open_period(t);
  IF p IS NULL THEN RAISE EXCEPTION 'L''actualisation est fermée en ce moment'; END IF;
  INSERT INTO public.unemployment_declarations(character_id, period, still_searching, worked, request_id)
    VALUES (cid, p, coalesce(_still_searching, false), coalesce(_worked, false), _request_id);
  PERFORM public.settle_career(cid);
  RETURN p;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Vous êtes déjà actualisé pour ce mois';
END $$;

CREATE FUNCTION public.unemployment_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; t timestamptz := public.game_now(); lay public.career_ledger; s public.unemployment_settings;
BEGIN
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage requis'; END IF;
  PERFORM public.settle_career(cid);
  SELECT * INTO s FROM public.unemployment_settings;
  SELECT * INTO lay FROM public.career_ledger WHERE character_id = cid AND kind = 'licenciement' ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'now', t, 'open_day', s.open_day, 'close_day', s.close_day, 'installed_at', s.installed_at,
    'employed', EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid),
    'registered', lay.key IS NOT NULL,
    'layoff', CASE WHEN lay.key IS NULL THEN NULL ELSE jsonb_build_object('at', lay.created_at, 'job', lay.payload->>'job', 'salary', (lay.payload->>'salary')::integer) END,
    'open_period', public.unemployment_open_period(t),
    'declarations', coalesce((SELECT jsonb_agg(jsonb_build_object('period', period, 'still_searching', still_searching, 'worked', worked, 'declared_at', declared_at) ORDER BY period DESC)
      FROM public.unemployment_declarations WHERE character_id = cid), '[]'),
    'payments', coalesce((SELECT jsonb_agg(jsonb_build_object('week', (payload->>'week')::integer, 'amount', (payload->>'amount')::integer, 'at', created_at) ORDER BY created_at DESC)
      FROM public.career_ledger WHERE character_id = cid AND kind = 'chomage'), '[]'));
END $$;

REVOKE ALL ON FUNCTION public.unemployment_open_period(timestamptz), public.unemployment_week_ok(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unemployment_open_period(timestamptz), public.unemployment_week_ok(uuid, timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.unemployment_declare(uuid, boolean, boolean), public.unemployment_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unemployment_declare(uuid, boolean, boolean), public.unemployment_state() TO authenticated, service_role;
COMMIT;
