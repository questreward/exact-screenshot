-- Run with privileged test tooling only, after final_work_payment.py prepare.
-- All temporary world_state updates are invisible to concurrent readers by
-- PostgreSQL MVCC; the original row is restored before the transaction commits.
DO $$
DECLARE
  original public.world_state;
  restored public.world_state;
  cid uuid;
  uid uuid;
  aid uuid;
  work_day date;
  a public.activities;
  before_balance numeric;
BEGIN
  SELECT c.id,c.user_id INTO STRICT cid,uid FROM public.characters c
    JOIN auth.users u ON u.id=c.user_id
    WHERE u.email LIKE 'final-work-%@example.com'
      AND c.first_name='Essai' AND c.last_name='Vacation';
  SELECT * INTO STRICT original FROM public.world_state WHERE id=1 FOR UPDATE;
  work_day := (public.game_now() AT TIME ZONE 'UTC')::date;
  WHILE extract(isodow FROM work_day)>5 LOOP work_day:=work_day+1; END LOOP;
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
  UPDATE public.world_state SET world_date=work_day,world_time='08:00:00',
    clock_started_at=now(),time_speed=0 WHERE id=1;
  PERFORM public.daily_life_state();
  IF NOT EXISTS(SELECT 1 FROM public.employments WHERE character_id=cid AND status='active') THEN
    RAISE EXCEPTION 'Test employment not accepted';
  END IF;
  PERFORM public.move_character(j.location_id) FROM public.jobs j
    JOIN public.employments e ON e.job_id=j.id WHERE e.character_id=cid;
  SELECT balance INTO before_balance FROM public.accounts WHERE character_id=cid;
  IF before_balance<>1500 THEN RAISE EXCEPTION 'Expected initial balance 1500'; END IF;
  SELECT id INTO STRICT aid FROM public.activities
    WHERE character_id=cid AND type='work' AND status='planned'
      AND start_time=public.game_now();
  PERFORM public.start_life_activity(_activity_id=>aid);
  SELECT * INTO STRICT a FROM public.activities WHERE id=aid;
  IF a.status<>'running' OR a.end_time-a.start_time<>interval '4 hours'
    OR a.reward<>80 THEN RAISE EXCEPTION 'Work start/duration/reward regression'; END IF;
  IF (SELECT energy FROM public.characters WHERE id=cid)<>70
    OR (SELECT balance FROM public.accounts WHERE character_id=cid)<>1500 THEN
    RAISE EXCEPTION 'Energy or premature salary regression';
  END IF;
  UPDATE public.world_state SET world_time='11:59:59' WHERE id=1;
  PERFORM public.daily_life_state();
  IF (SELECT balance FROM public.accounts WHERE character_id=cid)<>1500
    OR (SELECT status FROM public.activities WHERE id=aid)<>'running' THEN
    RAISE EXCEPTION 'Salary paid before full shift';
  END IF;
  UPDATE public.world_state SET world_time='12:00:00' WHERE id=1;
  PERFORM public.daily_life_state();
  PERFORM public.daily_life_state();
  IF (SELECT balance FROM public.accounts WHERE character_id=cid)<>1580
    OR (SELECT status FROM public.activities WHERE id=aid)<>'completed'
    OR (SELECT progress FROM public.employments WHERE character_id=cid)<>10 THEN
    RAISE EXCEPTION 'Work settlement regression';
  END IF;
  IF (SELECT count(*) FROM public.transactions t JOIN public.accounts ac ON ac.id=t.account_id
      WHERE ac.character_id=cid AND t.label='Salaire — Assistant administratif' AND t.amount=80)<>1 THEN
    RAISE EXCEPTION 'Expected exactly one salary transaction';
  END IF;
  UPDATE public.world_state SET world_date=original.world_date,world_time=original.world_time,
    clock_started_at=original.clock_started_at,time_speed=original.time_speed WHERE id=1;
  SELECT * INTO STRICT restored FROM public.world_state WHERE id=1;
  IF to_jsonb(restored) IS DISTINCT FROM to_jsonb(original) THEN
    RAISE EXCEPTION 'Original clock was not fully restored';
  END IF;
END $$;