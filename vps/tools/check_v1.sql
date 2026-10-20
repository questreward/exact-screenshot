-- Read-only installation audit. No game RPC is executed (reads may settle gameplay).
BEGIN TRANSACTION READ ONLY;
SELECT wanted.name AS object, CASE WHEN to_regclass('public.' || wanted.name) IS NULL THEN 'ABSENT' ELSE 'PRESENT' END AS result
FROM (VALUES ('economy_annual_factors'), ('job_mission_scripts'), ('job_mission_runs'), ('job_mission_progress'),
 ('municipal_property_tax_rates'), ('foreign_countries'), ('foreign_trips'), ('foreign_postcards')) wanted(name);

SELECT wanted.signature AS function, CASE WHEN to_regprocedure('public.' || wanted.signature) IS NULL THEN 'ABSENT' ELSE 'PRESENT' END AS result
FROM (VALUES ('real_economy_factor(timestamp with time zone)'), ('bank_card_check(uuid,bigint)'),
 ('job_mission_state()'), ('job_mission_choose(date,integer,integer)'), ('municipal_property_tax_state()'),
 ('municipal_property_tax_set_rate(text,integer)'), ('tax_space_state()'), ('foreign_travel_state()'),
 ('foreign_travel_depart(text,integer,text,uuid)'), ('foreign_travel_guard()'), ('foreign_agenda_guard()')) wanted(signature);

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
 has_table_privilege('authenticated', c.oid, 'SELECT') AS player_select,
 has_table_privilege('authenticated', c.oid, 'INSERT') OR has_table_privilege('authenticated', c.oid, 'UPDATE') OR has_table_privilege('authenticated', c.oid, 'DELETE') AS player_write
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('foreign_countries','foreign_trips','foreign_postcards','job_mission_runs','job_mission_progress','municipal_property_tax_rates');

SELECT tablename, policyname, cmd, roles, qual FROM pg_policies
WHERE schemaname='public' AND tablename IN ('foreign_countries','foreign_trips','foreign_postcards','job_mission_runs','job_mission_progress');

SELECT c.relname AS table_name, t.tgname AS trigger_name, t.tgenabled AS enabled
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND t.tgname IN ('foreign_agenda_guard','real_economy_lease');

SELECT p.proname AS function_name, p.prosecdef AS security_definer,
 position('public.foreign_travel_guard()' IN pg_get_functiondef(p.oid))>0 AS foreign_guard_installed
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f' AND p.proname IN ('move_character','start_life_activity','cast_election_vote','travel_drive_intercity','business_work');
ROLLBACK;