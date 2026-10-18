CREATE OR REPLACE FUNCTION public.admin_action(_command text, _request_id uuid, _input jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Compare chaque type de changement à son propre dernier signalement
    SELECT situation INTO last_snap FROM public.administrative_procedures
      WHERE character_id = cid AND type_id = 'situation_change' AND result->>'change' = change
      ORDER BY started_at DESC, created_at DESC, id DESC LIMIT 1;
    -- À défaut, situation de départ enregistrée
    IF last_snap IS NULL THEN
      SELECT details INTO last_snap FROM public.administrative_events
        WHERE character_id = cid AND kind = 'situation' AND event_key = 'situation-baseline' LIMIT 1;
    END IF;
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
END $function$;