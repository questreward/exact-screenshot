-- Agences réelles, interactions fictives. Espèces = transfert du compte, jamais revenu.
BEGIN;
CREATE TABLE IF NOT EXISTS public.player_cash (
  character_id uuid PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  amount integer NOT NULL DEFAULT 0 CHECK (amount >= 0)
);
GRANT SELECT ON public.player_cash TO authenticated;
GRANT ALL ON public.player_cash TO service_role;
ALTER TABLE public.player_cash ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='player_cash' AND policyname='own cash') THEN
  CREATE POLICY "own cash" ON public.player_cash FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
END IF; END $$;

WITH branches(city, name, address) AS (VALUES
 ('paris','Banque Populaire · Paris République','1 boulevard Magenta, 75010 Paris'),
 ('lyon','Banque Populaire · Lyon Tête d’Or Kléber','2 place Kléber, 69006 Lyon'),
 ('marseille','Banque Populaire · Marseille Vieux Port','12 La Canebière, 13001 Marseille'),
 ('bordeaux','Banque Populaire · Bordeaux Pey Berland','2 rue Dufour Dubergier, 33000 Bordeaux'),
 ('lille','Banque Populaire · Lille Nationale','106 rue Nationale, 59800 Lille')),
 types(kind) AS (VALUES ('banque'),('distributeur'))
INSERT INTO public.locations(city_id,district_id,name,kind,description,accessible,opening_hours)
SELECT b.city,b.city||'-centre',CASE WHEN t.kind='banque' THEN b.name ELSE 'Distributeur CIVITAS · '||b.name END,t.kind,
 b.address||' · Adresse réelle ; espace et opérations fictifs CIVITAS, sans affiliation. '||CASE WHEN t.kind='distributeur' THEN 'Borne de jeu à cette adresse, pas une garantie de distributeur réel.' ELSE 'Camille, conseillère fictive, vous accueille dans le jeu.' END,
 true, CASE WHEN t.kind='banque' THEN '9 h – 18 h (horaires du jeu)' ELSE '0 h – 24 h (borne du jeu)' END
FROM branches b CROSS JOIN types t
WHERE EXISTS (SELECT 1 FROM public.districts d WHERE d.id=b.city||'-centre')
AND NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.city_id=b.city AND l.kind=t.kind AND l.name=CASE WHEN t.kind='banque' THEN b.name ELSE 'Distributeur CIVITAS · '||b.name END);

CREATE OR REPLACE FUNCTION public.bank_cash_state() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid;
BEGIN
 SELECT id INTO cid FROM public.characters WHERE user_id=auth.uid();
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage requis'; END IF;
 RETURN jsonb_build_object('balance',(SELECT balance FROM public.accounts WHERE character_id=cid),
 'cash',COALESCE((SELECT amount FROM public.player_cash WHERE character_id=cid),0),
 'here',EXISTS (SELECT 1 FROM public.character_positions p JOIN public.locations l ON l.id=p.location_id
 WHERE p.character_id=cid AND l.accessible AND l.kind IN ('banque','distributeur')),
 'history',COALESCE((SELECT jsonb_agg(x ORDER BY x.occurred_at DESC) FROM (SELECT operation_key,amount,occurred_at,payload FROM public.economy_operations WHERE character_id=cid AND kind='especes' ORDER BY occurred_at DESC LIMIT 20) x),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.bank_cash_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bank_cash_state() TO authenticated;

CREATE OR REPLACE FUNCTION public.bank_cash_action(_direction text,_amount integer,_request uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; k text; wallet integer; delta integer;
BEGIN
 SELECT id INTO cid FROM public.characters WHERE user_id=auth.uid();
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage requis'; END IF;
 IF _request IS NULL OR _direction IS NULL OR _direction NOT IN ('withdraw','deposit') OR _amount IS NULL OR _amount<=0 THEN RAISE EXCEPTION 'Montant entier positif et opération requis'; END IF;
 PERFORM 1 FROM public.characters WHERE id=cid AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Non autorisé'; END IF;
 k := 'bank-cash:'||_request;
 IF EXISTS (SELECT 1 FROM public.economy_operations WHERE character_id=cid AND operation_key=k) THEN
   IF NOT EXISTS (SELECT 1 FROM public.economy_operations WHERE character_id=cid AND operation_key=k AND payload->>'direction'=_direction AND abs(amount)=_amount) THEN RAISE EXCEPTION 'Demande déjà utilisée pour une autre opération'; END IF;
   RETURN public.bank_cash_state();
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.character_positions p JOIN public.locations l ON l.id=p.location_id
   WHERE p.character_id=cid AND l.accessible AND l.kind IN ('banque','distributeur')) THEN RAISE EXCEPTION 'Rendez-vous à une agence ou un distributeur sur la carte'; END IF;
 INSERT INTO public.player_cash(character_id) VALUES(cid) ON CONFLICT DO NOTHING;
 SELECT amount INTO wallet FROM public.player_cash WHERE character_id=cid FOR UPDATE;
 IF _direction='deposit' AND wallet<_amount THEN RAISE EXCEPTION 'Espèces insuffisantes'; END IF;
 delta := CASE WHEN _direction='withdraw' THEN -_amount ELSE _amount END;
 IF NOT public.economy_cash(cid,k,delta,CASE WHEN _direction='withdraw' THEN 'Retrait d’espèces — FICTIF' ELSE 'Dépôt d’espèces — FICTIF' END,'especes',jsonb_build_object('direction',_direction)) THEN RAISE EXCEPTION 'Opération déjà enregistrée'; END IF;
 UPDATE public.player_cash SET amount=amount-delta WHERE character_id=cid;
 RETURN public.bank_cash_state();
END $$;
REVOKE ALL ON FUNCTION public.bank_cash_action(text,integer,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bank_cash_action(text,integer,uuid) TO authenticated;

-- Étend les instantanés existants sans changer leur règlement des échéances.
DO $$ DECLARE def text; anchor text; BEGIN
 def := pg_get_functiondef('public.personal_economy_state()'::regprocedure);
 anchor := $a$'available',(SELECT balance FROM public.accounts WHERE character_id=cid),$a$;
 IF position('cash_on_hand' IN def)=0 THEN
   IF position(anchor IN def)=0 THEN RAISE EXCEPTION 'Instantané patrimoine incompatible'; END IF;
   EXECUTE replace(def,anchor,anchor||$b$'cash_on_hand',COALESCE((SELECT amount FROM public.player_cash WHERE character_id=cid),0),$b$);
 END IF;
 def := pg_get_functiondef('public.financial_adviser_snapshot()'::regprocedure);
 IF position('especes_euros' IN def)=0 THEN
   anchor := $a$'solde_euros', a.balance,$a$;
   IF position(anchor IN def)=0 THEN RAISE EXCEPTION 'Instantané conseillère incompatible'; END IF;
   EXECUTE replace(def,anchor,anchor||$b$'especes_euros',COALESCE((SELECT amount FROM public.player_cash WHERE character_id=cid),0),$b$);
 END IF;
END $$;
COMMIT;