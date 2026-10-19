-- CIVITAS – P5d : IMPÔTS DES ENTREPRISES
-- Ajouts + remplacement de deux fonctions de P5c (business_collect, business_actor_sync), même signature.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0052_p5d_business_tax.sql
-- Impôt sur le bénéfice + taxe locale fixe, prélevés sur la caisse de l'entreprise et versés au budget de la ville.
-- Le salaire de dirigeant/salarié devient un « salaire » compté dans la déclaration de revenus annuelle.
BEGIN;

CREATE TABLE public.business_tax_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  profit_rate integer NOT NULL DEFAULT 20 CHECK (profit_rate BETWEEN 0 AND 100),
  local_weekly integer NOT NULL DEFAULT 25 CHECK (local_weekly >= 0)
);
CREATE TABLE public.business_taxes (
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  week integer NOT NULL,
  profit integer NOT NULL,
  profit_tax integer NOT NULL,
  local_tax integer NOT NULL,
  paid integer NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, week)
);
GRANT SELECT ON public.business_tax_settings, public.business_taxes TO authenticated;
GRANT ALL ON public.business_tax_settings, public.business_taxes TO service_role;
ALTER TABLE public.business_tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_taxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_tax_settings_read ON public.business_tax_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY business_taxes_own ON public.business_taxes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b JOIN public.characters c ON c.id = b.owner_id WHERE b.id = business_taxes.business_id AND c.user_id = auth.uid()));
INSERT INTO public.business_tax_settings (id) VALUES (1);

ALTER TABLE public.business_ledger DROP CONSTRAINT business_ledger_kind_check;
ALTER TABLE public.business_ledger ADD CONSTRAINT business_ledger_kind_check
  CHECK (kind IN ('capital','deposit','revenue','rent','npc_wage','player_salary','owner_salary','closing','tax'));

-- Calcule l'impôt des semaines déjà réglées et paie ce que la caisse permet (le reste est repris plus tard)
CREATE FUNCTION public.business_tax_settle(_biz uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ts public.business_tax_settings; b public.businesses; w record; tx record; bal integer; pay integer; BEGIN
  SELECT * INTO ts FROM public.business_tax_settings WHERE id = 1;
  SELECT * INTO b FROM public.businesses WHERE id = _biz;
  IF NOT FOUND THEN RETURN; END IF;
  FOR w IN SELECT * FROM public.business_weeks bw WHERE bw.business_id = _biz
           AND NOT EXISTS (SELECT 1 FROM public.business_taxes t WHERE t.business_id = _biz AND t.week = bw.week) ORDER BY week LOOP
    INSERT INTO public.business_taxes (business_id, week, profit, profit_tax, local_tax)
    VALUES (_biz, w.week, w.revenue - w.costs, GREATEST(0, w.revenue - w.costs) * ts.profit_rate / 100, ts.local_weekly);
  END LOOP;
  FOR tx IN SELECT * FROM public.business_taxes WHERE business_id = _biz AND paid < profit_tax + local_tax ORDER BY week FOR UPDATE LOOP
    SELECT balance INTO bal FROM public.business_treasuries WHERE business_id = _biz FOR UPDATE;
    pay := LEAST(bal, tx.profit_tax + tx.local_tax - tx.paid);
    EXIT WHEN pay <= 0;
    PERFORM public.business_move(_biz, 'tax:' || tx.week || ':' || tx.paid, -pay, 'tax', 'Impôts de la semaine ' || (tx.week % 52 + 1));
    UPDATE public.business_taxes SET paid = paid + pay WHERE business_id = _biz AND week = tx.week;
    INSERT INTO public.municipal_ledger (city_id, entry_key, category, amount, label)
    VALUES (b.city_id, 'biztax:' || _biz || ':' || tx.week || ':' || tx.paid, 'Recettes', pay, 'Impôts des entreprises — ' || b.name);
    UPDATE public.municipal_treasuries SET balance = balance + pay, income = income + pay WHERE city_id = b.city_id;
  END LOOP;
END $$;

-- Les salaires versés par une entreprise comptent désormais comme « salaire » (déclaration de revenus)
CREATE OR REPLACE FUNCTION public.business_collect(_cid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cid AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  FOR p IN SELECT * FROM public.business_payroll WHERE character_id = _cid AND status = 'due' ORDER BY created_at FOR UPDATE LOOP
    PERFORM public.economy_cash(_cid, 'bizpay:' || p.pay_key, p.amount, p.label, 'salaire', jsonb_build_object('business', p.business_id));
    UPDATE public.business_payroll SET status = 'paid', paid_at = public.game_now() WHERE id = p.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.business_actor_sync(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bid uuid; BEGIN
  FOR bid IN SELECT id FROM public.businesses WHERE owner_id = _cid AND status = 'active'
             UNION SELECT business_id FROM public.business_employees WHERE character_id = _cid AND status = 'active' LOOP
    PERFORM public.business_settle(bid);
    PERFORM public.business_tax_settle(bid);
  END LOOP;
  PERFORM public.business_collect(_cid);
END $$;

CREATE FUNCTION public.business_tax_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; bid uuid; BEGIN
  cid := public.social_actor();
  PERFORM public.business_actor_sync(cid);
  SELECT id INTO bid FROM public.businesses WHERE owner_id = cid AND status = 'active';
  RETURN jsonb_build_object(
    'settings', (SELECT to_jsonb(s) FROM public.business_tax_settings s WHERE id = 1),
    'debt', COALESCE((SELECT sum(profit_tax + local_tax - paid) FROM public.business_taxes WHERE business_id = bid), 0),
    'total_paid', COALESCE((SELECT sum(paid) FROM public.business_taxes WHERE business_id = bid), 0),
    'weeks', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.week DESC) FROM (SELECT * FROM public.business_taxes WHERE business_id = bid ORDER BY week DESC LIMIT 6) t), '[]'::jsonb)
  );
END $$;

-- Rattrapage : salaires d'entreprise déjà encaissés comptés comme salaire
UPDATE public.transactions SET category = 'salaire' WHERE category = 'travail' AND operation_key LIKE 'bizpay:%';

REVOKE ALL ON FUNCTION public.business_tax_settle(uuid), public.business_collect(uuid), public.business_actor_sync(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.business_tax_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_tax_state() TO authenticated;

DO $$ BEGIN
  IF to_regclass('public.businesses') IS NULL THEN RAISE EXCEPTION 'P5c doit être installé avant P5d'; END IF;
  IF to_regclass('public.municipal_treasuries') IS NULL THEN RAISE EXCEPTION 'Budget municipal introuvable'; END IF;
  IF (SELECT count(*) FROM public.events) < 81 THEN RAISE EXCEPTION 'Événements existants perdus'; END IF;
  RAISE NOTICE 'P5d installé : impôts des entreprises prêts';
END $$;

COMMIT;
