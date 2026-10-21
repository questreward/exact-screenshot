-- Instantané privé en lecture seule : aucune échéance réglée, aucun paiement.
BEGIN;
CREATE OR REPLACE FUNCTION public.financial_adviser_snapshot() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; result jsonb;
BEGIN
  SELECT id INTO cid FROM public.characters WHERE user_id=auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Créez votre personnage'; END IF;
  SELECT jsonb_build_object(
    'date_jeu', public.game_now(),
    'banque', jsonb_build_object(
      'solde_euros', a.balance,
      'decouvert_utilise_euros', COALESCE((SELECT overdraft_used FROM public.bank_profiles WHERE character_id = cid),0),
      'mensualites', COALESCE((SELECT jsonb_agg(jsonb_build_object('date',i.due_at,'montant_euros',i.principal_part+i.interest_part+i.late_fee,'etat',i.status) ORDER BY i.due_at)
        FROM public.loan_installments i JOIN public.loans l ON l.id=i.loan_id WHERE l.character_id=cid AND i.status IN ('pending','late')), '[]'::jsonb)),
    'retraite', jsonb_build_object('age',c.age,'age_legal',(SELECT legal_age FROM public.retirement_settings WHERE id=1),
      'estimation_non_versee',public.retirement_estimate(cid),
      'pension_enregistree_euros',(SELECT monthly_pension FROM public.retirement_profiles WHERE character_id=cid),
      'depart_enregistre',(SELECT retired_at FROM public.retirement_profiles WHERE character_id=cid)),
    'patrimoine', jsonb_build_object('epargne_euros',COALESCE((SELECT sum(saved) FROM public.economy_goals WHERE character_id=cid AND kind='saving'),0),
      'valeur_achat_biens_euros',COALESCE((SELECT sum(purchase_price) FROM public.personal_assets WHERE character_id=cid),0),
      'objectifs',COALESCE((SELECT jsonb_agg(jsonb_build_object('cible_euros',target,'epargne_euros',saved,'date_cible',target_date)) FROM public.economy_goals WHERE character_id=cid AND kind='saving'), '[]'::jsonb),
      'prochain_loyer',(SELECT next_rent FROM public.personal_budgets WHERE character_id=cid AND auto_rent),
      'loyer_journalier_euros',(SELECT t.daily_cost FROM public.character_housing h JOIN public.housing_types t ON t.id=h.type_id WHERE h.character_id=cid),
      'entretiens',COALESCE((SELECT jsonb_agg(jsonb_build_object('date',next_maintenance,'etat',condition)) FROM public.personal_assets WHERE character_id=cid AND next_maintenance IS NOT NULL),'[]'::jsonb))
  ) INTO result FROM public.characters c JOIN public.accounts a ON a.character_id=c.id WHERE c.id=cid AND c.user_id=auth.uid();
  IF result IS NULL THEN RAISE EXCEPTION 'Situation financière indisponible'; END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.financial_adviser_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.financial_adviser_snapshot() TO authenticated;
COMMIT;