-- CIVITAS – JUSTICE ET TRIBUNAUX
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0063_justice_courts.sql
-- Plainte d'un joueur contre un autre (frais de dépôt), défense écrite, jugement par un juge fictif à l'échéance (réglé à la lecture).
-- Le verdict est tiré de façon déterministe (hashtext du dossier), plus favorable à l'accusé s'il s'est défendu.
-- Coupable : réputation en baisse (une seule fois, registre unique) et amende versée au plaignant
--   (débitée chez le condamné à sa lecture si son solde suffit, encaissée par le plaignant à sa lecture). Jamais de solde négatif.
-- Les blocages entre joueurs empêchent le dépôt de plainte. Seules les deux parties voient le dossier.
BEGIN;

CREATE TABLE public.justice_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  min_age integer NOT NULL DEFAULT 16,
  filing_fee integer NOT NULL DEFAULT 10,
  defense_hours integer NOT NULL DEFAULT 48,
  after_defense_hours integer NOT NULL DEFAULT 6,
  max_open integer NOT NULL DEFAULT 3,
  guilty_pct_no_defense integer NOT NULL DEFAULT 80,
  guilty_pct_defense integer NOT NULL DEFAULT 45,
  fine integer NOT NULL DEFAULT 50,
  reputation_loss integer NOT NULL DEFAULT 5,
  judges text[] NOT NULL DEFAULT ARRAY['Juge Hélène Marchal','Juge Karim Bensaïd','Juge Sophie Lefort','Juge Paul Garnier','Juge Inès Moreau']
);
INSERT INTO public.justice_settings (id) VALUES (1);

CREATE TABLE public.justice_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  plaintiff_id uuid NOT NULL REFERENCES public.characters(id),
  defendant_id uuid NOT NULL REFERENCES public.characters(id),
  category text NOT NULL CHECK (category IN ('diffamation','harcelement','escroquerie','non_paiement','autre')),
  facts text NOT NULL,
  defense text,
  defense_at timestamptz,
  status text NOT NULL DEFAULT 'instruction' CHECK (status IN ('instruction','jugee')),
  verdict text CHECK (verdict IN ('coupable','relaxe')),
  judge text NOT NULL,
  fine integer NOT NULL DEFAULT 0,
  fine_paid_at timestamptz,
  filed_at timestamptz NOT NULL DEFAULT public.game_now(),
  judged_at timestamptz,
  CHECK (plaintiff_id <> defendant_id)
);
CREATE INDEX justice_cases_p ON public.justice_cases (plaintiff_id);
CREATE INDEX justice_cases_d ON public.justice_cases (defendant_id);

-- Effet sur la réputation : une seule fois par dossier
CREATE TABLE public.justice_effects (
  case_id uuid PRIMARY KEY REFERENCES public.justice_cases(id),
  reputation integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);

-- Amendes : débitées chez le condamné, encaissées une seule fois par le plaignant
CREATE TABLE public.justice_payments (
  case_id uuid PRIMARY KEY REFERENCES public.justice_cases(id),
  from_id uuid NOT NULL REFERENCES public.characters(id),
  to_id uuid NOT NULL REFERENCES public.characters(id),
  amount integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  collected_at timestamptz
);

GRANT SELECT ON public.justice_settings, public.justice_cases, public.justice_effects, public.justice_payments TO authenticated;
GRANT ALL ON public.justice_settings, public.justice_cases, public.justice_effects, public.justice_payments TO service_role;
ALTER TABLE public.justice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justice_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justice_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY justice_settings_read ON public.justice_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY justice_cases_parties ON public.justice_cases FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (justice_cases.plaintiff_id, justice_cases.defendant_id) AND c.user_id = auth.uid()));
CREATE POLICY justice_effects_parties ON public.justice_effects FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.justice_cases j JOIN public.characters c ON c.id IN (j.plaintiff_id, j.defendant_id)
          WHERE j.id = justice_effects.case_id AND c.user_id = auth.uid()));
CREATE POLICY justice_payments_parties ON public.justice_payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (justice_payments.from_id, justice_payments.to_id) AND c.user_id = auth.uid()));

CREATE FUNCTION public.justice_notify(_cid uuid, _title text, _body text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body) SELECT user_id, _title, _body FROM public.characters WHERE id = _cid
$$;

CREATE FUNCTION public.justice_settle(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.justice_settings; j public.justice_cases; pay public.justice_payments; nowt timestamptz := public.game_now(); guilty boolean; BEGIN
  SELECT * INTO s FROM public.justice_settings WHERE id = 1;
  -- 1. Jugements arrivés à échéance (dossiers où je suis partie)
  FOR j IN SELECT * FROM public.justice_cases WHERE status = 'instruction' AND _cid IN (plaintiff_id, defendant_id)
             AND (filed_at + make_interval(hours => s.defense_hours) <= nowt
                  OR (defense_at IS NOT NULL AND defense_at + make_interval(hours => s.after_defense_hours) <= nowt))
           FOR UPDATE SKIP LOCKED LOOP
    guilty := abs(hashtext(j.id::text || ':verdict')) % 100 < CASE WHEN j.defense IS NULL THEN s.guilty_pct_no_defense ELSE s.guilty_pct_defense END;
    UPDATE public.justice_cases SET status = 'jugee', verdict = CASE WHEN guilty THEN 'coupable' ELSE 'relaxe' END,
      fine = CASE WHEN guilty THEN s.fine ELSE 0 END, judged_at = nowt WHERE id = j.id;
    IF guilty THEN
      INSERT INTO public.justice_effects (case_id, reputation) VALUES (j.id, -s.reputation_loss) ON CONFLICT DO NOTHING;
      IF FOUND THEN
        INSERT INTO public.social_stats (character_id, reputation, influence) VALUES (j.defendant_id, 0, 0) ON CONFLICT (character_id) DO NOTHING;
        UPDATE public.social_stats SET reputation = GREATEST(0, reputation - s.reputation_loss) WHERE character_id = j.defendant_id;
      END IF;
    END IF;
    PERFORM public.justice_notify(j.plaintiff_id, 'Jugement rendu', CASE WHEN guilty THEN 'L''accusé a été reconnu coupable.' ELSE 'L''accusé a été relaxé.' END);
    PERFORM public.justice_notify(j.defendant_id, 'Jugement rendu', CASE WHEN guilty THEN 'Vous avez été reconnu coupable : amende de ' || s.fine || ' crédits.' ELSE 'Vous avez été relaxé.' END);
  END LOOP;
  -- 2. Mes amendes à payer (seulement si mon solde suffit ; sinon on réessaiera)
  FOR j IN SELECT * FROM public.justice_cases WHERE defendant_id = _cid AND verdict = 'coupable' AND fine_paid_at IS NULL AND fine > 0 FOR UPDATE LOOP
    EXIT WHEN COALESCE((SELECT balance FROM public.accounts WHERE character_id = _cid ORDER BY created_at LIMIT 1), 0) < j.fine;
    PERFORM public.economy_cash(_cid, 'justice-fine:' || j.id, -j.fine, 'Amende (tribunal)', 'justice', jsonb_build_object('case', j.id));
    INSERT INTO public.justice_payments (case_id, from_id, to_id, amount) VALUES (j.id, _cid, j.plaintiff_id, j.fine) ON CONFLICT DO NOTHING;
    UPDATE public.justice_cases SET fine_paid_at = nowt WHERE id = j.id;
  END LOOP;
  -- 3. Encaisser les amendes qui me sont dues
  FOR pay IN SELECT * FROM public.justice_payments WHERE to_id = _cid AND collected_at IS NULL FOR UPDATE SKIP LOCKED LOOP
    PERFORM public.economy_cash(_cid, 'justice-in:' || pay.case_id, pay.amount, 'Dommages et intérêts (tribunal)', 'justice', jsonb_build_object('case', pay.case_id));
    UPDATE public.justice_payments SET collected_at = nowt WHERE case_id = pay.case_id;
  END LOOP;
END $$;

CREATE FUNCTION public.justice_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.justice_settings; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM public.justice_settle(cid);
  SELECT * INTO s FROM public.justice_settings WHERE id = 1;
  RETURN jsonb_build_object('me', cid, 'now', public.game_now(), 'settings', to_jsonb(s) - 'id' - 'judges',
    'cases', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', j.id, 'role', CASE WHEN j.plaintiff_id = cid THEN 'plaignant' ELSE 'accuse' END,
        'other', public.network_card(CASE WHEN j.plaintiff_id = cid THEN j.defendant_id ELSE j.plaintiff_id END),
        'category', j.category, 'facts', j.facts, 'defense', j.defense, 'status', j.status, 'verdict', j.verdict, 'judge', j.judge,
        'fine', j.fine, 'fine_paid', j.fine_paid_at IS NOT NULL, 'filed_at', j.filed_at, 'judged_at', j.judged_at,
        'deadline', CASE WHEN j.defense_at IS NOT NULL THEN LEAST(j.filed_at + make_interval(hours => s.defense_hours), j.defense_at + make_interval(hours => s.after_defense_hours))
                         ELSE j.filed_at + make_interval(hours => s.defense_hours) END) ORDER BY j.filed_at DESC)
      FROM public.justice_cases j WHERE cid IN (j.plaintiff_id, j.defendant_id)), '[]'::jsonb));
END $$;

CREATE FUNCTION public.justice_action(_command text, _input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; s public.justice_settings; other uuid; rid uuid; oid uuid; txt text; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO s FROM public.justice_settings WHERE id = 1;
  PERFORM public.justice_settle(cid);
  txt := btrim(coalesce(_input->>'text', ''));

  IF _command = 'file' THEN
    rid := NULLIF(_input->>'request_id', '')::uuid;
    IF rid IS NULL THEN RAISE EXCEPTION 'Demande invalide.'; END IF;
    SELECT id INTO oid FROM public.justice_cases WHERE request_id = rid; IF oid IS NOT NULL THEN RETURN oid; END IF;
    other := NULLIF(_input->>'character_id', '')::uuid;
    PERFORM 1 FROM public.characters WHERE id = other;
    IF NOT FOUND OR other = cid THEN RAISE EXCEPTION 'Joueur introuvable.'; END IF;
    IF public.network_blocked(cid, other) THEN RAISE EXCEPTION 'Interaction impossible avec ce joueur'; END IF;
    IF c.age < s.min_age THEN RAISE EXCEPTION 'Il faut avoir % ans.', s.min_age; END IF;
    IF coalesce(_input->>'category', '') NOT IN ('diffamation','harcelement','escroquerie','non_paiement','autre') THEN RAISE EXCEPTION 'Motif invalide.'; END IF;
    IF char_length(txt) NOT BETWEEN 20 AND 1000 THEN RAISE EXCEPTION 'Décrivez les faits en 20 à 1000 caractères.'; END IF;
    IF NOT public.press_clean(txt) THEN RAISE EXCEPTION 'Texte refusé par le filtre automatique.'; END IF;
    IF (SELECT count(*) FROM public.justice_cases WHERE plaintiff_id = cid AND status = 'instruction') >= s.max_open THEN
      RAISE EXCEPTION 'Maximum % plaintes en cours.', s.max_open; END IF;
    IF EXISTS (SELECT 1 FROM public.justice_cases WHERE plaintiff_id = cid AND defendant_id = other AND status = 'instruction') THEN
      RAISE EXCEPTION 'Une plainte contre ce joueur est déjà en cours.'; END IF;
    IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid ORDER BY created_at LIMIT 1), 0) < s.filing_fee THEN
      RAISE EXCEPTION 'Solde insuffisant pour les frais de dépôt (% crédits).', s.filing_fee; END IF;
    INSERT INTO public.justice_cases (request_id, plaintiff_id, defendant_id, category, facts, judge)
    VALUES (rid, cid, other, _input->>'category', txt, s.judges[1 + abs(hashtext(rid::text)) % array_length(s.judges, 1)]) RETURNING id INTO oid;
    PERFORM public.economy_cash(cid, 'justice-fee:' || oid, -s.filing_fee, 'Frais de dépôt de plainte', 'justice', jsonb_build_object('case', oid));
    PERFORM public.justice_notify(other, 'Plainte déposée contre vous', c.first_name || ' ' || c.last_name || ' a porté plainte. Vous avez ' || s.defense_hours || ' h pour vous défendre.');
    RETURN oid;

  ELSIF _command = 'defend' THEN
    IF char_length(txt) NOT BETWEEN 20 AND 1000 THEN RAISE EXCEPTION 'Votre défense : 20 à 1000 caractères.'; END IF;
    IF NOT public.press_clean(txt) THEN RAISE EXCEPTION 'Texte refusé par le filtre automatique.'; END IF;
    UPDATE public.justice_cases SET defense = txt, defense_at = public.game_now()
      WHERE id = (_input->>'case_id')::uuid AND defendant_id = cid AND status = 'instruction' AND defense IS NULL RETURNING id INTO oid;
    IF oid IS NULL THEN RAISE EXCEPTION 'Dossier introuvable ou défense déjà déposée.'; END IF;
    RETURN oid;
  END IF;
  RAISE EXCEPTION 'Commande inconnue.';
END $$;

REVOKE ALL ON FUNCTION public.justice_notify(uuid, text, text), public.justice_settle(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.justice_state(), public.justice_action(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.justice_state(), public.justice_action(text, jsonb) TO authenticated;

COMMIT;
