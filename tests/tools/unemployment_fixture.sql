-- Isolated fixture only, never install on the VPS.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE TABLE public.fake_clock(t timestamptz); INSERT INTO public.fake_clock VALUES ('2026-10-20 08:00:00+00');
CREATE FUNCTION public.game_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT t FROM public.fake_clock $$;
CREATE TABLE public.characters(id uuid PRIMARY KEY, user_id uuid, situation text);
CREATE TABLE public.jobs(id uuid PRIMARY KEY, title text, salary integer);
CREATE TABLE public.employments(character_id uuid PRIMARY KEY, job_id uuid, started_at timestamptz, salary_bonus integer DEFAULT 0);
CREATE TABLE public.activities(character_id uuid, type text, status text, end_time timestamptz);
CREATE TABLE public.career_history(character_id uuid, kind text, label text, occurred_at timestamptz DEFAULT public.game_now());
CREATE TABLE public.career_settings(id integer PRIMARY KEY, layoff_days integer DEFAULT 14, unemployment_rate numeric DEFAULT 0.57, unemployment_weeks integer DEFAULT 26);
INSERT INTO public.career_settings(id) VALUES (1);
CREATE TABLE public.career_ledger(character_id uuid, key text, kind text, payload jsonb DEFAULT '{}', created_at timestamptz DEFAULT public.game_now(), PRIMARY KEY(character_id, key));
CREATE TABLE public.cash(key text PRIMARY KEY, amount integer);
CREATE FUNCTION public.economy_cash(_cid uuid,_key text,_amount integer,_label text,_category text,_payload jsonb DEFAULT '{}') RETURNS boolean LANGUAGE sql AS $$ INSERT INTO public.cash VALUES(_key,_amount) ON CONFLICT DO NOTHING RETURNING true $$;
CREATE FUNCTION public.economy_notify(_cid uuid,_key text,_t text,_b text) RETURNS void LANGUAGE sql AS $$ SELECT $$;
CREATE FUNCTION public.settle_career(_cid uuid) RETURNS void
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
      IF amount > 0 AND NOT EXISTS (SELECT 1 FROM public.career_history WHERE character_id = _cid AND kind IN ('embauche','changement') AND occurred_at > lay.created_at AND occurred_at < wk_start) THEN
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
