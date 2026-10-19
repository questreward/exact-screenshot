-- CIVITAS – SYNDICATS ET GRÈVES
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0064_unions_strikes.sql
-- Deux syndicats fictifs par ville. Un joueur salarié adhère (cotisation unique) à un syndicat de sa ville.
-- Un adhérent lance une revendication ; pendant la collecte, les adhérents la soutiennent.
--   Soutien = base simulée (déterministe) + soutiens des joueurs ; au-dessus du seuil, grève de quelques jours, sinon abandon.
-- Pendant la grève, chaque adhérent peut faire grève une fois par jour : énergie dépensée et retenue d'une journée de salaire
--   (seulement si le solde suffit, jamais de solde négatif). À la fin : victoire si la pression suffit,
--   prime unique versée aux grévistes (registre unique) et réputation en hausse. Tout se règle à la lecture.
-- L'historique d'adhésion est conservé (départ daté, jamais supprimé).
BEGIN;

CREATE TABLE public.union_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  join_fee integer NOT NULL DEFAULT 10,
  collect_days integer NOT NULL DEFAULT 3,
  strike_days integer NOT NULL DEFAULT 3,
  support_threshold integer NOT NULL DEFAULT 60,
  player_support integer NOT NULL DEFAULT 10,
  success_threshold integer NOT NULL DEFAULT 70,
  strike_pressure integer NOT NULL DEFAULT 15,
  strike_energy integer NOT NULL DEFAULT 10,
  workdays_month integer NOT NULL DEFAULT 20,     -- retenue d'une journée = salaire mensuel / ce nombre
  prime_multiplier integer NOT NULL DEFAULT 2,    -- prime = retenues x ce nombre (au moins prime_min)
  prime_min integer NOT NULL DEFAULT 30,
  win_reputation integer NOT NULL DEFAULT 2
);
INSERT INTO public.union_settings (id) VALUES (1);

CREATE TABLE public.unions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL REFERENCES public.cities(id),
  name text NOT NULL,
  motto text NOT NULL,
  UNIQUE (city_id, name)
);
INSERT INTO public.unions (city_id, name, motto)
SELECT c.id, v.prefix || ' ' || c.name, v.motto FROM public.cities c
CROSS JOIN (VALUES ('Union des Travailleurs de', 'Ensemble, on avance.'), ('Syndicat Solidaire de', 'Le dialogue avant tout.')) v(prefix, motto);

CREATE TABLE public.union_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id uuid NOT NULL REFERENCES public.unions(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  joined_at timestamptz NOT NULL DEFAULT public.game_now(),
  left_at timestamptz
);
CREATE UNIQUE INDEX union_members_active ON public.union_members (character_id) WHERE left_at IS NULL;

CREATE TABLE public.union_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  union_id uuid NOT NULL REFERENCES public.unions(id),
  author_id uuid NOT NULL REFERENCES public.characters(id),
  demand text NOT NULL,
  status text NOT NULL DEFAULT 'collecte' CHECK (status IN ('collecte','greve','gagnee','perdue','abandonnee')),
  sim_base integer NOT NULL,                       -- soutien simulé des salariés non joueurs (35 à 74)
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  strike_from timestamptz,
  ends_at timestamptz,
  closed_at timestamptz
);
CREATE UNIQUE INDEX union_campaigns_open ON public.union_campaigns (union_id) WHERE status IN ('collecte','greve');

CREATE TABLE public.union_supports (
  campaign_id uuid NOT NULL REFERENCES public.union_campaigns(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (campaign_id, character_id)
);

CREATE TABLE public.union_strike_days (
  campaign_id uuid NOT NULL REFERENCES public.union_campaigns(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  day date NOT NULL,
  withheld integer NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, character_id, day)
);

CREATE TABLE public.union_rewards (
  campaign_id uuid NOT NULL REFERENCES public.union_campaigns(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (campaign_id, character_id)
);

GRANT SELECT ON public.union_settings, public.unions, public.union_members, public.union_campaigns, public.union_supports,
  public.union_strike_days, public.union_rewards TO authenticated;
GRANT ALL ON public.union_settings, public.unions, public.union_members, public.union_campaigns, public.union_supports,
  public.union_strike_days, public.union_rewards TO service_role;
ALTER TABLE public.union_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.union_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.union_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.union_supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.union_strike_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.union_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY union_settings_read ON public.union_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY unions_read ON public.unions FOR SELECT TO authenticated USING (true);
CREATE POLICY union_campaigns_read ON public.union_campaigns FOR SELECT TO authenticated USING (true);   -- revendications publiques
CREATE POLICY union_members_own ON public.union_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = union_members.character_id AND c.user_id = auth.uid()));
CREATE POLICY union_supports_own ON public.union_supports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = union_supports.character_id AND c.user_id = auth.uid()));
CREATE POLICY union_strike_days_own ON public.union_strike_days FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = union_strike_days.character_id AND c.user_id = auth.uid()));
CREATE POLICY union_rewards_own ON public.union_rewards FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = union_rewards.character_id AND c.user_id = auth.uid()));

CREATE FUNCTION public.union_notify(_cid uuid, _title text, _body text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body) SELECT user_id, _title, _body FROM public.characters WHERE id = _cid
$$;

CREATE FUNCTION public.union_support_total(_campaign uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT LEAST(100, k.sim_base + (SELECT count(*) FROM public.union_supports WHERE campaign_id = k.id)::integer * s.player_support)
  FROM public.union_campaigns k, public.union_settings s WHERE k.id = _campaign AND s.id = 1
$$;

CREATE FUNCTION public.union_pressure_total(_campaign uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT LEAST(100, k.sim_base / 2 + (SELECT count(*) FROM public.union_strike_days WHERE campaign_id = k.id)::integer * s.strike_pressure)
  FROM public.union_campaigns k, public.union_settings s WHERE k.id = _campaign AND s.id = 1
$$;

CREATE FUNCTION public.union_settle(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.union_settings; k public.union_campaigns; nowt timestamptz := public.game_now(); amt integer; m record; BEGIN
  SELECT * INTO s FROM public.union_settings WHERE id = 1;
  -- 1. Revendications des syndicats de ma ville arrivées à échéance
  FOR k IN SELECT uc.* FROM public.union_campaigns uc JOIN public.unions u ON u.id = uc.union_id
           WHERE u.city_id = (SELECT city_id FROM public.characters WHERE id = _cid) AND uc.status IN ('collecte','greve')
           FOR UPDATE OF uc SKIP LOCKED LOOP
    IF k.status = 'collecte' AND k.created_at + make_interval(days => s.collect_days) <= nowt THEN
      IF public.union_support_total(k.id) >= s.support_threshold THEN
        UPDATE public.union_campaigns SET status = 'greve', strike_from = k.created_at + make_interval(days => s.collect_days),
          ends_at = k.created_at + make_interval(days => s.collect_days + s.strike_days) WHERE id = k.id;
        k.status := 'greve'; k.ends_at := k.created_at + make_interval(days => s.collect_days + s.strike_days);
        FOR m IN SELECT character_id FROM public.union_members WHERE union_id = k.union_id AND left_at IS NULL LOOP
          PERFORM public.union_notify(m.character_id, 'Grève lancée', 'La revendication « ' || left(k.demand, 60) || ' » est soutenue : la grève commence.');
        END LOOP;
      ELSE
        UPDATE public.union_campaigns SET status = 'abandonnee', closed_at = nowt WHERE id = k.id;
      END IF;
    END IF;
    IF k.status = 'greve' AND k.ends_at <= nowt THEN
      UPDATE public.union_campaigns SET status = CASE WHEN public.union_pressure_total(k.id) >= s.success_threshold THEN 'gagnee' ELSE 'perdue' END,
        closed_at = nowt WHERE id = k.id;
    END IF;
  END LOOP;
  -- 2. Mes primes de grève gagnée (une seule fois par revendication)
  FOR k IN SELECT uc.* FROM public.union_campaigns uc WHERE uc.status = 'gagnee'
           AND EXISTS (SELECT 1 FROM public.union_strike_days d WHERE d.campaign_id = uc.id AND d.character_id = _cid)
           AND NOT EXISTS (SELECT 1 FROM public.union_rewards r WHERE r.campaign_id = uc.id AND r.character_id = _cid) LOOP
    amt := GREATEST(s.prime_min, s.prime_multiplier * (SELECT COALESCE(sum(withheld), 0) FROM public.union_strike_days WHERE campaign_id = k.id AND character_id = _cid)::integer);
    INSERT INTO public.union_rewards (campaign_id, character_id, amount) VALUES (k.id, _cid, amt) ON CONFLICT DO NOTHING;
    IF FOUND THEN
      PERFORM public.economy_cash(_cid, 'union-prime:' || k.id, amt, 'Prime obtenue après la grève', 'syndicat', jsonb_build_object('campaign', k.id));
      INSERT INTO public.social_stats (character_id, reputation, influence) VALUES (_cid, 0, 0) ON CONFLICT (character_id) DO NOTHING;
      UPDATE public.social_stats SET reputation = reputation + s.win_reputation WHERE character_id = _cid;
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION public.union_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.union_settings; mem public.union_members; city text; BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  PERFORM public.union_settle(cid);
  SELECT * INTO s FROM public.union_settings WHERE id = 1;
  SELECT city_id INTO city FROM public.characters WHERE id = cid;
  SELECT * INTO mem FROM public.union_members WHERE character_id = cid AND left_at IS NULL;
  RETURN jsonb_build_object('me', cid, 'now', public.game_now(), 'settings', to_jsonb(s) - 'id',
    'employed', EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid AND status = 'active'),
    'daily_wage', COALESCE((SELECT j.salary / s.workdays_month FROM public.employments e JOIN public.jobs j ON j.id = e.job_id WHERE e.character_id = cid AND e.status = 'active'), 0),
    'my_union', mem.union_id,
    'unions', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', u.id, 'name', u.name, 'motto', u.motto,
        'members', (SELECT count(*) FROM public.union_members m WHERE m.union_id = u.id AND m.left_at IS NULL),
        'campaigns', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', k.id, 'demand', k.demand, 'status', k.status,
            'author', public.network_card(k.author_id), 'created_at', k.created_at, 'strike_from', k.strike_from, 'ends_at', k.ends_at,
            'collect_ends', k.created_at + make_interval(days => s.collect_days),
            'support', public.union_support_total(k.id), 'pressure', public.union_pressure_total(k.id),
            'supporters', (SELECT count(*) FROM public.union_supports x WHERE x.campaign_id = k.id),
            'strikers', (SELECT count(DISTINCT character_id) FROM public.union_strike_days x WHERE x.campaign_id = k.id),
            'i_support', EXISTS (SELECT 1 FROM public.union_supports x WHERE x.campaign_id = k.id AND x.character_id = cid),
            'struck_today', EXISTS (SELECT 1 FROM public.union_strike_days x WHERE x.campaign_id = k.id AND x.character_id = cid AND x.day = public.game_now()::date),
            'my_days', (SELECT count(*) FROM public.union_strike_days x WHERE x.campaign_id = k.id AND x.character_id = cid),
            'my_prime', (SELECT amount FROM public.union_rewards r WHERE r.campaign_id = k.id AND r.character_id = cid)) ORDER BY k.created_at DESC)
          FROM (SELECT * FROM public.union_campaigns WHERE union_id = u.id ORDER BY created_at DESC LIMIT 5) k), '[]'::jsonb)) ORDER BY u.name)
      FROM public.unions u WHERE u.city_id = city), '[]'::jsonb));
END $$;

CREATE FUNCTION public.union_action(_command text, _input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; s public.union_settings; mem public.union_members; k public.union_campaigns;
        uid uuid; rid uuid; oid uuid; txt text; wage integer; today date := public.game_now()::date; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO s FROM public.union_settings WHERE id = 1;
  PERFORM public.union_settle(cid);
  SELECT * INTO mem FROM public.union_members WHERE character_id = cid AND left_at IS NULL FOR UPDATE;

  IF _command = 'join' THEN
    uid := NULLIF(_input->>'union_id', '')::uuid;
    IF mem.id IS NOT NULL THEN RAISE EXCEPTION 'Vous êtes déjà syndiqué. Quittez d''abord votre syndicat.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.unions WHERE id = uid AND city_id = c.city_id) THEN RAISE EXCEPTION 'Syndicat introuvable dans votre ville.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid AND status = 'active') THEN RAISE EXCEPTION 'Il faut avoir un emploi pour se syndiquer.'; END IF;
    IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid ORDER BY created_at LIMIT 1), 0) < s.join_fee THEN
      RAISE EXCEPTION 'Solde insuffisant pour la cotisation (% crédits).', s.join_fee; END IF;
    INSERT INTO public.union_members (union_id, character_id) VALUES (uid, cid) RETURNING id INTO oid;
    PERFORM public.economy_cash(cid, 'union-fee:' || oid, -s.join_fee, 'Cotisation syndicale', 'syndicat', jsonb_build_object('union', uid));
    RETURN oid;

  ELSIF _command = 'leave' THEN
    IF mem.id IS NULL THEN RAISE EXCEPTION 'Vous n''êtes pas syndiqué.'; END IF;
    UPDATE public.union_members SET left_at = public.game_now() WHERE id = mem.id;
    RETURN mem.id;

  ELSIF _command = 'propose' THEN
    rid := NULLIF(_input->>'request_id', '')::uuid;
    IF rid IS NULL THEN RAISE EXCEPTION 'Demande invalide.'; END IF;
    SELECT id INTO oid FROM public.union_campaigns WHERE request_id = rid; IF oid IS NOT NULL THEN RETURN oid; END IF;
    IF mem.id IS NULL THEN RAISE EXCEPTION 'Réservé aux adhérents.'; END IF;
    txt := btrim(coalesce(_input->>'text', ''));
    IF char_length(txt) NOT BETWEEN 10 AND 300 THEN RAISE EXCEPTION 'Revendication : 10 à 300 caractères.'; END IF;
    IF NOT public.press_clean(txt) THEN RAISE EXCEPTION 'Texte refusé par le filtre automatique.'; END IF;
    IF EXISTS (SELECT 1 FROM public.union_campaigns WHERE union_id = mem.union_id AND status IN ('collecte','greve')) THEN
      RAISE EXCEPTION 'Une revendication est déjà en cours dans ce syndicat.'; END IF;
    INSERT INTO public.union_campaigns (request_id, union_id, author_id, demand, sim_base)
    VALUES (rid, mem.union_id, cid, txt, 35 + abs(hashtext(rid::text)) % 40) RETURNING id INTO oid;
    INSERT INTO public.union_supports (campaign_id, character_id) VALUES (oid, cid);
    RETURN oid;

  ELSIF _command IN ('support','strike') THEN
    SELECT * INTO k FROM public.union_campaigns WHERE id = (_input->>'campaign_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Revendication introuvable.'; END IF;
    IF mem.id IS NULL OR mem.union_id <> k.union_id THEN RAISE EXCEPTION 'Réservé aux adhérents de ce syndicat.'; END IF;
    IF _command = 'support' THEN
      IF k.status <> 'collecte' THEN RAISE EXCEPTION 'La collecte de soutiens est terminée.'; END IF;
      INSERT INTO public.union_supports (campaign_id, character_id) VALUES (k.id, cid) ON CONFLICT DO NOTHING;
      RETURN k.id;
    END IF;
    IF k.status <> 'greve' OR public.game_now() < k.strike_from OR public.game_now() >= k.ends_at THEN RAISE EXCEPTION 'Aucune grève en cours.'; END IF;
    IF EXISTS (SELECT 1 FROM public.union_strike_days WHERE campaign_id = k.id AND character_id = cid AND day = today) THEN
      RAISE EXCEPTION 'Vous faites déjà grève aujourd''hui.'; END IF;
    IF c.energy < s.strike_energy THEN RAISE EXCEPTION 'Pas assez d''énergie (% nécessaires).', s.strike_energy; END IF;
    wage := COALESCE((SELECT j.salary / s.workdays_month FROM public.employments e JOIN public.jobs j ON j.id = e.job_id WHERE e.character_id = cid AND e.status = 'active'), 0);
    IF wage > COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid ORDER BY created_at LIMIT 1), 0) THEN wage := 0; END IF;
    IF wage > 0 THEN
      PERFORM public.economy_cash(cid, 'union-strike:' || k.id || ':' || today, -wage, 'Retenue pour jour de grève', 'syndicat', jsonb_build_object('campaign', k.id));
    END IF;
    INSERT INTO public.union_strike_days (campaign_id, character_id, day, withheld) VALUES (k.id, cid, today, wage);
    UPDATE public.characters SET energy = energy - s.strike_energy WHERE id = cid;
    RETURN k.id;
  END IF;
  RAISE EXCEPTION 'Commande inconnue.';
END $$;

REVOKE ALL ON FUNCTION public.union_notify(uuid, text, text), public.union_support_total(uuid), public.union_pressure_total(uuid),
  public.union_settle(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.union_state(), public.union_action(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.union_state(), public.union_action(text, jsonb) TO authenticated;

COMMIT;
