-- CIVITAS – SANTÉ ET BIEN-ÊTRE
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0062_health_wellbeing.sql
-- Santé (0–100) et moral (0–100) par personnage, réglés jour par jour à la lecture (au plus 14 jours rattrapés).
-- Maladies tirées de façon déterministe par personnage et par jour (hashtext), jamais deux fois.
-- Sport (coûte de l'énergie), détente (une fois par jour), médecin (payant, via le système d'argent officiel, guérit).
BEGIN;

CREATE TABLE public.health_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  illness_chance_pct integer NOT NULL DEFAULT 5,
  illness_days integer NOT NULL DEFAULT 3,
  illness_loss integer NOT NULL DEFAULT 6,      -- santé perdue par jour de maladie
  daily_recovery integer NOT NULL DEFAULT 2,    -- santé regagnée par jour sans maladie
  morale_target integer NOT NULL DEFAULT 60,    -- le moral revient doucement vers cette valeur
  doctor_cost integer NOT NULL DEFAULT 25,
  doctor_health integer NOT NULL DEFAULT 10,
  sport_energy integer NOT NULL DEFAULT 10,
  sport_health integer NOT NULL DEFAULT 3,
  sport_morale integer NOT NULL DEFAULT 3,
  relax_morale integer NOT NULL DEFAULT 5,
  illnesses text[] NOT NULL DEFAULT ARRAY['Rhume','Grippe','Angine','Gastro-entérite','Mal de dos','Migraine']
);
INSERT INTO public.health_settings (id) VALUES (1);

CREATE TABLE public.health_profiles (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  health integer NOT NULL DEFAULT 80 CHECK (health BETWEEN 0 AND 100),
  morale integer NOT NULL DEFAULT 60 CHECK (morale BETWEEN 0 AND 100),
  illness text,
  ill_until date,
  settled_day date NOT NULL
);

-- Une action de chaque sorte par personnage et par jour de jeu
CREATE TABLE public.health_log (
  character_id uuid NOT NULL REFERENCES public.characters(id),
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('sport','detente','medecin')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (character_id, day, kind)
);

GRANT SELECT ON public.health_settings, public.health_profiles, public.health_log TO authenticated;
GRANT ALL ON public.health_settings, public.health_profiles, public.health_log TO service_role;
ALTER TABLE public.health_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY health_settings_read ON public.health_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY health_profiles_own ON public.health_profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = health_profiles.character_id AND c.user_id = auth.uid()));
CREATE POLICY health_log_own ON public.health_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = health_log.character_id AND c.user_id = auth.uid()));

CREATE FUNCTION public.health_settle(_cid uuid) RETURNS public.health_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.health_settings; p public.health_profiles; today date := public.game_now()::date; d date; BEGIN
  SELECT * INTO s FROM public.health_settings WHERE id = 1;
  INSERT INTO public.health_profiles (character_id, settled_day) VALUES (_cid, today) ON CONFLICT DO NOTHING;
  SELECT * INTO p FROM public.health_profiles WHERE character_id = _cid FOR UPDATE;
  d := GREATEST(p.settled_day + 1, today - 13);
  WHILE d <= today LOOP
    IF p.illness IS NOT NULL AND d <= p.ill_until THEN
      p.health := GREATEST(0, p.health - s.illness_loss);
      p.morale := GREATEST(0, p.morale - 1);
    ELSE
      p.illness := NULL; p.ill_until := NULL;
      p.health := LEAST(100, p.health + s.daily_recovery);
      IF abs(hashtext(_cid::text || ':sante:' || d)) % 100 < s.illness_chance_pct THEN
        p.illness := s.illnesses[1 + abs(hashtext(d || ':mal:' || _cid::text)) % array_length(s.illnesses, 1)];
        p.ill_until := d + s.illness_days - 1;
      END IF;
      p.morale := p.morale + sign(s.morale_target - p.morale)::integer;
    END IF;
    d := d + 1;
  END LOOP;
  UPDATE public.health_profiles SET health = p.health, morale = p.morale, illness = p.illness, ill_until = p.ill_until,
    settled_day = GREATEST(p.settled_day, today) WHERE character_id = _cid RETURNING * INTO p;
  RETURN p;
END $$;

CREATE FUNCTION public.health_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); p public.health_profiles; s public.health_settings; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  p := public.health_settle(cid);
  SELECT * INTO s FROM public.health_settings WHERE id = 1;
  RETURN jsonb_build_object('now', public.game_now(), 'health', p.health, 'morale', p.morale, 'illness', p.illness, 'ill_until', p.ill_until,
    'energy', (SELECT energy FROM public.characters WHERE id = cid),
    'balance', (SELECT balance FROM public.accounts WHERE character_id = cid ORDER BY created_at LIMIT 1),
    'settings', to_jsonb(s) - 'id' - 'illnesses',
    'done_today', COALESCE((SELECT jsonb_agg(kind) FROM public.health_log WHERE character_id = cid AND day = public.game_now()::date), '[]'::jsonb));
END $$;

CREATE FUNCTION public.health_action(_command text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; p public.health_profiles; s public.health_settings; today date := public.game_now()::date; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO s FROM public.health_settings WHERE id = 1;
  p := public.health_settle(cid);
  IF _command NOT IN ('sport','detente','medecin') THEN RAISE EXCEPTION 'Commande inconnue.'; END IF;
  IF EXISTS (SELECT 1 FROM public.health_log WHERE character_id = cid AND day = today AND kind = _command) THEN
    RAISE EXCEPTION 'Déjà fait aujourd''hui.'; END IF;

  IF _command = 'sport' THEN
    IF p.illness IS NOT NULL THEN RAISE EXCEPTION 'Pas de sport en étant malade : reposez-vous ou voyez un médecin.'; END IF;
    IF c.energy < s.sport_energy THEN RAISE EXCEPTION 'Pas assez d''énergie (% nécessaires).', s.sport_energy; END IF;
    UPDATE public.characters SET energy = energy - s.sport_energy WHERE id = cid;
    UPDATE public.health_profiles SET health = LEAST(100, health + s.sport_health), morale = LEAST(100, morale + s.sport_morale) WHERE character_id = cid;
  ELSIF _command = 'detente' THEN
    UPDATE public.health_profiles SET morale = LEAST(100, morale + s.relax_morale) WHERE character_id = cid;
  ELSE
    IF p.illness IS NULL AND p.health >= 70 THEN RAISE EXCEPTION 'Vous êtes en bonne santé, pas besoin de médecin.'; END IF;
    IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid ORDER BY created_at LIMIT 1), 0) < s.doctor_cost THEN
      RAISE EXCEPTION 'Solde insuffisant (% crédits).', s.doctor_cost; END IF;
    PERFORM public.economy_cash(cid, 'health-doctor:' || cid || ':' || today, -s.doctor_cost, 'Consultation médicale', 'sante', '{}'::jsonb);
    UPDATE public.health_profiles SET illness = NULL, ill_until = NULL, health = LEAST(100, health + s.doctor_health) WHERE character_id = cid;
  END IF;
  INSERT INTO public.health_log (character_id, day, kind) VALUES (cid, today, _command);
  RETURN public.health_state();
END $$;

REVOKE ALL ON FUNCTION public.health_settle(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.health_state(), public.health_action(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.health_state(), public.health_action(text) TO authenticated;

COMMIT;
