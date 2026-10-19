-- PROPOSITION NON APPLIQUÉE — contrôles de structure, lecture seule après initialisation.
SELECT
 (SELECT count(*) FROM public.national_constituencies) AS constituency_count,
 (SELECT count(*) FROM public.national_constituencies)=5 AS five_constituencies_ok,
 NOT EXISTS(SELECT 1 FROM pg_tables t WHERE t.schemaname='public' AND t.tablename LIKE 'national_%' AND NOT t.rowsecurity) AS row_security_ok,
 (SELECT count(*)=1 AND bool_and(NOT enabled) FROM public.national_settings) AS national_disabled_ok,
 (SELECT balance FROM public.national_treasury WHERE id=1) AS initial_budget,
 (SELECT count(*) FROM public.national_party_profiles) AS party_profile_count,
 (SELECT count(*) FROM public.national_law_templates WHERE NOT active) AS inactive_law_template_count;
