-- 0100 — Vieillissement des personnages : 1 an de jeu par mois réel.
-- L'âge reste stocké dans characters.age (lu partout) ; il n'avance que par aging_settle,
-- calculé depuis un point de départ fixé (âge de base + mois réels écoulés), idempotent.
-- Aucune action existante n'est remplacée. Installation sur le VPS en une transaction.
BEGIN;

CREATE TABLE public.aging_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  real_interval interval NOT NULL DEFAULT interval '1 month',
  max_age integer NOT NULL DEFAULT 99 CHECK (max_age BETWEEN 30 AND 120)
);
INSERT INTO public.aging_settings DEFAULT VALUES;
GRANT SELECT ON public.aging_settings TO authenticated;
GRANT ALL ON public.aging_settings TO service_role;
ALTER TABLE public.aging_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aging settings read" ON public.aging_settings FOR SELECT TO authenticated USING (true);

CREATE TABLE public.character_aging (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  base_age integer NOT NULL,
  anchor_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.character_aging TO authenticated;
GRANT ALL ON public.character_aging TO service_role;
ALTER TABLE public.character_aging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own aging read" ON public.character_aging FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

CREATE TABLE public.birthday_log (
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  age integer NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id, age)
);
GRANT SELECT ON public.birthday_log TO authenticated;
GRANT ALL ON public.birthday_log TO service_role;
ALTER TABLE public.birthday_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own birthdays read" ON public.birthday_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- Point de départ : chaque personnage existant garde son âge actuel à l'installation.
INSERT INTO public.character_aging (character_id, base_age) SELECT id, age FROM public.characters;

CREATE FUNCTION public.aging_on_character_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.character_aging (character_id, base_age) VALUES (NEW.id, NEW.age) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER character_aging_init AFTER INSERT ON public.characters FOR EACH ROW EXECUTE FUNCTION public.aging_on_character_insert();

-- Interne : fait avancer l'âge (jamais reculer), une ligne d'anniversaire par année gagnée.
CREATE FUNCTION public.aging_settle(_cid uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.character_aging; s public.aging_settings; cur integer; target integer; n integer; i integer;
BEGIN
  SELECT * INTO s FROM public.aging_settings WHERE id = 1;
  SELECT age INTO cur FROM public.characters WHERE id = _cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  SELECT * INTO a FROM public.character_aging WHERE character_id = _cid;
  IF NOT FOUND THEN
    INSERT INTO public.character_aging (character_id, base_age) VALUES (_cid, cur);
    RETURN cur;
  END IF;
  n := 0;
  WHILE a.anchor_at + s.real_interval * (n + 1) <= now() AND a.base_age + n + 1 <= s.max_age LOOP
    n := n + 1;
  END LOOP;
  target := a.base_age + n;
  IF target > cur THEN
    FOR i IN cur + 1 .. target LOOP
      INSERT INTO public.birthday_log (character_id, age, at)
      VALUES (_cid, i, a.anchor_at + s.real_interval * (i - a.base_age)) ON CONFLICT DO NOTHING;
    END LOOP;
    UPDATE public.characters SET age = target, updated_at = now() WHERE id = _cid;
    RETURN target;
  END IF;
  RETURN cur;
END $$;
REVOKE ALL ON FUNCTION public.aging_settle(uuid) FROM PUBLIC, anon, authenticated;

-- Joueur : règle son propre âge et renvoie l'état (prochain anniversaire, derniers anniversaires).
CREATE FUNCTION public.aging_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; age_now integer; a public.character_aging; s public.aging_settings;
BEGIN
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable.'; END IF;
  age_now := public.aging_settle(cid);
  SELECT * INTO a FROM public.character_aging WHERE character_id = cid;
  SELECT * INTO s FROM public.aging_settings WHERE id = 1;
  RETURN jsonb_build_object(
    'age', age_now,
    'next_birthday', CASE WHEN age_now < s.max_age THEN a.anchor_at + s.real_interval * (age_now - a.base_age + 1) END,
    'new_birthday', EXISTS (SELECT 1 FROM public.birthday_log b WHERE b.character_id = cid AND b.at > now() - interval '3 days'),
    'birthdays', (SELECT COALESCE(jsonb_agg(jsonb_build_object('age', b.age, 'at', b.at) ORDER BY b.age DESC), '[]'::jsonb)
                  FROM (SELECT * FROM public.birthday_log WHERE character_id = cid ORDER BY age DESC LIMIT 10) b)
  );
END $$;
REVOKE ALL ON FUNCTION public.aging_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aging_state() TO authenticated;

COMMIT;
