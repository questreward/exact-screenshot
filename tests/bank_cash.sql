-- Après bank_cash_fixture.sql puis 0136/0137, dans une base jetable uniquement.
BEGIN;
SELECT set_config('test.uid','00000000-0000-0000-0000-000000000001',true);
INSERT INTO public.character_positions SELECT auth.uid(),id FROM public.locations WHERE city_id='paris' AND kind='distributeur';
SELECT public.bank_cash_action('withdraw',50,'10000000-0000-0000-0000-000000000001');
DO $$ BEGIN
 IF (SELECT balance FROM public.accounts WHERE character_id=auth.uid())<>950 OR (SELECT amount FROM public.player_cash WHERE character_id=auth.uid())<>50 THEN RAISE EXCEPTION 'Retrait 50 : soldes incorrects'; END IF;
 IF (public.financial_adviser_snapshot()->'banque'->>'especes_euros')::integer<>50 THEN RAISE EXCEPTION 'Conseillère ignore les espèces'; END IF;
 IF (public.personal_economy_state()->>'cash_on_hand')::integer<>50 THEN RAISE EXCEPTION 'Patrimoine ignore les espèces'; END IF;
END $$;
SELECT public.bank_cash_action('withdraw',50,'10000000-0000-0000-0000-000000000001');
DO $$ BEGIN IF (SELECT count(*) FROM public.transactions)<>1 THEN RAISE EXCEPTION 'Double retrait'; END IF; END $$;
SELECT public.bank_cash_action('deposit',10,'10000000-0000-0000-0000-000000000002');
DO $$ BEGIN
 IF (SELECT balance FROM public.accounts WHERE character_id=auth.uid())<>960 OR (SELECT amount FROM public.player_cash WHERE character_id=auth.uid())<>40 THEN RAISE EXCEPTION 'Dépôt 10 : soldes incorrects'; END IF;
 BEGIN PERFORM public.bank_cash_action('deposit',41,'10000000-0000-0000-0000-000000000003'); RAISE EXCEPTION 'TEST: dépôt excessif accepté'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
 BEGIN PERFORM public.bank_cash_action('withdraw',961,'10000000-0000-0000-0000-000000000004'); RAISE EXCEPTION 'TEST: retrait excessif accepté'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
 BEGIN PERFORM public.bank_cash_action('deposit',10,'10000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'TEST: clé réutilisée avec autre opération'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
 IF (SELECT balance FROM public.accounts WHERE character_id=auth.uid())+(SELECT amount FROM public.player_cash WHERE character_id=auth.uid())<>1000 THEN RAISE EXCEPTION 'Argent non conservé'; END IF;
END $$;
UPDATE public.character_positions SET location_id=NULL;
DO $$ BEGIN
 BEGIN PERFORM public.bank_cash_action('withdraw',10,'10000000-0000-0000-0000-000000000005'); RAISE EXCEPTION 'TEST: retrait loin de banque accepté'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('test.uid','00000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.player_cash) THEN RAISE EXCEPTION 'Espèces privées exposées'; END IF; END $$;
SELECT set_config('test.uid','',true);
DO $$ BEGIN
 BEGIN PERFORM public.financial_adviser_snapshot(); RAISE EXCEPTION 'TEST: conseil anonyme accepté'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
ROLLBACK;