-- CIVITAS 0132 : abonnement CIVITAS VIP (2,99 €/mois, Stripe, sans essai), sans aucun avantage de jeu.
-- Avantages : badge ⭐ VIP, tenues et cadres exclusifs, thèmes du téléphone, plus de favoris.
-- 16–17 ans : accord parental, le parent paie. Nouvelles tables seulement. Tout ou rien.
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.cosmetic_owned') IS NULL THEN RAISE EXCEPTION '0132: la boutique de style (0122) doit être installée d''abord'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.vip_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('attente_parent','attente_paiement','actif','refuse','termine')),
  price_cents integer NOT NULL DEFAULT 299,
  minor boolean NOT NULL,
  parent_email text,
  consent_token_hash text UNIQUE,
  stripe_session_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS vip_subscriptions_user ON public.vip_subscriptions (user_id, created_at DESC);
-- Un seul abonnement vivant par compte.
CREATE UNIQUE INDEX IF NOT EXISTS vip_one_live ON public.vip_subscriptions (user_id) WHERE status IN ('attente_parent','attente_paiement','actif');
GRANT SELECT ON public.vip_subscriptions TO authenticated;
GRANT ALL ON public.vip_subscriptions TO service_role;
ALTER TABLE public.vip_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vip_own ON public.vip_subscriptions;
CREATE POLICY vip_own ON public.vip_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Objets exclusifs VIP : jamais vendus seuls (inactifs dans la boutique), offerts aux abonnés.
INSERT INTO public.cosmetic_items (id, name, description, kind, price_cents, active) VALUES
  ('vip-cadre-etoile', 'Cadre « Étoile VIP »', 'Un contour étoilé réservé aux membres VIP.', 'Cadre', 299, false),
  ('vip-tenue-gala',   'Tenue de gala VIP',     'Une tenue exclusive pour les membres VIP.',  'Tenue', 299, false)
ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.vip_items (item_id text PRIMARY KEY REFERENCES public.cosmetic_items(id));
INSERT INTO public.vip_items VALUES ('vip-cadre-etoile'), ('vip-tenue-gala') ON CONFLICT DO NOTHING;
GRANT SELECT ON public.vip_items TO authenticated;
GRANT ALL ON public.vip_items TO service_role;
ALTER TABLE public.vip_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vip_items_read ON public.vip_items;
CREATE POLICY vip_items_read ON public.vip_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS cosmetic_items_vip_read ON public.cosmetic_items;
CREATE POLICY cosmetic_items_vip_read ON public.cosmetic_items FOR SELECT TO authenticated USING (id IN (SELECT item_id FROM public.vip_items));

-- Badge public : seulement « est VIP ou non », rien d'autre.
CREATE OR REPLACE FUNCTION public.vip_badge(_character uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.vip_subscriptions v JOIN public.characters c ON c.user_id = v.user_id
                 WHERE c.id = _character AND v.status = 'actif' AND v.period_end > now());
$$;
REVOKE ALL ON FUNCTION public.vip_badge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vip_badge(uuid) TO authenticated;

COMMIT;
