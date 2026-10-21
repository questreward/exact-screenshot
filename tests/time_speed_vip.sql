-- Après 0133, 0134 puis 0135, uniquement avec time_speed_vip_fixture.sql.
BEGIN;
DO $$ DECLARE w public.world_state; BEGIN
  SELECT * INTO STRICT w FROM public.world_state WHERE id = 1;
  IF w.time_speed <> 4 THEN RAISE EXCEPTION 'Vitesse attendue : 4 exact, pas un multiple'; END IF;
  UPDATE public.world_state SET world_date = '2026-10-22', world_time = '00:00', clock_started_at = now() - interval '1 minute';
  IF public.game_now() <> '2026-10-22 00:04:00+00'::timestamptz THEN RAISE EXCEPTION '1 minute réelle doit donner 4 minutes de jeu'; END IF;
END $$;

DO $$ DECLARE a public.activities; BEGIN
  INSERT INTO public.activities (character_id, type, start_time, end_time, cost, energy, fuel)
  VALUES ('00000000-0000-0000-0000-000000000001', 'intercity_travel', now(), now() + interval '4 hours', 70, 8, 12.5) RETURNING * INTO a;
  IF a.end_time - a.start_time <> interval '30 minutes' THEN RAISE EXCEPTION 'Voyage VIP : durée divisée par 8'; END IF;
  IF a.cost <> 70 OR a.energy <> 8 OR a.fuel <> 12.5 THEN RAISE EXCEPTION 'Prix/énergie/essence modifiés'; END IF;
END $$;

DO $$ DECLARE a public.activities; BEGIN
  INSERT INTO public.activities (character_id, type, start_time, end_time)
  VALUES ('00000000-0000-0000-0000-000000000001', 'intercity_travel', now(), now() + interval '16 minutes') RETURNING * INTO a;
  IF a.end_time - a.start_time <> interval '5 minutes' THEN RAISE EXCEPTION 'Plancher VIP : 5 minutes'; END IF;
END $$;

DO $$ DECLARE cid uuid; a public.activities; BEGIN
  FOREACH cid IN ARRAY ARRAY['00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000003'::uuid] LOOP
    INSERT INTO public.activities (character_id, type, start_time, end_time)
    VALUES (cid, 'intercity_travel', now(), now() + interval '4 hours') RETURNING * INTO a;
    IF a.end_time - a.start_time <> interval '4 hours' THEN RAISE EXCEPTION 'Non-VIP ou VIP expiré accéléré'; END IF;
  END LOOP;
END $$;

DO $$ DECLARE a public.activities; BEGIN
  INSERT INTO public.activities (character_id, type, start_time, end_time)
  VALUES ('00000000-0000-0000-0000-000000000001', 'work', now(), now() + interval '4 hours') RETURNING * INTO a;
  IF a.end_time - a.start_time <> interval '4 hours' THEN RAISE EXCEPTION 'Le travail ne doit pas être accéléré pour les VIP'; END IF;
END $$;
ROLLBACK;

-- Un rejeu ne doit modifier ni l'ancre ni la vitesse, même si du temps a passé.
CREATE TEMP TABLE before_replay AS SELECT * FROM public.world_state;
\ir ../vps/migrations/0135_clock_x4_indicator.sql
DO $$ BEGIN
  IF EXISTS (SELECT * FROM public.world_state EXCEPT SELECT * FROM before_replay) THEN RAISE EXCEPTION 'Rejeu : horloge modifiée'; END IF;
  IF (SELECT count(*) FROM public.world_speed_changes WHERE key = 'clock-x4-vip-travel-x8') <> 1 THEN RAISE EXCEPTION 'Clé non unique'; END IF;
END $$;