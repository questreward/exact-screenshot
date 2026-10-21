-- CIVITAS 0127 : un client fictif du showroom peut acheter une voiture exposée.
-- Règles validées : prix = tarif de la concession (comme pour un joueur), 1 vente fictive maximum par jour de jeu et par concession.
-- La voiture sort du stock, la caisse de la concession est créditée, l'opération apparaît dans les ventes. Prérequis : 0084. Tout ou rien.
BEGIN;

DO $$ BEGIN IF to_regprocedure('public.dealer_buy(uuid,text,integer,integer,uuid)') IS NULL THEN RAISE EXCEPTION '0127: installer 0084 d''abord'; END IF; END $$;

ALTER TABLE public.dealer_ops DROP CONSTRAINT IF EXISTS dealer_ops_kind_check;
ALTER TABLE public.dealer_ops ADD CONSTRAINT dealer_ops_kind_check CHECK (kind IN ('restock','sale','credit_sale','trade_in','used_sale','npc_sale'));

CREATE OR REPLACE FUNCTION public.dealer_showroom_sell(_catalog_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; b public.businesses; cat public.economy_catalog; amount integer; key text; BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO b FROM public.businesses WHERE owner_id = cid AND status = 'active' AND sector_id = 'concession' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vous n''avez pas de concession active'; END IF;
  key := 'dealer-npc:' || b.id || ':' || (public.game_now() AT TIME ZONE 'Europe/Paris')::date;
  IF EXISTS (SELECT 1 FROM public.dealer_ops WHERE operation_key = key) THEN RAISE EXCEPTION 'Un client du showroom a déjà acheté aujourd''hui. Reviens demain.'; END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND kind = 'vehicle';
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule inconnu'; END IF;
  UPDATE public.dealer_stock SET quantity = quantity - 1 WHERE business_id = b.id AND catalog_id = cat.id AND quantity > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plus en stock'; END IF;
  amount := public.service_amount(cat.price, public.service_percent(b.id));
  PERFORM public.business_move(b.id, key, amount, 'sale', 'Vente showroom — ' || cat.name || ' à un client');
  INSERT INTO public.dealer_ops (operation_key, business_id, character_id, kind, catalog_id, amount) VALUES (key, b.id, cid, 'npc_sale', cat.id, amount);
  RETURN jsonb_build_object('amount', amount, 'name', cat.name);
END $$;
REVOKE ALL ON FUNCTION public.dealer_showroom_sell(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dealer_showroom_sell(text) TO authenticated, service_role;

COMMIT;
