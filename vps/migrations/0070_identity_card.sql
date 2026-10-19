-- CIVITAS – DOCUMENTS ADMINISTRATIFS, VAGUE 1 : CARTE D'IDENTITÉ FICTIVE, APPARENCE MODIFIABLE, PHOTO, SIGNATURE
-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée, aucune donnée existante effacée.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0070_identity_card.sql
-- - character_identity : une ligne par personnage, créée à la première ouverture de la carte. Numéro de document,
--   date de naissance fictive, ville de naissance, dates de délivrance/expiration : tous fixés par le serveur.
--   Le numéro suit un format propre à CIVITAS (« CIV-… ») qui ne ressemble à aucun numéro officiel.
-- - Photo : stockée dans la base de TON serveur (aucun service externe), image JPEG/PNG/WEBP de 200 Ko maximum, supprimable.
-- - Signature : modèle graphique fictif + texte, sans valeur juridique.
-- - Apparence : la seule écriture sur characters est la colonne appearance, avec des valeurs vérifiées (liste fermée).
-- Lecture et modification réservées au joueur lui-même.
BEGIN;

CREATE TABLE public.identity_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  validity_years integer NOT NULL DEFAULT 10,
  photo_max_chars integer NOT NULL DEFAULT 280000,   -- ≈ 200 Ko d'image encodée
  allowed_appearance jsonb NOT NULL DEFAULT '{
    "silhouette":["slim","regular","broad"], "skin":["s1","s2","s3","s4","s5"],
    "hair":["short","long","curly","bun","bald"], "hairColor":["black","brown","blond","red","grey"],
    "outfit":["coral","navy","green","sand","charcoal"], "style":["casual","chic","sport"],
    "accessory":["none","glasses","sunglasses","earrings","cap","scarf"]}'::jsonb,
  signature_styles text[] NOT NULL DEFAULT ARRAY['classique','penchee','rapide','paraphe']
);
INSERT INTO public.identity_settings (id) VALUES (1);

CREATE TABLE public.character_identity (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id),
  doc_number text NOT NULL UNIQUE,
  birth_date date NOT NULL,
  birth_city text NOT NULL,
  issued_at date NOT NULL,
  expires_at date NOT NULL,
  signature_style text,
  signature_text text CHECK (signature_text IS NULL OR char_length(signature_text) BETWEEN 2 AND 30),
  photo text,
  photo_updated_at timestamptz,
  use_photo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);

GRANT SELECT ON public.identity_settings TO authenticated;
GRANT ALL ON public.identity_settings, public.character_identity TO service_role;
ALTER TABLE public.identity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_identity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Identity settings readable" ON public.identity_settings FOR SELECT TO authenticated USING (true);
-- Aucune politique sur character_identity : accès uniquement via les fonctions ci-dessous.

-- Crée la fiche d'identité si besoin (interne).
CREATE FUNCTION public.identity_ensure(_cid uuid) RETURNS public.character_identity LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.character_identity; c public.characters; s public.identity_settings; today date := public.game_now()::date; h bigint; BEGIN
  SELECT * INTO r FROM public.character_identity WHERE character_id = _cid;
  IF FOUND THEN RETURN r; END IF;
  SELECT * INTO c FROM public.characters WHERE id = _cid;
  SELECT * INTO s FROM public.identity_settings WHERE id = 1;
  h := abs(hashtextextended(_cid::text, 70));
  INSERT INTO public.character_identity (character_id, doc_number, birth_date, birth_city, issued_at, expires_at)
  VALUES (_cid,
    'CIV-' || to_char(today, 'YY') || '-' || upper(substr(md5(_cid::text || ':identite'), 1, 4)) || '-' || lpad((h % 1000000)::text, 6, '0'),
    (today - make_interval(years => c.age) - make_interval(days => (h % 360)::integer))::date,
    COALESCE((SELECT name FROM public.cities WHERE id = c.city_id), 'Inconnue'),
    today, (today + make_interval(years => s.validity_years))::date)
  ON CONFLICT (character_id) DO NOTHING;
  SELECT * INTO r FROM public.character_identity WHERE character_id = _cid;
  RETURN r;
END $$;

CREATE FUNCTION public.identity_card() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); c public.characters; r public.character_identity; s public.identity_settings; BEGIN
  SELECT * INTO c FROM public.characters WHERE id = cid;
  r := public.identity_ensure(cid);
  SELECT * INTO s FROM public.identity_settings WHERE id = 1;
  RETURN jsonb_build_object(
    'first_name', c.first_name, 'last_name', c.last_name, 'age', c.age, 'appearance', c.appearance,
    'city', (SELECT name FROM public.cities WHERE id = c.city_id), 'created_at', c.created_at,
    'nationality', 'Citoyenneté CIVITAS', 'civitas_id', upper(substr(replace(c.id::text, '-', ''), 1, 10)),
    'doc_number', r.doc_number, 'birth_date', r.birth_date, 'birth_city', r.birth_city,
    'issued_at', r.issued_at, 'expires_at', r.expires_at, 'expired', r.expires_at < public.game_now()::date,
    'signature_style', r.signature_style, 'signature_text', r.signature_text,
    'photo', r.photo, 'use_photo', r.use_photo,
    'settings', jsonb_build_object('photo_max_chars', s.photo_max_chars, 'signature_styles', to_jsonb(s.signature_styles)));
END $$;

CREATE FUNCTION public.identity_update(_command text, _input jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.social_actor(); s public.identity_settings; k text; v text; app jsonb := '{}'::jsonb; p text; t text; BEGIN
  SELECT * INTO s FROM public.identity_settings WHERE id = 1;
  PERFORM public.identity_ensure(cid);
  PERFORM 1 FROM public.character_identity WHERE character_id = cid FOR UPDATE;

  IF _command = 'appearance' THEN
    IF jsonb_typeof(_input) <> 'object' THEN RAISE EXCEPTION 'Apparence invalide.'; END IF;
    FOR k IN SELECT jsonb_object_keys(s.allowed_appearance) LOOP
      v := _input->>k;
      IF v IS NULL THEN CONTINUE; END IF;
      IF NOT (s.allowed_appearance->k) ? v THEN RAISE EXCEPTION 'Option d''apparence invalide.'; END IF;
      app := app || jsonb_build_object(k, v);
    END LOOP;
    UPDATE public.characters SET appearance = appearance || app, updated_at = now() WHERE id = cid;

  ELSIF _command = 'signature' THEN
    t := btrim(coalesce(_input->>'text', ''));
    IF NOT (_input->>'style') = ANY (s.signature_styles) THEN RAISE EXCEPTION 'Modèle de signature invalide.'; END IF;
    IF char_length(t) NOT BETWEEN 2 AND 30 OR NOT public.press_clean(t) THEN RAISE EXCEPTION 'Signature : 2 à 30 caractères.'; END IF;
    UPDATE public.character_identity SET signature_style = _input->>'style', signature_text = t WHERE character_id = cid;

  ELSIF _command = 'photo' THEN
    p := _input->>'photo';
    IF p IS NULL OR p !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' THEN RAISE EXCEPTION 'Format d''image refusé (JPEG, PNG ou WEBP).'; END IF;
    IF char_length(p) > s.photo_max_chars THEN RAISE EXCEPTION 'Image trop lourde (200 Ko maximum).'; END IF;
    UPDATE public.character_identity SET photo = p, use_photo = true, photo_updated_at = public.game_now() WHERE character_id = cid;

  ELSIF _command = 'delete_photo' THEN
    UPDATE public.character_identity SET photo = NULL, use_photo = false, photo_updated_at = public.game_now() WHERE character_id = cid;

  ELSIF _command = 'use_photo' THEN
    IF (_input->>'value')::boolean AND (SELECT photo FROM public.character_identity WHERE character_id = cid) IS NULL THEN
      RAISE EXCEPTION 'Ajoutez d''abord une photo.'; END IF;
    UPDATE public.character_identity SET use_photo = (_input->>'value')::boolean WHERE character_id = cid;

  ELSE RAISE EXCEPTION 'Commande inconnue.';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.identity_ensure(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.identity_card(), public.identity_update(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.identity_card(), public.identity_update(text, jsonb) TO authenticated;

COMMIT;
