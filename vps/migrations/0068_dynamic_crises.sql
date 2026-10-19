-- CIVITAS – CRISES DYNAMIQUES
-- Uniquement des ajouts. Tout ou rien. Aucune fonction ni table existante modifiée. Nécessite 0066 (conséquences différées).
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0068_dynamic_crises.sql
-- Des crises (inondation, canicule, fermeture d'usine, cyberattaque…) apparaissent de façon déterministe à la lecture :
--   au plus une par ville et par semaine de jeu (clé unique), plus parfois une crise nationale qui touche toutes les villes.
-- Conséquences immédiates (indicateurs en baisse, actualité), puis le maire choisit une réponse parmi trois options sans « bonne »
--   réponse unique (coût, rapidité, groupes favorables/défavorables). Sans maire joueur ou sans décision dans le délai,
--   le conseil choisit (tirage déterministe, aucune option n'est privilégiée).
-- Les habitants peuvent aider (énergie → réputation, accélère la reprise), protester (pression sur un maire joueur)
--   ou donner à la cagnotte de solidarité (argent personnel conservé séparément, jamais versé au budget municipal).
-- Effets immédiats et différés programmés via le moteur de conséquences (une seule application chacun).
BEGIN;

CREATE TABLE public.crisis_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  weekly_chance_pct integer NOT NULL DEFAULT 20,   -- par ville et par semaine
  national_chance_pct integer NOT NULL DEFAULT 10, -- par période de 4 semaines
  decide_hours integer NOT NULL DEFAULT 48,
  help_energy integer NOT NULL DEFAULT 20,
  help_reputation integer NOT NULL DEFAULT 1,
  helpers_cap integer NOT NULL DEFAULT 6,          -- au-delà, l'aide n'accélère plus la reprise
  protest_threshold integer NOT NULL DEFAULT 3,
  protest_political integer NOT NULL DEFAULT 2
);
INSERT INTO public.crisis_settings (id) VALUES (1);

CREATE TABLE public.crisis_templates (
  id text PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('ville','quartier','national')),
  title text NOT NULL,
  description text NOT NULL,
  duration_days integer NOT NULL,
  main_indicator text NOT NULL,
  side_indicator text NOT NULL,
  impact jsonb NOT NULL              -- {indicateur: baisse}
);
INSERT INTO public.crisis_templates VALUES
  ('inondation','ville','Inondation','De fortes pluies ont inondé plusieurs rues. Des habitants sont évacués.',5,'environment','housing','{"environment":-6,"housing":-4,"services":-3}'),
  ('canicule','ville','Canicule','Une vague de chaleur frappe la ville. Les personnes fragiles sont exposées.',4,'services','environment','{"services":-4,"environment":-3}'),
  ('tempete','ville','Tempête','Des vents violents ont arraché arbres et toitures.',3,'safety','transport','{"safety":-3,"transport":-4}'),
  ('pollution','ville','Pic de pollution','L''air devient irrespirable. La circulation est restreinte.',3,'environment','transport','{"environment":-6}'),
  ('usine','quartier','Fermeture d''une entreprise','Une grande entreprise fictive ferme son site : des centaines d''emplois menacés.',7,'employment','commerce','{"employment":-6,"commerce":-3}'),
  ('logement','ville','Crise du logement','Les loyers flambent et les logements disponibles manquent.',7,'housing','satisfaction','{"housing":-6}'),
  ('panne','quartier','Panne majeure','Une panne géante prive des quartiers d''électricité.',2,'services','commerce','{"services":-5,"commerce":-2}'),
  ('transport','ville','Paralysie des transports','Un incident bloque le réseau de transports en commun.',3,'transport','commerce','{"transport":-6}'),
  ('cyber','ville','Cyberattaque fictive','Les services numériques de la mairie sont paralysés.',4,'services','safety','{"services":-5}'),
  ('accident','quartier','Accident industriel fictif','Un incident dans une usine inquiète les riverains.',4,'safety','environment','{"safety":-4,"environment":-3}'),
  ('eco','national','Crise économique','Le pays entre en récession : les entreprises réduisent leurs embauches.',10,'employment','commerce','{"employment":-4,"commerce":-4}'),
  ('sanitaire','national','Crise sanitaire fictive','Une épidémie saisonnière sature les services de santé.',7,'services','satisfaction','{"services":-4,"satisfaction":-2}'),
  ('penurie','national','Pénurie','Des produits de base manquent dans les magasins.',5,'commerce','satisfaction','{"commerce":-5}');

-- Trois réponses-types, appliquées à l'indicateur principal de la crise. Aucune n'est « la bonne ».
CREATE TABLE public.crisis_options (
  id text PRIMARY KEY CHECK (id IN ('A','B','C')),
  label text NOT NULL,
  description text NOT NULL,
  cost bigint NOT NULL,
  immediate_pct integer NOT NULL,   -- part de la baisse compensée tout de suite
  later_pct integer NOT NULL,       -- part compensée plus tard
  later_days integer NOT NULL,
  satisfaction_now integer NOT NULL,
  satisfaction_later integer NOT NULL,
  side_delta integer NOT NULL,      -- effet sur un autre indicateur (groupes défavorables)
  pros text NOT NULL, cons text NOT NULL, favorable text NOT NULL, unfavorable text NOT NULL
);
INSERT INTO public.crisis_options VALUES
  ('A','Plan d''urgence massif','Mobiliser tous les moyens immédiatement.',300000,70,10,30,2,0,0,
   'Résultats rapides et visibles','Très coûteux pour le budget','Habitants touchés, secours','Contribuables, autres projets reportés'),
  ('B','Réponse progressive','Des mesures mesurées, étalées dans le temps.',80000,0,90,14,-1,2,0,
   'Peu coûteux, durable','Lent : mécontentement au début','Gestionnaires prudents','Habitants touchés qui attendent'),
  ('C','Mesure ciblée','Concentrer l''effort sur les plus touchés, au détriment d''un autre domaine.',150000,100,0,0,0,0,-2,
   'Très efficace pour les plus touchés','Dégrade un autre domaine','Quartiers sinistrés','Habitants des autres quartiers');

CREATE TABLE public.crises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_key text NOT NULL UNIQUE,
  template_id text NOT NULL REFERENCES public.crisis_templates(id),
  city_id text NOT NULL REFERENCES public.cities(id),
  district_id text REFERENCES public.districts(id),
  national boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'urgence' CHECK (status IN ('urgence','gestion','terminee')),
  option_id text REFERENCES public.crisis_options(id),
  decided_by text CHECK (decided_by IN ('maire','conseil')),
  starts_at timestamptz NOT NULL,
  decide_by timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  decided_at timestamptz,
  closed_at timestamptz
);
CREATE INDEX crises_city ON public.crises (city_id, status);

CREATE TABLE public.crisis_actions (
  crisis_id uuid NOT NULL REFERENCES public.crises(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  kind text NOT NULL CHECK (kind IN ('aide','protestation')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (crisis_id, character_id, kind)
);

CREATE TABLE public.crisis_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  crisis_id uuid NOT NULL REFERENCES public.crises(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  amount integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);

GRANT SELECT ON public.crisis_settings, public.crisis_templates, public.crisis_options, public.crises, public.crisis_actions, public.crisis_donations TO authenticated;
GRANT ALL ON public.crisis_settings, public.crisis_templates, public.crisis_options, public.crises, public.crisis_actions, public.crisis_donations TO service_role;
ALTER TABLE public.crisis_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY crisis_settings_read ON public.crisis_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY crisis_templates_read ON public.crisis_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY crisis_options_read ON public.crisis_options FOR SELECT TO authenticated USING (true);
CREATE POLICY crises_read ON public.crises FOR SELECT TO authenticated USING (true);
CREATE POLICY crisis_actions_own ON public.crisis_actions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = crisis_actions.character_id AND c.user_id = auth.uid()));
CREATE POLICY crisis_donations_own ON public.crisis_donations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = crisis_donations.character_id AND c.user_id = auth.uid()));

CREATE FUNCTION public.crisis_notify(_cid uuid, _title text, _body text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body) SELECT user_id, _title, _body FROM public.characters WHERE id = _cid
$$;

-- Ouvrir une crise (interne) : impact immédiat + actualité
CREATE FUNCTION public.crisis_open(_key text, _template text, _city text, _national boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.crisis_templates; s public.crisis_settings; cr uuid; d text; k text; v text; nowt timestamptz := public.game_now(); mayor uuid; BEGIN
  SELECT * INTO t FROM public.crisis_templates WHERE id = _template;
  SELECT * INTO s FROM public.crisis_settings WHERE id = 1;
  IF t.scope = 'quartier' THEN
    SELECT id INTO d FROM public.districts WHERE city_id = _city ORDER BY abs(hashtext(_key || id)) LIMIT 1;
  END IF;
  INSERT INTO public.crises (crisis_key, template_id, city_id, district_id, national, starts_at, decide_by, ends_at)
  VALUES (_key, t.id, _city, d, _national, nowt, nowt + make_interval(hours => s.decide_hours), nowt + make_interval(days => t.duration_days))
  ON CONFLICT (crisis_key) DO NOTHING RETURNING id INTO cr;
  IF cr IS NULL THEN RETURN; END IF;
  FOR k, v IN SELECT key, value FROM jsonb_each_text(t.impact) LOOP
    PERFORM public.schedule_effect('crisis:' || cr || ':impact:' || k, 'crise', cr, _city, nowt, 'indicator', t.title || ' : premières conséquences', k, v::integer);
  END LOOP;
  PERFORM public.civic_news('crisis:' || cr, t.title || CASE WHEN d IS NOT NULL THEN ' — ' || (SELECT name FROM public.districts WHERE id = d) ELSE '' END,
    t.description || ' La mairie doit choisir une réponse sous ' || s.decide_hours || ' h.', _city, NULL, NULL);
  mayor := public.petition_mayor(_city);
  IF mayor IS NOT NULL THEN PERFORM public.crisis_notify(mayor, 'Crise : ' || t.title, 'Votre ville est touchée. Choisissez une réponse dans la page Crises.'); END IF;
END $$;

-- Appliquer la réponse choisie (interne)
CREATE FUNCTION public.crisis_apply_option(_crisis uuid, _option text, _by text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.crises; t public.crisis_templates; o public.crisis_options; main integer; nowt timestamptz := public.game_now(); BEGIN
  SELECT * INTO c FROM public.crises WHERE id = _crisis FOR UPDATE;
  IF c.status <> 'urgence' THEN RETURN; END IF;
  SELECT * INTO t FROM public.crisis_templates WHERE id = c.template_id;
  SELECT * INTO o FROM public.crisis_options WHERE id = _option;
  main := abs(COALESCE((t.impact->>t.main_indicator)::integer, 0));
  UPDATE public.crises SET status = 'gestion', option_id = o.id, decided_by = _by, decided_at = nowt WHERE id = c.id;
  PERFORM public.schedule_effect('crisis:' || c.id || ':cost', 'crise', c.id, c.city_id, nowt, 'treasury', 'Réponse à la crise : ' || o.label, NULL, 0, -o.cost);
  IF o.immediate_pct > 0 THEN
    PERFORM public.schedule_effect('crisis:' || c.id || ':now', 'crise', c.id, c.city_id, nowt, 'indicator', o.label || ' : effets immédiats', t.main_indicator, (main * o.immediate_pct + 99) / 100);
  END IF;
  IF o.later_pct > 0 THEN
    PERFORM public.schedule_effect('crisis:' || c.id || ':later', 'crise', c.id, c.city_id, nowt + make_interval(days => o.later_days), 'indicator', o.label || ' : effets différés', t.main_indicator, (main * o.later_pct + 99) / 100);
  END IF;
  IF o.side_delta <> 0 THEN
    PERFORM public.schedule_effect('crisis:' || c.id || ':side', 'crise', c.id, c.city_id, nowt, 'indicator', o.label || ' : un autre domaine en pâtit', t.side_indicator, o.side_delta);
  END IF;
  IF o.satisfaction_now <> 0 THEN
    PERFORM public.schedule_effect('crisis:' || c.id || ':sat-now', 'crise', c.id, c.city_id, nowt, 'indicator', 'Réaction des habitants à : ' || o.label, 'satisfaction', o.satisfaction_now);
  END IF;
  IF o.satisfaction_later <> 0 THEN
    PERFORM public.schedule_effect('crisis:' || c.id || ':sat-later', 'crise', c.id, c.city_id, nowt + make_interval(days => o.later_days), 'indicator', 'Opinion après coup sur : ' || o.label, 'satisfaction', o.satisfaction_later);
  END IF;
  PERFORM public.civic_news('crisis-decision:' || c.id, t.title || ' : ' || CASE WHEN _by = 'maire' THEN 'le maire' ELSE 'le conseil municipal' END || ' choisit « ' || o.label || ' »',
    o.description || ' Avantage : ' || lower(o.pros) || '. Inconvénient : ' || lower(o.cons) || '.', c.city_id, NULL, NULL);
END $$;

-- Génération, décisions par défaut et fin des crises d'une ville (réglé à la lecture)
CREATE FUNCTION public.crisis_refresh(_city text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.crisis_settings; nowt timestamptz := public.game_now(); wk integer; per integer; tpl text; c public.crises; t public.crisis_templates;
        helpers integer; protests integer; mayor uuid; k text; v text; ct record; BEGIN
  SELECT * INTO s FROM public.crisis_settings WHERE id = 1;
  PERFORM pg_advisory_xact_lock(hashtextextended('crisis:' || _city, 0));
  wk := floor(EXTRACT(epoch FROM nowt) / 604800)::integer; per := wk / 4;
  mayor := public.petition_mayor(_city);
  -- 1. Crise nationale de la période (toutes les villes, même modèle)
  IF abs(hashtext('national:' || per)) % 100 < s.national_chance_pct THEN
    SELECT id INTO tpl FROM public.crisis_templates WHERE scope = 'national' ORDER BY abs(hashtext(per || ':' || id)) LIMIT 1;
    FOR ct IN SELECT id FROM public.cities LOOP
      PERFORM public.crisis_open('national:' || per || ':' || ct.id, tpl, ct.id, true);
    END LOOP;
  END IF;
  -- 2. Crise locale de la semaine (si aucune crise locale en cours)
  IF abs(hashtext('crisis:' || _city || ':' || wk)) % 100 < s.weekly_chance_pct
     AND NOT EXISTS (SELECT 1 FROM public.crises WHERE city_id = _city AND NOT national AND status <> 'terminee') THEN
    SELECT id INTO tpl FROM public.crisis_templates WHERE scope <> 'national' ORDER BY abs(hashtext(_city || ':' || wk || ':' || id)) LIMIT 1;
    PERFORM public.crisis_open('local:' || _city || ':' || wk, tpl, _city, false);
  END IF;
  -- 3. Décision par défaut du conseil, puis fin des crises
  FOR c IN SELECT * FROM public.crises WHERE city_id = _city AND status <> 'terminee' ORDER BY starts_at FOR UPDATE LOOP
    IF c.status = 'urgence' AND (mayor IS NULL OR c.decide_by <= nowt) THEN
      PERFORM public.crisis_apply_option(c.id, (ARRAY['A','B','C'])[1 + abs(hashtext(c.id::text || ':conseil')) % 3], 'conseil');
      c.status := 'gestion';
    END IF;
    IF c.ends_at <= nowt THEN
      SELECT * INTO t FROM public.crisis_templates WHERE id = c.template_id;
      helpers := (SELECT count(*) FROM public.crisis_actions WHERE crisis_id = c.id AND kind = 'aide');
      protests := (SELECT count(*) FROM public.crisis_actions WHERE crisis_id = c.id AND kind = 'protestation');
      UPDATE public.crises SET status = 'terminee', closed_at = c.ends_at WHERE id = c.id;
      -- Reprise naturelle : la moitié de la baisse, plus l'effet de l'entraide
      FOR k, v IN SELECT key, value FROM jsonb_each_text(t.impact) LOOP
        PERFORM public.schedule_effect('crisis:' || c.id || ':recovery:' || k, 'crise', c.id, _city, nowt, 'indicator',
          'Fin de la crise « ' || t.title || ' » : reprise' || CASE WHEN helpers > 0 THEN ' (accélérée par ' || helpers || ' bénévole(s))' ELSE '' END,
          k, (abs(v::integer) + 1) / 2 + LEAST(helpers, s.helpers_cap) / 3);
      END LOOP;
      IF protests >= s.protest_threshold THEN
        PERFORM public.schedule_effect('crisis:' || c.id || ':protest-sat', 'crise', c.id, _city, nowt, 'indicator', 'Colère des habitants après la crise', 'satisfaction', -1);
        IF mayor IS NOT NULL THEN
          PERFORM public.schedule_effect('crisis:' || c.id || ':protest-mayor', 'crise', c.id, _city, nowt, 'political', 'Gestion de crise contestée', NULL, -s.protest_political, 0, mayor);
        END IF;
      END IF;
      PERFORM public.schedule_effect('crisis:' || c.id || ':news-end', 'crise', c.id, _city, nowt, 'news', 'Fin de la crise : ' || t.title, NULL, 0, 0, NULL,
        helpers || ' habitant(s) ont aidé, ' || protests || ' ont protesté. La ville se remet progressivement.');
    END IF;
  END LOOP;
  PERFORM public.apply_due_effects(_city);
END $$;

CREATE FUNCTION public.crisis_state(_city text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); ch public.characters; city text; s public.crisis_settings; BEGIN
  SELECT * INTO ch FROM public.characters WHERE id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  city := COALESCE(_city, ch.city_id);
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE id = city) THEN RAISE EXCEPTION 'Ville inconnue.'; END IF;
  PERFORM public.crisis_refresh(city);
  SELECT * INTO s FROM public.crisis_settings WHERE id = 1;
  RETURN jsonb_build_object('me', cid, 'now', public.game_now(), 'city', city, 'my_city', ch.city_id, 'energy', ch.energy,
    'is_mayor', public.petition_mayor(city) = cid, 'settings', to_jsonb(s) - 'id',
    'cities', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY name) FROM public.cities),
    'options', (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.crisis_options o),
    'crises', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'title', t.title, 'description', t.description, 'national', c.national,
        'district', (SELECT name FROM public.districts WHERE id = c.district_id), 'status', c.status, 'option_id', c.option_id, 'decided_by', c.decided_by,
        'starts_at', c.starts_at, 'decide_by', c.decide_by, 'ends_at', c.ends_at, 'impact', t.impact, 'main_indicator', t.main_indicator, 'side_indicator', t.side_indicator,
        'helpers', (SELECT count(*) FROM public.crisis_actions a WHERE a.crisis_id = c.id AND a.kind = 'aide'),
        'protests', (SELECT count(*) FROM public.crisis_actions a WHERE a.crisis_id = c.id AND a.kind = 'protestation'),
        'donations', (SELECT COALESCE(sum(amount), 0) FROM public.crisis_donations x WHERE x.crisis_id = c.id),
        'my_actions', COALESCE((SELECT jsonb_agg(kind) FROM public.crisis_actions a WHERE a.crisis_id = c.id AND a.character_id = cid), '[]'::jsonb),
        'effects', (SELECT jsonb_agg(jsonb_build_object('label', e.label, 'kind', e.kind, 'indicator', e.indicator, 'delta', e.delta, 'amount', e.amount,
            'value', e.applied_value, 'due_at', e.due_at, 'applied', e.applied_at IS NOT NULL) ORDER BY e.due_at, e.effect_key)
            FROM public.scheduled_effects e WHERE e.source_kind = 'crise' AND e.source_id = c.id AND e.kind IN ('indicator','treasury'))
      ) ORDER BY (c.status = 'terminee'), c.starts_at DESC)
      FROM (SELECT * FROM public.crises WHERE city_id = city ORDER BY (status = 'terminee'), starts_at DESC LIMIT 12) c
      JOIN public.crisis_templates t ON t.id = c.template_id), '[]'::jsonb));
END $$;

CREATE FUNCTION public.crisis_action(_command text, _input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); ch public.characters; s public.crisis_settings; c public.crises; amt integer; rid uuid; BEGIN
  SELECT * INTO ch FROM public.characters WHERE id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO s FROM public.crisis_settings WHERE id = 1;
  SELECT * INTO c FROM public.crises WHERE id = (_input->>'crisis_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Crise introuvable.'; END IF;
  PERFORM public.crisis_refresh(c.city_id);
  SELECT * INTO c FROM public.crises WHERE id = c.id FOR UPDATE;
  IF c.status = 'terminee' THEN RAISE EXCEPTION 'Cette crise est terminée.'; END IF;

  IF _command = 'decide' THEN
    IF public.petition_mayor(c.city_id) IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Réservé au maire de la ville.'; END IF;
    IF c.status <> 'urgence' THEN RAISE EXCEPTION 'Une réponse a déjà été choisie.'; END IF;
    IF coalesce(_input->>'option_id', '') NOT IN ('A','B','C') THEN RAISE EXCEPTION 'Option invalide.'; END IF;
    PERFORM public.crisis_apply_option(c.id, _input->>'option_id', 'maire');
    PERFORM public.apply_due_effects(c.city_id);
    RETURN c.id;
  END IF;
  IF ch.city_id <> c.city_id THEN RAISE EXCEPTION 'Réservé aux habitants de la ville touchée.'; END IF;

  IF _command = 'help' THEN
    IF EXISTS (SELECT 1 FROM public.crisis_actions WHERE crisis_id = c.id AND character_id = cid AND kind = 'aide') THEN RAISE EXCEPTION 'Vous avez déjà aidé.'; END IF;
    IF ch.energy < s.help_energy THEN RAISE EXCEPTION 'Pas assez d''énergie (% nécessaires).', s.help_energy; END IF;
    INSERT INTO public.crisis_actions (crisis_id, character_id, kind) VALUES (c.id, cid, 'aide');
    UPDATE public.characters SET energy = energy - s.help_energy WHERE id = cid;
    PERFORM public.schedule_effect('crisis:' || c.id || ':help:' || cid, 'crise', c.id, c.city_id, public.game_now(), 'reputation', 'Aide bénévole pendant une crise', NULL, s.help_reputation, 0, cid);
    PERFORM public.apply_due_effects(c.city_id);
    RETURN c.id;
  ELSIF _command = 'protest' THEN
    INSERT INTO public.crisis_actions (crisis_id, character_id, kind) VALUES (c.id, cid, 'protestation') ON CONFLICT DO NOTHING;
    IF NOT FOUND THEN RAISE EXCEPTION 'Vous avez déjà protesté.'; END IF;
    RETURN c.id;
  ELSIF _command = 'donate' THEN
    rid := NULLIF(_input->>'request_id', '')::uuid;
    IF rid IS NULL THEN RAISE EXCEPTION 'Demande invalide.'; END IF;
    IF EXISTS (SELECT 1 FROM public.crisis_donations WHERE request_id = rid) THEN RETURN c.id; END IF;
    amt := (_input->>'amount')::integer;
    IF amt IS NULL OR amt NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Don entre 5 et 500 crédits.'; END IF;
    IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid ORDER BY created_at LIMIT 1), 0) < amt THEN RAISE EXCEPTION 'Solde insuffisant.'; END IF;
    INSERT INTO public.crisis_donations (request_id, crisis_id, character_id, amount) VALUES (rid, c.id, cid, amt);
    PERFORM public.economy_cash(cid, 'crisis-don:' || rid, -amt, 'Don de solidarité (crise)', 'dons', jsonb_build_object('crisis', c.id));
    RETURN c.id;
  END IF;
  RAISE EXCEPTION 'Commande inconnue.';
END $$;

REVOKE ALL ON FUNCTION public.crisis_notify(uuid, text, text), public.crisis_open(text, text, text, boolean),
  public.crisis_apply_option(uuid, text, text), public.crisis_refresh(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crisis_state(text), public.crisis_action(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crisis_state(text), public.crisis_action(text, jsonb) TO authenticated;

COMMIT;
