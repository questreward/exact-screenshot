-- 0. Faille Bloc 10 : plus d'appel direct
REVOKE EXECUTE ON FUNCTION public.economy_cash(uuid,text,integer,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.economy_notify(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_personal_economy(uuid) FROM PUBLIC, anon, authenticated;

-- 1. Réglages et catalogues
CREATE TABLE public.admin_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tax_free_threshold integer NOT NULL DEFAULT 10000, tax_rate integer NOT NULL DEFAULT 10,
  training_credit_rate integer NOT NULL DEFAULT 20, declaration_days integer NOT NULL DEFAULT 14,
  payment_days integer NOT NULL DEFAULT 14, correction_days integer NOT NULL DEFAULT 30,
  late_fee integer NOT NULL DEFAULT 10, adult_age integer NOT NULL DEFAULT 18,
  aid_income_ceiling integer NOT NULL DEFAULT 1500, aid_rate integer NOT NULL DEFAULT 40,
  aid_income_floor integer NOT NULL DEFAULT 600, aid_income_reduction integer NOT NULL DEFAULT 25,
  aid_min_amount integer NOT NULL DEFAULT 10, aid_months integer NOT NULL DEFAULT 3,
  aid_response_minutes integer NOT NULL DEFAULT 60, renewal_notice_days integer NOT NULL DEFAULT 7,
  student_aid_amount integer NOT NULL DEFAULT 150, student_aid_ceiling integer NOT NULL DEFAULT 800);
INSERT INTO public.admin_settings (id) VALUES (1);

CREATE TABLE public.admin_document_types (
  id text PRIMARY KEY, name text NOT NULL, category text NOT NULL, origin text NOT NULL,
  validity_days integer NOT NULL, explanation text NOT NULL, sort_order integer NOT NULL DEFAULT 0);
INSERT INTO public.admin_document_types VALUES
 ('identity','Justificatif d''identité simulé','Situation personnelle','Mairie fictive CIVITAS',3650,'Prouve qui vous êtes dans le jeu. Jamais une vraie pièce d''identité.',1),
 ('bank_statement','Relevé bancaire simulé','Fiscalité','Banque CIVITAS',30,'Résume les mouvements de votre compte du jeu.',2),
 ('income_proof','Justificatif de revenus','Travail','Banque CIVITAS',90,'Indique les salaires réellement reçus dans le jeu.',3),
 ('housing_proof','Justificatif de logement','Logement','Bailleur fictif',90,'Prouve où vous habitez et combien coûte votre logement.',4),
 ('school_certificate','Certificat de scolarité','Études','Établissement fictif',180,'Prouve que vous êtes inscrit en formation.',5),
 ('work_contract','Contrat de travail','Travail','Employeur fictif',365,'Prouve votre emploi actuel et votre salaire.',6),
 ('situation_proof','Justificatif de situation','Situation personnelle','Organisme fictif CIVITAS',90,'Indique si vous étudiez ou travaillez.',7);

CREATE TABLE public.admin_procedure_types (
  id text PRIMARY KEY, category text NOT NULL, title text NOT NULL, description text NOT NULL,
  why text NOT NULL, asked text NOT NULL, next_step text NOT NULL,
  required_documents text[] NOT NULL DEFAULT '{}', min_age integer NOT NULL DEFAULT 16, sort_order integer NOT NULL DEFAULT 0);
INSERT INTO public.admin_procedure_types VALUES
 ('tax_declaration','Fiscalité','Déclaration de revenus','Déclarer chaque année les revenus gagnés dans le jeu.','Calculer la part de vos revenus qui finance les services communs.','Vérifier vos revenus, joindre vos justificatifs, confirmer votre situation.','Le montant est calculé ; vous payez ou êtes remboursé via la Banque.','{income_proof,bank_statement,identity}',18,1),
 ('housing_aid','Logement','Aide au logement','Une aide mensuelle simulée pour réduire le coût du logement.','Aider à payer un logement quand les revenus sont modestes.','Vos justificatifs de logement, de revenus et de situation.','Réponse après un court délai ; si acceptée, versements mensuels en Banque.','{housing_proof,income_proof,situation_proof}',18,2),
 ('student_aid','Aides','Aide étudiante','Un versement unique simulé pour les étudiants aux revenus modestes.','Soutenir les étudiants pendant leur formation.','Votre certificat de scolarité, votre identité, vos revenus.','Réponse après un court délai ; si acceptée, un versement en Banque.','{school_certificate,identity,income_proof}',16,3),
 ('situation_change','Situation personnelle','Changement de situation','Signaler un changement réel : emploi, logement, études, ville.','Garder vos démarches à jour avec votre vraie situation de jeu.','Choisir le changement qui s''est produit.','Les documents concernés deviennent périmés ; vos aides passent à compléter.','{}',16,4);

-- 2. Données des joueurs
CREATE TABLE public.administrative_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  type_id text NOT NULL REFERENCES public.admin_document_types(id),
  issued_at timestamptz NOT NULL, valid_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'valide' CHECK (status IN ('valide','perime','remplace')),
  details jsonb NOT NULL DEFAULT '{}');
CREATE UNIQUE INDEX administrative_documents_one_valid ON public.administrative_documents (character_id, type_id) WHERE status = 'valide';

CREATE TABLE public.administrative_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  type_id text NOT NULL REFERENCES public.admin_procedure_types(id),
  category text NOT NULL, title text NOT NULL, period text NOT NULL,
  status text NOT NULL DEFAULT 'a_faire' CHECK (status IN ('a_faire','en_cours','a_completer','envoyee','acceptee','refusee','terminee')),
  late boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL, due_at timestamptz, closes_at timestamptz, response_at timestamptz,
  situation jsonb, choices jsonb NOT NULL DEFAULT '{}', result jsonb NOT NULL DEFAULT '{}',
  renewed_from uuid UNIQUE REFERENCES public.administrative_procedures(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, type_id, period));
CREATE UNIQUE INDEX administrative_procedures_one_active_aid ON public.administrative_procedures (character_id, type_id)
  WHERE type_id IN ('housing_aid','student_aid') AND status IN ('a_faire','en_cours','a_completer','envoyee');

CREATE TABLE public.administrative_procedure_documents (
  procedure_id uuid NOT NULL REFERENCES public.administrative_procedures(id),
  type_id text NOT NULL REFERENCES public.admin_document_types(id),
  document_id uuid NOT NULL REFERENCES public.administrative_documents(id),
  attached_at timestamptz NOT NULL, PRIMARY KEY (procedure_id, type_id));

CREATE TABLE public.tax_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL REFERENCES public.administrative_procedures(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  version integer NOT NULL, income integer NOT NULL, taxable integer NOT NULL, tax integer NOT NULL,
  training_spent integer NOT NULL, credit integer NOT NULL, net integer NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','remplacee')),
  submitted_at timestamptz NOT NULL, UNIQUE (procedure_id, version));

CREATE TABLE public.administrative_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  procedure_id uuid REFERENCES public.administrative_procedures(id),
  event_key text NOT NULL, kind text NOT NULL, label text NOT NULL, amount integer,
  details jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL,
  UNIQUE (character_id, event_key));

-- 3. Accès : lecture seule, ses propres données
GRANT SELECT ON public.admin_settings, public.admin_document_types, public.admin_procedure_types,
  public.administrative_documents, public.administrative_procedures, public.administrative_procedure_documents,
  public.tax_declarations, public.administrative_events TO authenticated;
GRANT ALL ON public.admin_settings, public.admin_document_types, public.admin_procedure_types,
  public.administrative_documents, public.administrative_procedures, public.administrative_procedure_documents,
  public.tax_declarations, public.administrative_events TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_procedure_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_procedure_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Réglages lisibles" ON public.admin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Types de documents lisibles" ON public.admin_document_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Types de démarches lisibles" ON public.admin_procedure_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mes documents" ON public.administrative_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY "Mes démarches" ON public.administrative_procedures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY "Mes pièces jointes" ON public.administrative_procedure_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.administrative_procedures p JOIN public.characters c ON c.id = p.character_id WHERE p.id = procedure_id AND c.user_id = auth.uid()));
CREATE POLICY "Mes déclarations" ON public.tax_declarations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY "Mon historique administratif" ON public.administrative_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- 4. Fonctions internes
CREATE FUNCTION public.admin_event(_cid uuid, _proc uuid, _key text, _kind text, _label text, _amount integer, _details jsonb DEFAULT '{}')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.administrative_events (character_id, procedure_id, event_key, kind, label, amount, details, occurred_at)
  VALUES (_cid, _proc, _key, _kind, _label, _amount, _details, public.game_now()) ON CONFLICT (character_id, event_key) DO NOTHING;
  RETURN FOUND;
END $$;

CREATE FUNCTION public.admin_snapshot(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'age', c.age, 'path', c.path_id, 'career_active', COALESCE(c.progression->>'career_active','false') = 'true', 'city', c.city_id,
    'job_id', e.job_id, 'job_title', j.title,
    'salary', CASE WHEN e.character_id IS NULL THEN 0 ELSE j.salary + e.salary_bonus END,
    'housing_type', h.type_id, 'housing_location', h.location_id, 'housing_name', ht.name,
    'housing_monthly', COALESCE(ht.daily_cost * 30, 0),
    'studying', se.character_id IS NOT NULL, 'field_id', se.field_id,
    'monthly_income', COALESCE((SELECT sum(t.amount) FROM public.transactions t JOIN public.accounts a ON a.id = t.account_id
        WHERE a.character_id = c.id AND t.category = 'salaire' AND t.amount > 0
          AND COALESCE(t.world_at, t.created_at) > public.game_now() - interval '30 days'), 0),
    'year_income', COALESCE((SELECT sum(t.amount) FROM public.transactions t JOIN public.accounts a ON a.id = t.account_id
        WHERE a.character_id = c.id AND t.category = 'salaire' AND t.amount > 0
          AND COALESCE(t.world_at, t.created_at) >= date_trunc('year', public.game_now())), 0),
    'year_training', COALESCE((SELECT -sum(t.amount) FROM public.transactions t JOIN public.accounts a ON a.id = t.account_id
        WHERE a.character_id = c.id AND t.category = 'formation' AND t.amount < 0
          AND COALESCE(t.world_at, t.created_at) >= date_trunc('year', public.game_now())), 0))
  FROM public.characters c
  LEFT JOIN public.employments e ON e.character_id = c.id LEFT JOIN public.jobs j ON j.id = e.job_id
  LEFT JOIN public.character_housing h ON h.character_id = c.id LEFT JOIN public.housing_types ht ON ht.id = h.type_id
  LEFT JOIN public.study_enrollments se ON se.character_id = c.id
  WHERE c.id = _cid
$$;

CREATE FUNCTION public.admin_tax(_income integer, _training integer, _use_credit boolean) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'taxable', GREATEST(0, _income - s.tax_free_threshold),
    'tax', GREATEST(0, _income - s.tax_free_threshold) * s.tax_rate / 100,
    'credit', CASE WHEN _use_credit THEN _training * s.training_credit_rate / 100 ELSE 0 END,
    'net', GREATEST(0, _income - s.tax_free_threshold) * s.tax_rate / 100
           - CASE WHEN _use_credit THEN _training * s.training_credit_rate / 100 ELSE 0 END)
  FROM public.admin_settings s WHERE s.id = 1
$$;

CREATE FUNCTION public.admin_housing_aid(_snap jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.admin_settings; amount integer; income integer := (_snap->>'monthly_income')::integer; BEGIN
  SELECT * INTO s FROM public.admin_settings WHERE id = 1;
  IF (_snap->>'age')::integer < s.adult_age THEN RETURN jsonb_build_object('eligible', false, 'reason', 'Cette aide simulée est réservée aux joueurs de ' || s.adult_age || ' ans et plus.'); END IF;
  IF _snap->>'housing_type' IS NULL THEN RETURN jsonb_build_object('eligible', false, 'reason', 'Aucun logement enregistré pour votre personnage.'); END IF;
  IF income > s.aid_income_ceiling THEN RETURN jsonb_build_object('eligible', false, 'reason', 'Vos revenus simulés dépassent le plafond prévu pour cette aide (' || s.aid_income_ceiling || ' € par mois).'); END IF;
  amount := (_snap->>'housing_monthly')::integer * s.aid_rate / 100 - GREATEST(0, income - s.aid_income_floor) * s.aid_income_reduction / 100;
  IF amount < s.aid_min_amount THEN RETURN jsonb_build_object('eligible', false, 'reason', 'Le montant calculé est trop faible pour être versé (moins de ' || s.aid_min_amount || ' €).'); END IF;
  RETURN jsonb_build_object('eligible', true, 'amount', amount);
END $$;

CREATE FUNCTION public.admin_student_aid(_snap jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.admin_settings; BEGIN
  SELECT * INTO s FROM public.admin_settings WHERE id = 1;
  IF NOT (_snap->>'studying')::boolean THEN RETURN jsonb_build_object('eligible', false, 'reason', 'Vous n''êtes inscrit dans aucune formation.'); END IF;
  IF (_snap->>'monthly_income')::integer > s.student_aid_ceiling THEN RETURN jsonb_build_object('eligible', false, 'reason', 'Vos revenus simulés dépassent le plafond prévu pour cette aide (' || s.student_aid_ceiling || ' € par mois).'); END IF;
  RETURN jsonb_build_object('eligible', true, 'amount', s.student_aid_amount);
END $$;

-- Montant restant dû : déclaration active + majoration éventuelle + paiements (négatifs) et remboursements (positifs) déjà passés en Banque
CREATE FUNCTION public.admin_tax_balance(_proc uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT d.net FROM public.tax_declarations d WHERE d.procedure_id = p.id AND d.status = 'active'), 0)
       + CASE WHEN EXISTS (SELECT 1 FROM public.tax_declarations d WHERE d.procedure_id = p.id) THEN COALESCE((p.result->>'late_fee')::integer, 0) ELSE 0 END
       + COALESCE((SELECT sum(o.amount) FROM public.economy_operations o
                   WHERE o.character_id = p.character_id AND o.operation_key LIKE 'tax:' || p.id || ':%' AND o.status = 'done'), 0)
  FROM public.administrative_procedures p WHERE p.id = _proc
$$;

CREATE FUNCTION public.settle_administration(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.admin_settings; c public.characters; t timestamptz := public.game_now(); p public.administrative_procedures;
  snap jsonb; r jsonb; n integer; per text := to_char(public.game_now(), 'YYYY'); BEGIN
  SELECT * INTO s FROM public.admin_settings WHERE id = 1;
  SELECT * INTO c FROM public.characters WHERE id = _cid FOR UPDATE;
  IF NOT FOUND OR c.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  UPDATE public.administrative_documents SET status = 'perime' WHERE character_id = _cid AND status = 'valide' AND valid_until <= t;
  IF NOT EXISTS (SELECT 1 FROM public.administrative_events WHERE character_id = _cid AND kind = 'situation') THEN
    PERFORM public.admin_event(_cid, NULL, 'situation-baseline', 'situation', 'Situation de départ enregistrée', NULL, public.admin_snapshot(_cid));
  END IF;
  -- Déclaration annuelle (18 ans et +)
  IF c.age >= s.adult_age AND NOT EXISTS (SELECT 1 FROM public.administrative_procedures WHERE character_id = _cid AND type_id = 'tax_declaration' AND period = per) THEN
    INSERT INTO public.administrative_procedures (character_id, type_id, category, title, period, started_at, due_at, closes_at)
    SELECT _cid, id, category, title || ' ' || per, per, t, t + s.declaration_days * interval '1 day', t + (s.declaration_days + s.correction_days) * interval '1 day'
    FROM public.admin_procedure_types WHERE id = 'tax_declaration';
    PERFORM public.admin_event(_cid, NULL, 'tax-open:' || per, 'ouverture', 'Déclaration de revenus ' || per || ' disponible', NULL);
    PERFORM public.economy_notify(_cid, 'admin:tax-open:' || per, 'Une démarche doit être complétée', 'Votre déclaration de revenus simulée ' || per || ' est disponible dans Mes démarches.');
  END IF;
  -- Retards (une seule fois par démarche)
  FOR p IN SELECT * FROM public.administrative_procedures WHERE character_id = _cid AND type_id = 'tax_declaration' AND NOT late AND due_at <= t
      AND (status IN ('a_faire','en_cours','a_completer') OR (status = 'acceptee' AND public.admin_tax_balance(id) > 0)) FOR UPDATE LOOP
    UPDATE public.administrative_procedures SET late = true, result = result || jsonb_build_object('late_fee', s.late_fee) WHERE id = p.id;
    PERFORM public.admin_event(_cid, p.id, 'late:' || p.id, 'retard', 'Date limite dépassée — majoration simplifiée de ' || s.late_fee || ' €', s.late_fee);
    PERFORM public.economy_notify(_cid, 'admin:late:' || p.id, 'Démarche en retard', '« ' || p.title || ' » a dépassé sa date limite. Règle simplifiée du jeu : ' || s.late_fee || ' € ajoutés au montant dû.');
  END LOOP;
  -- Paiement bientôt dû (3 jours)
  FOR p IN SELECT * FROM public.administrative_procedures WHERE character_id = _cid AND type_id = 'tax_declaration' AND status = 'acceptee'
      AND due_at > t AND due_at <= t + interval '3 days' LOOP
    IF public.admin_tax_balance(p.id) > 0 THEN
      PERFORM public.economy_notify(_cid, 'admin:tax-soon:' || p.id || ':' || COALESCE(p.result->>'version', '0'), 'Votre paiement fiscal arrive bientôt', 'Montant à régler avant le ' || to_char(p.due_at, 'DD/MM/YYYY') || ' dans Mes démarches.');
    END IF;
  END LOOP;
  -- Réponses aux demandes d'aide (recalculées sur les vraies données au moment de la réponse)
  FOR p IN SELECT * FROM public.administrative_procedures WHERE character_id = _cid AND status = 'envoyee'
      AND type_id IN ('housing_aid','student_aid') AND response_at <= t ORDER BY response_at FOR UPDATE LOOP
    snap := public.admin_snapshot(_cid);
    r := CASE p.type_id WHEN 'housing_aid' THEN public.admin_housing_aid(snap) ELSE public.admin_student_aid(snap) END;
    IF (r->>'eligible')::boolean THEN
      UPDATE public.administrative_procedures SET status = 'acceptee', situation = snap,
        result = result || r || jsonb_build_object('reason', NULL,
          'starts_at', COALESCE(result->'starts_at', to_jsonb(t)),
          'months', CASE WHEN p.type_id = 'housing_aid' THEN s.aid_months ELSE 1 END,
          'ends_at', COALESCE(result->'ends_at', to_jsonb(t + CASE WHEN p.type_id = 'housing_aid' THEN s.aid_months ELSE 1 END * interval '30 days')))
      WHERE id = p.id;
      PERFORM public.admin_event(_cid, p.id, 'answer:' || p.id || ':' || extract(epoch FROM p.response_at)::bigint, 'reponse', 'Demande acceptée — ' || (r->>'amount') || ' €', (r->>'amount')::integer);
      PERFORM public.economy_notify(_cid, 'admin:answer:' || p.id || ':' || extract(epoch FROM p.response_at)::bigint, 'Votre demande a été acceptée', p.title || ' (simulation) : ' || (r->>'amount') || ' €.');
    ELSE
      UPDATE public.administrative_procedures SET status = 'refusee', situation = snap, result = result || r WHERE id = p.id;
      PERFORM public.admin_event(_cid, p.id, 'answer:' || p.id || ':' || extract(epoch FROM p.response_at)::bigint, 'reponse', 'Demande refusée — ' || (r->>'reason'), NULL);
      PERFORM public.economy_notify(_cid, 'admin:answer:' || p.id || ':' || extract(epoch FROM p.response_at)::bigint, 'Votre demande a été refusée', r->>'reason');
    END IF;
  END LOOP;
  -- Versements des aides acceptées (un par période de 30 jours, clé unique)
  FOR p IN SELECT * FROM public.administrative_procedures WHERE character_id = _cid AND status = 'acceptee'
      AND type_id IN ('housing_aid','student_aid') FOR UPDATE LOOP
    FOR n IN 0 .. (p.result->>'months')::integer - 1 LOOP
      EXIT WHEN (p.result->>'starts_at')::timestamptz + n * interval '30 days' > t;
      IF public.economy_cash(_cid, 'aid:' || p.id || ':' || n, (p.result->>'amount')::integer,
           CASE WHEN p.type_id = 'housing_aid' THEN 'Aide au logement (simulation) — versement ' || (n + 1) ELSE 'Aide étudiante (simulation)' END, 'aide') THEN
        PERFORM public.admin_event(_cid, p.id, 'aid-paid:' || p.id || ':' || n, 'versement', 'Versement reçu en Banque', (p.result->>'amount')::integer);
      END IF;
    END LOOP;
    IF p.type_id = 'housing_aid' AND (p.result->>'ends_at')::timestamptz - s.renewal_notice_days * interval '1 day' <= t THEN
      PERFORM public.economy_notify(_cid, 'admin:aid-end:' || p.id, 'Votre aide arrive à échéance', 'Pensez à renouveler votre demande dans Mes démarches.');
    END IF;
    IF (p.result->>'ends_at')::timestamptz <= t THEN
      UPDATE public.administrative_procedures SET status = 'terminee' WHERE id = p.id;
      PERFORM public.admin_event(_cid, p.id, 'aid-end:' || p.id, 'fin', 'Aide terminée', NULL);
    END IF;
  END LOOP;
END $$;

-- 5. Fonctions appelables par le joueur
CREATE FUNCTION public.admin_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.prepare_daily_life(); PERFORM public.settle_administration(cid);
  RETURN jsonb_build_object(
    'world_now', public.game_now(),
    'settings', (SELECT to_jsonb(s) FROM public.admin_settings s WHERE id = 1),
    'situation', public.admin_snapshot(cid),
    'procedure_types', COALESCE((SELECT jsonb_agg(pt ORDER BY sort_order) FROM public.admin_procedure_types pt), '[]'),
    'document_types', COALESCE((SELECT jsonb_agg(dt ORDER BY sort_order) FROM public.admin_document_types dt), '[]'),
    'documents', COALESCE((SELECT jsonb_agg(d ORDER BY issued_at DESC) FROM public.administrative_documents d WHERE character_id = cid), '[]'),
    'procedures', COALESCE((SELECT jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'attachments', COALESCE((SELECT jsonb_agg(jsonb_build_object('type_id', pd.type_id, 'document_id', pd.document_id, 'valid', d.status = 'valide'))
                                 FROM public.administrative_procedure_documents pd JOIN public.administrative_documents d ON d.id = pd.document_id WHERE pd.procedure_id = p.id), '[]'),
        'declarations', COALESCE((SELECT jsonb_agg(td ORDER BY version) FROM public.tax_declarations td WHERE td.procedure_id = p.id), '[]'),
        'balance', CASE WHEN p.type_id = 'tax_declaration' THEN public.admin_tax_balance(p.id) ELSE NULL END,
        'renewed', EXISTS (SELECT 1 FROM public.administrative_procedures r WHERE r.renewed_from = p.id)) ORDER BY p.started_at DESC)
      FROM public.administrative_procedures p WHERE character_id = cid), '[]'),
    'events', COALESCE((SELECT jsonb_agg(e ORDER BY occurred_at DESC) FROM (SELECT * FROM public.administrative_events WHERE character_id = cid AND kind <> 'requete' ORDER BY occurred_at DESC LIMIT 60) e), '[]'));
END $$;

CREATE FUNCTION public.admin_action(_command text, _request_id uuid, _input jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.admin_settings; t timestamptz; p public.administrative_procedures;
  pt public.admin_procedure_types; dt public.admin_document_types; snap jsonb; last_snap jsonb; r jsonb; v integer; owed integer;
  doc uuid; missing integer; use_credit boolean; newid uuid; change text; stale text[]; BEGIN
  IF _request_id IS NULL THEN RAISE EXCEPTION 'Requête invalide'; END IF;
  cid := public.prepare_daily_life(); PERFORM public.settle_administration(cid);
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO s FROM public.admin_settings WHERE id = 1; t := public.game_now();
  IF NOT public.admin_event(cid, NULL, 'request:' || _request_id, 'requete', _command, NULL) THEN RETURN jsonb_build_object('status', 'duplicate'); END IF;

  IF _command = 'document' THEN
    SELECT * INTO dt FROM public.admin_document_types WHERE id = _input->>'type_id';
    IF NOT FOUND THEN RAISE EXCEPTION 'Document inconnu'; END IF;
    snap := public.admin_snapshot(cid);
    IF dt.id = 'housing_proof' AND snap->>'housing_type' IS NULL THEN RAISE EXCEPTION 'Aucun logement enregistré'; END IF;
    IF dt.id = 'school_certificate' AND NOT (snap->>'studying')::boolean THEN RAISE EXCEPTION 'Aucune inscription en formation'; END IF;
    IF dt.id = 'work_contract' AND snap->>'job_id' IS NULL THEN RAISE EXCEPTION 'Aucun emploi en cours'; END IF;
    IF dt.id = 'situation_proof' AND snap->>'job_id' IS NULL AND NOT (snap->>'studying')::boolean THEN RAISE EXCEPTION 'Aucune situation d''études ou d''emploi à justifier'; END IF;
    UPDATE public.administrative_documents SET status = 'remplace' WHERE character_id = cid AND type_id = dt.id AND status = 'valide';
    INSERT INTO public.administrative_documents (character_id, type_id, issued_at, valid_until, details)
    VALUES (cid, dt.id, t, t + dt.validity_days * interval '1 day', snap) RETURNING id INTO doc;
    UPDATE public.administrative_procedure_documents pd SET document_id = doc, attached_at = t
      FROM public.administrative_procedures p2 WHERE pd.procedure_id = p2.id AND p2.character_id = cid AND pd.type_id = dt.id
        AND p2.status IN ('a_faire','en_cours','a_completer');
    PERFORM public.admin_event(cid, NULL, 'doc:' || doc, 'document', 'Document obtenu : ' || dt.name, NULL);

  ELSIF _command = 'start' THEN
    SELECT * INTO pt FROM public.admin_procedure_types WHERE id = _input->>'type_id' AND id IN ('housing_aid','student_aid');
    IF NOT FOUND THEN RAISE EXCEPTION 'Démarche indisponible'; END IF;
    IF c.age < pt.min_age THEN RAISE EXCEPTION 'Démarche réservée aux joueurs de % ans et plus', pt.min_age; END IF;
    IF pt.id = 'student_aid' AND EXISTS (SELECT 1 FROM public.administrative_procedures WHERE character_id = cid AND type_id = 'student_aid'
         AND left(period, 4) = to_char(t, 'YYYY') AND status IN ('acceptee','terminee')) THEN RAISE EXCEPTION 'Aide étudiante déjà obtenue cette année'; END IF;
    IF pt.id = 'housing_aid' AND EXISTS (SELECT 1 FROM public.administrative_procedures WHERE character_id = cid AND type_id = 'housing_aid' AND status = 'acceptee') THEN
      RAISE EXCEPTION 'Une aide au logement est déjà en cours'; END IF;
    INSERT INTO public.administrative_procedures (character_id, type_id, category, title, period, started_at)
    VALUES (cid, pt.id, pt.category, pt.title, to_char(t, 'YYYY-MM-DD"T"HH24:MI:SS'), t) RETURNING id INTO newid;
    PERFORM public.admin_event(cid, newid, 'start:' || newid, 'debut', 'Démarche commencée : ' || pt.title, NULL);

  ELSIF _command = 'report_change' THEN
    change := _input->>'change';
    IF change NOT IN ('job','housing','status','city') THEN RAISE EXCEPTION 'Changement inconnu'; END IF;
    snap := public.admin_snapshot(cid);
    SELECT details INTO last_snap FROM public.administrative_events WHERE character_id = cid AND kind = 'situation' ORDER BY occurred_at DESC, id DESC LIMIT 1;
    IF (change = 'job' AND snap->'job_id' IS NOT DISTINCT FROM last_snap->'job_id')
       OR (change = 'housing' AND snap->'housing_type' IS NOT DISTINCT FROM last_snap->'housing_type' AND snap->'housing_location' IS NOT DISTINCT FROM last_snap->'housing_location')
       OR (change = 'status' AND snap->'studying' IS NOT DISTINCT FROM last_snap->'studying' AND snap->'career_active' IS NOT DISTINCT FROM last_snap->'career_active')
       OR (change = 'city' AND snap->'city' IS NOT DISTINCT FROM last_snap->'city') THEN
      RAISE EXCEPTION 'Aucun changement réel à signaler pour cette situation'; END IF;
    INSERT INTO public.administrative_procedures (character_id, type_id, category, title, period, started_at, status, situation, result)
    VALUES (cid, 'situation_change',
      CASE change WHEN 'job' THEN 'Travail' WHEN 'housing' THEN 'Logement' WHEN 'status' THEN 'Études' ELSE 'Situation personnelle' END,
      CASE change WHEN 'job' THEN 'Changement d''emploi' WHEN 'housing' THEN 'Changement de logement' WHEN 'status' THEN 'Changement de statut (études / vie active)' ELSE 'Changement de ville' END,
      to_char(t, 'YYYY-MM-DD"T"HH24:MI:SS') || ':' || change, t, 'terminee', snap, jsonb_build_object('change', change, 'before', last_snap, 'after', snap))
    RETURNING id INTO newid;
    PERFORM public.admin_event(cid, newid, 'situation:' || newid, 'situation', 'Changement de situation signalé', NULL, snap);
    stale := CASE change WHEN 'job' THEN ARRAY['work_contract','income_proof','situation_proof'] WHEN 'housing' THEN ARRAY['housing_proof']
                         WHEN 'status' THEN ARRAY['school_certificate','situation_proof'] ELSE ARRAY['housing_proof'] END;
    UPDATE public.administrative_documents SET status = 'perime' WHERE character_id = cid AND status = 'valide' AND type_id = ANY (stale);
    UPDATE public.administrative_procedures SET status = 'a_completer',
      result = result || jsonb_build_object('reason', 'Situation modifiée : mettez à jour vos justificatifs puis renvoyez le dossier.')
      WHERE character_id = cid AND type_id IN ('housing_aid','student_aid') AND status IN ('acceptee','envoyee');
    PERFORM public.economy_notify(cid, 'admin:change:' || newid, 'Une démarche doit être complétée', 'Votre changement de situation a été pris en compte. Vérifiez vos démarches en cours.');

  ELSIF _command IN ('attach','confirm','submit','correct','pay','renew') THEN
    SELECT * INTO p FROM public.administrative_procedures WHERE id = (_input->>'procedure_id')::uuid AND character_id = cid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Démarche introuvable'; END IF;
    SELECT * INTO pt FROM public.admin_procedure_types WHERE id = p.type_id;

    IF _command = 'attach' THEN
      IF p.status NOT IN ('a_faire','en_cours','a_completer') THEN RAISE EXCEPTION 'Dossier déjà envoyé'; END IF;
      IF NOT ((_input->>'type_id') = ANY (pt.required_documents)) THEN RAISE EXCEPTION 'Document non demandé pour cette démarche'; END IF;
      SELECT id INTO doc FROM public.administrative_documents WHERE character_id = cid AND type_id = _input->>'type_id' AND status = 'valide';
      IF NOT FOUND THEN RAISE EXCEPTION 'Obtenez d''abord ce document dans Mes documents'; END IF;
      INSERT INTO public.administrative_procedure_documents VALUES (p.id, _input->>'type_id', doc, t)
        ON CONFLICT (procedure_id, type_id) DO UPDATE SET document_id = EXCLUDED.document_id, attached_at = EXCLUDED.attached_at;
      UPDATE public.administrative_procedures SET status = CASE WHEN status = 'a_faire' THEN 'en_cours' ELSE status END WHERE id = p.id;

    ELSIF _command = 'confirm' THEN
      IF p.status NOT IN ('a_faire','en_cours','a_completer') THEN RAISE EXCEPTION 'Dossier déjà envoyé'; END IF;
      UPDATE public.administrative_procedures SET situation = public.admin_snapshot(cid),
        choices = jsonb_build_object('training_credit', COALESCE((_input->>'training_credit')::boolean, false)),
        status = CASE WHEN status = 'a_faire' THEN 'en_cours' ELSE status END WHERE id = p.id;

    ELSIF _command IN ('submit','correct') THEN
      IF _command = 'submit' AND p.status NOT IN ('a_faire','en_cours','a_completer') THEN RAISE EXCEPTION 'Dossier déjà envoyé'; END IF;
      IF _command = 'correct' AND (p.type_id <> 'tax_declaration' OR p.status NOT IN ('acceptee','terminee')) THEN RAISE EXCEPTION 'Correction impossible pour cette démarche'; END IF;
      IF _command = 'correct' AND t >= p.closes_at THEN RAISE EXCEPTION 'Modification impossible pour cette période'; END IF;
      IF _command = 'submit' AND p.situation IS NULL THEN RAISE EXCEPTION 'Confirmez d''abord votre situation'; END IF;
      SELECT count(*) INTO missing FROM unnest(pt.required_documents) rd WHERE NOT EXISTS (
        SELECT 1 FROM public.administrative_procedure_documents pd JOIN public.administrative_documents d ON d.id = pd.document_id
        WHERE pd.procedure_id = p.id AND pd.type_id = rd AND d.status = 'valide');
      IF _command = 'submit' AND missing > 0 THEN RAISE EXCEPTION 'Documents manquants ou périmés : %', missing; END IF;
      IF p.type_id = 'tax_declaration' THEN
        snap := public.admin_snapshot(cid);
        use_credit := CASE WHEN _command = 'correct' THEN COALESCE((_input->>'training_credit')::boolean, false) ELSE COALESCE((p.choices->>'training_credit')::boolean, false) END;
        r := public.admin_tax((snap->>'year_income')::integer, (snap->>'year_training')::integer, use_credit);
        SELECT COALESCE(max(version), 0) + 1 INTO v FROM public.tax_declarations WHERE procedure_id = p.id;
        UPDATE public.tax_declarations SET status = 'remplacee' WHERE procedure_id = p.id AND status = 'active';
        INSERT INTO public.tax_declarations (procedure_id, character_id, version, income, taxable, tax, training_spent, credit, net, submitted_at)
        VALUES (p.id, cid, v, (snap->>'year_income')::integer, (r->>'taxable')::integer, (r->>'tax')::integer, (snap->>'year_training')::integer, (r->>'credit')::integer, (r->>'net')::integer, t);
        owed := public.admin_tax_balance(p.id);
        IF owed < 0 THEN
          PERFORM public.economy_cash(cid, 'tax:' || p.id || ':refund:' || v, -owed, 'Remboursement fiscal (simulation) ' || p.period, 'impots');
          PERFORM public.admin_event(cid, p.id, 'refund:' || p.id || ':' || v, 'remboursement', 'Remboursement reçu en Banque', -owed);
          owed := 0;
        END IF;
        UPDATE public.administrative_procedures SET situation = snap, choices = jsonb_build_object('training_credit', use_credit),
          status = CASE WHEN owed > 0 THEN 'acceptee' ELSE 'terminee' END,
          due_at = CASE WHEN owed > 0 THEN GREATEST(t + s.payment_days * interval '1 day', COALESCE(due_at, t)) ELSE due_at END,
          result = result || jsonb_build_object('version', v, 'net', (r->>'net')::integer)
        WHERE id = p.id;
        PERFORM public.admin_event(cid, p.id, 'declaration:' || p.id || ':' || v, 'declaration',
          CASE WHEN v = 1 THEN 'Déclaration envoyée' ELSE 'Déclaration corrigée (version ' || v || ')' END || ' — revenu simulé ' || (snap->>'year_income') || ' €, montant ' || (r->>'net') || ' €',
          (r->>'net')::integer, jsonb_build_object('version', v));
        PERFORM public.economy_notify(cid, 'admin:declaration:' || p.id || ':' || v, 'Votre déclaration a été acceptée',
          'Montant estimé : ' || (r->>'net') || ' € (simulation CIVITAS).');
      ELSE
        UPDATE public.administrative_procedures SET status = 'envoyee', situation = public.admin_snapshot(cid),
          response_at = t + s.aid_response_minutes * interval '1 minute' WHERE id = p.id;
        PERFORM public.admin_event(cid, p.id, 'submit:' || p.id || ':' || extract(epoch FROM t)::bigint, 'envoi', 'Dossier envoyé', NULL);
      END IF;

    ELSIF _command = 'pay' THEN
      IF p.type_id <> 'tax_declaration' THEN RAISE EXCEPTION 'Aucun paiement pour cette démarche'; END IF;
      owed := public.admin_tax_balance(p.id);
      IF owed <= 0 OR NOT EXISTS (SELECT 1 FROM public.tax_declarations WHERE procedure_id = p.id) THEN RAISE EXCEPTION 'Rien à payer'; END IF;
      PERFORM public.economy_cash(cid, 'tax:' || p.id || ':pay:' || (p.result->>'version') || ':' || owed, -owed, 'Impôt sur le revenu (simulation) ' || p.period, 'impots');
      UPDATE public.administrative_procedures SET status = 'terminee' WHERE id = p.id;
      PERFORM public.admin_event(cid, p.id, 'pay:' || p.id || ':' || (p.result->>'version') || ':' || owed, 'paiement', 'Paiement prélevé en Banque', owed);

    ELSIF _command = 'renew' THEN
      IF p.type_id <> 'housing_aid' OR p.status NOT IN ('acceptee','terminee') OR p.result->>'ends_at' IS NULL
         OR (p.result->>'ends_at')::timestamptz - s.renewal_notice_days * interval '1 day' > t THEN RAISE EXCEPTION 'Renouvellement pas encore possible'; END IF;
      IF EXISTS (SELECT 1 FROM public.administrative_procedures WHERE renewed_from = p.id) THEN RAISE EXCEPTION 'Renouvellement déjà demandé'; END IF;
      INSERT INTO public.administrative_procedures (character_id, type_id, category, title, period, started_at, renewed_from)
      VALUES (cid, 'housing_aid', pt.category, pt.title || ' — renouvellement', to_char(t, 'YYYY-MM-DD"T"HH24:MI:SS') || ':renew', t, p.id) RETURNING id INTO newid;
      PERFORM public.admin_event(cid, newid, 'renew:' || p.id, 'renouvellement', 'Renouvellement commencé', NULL);
    END IF;
  ELSE
    RAISE EXCEPTION 'Action inconnue';
  END IF;
  RETURN jsonb_build_object('status', 'ok');
END $$;

-- 6. Droits d'appel
REVOKE EXECUTE ON FUNCTION public.admin_event(uuid,uuid,text,text,text,integer,jsonb), public.admin_snapshot(uuid),
  public.admin_tax(integer,integer,boolean), public.admin_housing_aid(jsonb), public.admin_student_aid(jsonb),
  public.admin_tax_balance(uuid), public.settle_administration(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_state(), public.admin_action(text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_state(), public.admin_action(text,uuid,jsonb) TO authenticated;