-- CIVITAS – DOCUMENTS VAGUE 3 : COFFRE-FORT « MES DOCUMENTS », FORMULAIRES REMPLISSABLES, DOCUMENTS AUTOMATIQUES
-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée, aucune donnée existante touchée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0072_document_vault.sql
-- Principe : les documents automatiques (contrat, fiche de paie, bail, quittance, avis d'impôt, échéancier, assurance,
--   consultation, mandat, décision d'aide) sont recalculés à la lecture depuis les données réelles du serveur.
--   Rien n'est dupliqué, aucun argent, aucune récompense. Seuls sont stockés : les formulaires remplis par le joueur
--   (avec historique immuable) et la liste des documents déjà consultés (pour signaler les nouveaux).
-- Tous les documents portent la mention DOCUMENT FICTIF — CIVITAS. Chacun ne voit que les siens.
BEGIN;

CREATE TABLE public.document_form_types (
  id text PRIMARY KEY,
  category text NOT NULL,
  title text NOT NULL,
  intro text NOT NULL,
  simple_intro text NOT NULL,
  fields jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE public.document_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  type_id text NOT NULL REFERENCES public.document_form_types(id),
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','valide')),
  data jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  doc_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  updated_at timestamptz NOT NULL DEFAULT public.game_now(),
  validated_at timestamptz
);
CREATE UNIQUE INDEX document_forms_one_draft ON public.document_forms (character_id, type_id) WHERE status = 'brouillon';
CREATE TABLE public.document_form_history (
  id bigserial PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.document_forms(id),
  version integer NOT NULL,
  action text NOT NULL CHECK (action IN ('sauvegarde','validation','correction')),
  data jsonb NOT NULL,
  at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.document_seen (
  character_id uuid NOT NULL REFERENCES public.characters(id),
  doc_key text NOT NULL CHECK (char_length(doc_key) <= 120),
  seen_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, doc_key)
);

INSERT INTO public.document_form_types VALUES
('caf_demande','caf','Demande d''aide au logement (formulaire d''entraînement)',
 'Ce formulaire t''apprend à préparer une demande d''aide au logement. Les informations déjà connues du jeu sont remplies pour toi.',
 'Tu dis qui vit chez toi et depuis quand. Le reste est déjà rempli.',
 '[{"key":"nom","label":"Nom et prénom","type":"text","prefill":"full_name"},
   {"key":"adresse","label":"Adresse du logement","type":"text","prefill":"address"},
   {"key":"loyer","label":"Coût mensuel du logement (€)","type":"number","prefill":"housing_monthly"},
   {"key":"revenu","label":"Revenu mensuel (€)","type":"number","prefill":"monthly_income"},
   {"key":"situation","label":"Ta situation","type":"radio","required":true,"options":[["etudiant","Étudiant"],["salarie","Salarié"],["sans_emploi","Sans emploi"],["autre","Autre"]]},
   {"key":"foyer","label":"Nombre de personnes dans le logement","type":"number","required":true,"min":1,"max":8,"help":"Toi compris."},
   {"key":"colocation","label":"Je suis en colocation","type":"checkbox"},
   {"key":"date_entree","label":"Date d''entrée dans le logement","type":"date","required":true},
   {"key":"motif","label":"Motif principal","type":"select","required":true,"options":[["premier","Premier logement"],["demenagement","Déménagement"],["baisse","Baisse de revenus"],["autre","Autre"]]},
   {"key":"certifie","label":"Je certifie l''exactitude de ces informations (fictives)","type":"checkbox","required":true}]',1),
('caf_changement','caf','Déclaration de changement de situation',
 'Quand ta vie change (emploi, logement, couple, naissance…), il faut le signaler pour garder des droits justes.',
 'Dis ce qui a changé et quand.',
 '[{"key":"nom","label":"Nom et prénom","type":"text","prefill":"full_name"},
   {"key":"changement","label":"Ce qui a changé","type":"select","required":true,"options":[["emploi","Emploi"],["logement","Logement"],["couple","Vie de couple"],["naissance","Naissance ou adoption"],["revenus","Revenus"],["demenagement","Déménagement"]]},
   {"key":"date","label":"Date du changement","type":"date","required":true},
   {"key":"nouveau_revenu","label":"Nouveau revenu mensuel (€), si concerné","type":"number","min":0,"max":100000},
   {"key":"details","label":"Précisions","type":"text","max":300},
   {"key":"certifie","label":"Je certifie l''exactitude de ces informations (fictives)","type":"checkbox","required":true}]',2),
('etat_des_lieux','logement','État des lieux',
 'À l''entrée et à la sortie d''un logement, on note l''état de chaque pièce. Cela évite les litiges sur la caution.',
 'Note l''état de ton logement, pièce par pièce.',
 '[{"key":"adresse","label":"Adresse du logement","type":"text","prefill":"address"},
   {"key":"logement","label":"Type de logement","type":"text","prefill":"housing_type"},
   {"key":"moment","label":"État des lieux","type":"radio","required":true,"options":[["entree","D''entrée"],["sortie","De sortie"]]},
   {"key":"date","label":"Date","type":"date","required":true},
   {"key":"pieces","label":"Nombre de pièces","type":"number","required":true,"min":1,"max":10},
   {"key":"murs","label":"Murs et plafonds","type":"select","required":true,"options":[["neuf","Neuf"],["bon","Bon état"],["usage","Usé"],["mauvais","Mauvais état"]]},
   {"key":"sols","label":"Sols","type":"select","required":true,"options":[["neuf","Neuf"],["bon","Bon état"],["usage","Usé"],["mauvais","Mauvais état"]]},
   {"key":"cuisine","label":"Cuisine","type":"select","required":true,"options":[["neuf","Neuf"],["bon","Bon état"],["usage","Usé"],["mauvais","Mauvais état"]]},
   {"key":"sanitaires","label":"Salle de bain et toilettes","type":"select","required":true,"options":[["neuf","Neuf"],["bon","Bon état"],["usage","Usé"],["mauvais","Mauvais état"]]},
   {"key":"compteur","label":"Relevé du compteur électrique","type":"number","min":0,"max":999999},
   {"key":"cles","label":"Nombre de clés remises","type":"number","required":true,"min":0,"max":20},
   {"key":"remarques","label":"Remarques","type":"text","max":300}]',3),
('declaration_preparation','impots','Préparation de la déclaration de revenus',
 'Brouillon pour t''entraîner. La vraie déclaration, avec le calcul de l''impôt, se fait dans « Mes démarches ».',
 'Vérifie tes revenus et coche ce qui te concerne.',
 '[{"key":"nom","label":"Nom et prénom","type":"text","prefill":"full_name"},
   {"key":"revenus","label":"Salaires reçus sur 12 mois (€)","type":"number","prefill":"yearly_income"},
   {"key":"situation","label":"Situation familiale","type":"select","required":true,"options":[["celibataire","Célibataire"],["couple","En couple"],["pacse","Pacsé"],["marie","Marié"]]},
   {"key":"charges","label":"Personnes à charge","type":"number","required":true,"min":0,"max":10},
   {"key":"frais_reels","label":"Je déclare mes frais réels","type":"checkbox","help":"Sinon, une déduction forfaitaire s''applique."},
   {"key":"montant_frais","label":"Montant des frais réels (€)","type":"number","min":0,"max":100000},
   {"key":"dons","label":"Dons à des associations (€)","type":"number","min":0,"max":100000},
   {"key":"certifie","label":"J''ai vérifié mes informations","type":"checkbox","required":true}]',4);

GRANT SELECT ON public.document_form_types TO authenticated;
GRANT ALL ON public.document_form_types, public.document_forms, public.document_form_history, public.document_seen TO service_role;
GRANT USAGE ON SEQUENCE public.document_form_history_id_seq TO service_role;
ALTER TABLE public.document_form_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_form_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Form types readable" ON public.document_form_types FOR SELECT TO authenticated USING (true);
-- Pas de politique sur les autres tables : accès uniquement par les fonctions ci-dessous.

-- Données connues du serveur pour pré-remplir (interne).
CREATE FUNCTION public.document_prefill(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'full_name', c.first_name || ' ' || c.last_name,
    'city', (SELECT name FROM public.cities WHERE id = c.city_id),
    'address', (SELECT l.name || ', ' || ci.name FROM public.character_housing h JOIN public.locations l ON l.id = h.location_id
                JOIN public.cities ci ON ci.id = l.city_id WHERE h.character_id = c.id),
    'housing_type', (SELECT t.name FROM public.character_housing h JOIN public.housing_types t ON t.id = h.type_id WHERE h.character_id = c.id),
    'housing_monthly', (SELECT t.daily_cost * 30 FROM public.character_housing h JOIN public.housing_types t ON t.id = h.type_id WHERE h.character_id = c.id),
    'monthly_income', (SELECT j.salary + e.salary_bonus FROM public.employments e JOIN public.jobs j ON j.id = e.job_id
                       WHERE e.character_id = c.id AND e.status = 'active' LIMIT 1),
    'yearly_income', COALESCE((SELECT sum(t.amount) FROM public.transactions t JOIN public.accounts a ON a.id = t.account_id
                       WHERE a.character_id = c.id AND t.amount > 0 AND (t.category = 'salaire' OR t.label LIKE 'Salaire%')
                         AND COALESCE(t.world_at, t.created_at) > public.game_now() - interval '365 days'), 0))
  FROM public.characters c WHERE c.id = _cid;
$$;

-- Documents recalculés depuis les données réelles (interne).
CREATE FUNCTION public.document_auto(_cid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH tx AS (
    SELECT t.amount, t.category, t.label, COALESCE(t.world_at, t.created_at) AS at
    FROM public.transactions t JOIN public.accounts a ON a.id = t.account_id WHERE a.character_id = _cid),
  docs(key, category, kind, title, at, status, expires_at, data) AS (
    SELECT 'carte', 'identite', 'carte', 'Carte d''identité CIVITAS', i.issued_at::timestamptz,
      CASE WHEN i.expires_at < public.game_now()::date THEN 'expire' ELSE 'valide' END, i.expires_at::timestamptz,
      jsonb_build_object('doc_number', i.doc_number, 'birth_date', i.birth_date, 'birth_city', i.birth_city)
    FROM public.character_identity i WHERE i.character_id = _cid
    UNION ALL
    SELECT 'admin:' || d.id, CASE d.type_id WHEN 'identity' THEN 'identite' WHEN 'bank_statement' THEN 'banque' WHEN 'housing_proof' THEN 'logement'
        WHEN 'school_certificate' THEN 'identite' WHEN 'situation_proof' THEN 'caf' ELSE 'travail' END,
      'justificatif', dt.name, d.issued_at, d.status, d.valid_until, d.details || jsonb_build_object('origin', dt.origin, 'explanation', dt.explanation)
    FROM public.administrative_documents d JOIN public.admin_document_types dt ON dt.id = d.type_id WHERE d.character_id = _cid
    UNION ALL
    SELECT 'contrat:' || md5(e.job_id::text || e.started_at::text), 'travail', 'contrat', 'Contrat de travail — ' || j.title, e.started_at,
      CASE WHEN e.status = 'active' THEN 'en_cours' ELSE 'termine' END, NULL::timestamptz,
      jsonb_build_object('job', j.title, 'salary', j.salary + e.salary_bonus, 'level', e.promotion_level,
        'employer', COALESCE((SELECT name FROM public.organizations WHERE id = j.organization_id), 'Employeur fictif CIVITAS'),
        'place', (SELECT name FROM public.locations WHERE id = j.location_id))
    FROM public.employments e JOIN public.jobs j ON j.id = e.job_id WHERE e.character_id = _cid
    UNION ALL
    SELECT 'paie:' || to_char(date_trunc('month', at), 'YYYY-MM'), 'travail', 'paie', 'Fiche de paie — ' || to_char(date_trunc('month', at), 'MM/YYYY'),
      max(at), 'valide', NULL, jsonb_build_object('month', to_char(date_trunc('month', at), 'YYYY-MM'), 'gross', sum(amount), 'lines', count(*))
    FROM tx WHERE amount > 0 AND (category = 'salaire' OR label LIKE 'Salaire%') GROUP BY date_trunc('month', at)
    UNION ALL
    SELECT 'bail:' || h.type_id || ':' || h.location_id, 'logement', 'bail', 'Bail — ' || t.name, (SELECT c.created_at FROM public.characters c WHERE c.id = _cid),
      'en_cours', NULL, jsonb_build_object('housing', t.name, 'monthly', t.daily_cost * 30, 'daily', t.daily_cost,
        'address', l.name || ', ' || ci.name, 'landlord', 'Bailleur fictif CIVITAS')
    FROM public.character_housing h JOIN public.housing_types t ON t.id = h.type_id JOIN public.locations l ON l.id = h.location_id
      JOIN public.cities ci ON ci.id = l.city_id WHERE h.character_id = _cid
    UNION ALL
    SELECT 'quittance:' || to_char(date_trunc('month', at), 'YYYY-MM'), 'logement', 'quittance', 'Quittance de loyer — ' || to_char(date_trunc('month', at), 'MM/YYYY'),
      max(at), 'valide', NULL, jsonb_build_object('month', to_char(date_trunc('month', at), 'YYYY-MM'), 'paid', -sum(amount), 'payments', count(*))
    FROM tx WHERE amount < 0 AND (category = 'logement' OR label LIKE 'Logement%') GROUP BY date_trunc('month', at)
    UNION ALL
    SELECT 'avis:' || d.id, 'impots', 'avis', 'Avis d''impôt — ' || p.period, d.submitted_at,
      CASE WHEN d.status = 'remplacee' THEN 'remplace' WHEN p.status IN ('terminee','acceptee') THEN 'regle' ELSE 'a_payer' END, p.closes_at,
      jsonb_build_object('period', p.period, 'income', d.income, 'taxable', d.taxable, 'tax', d.tax, 'credit', d.credit, 'net', d.net,
        'version', d.version, 'procedure_status', p.status, 'due_at', p.due_at)
    FROM public.tax_declarations d JOIN public.administrative_procedures p ON p.id = d.procedure_id WHERE d.character_id = _cid
    UNION ALL
    SELECT 'caf:' || p.id, 'caf', 'decision', p.title || ' — ' || p.period, COALESCE(p.response_at, p.started_at),
      p.status, NULL, jsonb_build_object('status', p.status, 'result', p.result)
    FROM public.administrative_procedures p WHERE p.character_id = _cid AND p.type_id IN ('housing_aid','student_aid')
    UNION ALL
    SELECT 'echeancier:' || l.id, 'banque', 'echeancier', 'Échéancier de prêt', l.created_at,
      CASE l.status WHEN 'active' THEN 'en_cours' WHEN 'repaid' THEN 'termine' ELSE 'saisi' END, NULL,
      jsonb_build_object('principal', l.principal, 'months', l.months, 'rate', l.rate, 'monthly', l.monthly,
        'installments', (SELECT jsonb_agg(jsonb_build_object('n', i.number, 'due', i.due_at, 'capital', i.principal_part,
            'interest', i.interest_part, 'fee', i.late_fee, 'status', i.status) ORDER BY i.number) FROM public.loan_installments i WHERE i.loan_id = l.id))
    FROM public.loans l WHERE l.character_id = _cid
    UNION ALL
    SELECT 'releve:' || to_char(date_trunc('month', at), 'YYYY-MM'), 'banque', 'releve', 'Relevé de compte — ' || to_char(date_trunc('month', at), 'MM/YYYY'),
      max(at), 'valide', NULL, jsonb_build_object('month', to_char(date_trunc('month', at), 'YYYY-MM'),
        'credits', COALESCE(sum(amount) FILTER (WHERE amount > 0), 0), 'debits', COALESCE(-sum(amount) FILTER (WHERE amount < 0), 0), 'count', count(*))
    FROM tx GROUP BY date_trunc('month', at)
    UNION ALL
    SELECT 'assurance:' || c.id, 'assurance', 'assurance', 'Attestation d''assurance — ' || p.name, c.covered_from,
      CASE c.status WHEN 'active' THEN 'valide' WHEN 'suspended' THEN 'suspendu' ELSE 'resilie' END,
      CASE WHEN c.status = 'active' THEN c.next_due_at END,
      jsonb_build_object('product', p.name, 'covers', to_jsonb(p.covers), 'monthly', c.monthly_price, 'months_paid', c.months_paid, 'next_due_at', c.next_due_at)
    FROM public.insurance_contracts c JOIN public.insurance_products p ON p.id = c.product_id WHERE c.character_id = _cid
    UNION ALL
    SELECT 'sante:' || h.day, 'sante', 'consultation', 'Compte rendu de consultation', h.created_at, 'valide', NULL,
      jsonb_build_object('day', h.day)
    FROM public.health_log h WHERE h.character_id = _cid AND h.kind = 'medecin'
    UNION ALL
    SELECT 'mandat:' || m.id, 'citoyen', 'mandat', 'Attestation de mandat — ' || m.function, m.starts_at,
      CASE WHEN m.status = 'active' THEN 'en_cours' ELSE 'termine' END, m.ends_at,
      jsonb_build_object('function', m.function, 'city', (SELECT name FROM public.cities WHERE id = m.city_id), 'ends_at', m.ends_at)
    FROM public.municipal_mandates m JOIN public.candidacies k ON k.id = m.candidacy_id WHERE k.character_id = _cid
    UNION ALL
    SELECT 'candidature:' || k.id, 'citoyen', 'candidature', 'Récépissé de candidature municipale', k.submitted_at, k.status, NULL,
      jsonb_build_object('name', k.display_name, 'slogan', k.slogan)
    FROM public.candidacies k WHERE k.character_id = _cid AND k.submitted_at IS NOT NULL
    UNION ALL
    SELECT 'form:' || f.id, t.category, 'formulaire', t.title, f.validated_at, 'valide', NULL,
      jsonb_build_object('type_id', f.type_id, 'values', f.data, 'version', f.version, 'doc_number', f.doc_number)
    FROM public.document_forms f JOIN public.document_form_types t ON t.id = f.type_id WHERE f.character_id = _cid AND f.status = 'valide')
  SELECT COALESCE(jsonb_agg(jsonb_build_object('key', key, 'category', category, 'kind', kind, 'title', title, 'at', at,
    'status', status, 'expires_at', expires_at, 'data', data) ORDER BY at DESC NULLS LAST), '[]'::jsonb) FROM docs;
$$;

-- Lecture publique : uniquement ses propres documents.
CREATE FUNCTION public.document_vault() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); BEGIN
  RETURN jsonb_build_object(
    'now', public.game_now(),
    'owner', (SELECT jsonb_build_object('full_name', c.first_name || ' ' || c.last_name, 'age', c.age,
        'city', (SELECT name FROM public.cities WHERE id = c.city_id), 'civitas_id', upper(left(replace(c.id::text, '-', ''), 10)),
        'signature_style', i.signature_style, 'signature_text', i.signature_text)
      FROM public.characters c LEFT JOIN public.character_identity i ON i.character_id = c.id WHERE c.id = cid),
    'documents', public.document_auto(cid),
    'seen', COALESCE((SELECT jsonb_agg(doc_key) FROM public.document_seen WHERE character_id = cid), '[]'::jsonb),
    'deadlines', COALESCE((SELECT jsonb_agg(jsonb_build_object('title', title, 'due_at', due_at, 'status', status) ORDER BY due_at)
        FROM public.administrative_procedures WHERE character_id = cid AND due_at IS NOT NULL AND status IN ('a_faire','en_cours','a_completer')), '[]'::jsonb),
    'prefill', public.document_prefill(cid),
    'form_types', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.sort_order) FROM public.document_form_types t),
    'drafts', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', f.id, 'type_id', f.type_id, 'data', f.data, 'updated_at', f.updated_at, 'version', f.version))
        FROM public.document_forms f WHERE f.character_id = cid AND f.status = 'brouillon'), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('type_id', f.type_id, 'action', h.action, 'version', h.version, 'at', h.at) ORDER BY h.at DESC)
        FROM public.document_form_history h JOIN public.document_forms f ON f.id = h.form_id WHERE f.character_id = cid), '[]'::jsonb));
END $$;

-- Contrôle d'un formulaire côté serveur (interne). Renvoie les valeurs nettoyées ; erreur si invalide.
CREATE FUNCTION public.document_form_clean(_type public.document_form_types, _data jsonb, _final boolean, _prefill jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE f jsonb; k text; v jsonb; out jsonb := '{}'; n numeric; s text; BEGIN
  IF jsonb_typeof(COALESCE(_data, '{}')) <> 'object' THEN RAISE EXCEPTION 'Formulaire invalide'; END IF;
  FOR f IN SELECT * FROM jsonb_array_elements(_type.fields) LOOP
    k := f->>'key';
    IF f ? 'prefill' THEN  -- donnée connue du serveur : jamais ressaisie, toujours celle du serveur
      out := out || jsonb_build_object(k, _prefill->(f->>'prefill')); CONTINUE;
    END IF;
    v := _data->k;
    IF v IS NULL OR v = 'null'::jsonb OR v = '""'::jsonb THEN
      IF _final AND (f->>'required')::boolean IS TRUE THEN RAISE EXCEPTION 'Champ obligatoire : %', f->>'label'; END IF;
      CONTINUE;
    END IF;
    CASE f->>'type'
      WHEN 'text' THEN
        s := btrim(v #>> '{}');
        IF char_length(s) > COALESCE((f->>'max')::int, 200) THEN RAISE EXCEPTION 'Texte trop long : %', f->>'label'; END IF;
        out := out || jsonb_build_object(k, s);
      WHEN 'number' THEN
        BEGIN n := (v #>> '{}')::numeric; EXCEPTION WHEN others THEN RAISE EXCEPTION 'Nombre attendu : %', f->>'label'; END;
        IF (f ? 'min' AND n < (f->>'min')::numeric) OR (f ? 'max' AND n > (f->>'max')::numeric) THEN
          RAISE EXCEPTION 'Valeur hors limites : %', f->>'label'; END IF;
        out := out || jsonb_build_object(k, n);
      WHEN 'date' THEN
        s := v #>> '{}';
        IF s !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Date invalide : %', f->>'label'; END IF;
        BEGIN PERFORM s::date; EXCEPTION WHEN others THEN RAISE EXCEPTION 'Date invalide : %', f->>'label'; END;
        out := out || jsonb_build_object(k, s);
      WHEN 'checkbox' THEN
        IF jsonb_typeof(v) <> 'boolean' THEN RAISE EXCEPTION 'Case invalide : %', f->>'label'; END IF;
        IF _final AND (f->>'required')::boolean IS TRUE AND v = 'false'::jsonb THEN RAISE EXCEPTION 'À cocher : %', f->>'label'; END IF;
        out := out || jsonb_build_object(k, v);
      ELSE -- select / radio : liste fermée
        s := v #>> '{}';
        IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(f->'options') o WHERE o->>0 = s) THEN
          RAISE EXCEPTION 'Choix non autorisé : %', f->>'label'; END IF;
        out := out || jsonb_build_object(k, s);
    END CASE;
  END LOOP;
  RETURN out;
END $$;

-- Actions : sauvegarder, valider, corriger, supprimer un brouillon, marquer comme lu.
CREATE FUNCTION public.document_action(_command text, _input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); t public.document_form_types; f public.document_forms; clean jsonb; BEGIN
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  IF _command = 'seen' THEN
    IF jsonb_typeof(_input->'keys') <> 'array' OR jsonb_array_length(_input->'keys') > 300 THEN RAISE EXCEPTION 'Liste invalide'; END IF;
    INSERT INTO public.document_seen (character_id, doc_key)
      SELECT cid, k FROM jsonb_array_elements_text(_input->'keys') k WHERE char_length(k) <= 120 ON CONFLICT DO NOTHING;
    RETURN '{}';
  END IF;
  IF _command = 'correct' THEN
    SELECT * INTO f FROM public.document_forms WHERE id = (_input->>'form_id')::uuid AND character_id = cid AND status = 'valide';
    IF NOT FOUND THEN RAISE EXCEPTION 'Document introuvable'; END IF;
    IF EXISTS (SELECT 1 FROM public.document_forms WHERE character_id = cid AND type_id = f.type_id AND status = 'brouillon') THEN
      RAISE EXCEPTION 'Un brouillon de ce formulaire existe déjà'; END IF;
    INSERT INTO public.document_forms (character_id, type_id, data, version, doc_number)
      VALUES (cid, f.type_id, f.data, f.version + 1, f.doc_number) RETURNING * INTO f;
    INSERT INTO public.document_form_history (form_id, version, action, data) VALUES (f.id, f.version, 'correction', f.data);
    RETURN jsonb_build_object('id', f.id);
  END IF;
  SELECT * INTO t FROM public.document_form_types WHERE id = _input->>'type_id';
  IF NOT FOUND THEN RAISE EXCEPTION 'Formulaire inconnu'; END IF;
  SELECT * INTO f FROM public.document_forms WHERE character_id = cid AND type_id = t.id AND status = 'brouillon' FOR UPDATE;
  IF _command = 'delete_draft' THEN
    IF FOUND THEN
      DELETE FROM public.document_form_history WHERE form_id = f.id; DELETE FROM public.document_forms WHERE id = f.id;
    END IF;
    RETURN '{}';
  END IF;
  IF _command NOT IN ('save','submit') THEN RAISE EXCEPTION 'Action inconnue'; END IF;
  clean := public.document_form_clean(t, _input->'data', _command = 'submit', public.document_prefill(cid));
  IF f.id IS NULL THEN
    INSERT INTO public.document_forms (character_id, type_id, data, doc_number)
      VALUES (cid, t.id, clean, 'CIV-F-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))) RETURNING * INTO f;
  ELSE
    UPDATE public.document_forms SET data = clean, updated_at = public.game_now() WHERE id = f.id RETURNING * INTO f;
  END IF;
  IF _command = 'submit' THEN
    UPDATE public.document_forms SET status = 'valide', validated_at = public.game_now() WHERE id = f.id;
    INSERT INTO public.document_form_history (form_id, version, action, data) VALUES (f.id, f.version, 'validation', clean);
  ELSIF NOT EXISTS (SELECT 1 FROM public.document_form_history WHERE form_id = f.id AND action = 'sauvegarde'
                    AND at > public.game_now() - interval '10 minutes') THEN
    INSERT INTO public.document_form_history (form_id, version, action, data) VALUES (f.id, f.version, 'sauvegarde', clean);
  END IF;
  RETURN jsonb_build_object('id', f.id, 'data', clean);
END $$;

REVOKE ALL ON FUNCTION public.document_prefill(uuid), public.document_auto(uuid),
  public.document_form_clean(public.document_form_types, jsonb, boolean, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.document_vault(), public.document_action(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.document_vault(), public.document_action(text, jsonb) TO authenticated;

-- Photo autorisée d'un candidat joueur (listes d'élections) : mêmes règles que public_photo (réglage « photo visible », blocages).
-- L'identifiant du personnage du candidat n'est jamais renvoyé ; un candidat fictif n'a pas de photo.
CREATE FUNCTION public.candidacy_photo(_candidacy uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := public.social_actor(); cid uuid; BEGIN
  SELECT character_id INTO cid FROM public.candidacies WHERE id = _candidacy AND (status IN ('validated','completed') OR character_id = me);
  IF cid IS NULL THEN RETURN NULL; END IF;
  RETURN public.public_photo(cid);
END $$;
REVOKE ALL ON FUNCTION public.candidacy_photo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.candidacy_photo(uuid) TO authenticated;

COMMIT;
