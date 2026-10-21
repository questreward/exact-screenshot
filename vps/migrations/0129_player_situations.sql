-- CIVITAS 0129 : situations du quotidien (Bloc 3 — gameplay dynamique).
-- Règles validées : 4 situations max par jour (8h, 12h, 16h, 19h heure du jeu), gains 20 à 80 €,
-- mauvaises surprises max 50 € et jamais sous zéro, rares ~5 %, même situation pas avant 3 jours,
-- chaînes (une réponse peut amener la situation suivante), non répondues = « manquées ».
-- Argent via economy_cash (clé unique = une seule fois). Tout ou rien.
BEGIN;

DO $$ BEGIN IF to_regprocedure('public.economy_cash(uuid,text,integer,text,text,jsonb)') IS NULL THEN RAISE EXCEPTION '0129: economy_cash manquant'; END IF; END $$;

CREATE TABLE IF NOT EXISTS public.player_situations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  day date NOT NULL,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 4),
  template text NOT NULL,
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','missed')),
  choice text,
  outcome jsonb,
  next_template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (character_id, day, slot)
);
GRANT SELECT ON public.player_situations TO authenticated;
GRANT ALL ON public.player_situations TO service_role;
ALTER TABLE public.player_situations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own situations" ON public.player_situations;
CREATE POLICY "own situations" ON public.player_situations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

-- Catalogue : options = [id, libellé, indice, chance %, gain min, gain max, perte si échec, suite]
CREATE OR REPLACE FUNCTION public.situation_catalog() RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$ SELECT '{
 "order":{"emoji":"📦","title":"Commande inhabituelle","body":"Un client demande une grosse commande pour demain.","tone":"positive","need":"business","options":[
   {"id":"accept","label":"Accepter","hint":"Bon gain, un peu risqué","chance":70,"min":40,"max":70,"loss":30},
   {"id":"negotiate","label":"Négocier le prix","hint":"Plus de gain, le client peut partir","chance":45,"min":60,"max":80,"loss":0},
   {"id":"refuse","label":"Refuser poliment","hint":"Aucun risque","chance":100,"min":0,"max":0,"loss":0}]},
 "client":{"emoji":"🧑‍💼","title":"Client supplémentaire","body":"Un passant entre et hésite.","tone":"positive","need":"business","options":[
   {"id":"advise","label":"Prendre le temps de conseiller","hint":"Souvent payant","chance":80,"min":20,"max":45,"loss":0},
   {"id":"discount","label":"Offrir une petite remise","hint":"Vente presque sûre, gain réduit","chance":95,"min":20,"max":25,"loss":0}]},
 "delivery":{"emoji":"🛵","title":"Petite livraison","body":"Un commerçant du quartier cherche quelqu''un pour une course.","tone":"positive","options":[
   {"id":"go","label":"Faire la course","hint":"Gain correct","chance":85,"min":25,"max":45,"loss":10},
   {"id":"no","label":"Pas le temps","hint":"Rien ne se passe","chance":100,"min":0,"max":0,"loss":0}]},
 "neighbor":{"emoji":"🤝","title":"Un voisin a besoin d''aide","body":"Il déménage un meuble lourd.","tone":"positive","options":[
   {"id":"help","label":"Donner un coup de main","hint":"Il pourrait vous remercier","chance":60,"min":20,"max":30,"loss":0},
   {"id":"no","label":"Décliner","hint":"Rien ne se passe","chance":100,"min":0,"max":0,"loss":0}]},
 "breakdown":{"emoji":"🔧","title":"Petite panne à la maison","body":"Le chauffe-eau fait un bruit étrange.","tone":"negative","options":[
   {"id":"diy","label":"Réparer soi-même","hint":"Gratuit si ça marche","chance":60,"min":0,"max":0,"loss":40},
   {"id":"pro","label":"Appeler un artisan","hint":"Coût sûr","chance":0,"min":0,"max":0,"loss":25},
   {"id":"wait","label":"Attendre","hint":"Ça peut empirer","chance":50,"min":0,"max":0,"loss":0,"next":"breakdown2"}]},
 "breakdown2":{"emoji":"💧","title":"Le chauffe-eau fuit","body":"Vous aviez attendu : il faut agir maintenant.","tone":"negative","chain":true,"options":[
   {"id":"pro","label":"Artisan en urgence","hint":"Plus cher","chance":0,"min":0,"max":0,"loss":50},
   {"id":"diy","label":"Tenter un bricolage","hint":"Risqué","chance":40,"min":0,"max":0,"loss":50}]},
 "unhappy":{"emoji":"😠","title":"Client mécontent","body":"Un client se plaint d''un service.","tone":"negative","need":"business","options":[
   {"id":"refund","label":"Rembourser un geste","hint":"Petit coût sûr","chance":0,"min":0,"max":0,"loss":20},
   {"id":"talk","label":"Discuter calmement","hint":"Peut tout arranger","chance":55,"min":0,"max":0,"loss":40,"next":"review"}]},
 "review":{"emoji":"⭐","title":"Le client revient","body":"Après votre discussion, il laisse un avis.","tone":"positive","chain":true,"options":[
   {"id":"thank","label":"Le remercier et l''inviter à revenir","hint":"Il pourrait acheter","chance":70,"min":20,"max":40,"loss":0}]},
 "wallet":{"emoji":"👛","title":"Portefeuille trouvé","body":"Un portefeuille traîne sur un banc.","tone":"positive","options":[
   {"id":"owner","label":"Chercher le propriétaire","hint":"Il pourrait vous récompenser","chance":60,"min":30,"max":60,"loss":0},
   {"id":"police","label":"Le déposer au commissariat","hint":"Simple et sûr","chance":100,"min":20,"max":20,"loss":0}]},
 "rare":{"emoji":"🎉","title":"Opportunité exceptionnelle","body":"Une entreprise cherche quelqu''un pour une mission éclair très bien payée.","tone":"rare","options":[
   {"id":"take","label":"Relever le défi","hint":"Gros gain possible","chance":75,"min":70,"max":80,"loss":0},
   {"id":"no","label":"Laisser passer","hint":"Rien ne se passe","chance":100,"min":0,"max":0,"loss":0}]}
}'::jsonb $$;

CREATE OR REPLACE FUNCTION public.situations_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; now_p timestamp; today date; hr int; s int; unlocked int; cat jsonb := public.situation_catalog();
  has_biz boolean := false; pick text; pool text[]; prev text; h int; BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  now_p := public.game_now() AT TIME ZONE 'Europe/Paris'; today := now_p::date; hr := extract(hour FROM now_p);
  UPDATE public.player_situations SET status = 'missed' WHERE character_id = cid AND status = 'open' AND day < today;
  IF to_regclass('public.businesses') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = $1 AND status = ''active'')' INTO has_biz USING cid;
  END IF;
  unlocked := CASE WHEN hr >= 19 THEN 4 WHEN hr >= 16 THEN 3 WHEN hr >= 12 THEN 2 WHEN hr >= 8 THEN 1 ELSE 0 END;
  FOR s IN 1..unlocked LOOP
    IF EXISTS (SELECT 1 FROM public.player_situations WHERE character_id = cid AND day = today AND slot = s) THEN CONTINUE; END IF;
    -- une seule situation ouverte à la fois (anti-spam)
    IF EXISTS (SELECT 1 FROM public.player_situations WHERE character_id = cid AND status = 'open') THEN EXIT; END IF;
    SELECT next_template INTO prev FROM public.player_situations WHERE character_id = cid AND next_template IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.player_situations p2 WHERE p2.character_id = cid AND p2.created_at > player_situations.created_at)
      ORDER BY created_at DESC LIMIT 1;
    h := abs(hashtext(cid::text || today::text || s::text)) % 100;
    IF prev IS NOT NULL THEN pick := prev;
    ELSIF h < 5 THEN pick := 'rare';
    ELSE
      SELECT array_agg(k ORDER BY k) INTO pool FROM jsonb_object_keys(cat) k
        WHERE k <> 'rare' AND NOT coalesce((cat->k->>'chain')::boolean, false)
          AND (cat->k->>'need' IS NULL OR has_biz)
          AND NOT EXISTS (SELECT 1 FROM public.player_situations p WHERE p.character_id = cid AND p.template = k AND p.day > today - 3);
      IF pool IS NULL THEN EXIT; END IF;
      -- profil : un patron reçoit plus souvent des situations d'entreprise
      IF has_biz AND h % 2 = 0 AND EXISTS (SELECT 1 FROM unnest(pool) x WHERE cat->x->>'need' = 'business') THEN
        SELECT array_agg(x) INTO pool FROM unnest(pool) x WHERE cat->x->>'need' = 'business';
      END IF;
      pick := pool[1 + h % array_length(pool, 1)];
    END IF;
    INSERT INTO public.player_situations (character_id, day, slot, template, snapshot)
      VALUES (cid, today, s, pick, jsonb_build_object('emoji', cat->pick->'emoji', 'title', cat->pick->'title', 'body', cat->pick->'body', 'tone', cat->pick->'tone',
        'options', (SELECT jsonb_agg(jsonb_build_object('id', o->'id', 'label', o->'label', 'hint', o->'hint')) FROM jsonb_array_elements(cat->pick->'options') o)))
      ON CONFLICT DO NOTHING;
    -- la suite d'une chaîne n'est utilisée qu'une fois
    UPDATE public.player_situations SET next_template = NULL WHERE character_id = cid AND next_template = pick AND template <> pick;
  END LOOP;
  RETURN jsonb_build_object('day', today, 'max', 4, 'unlocked', unlocked, 'items', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id', id, 'day', day, 'slot', slot, 'status', status, 'snapshot', snapshot, 'choice', choice, 'outcome', outcome) ORDER BY day DESC, slot DESC)
    FROM (SELECT * FROM public.player_situations WHERE character_id = cid AND day > today - 3 ORDER BY day DESC, slot DESC LIMIT 12) x), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.situation_choose(_id uuid, _choice text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; ps public.player_situations; opt jsonb; roll int; ok boolean; amount int := 0; bal int; msg text; nxt text; BEGIN
  cid := public.prepare_daily_life();
  PERFORM 1 FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO ps FROM public.player_situations WHERE id = _id AND character_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Situation introuvable'; END IF;
  IF ps.status <> 'open' THEN RAISE EXCEPTION 'Cette situation est terminée'; END IF;
  SELECT o INTO opt FROM jsonb_array_elements(public.situation_catalog()->ps.template->'options') o WHERE o->>'id' = _choice;
  IF opt IS NULL THEN RAISE EXCEPTION 'Choix inconnu'; END IF;
  roll := abs(hashtext(ps.id::text || _choice)) % 100;
  ok := roll < (opt->>'chance')::int;
  IF ok THEN
    amount := (opt->>'min')::int + CASE WHEN (opt->>'max')::int > (opt->>'min')::int THEN roll % ((opt->>'max')::int - (opt->>'min')::int + 1) ELSE 0 END;
    msg := CASE WHEN amount > 0 THEN 'Réussi ! Vous gagnez ' || amount || ' €.' ELSE 'Tout se passe bien.' END;
  ELSE
    amount := -least((opt->>'loss')::int, 50);
    IF amount < 0 THEN
      SELECT balance INTO bal FROM public.accounts WHERE character_id = cid;
      amount := -least(-amount, greatest(coalesce(bal, 0), 0)); -- jamais sous zéro
    END IF;
    nxt := opt->>'next';
    msg := CASE WHEN amount < 0 THEN 'Pas de chance : cela vous coûte ' || (-amount) || ' €.' WHEN nxt IS NOT NULL THEN 'Rien pour l''instant… à suivre.' ELSE 'Cela n''a rien donné, mais rien de perdu.' END;
  END IF;
  IF amount <> 0 THEN
    PERFORM public.economy_cash(cid, 'situation:' || ps.id, amount, (ps.snapshot->>'title') || ' — ' || (opt->>'label'), 'situation', jsonb_build_object('situation', ps.id));
  END IF;
  UPDATE public.player_situations SET status = 'resolved', choice = _choice, resolved_at = now(), next_template = nxt,
    outcome = jsonb_build_object('ok', ok, 'amount', amount, 'message', msg, 'label', opt->>'label') WHERE id = ps.id;
  RETURN jsonb_build_object('ok', ok, 'amount', amount, 'message', msg);
END $$;

REVOKE ALL ON FUNCTION public.situations_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.situation_choose(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.situations_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.situation_choose(uuid, text) TO authenticated, service_role;

COMMIT;
