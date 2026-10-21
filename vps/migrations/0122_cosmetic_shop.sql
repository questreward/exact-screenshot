-- CIVITAS 0122 : boutique d'objets de style (argent réel, Stripe), sans aucun avantage de jeu.
-- Nouvelles tables seulement. Aucune table existante modifiée. Tout ou rien.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cosmetic_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  kind text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents BETWEEN 49 AND 299),
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.cosmetic_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL REFERENCES public.cosmetic_items(id),
  price_cents integer NOT NULL,
  status text NOT NULL CHECK (status IN ('attente_parent','attente_paiement','paye','refuse')),
  minor boolean NOT NULL,
  parent_email text,
  consent_token_hash text UNIQUE,
  stripe_session_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.cosmetic_owned (
  user_id uuid NOT NULL,
  item_id text NOT NULL REFERENCES public.cosmetic_items(id),
  order_id uuid NOT NULL UNIQUE REFERENCES public.cosmetic_orders(id),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE public.cosmetic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_owned ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.cosmetic_items TO anon, authenticated;
GRANT SELECT ON public.cosmetic_orders, public.cosmetic_owned TO authenticated;
GRANT ALL ON public.cosmetic_items, public.cosmetic_orders, public.cosmetic_owned TO service_role;

DROP POLICY IF EXISTS cosmetic_items_read ON public.cosmetic_items;
CREATE POLICY cosmetic_items_read ON public.cosmetic_items FOR SELECT USING (active);
DROP POLICY IF EXISTS cosmetic_orders_own ON public.cosmetic_orders;
CREATE POLICY cosmetic_orders_own ON public.cosmetic_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS cosmetic_owned_own ON public.cosmetic_owned;
CREATE POLICY cosmetic_owned_own ON public.cosmetic_owned FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.cosmetic_items (id, name, description, kind, price_cents) VALUES
  ('cadre-or',       'Cadre de profil doré',      'Un contour doré autour de ta photo de profil.',      'Cadre',   99),
  ('cadre-tricolore','Cadre tricolore',           'Un contour bleu, blanc, rouge pour ton profil.',     'Cadre',   49),
  ('tenue-costume',  'Costume trois-pièces',      'Une tenue élégante pour ton personnage.',            'Tenue',  199),
  ('tenue-sport',    'Survêtement rétro',         'Le style des années 90 pour ton personnage.',        'Tenue',  149),
  ('tenue-soiree',   'Tenue de soirée',           'Pour briller aux réceptions officielles.',           'Tenue',  299),
  ('badge-pionnier', 'Badge « Pionnier »',        'Montre que tu étais là dès le début.',               'Badge',   99),
  ('fond-tour',      'Fond « Tour Eiffel la nuit »','Une image de fond pour ta carte de profil.',       'Fond',   149),
  ('fond-mer',       'Fond « Calanques »',        'Une image de fond pour ta carte de profil.',         'Fond',   149)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.cosmetic_items) < 8 THEN RAISE EXCEPTION 'Objets de style incomplets'; END IF;
END $$;

COMMIT;
