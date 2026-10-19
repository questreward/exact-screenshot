-- CIVITAS – P7 : MULTIJOUEUR COMPLET
-- Ajouts + remplacement de 3 fonctions de P6 (player_directory, player_profile, network_state, même signature)
-- + retouche ciblée du décompte municipal (poids des votes des joueurs), vérifiée avant application.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0054_p7_multiplayer.sql
BEGIN;

-- 1. Réglages ------------------------------------------------------------------------------
CREATE TABLE public.multiplayer_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  transfer_daily_max integer NOT NULL DEFAULT 1000,
  together_minutes integer NOT NULL DEFAULT 60,
  together_energy integer NOT NULL DEFAULT 10,
  together_reputation integer NOT NULL DEFAULT 2,
  invite_hours integer NOT NULL DEFAULT 24,
  player_vote_percent numeric NOT NULL DEFAULT 2 CHECK (player_vote_percent >= 0 AND player_vote_percent <= 10)
);
CREATE TABLE public.together_kinds (
  id text PRIMARY KEY,
  label text NOT NULL,
  location_kinds text[] NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.multiplayer_settings, public.together_kinds TO authenticated;
GRANT ALL ON public.multiplayer_settings, public.together_kinds TO service_role;
ALTER TABLE public.multiplayer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.together_kinds ENABLE ROW LEVEL SECURITY;
CREATE POLICY multiplayer_settings_read ON public.multiplayer_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY together_kinds_read ON public.together_kinds FOR SELECT TO authenticated USING (true);
INSERT INTO public.multiplayer_settings (id) VALUES (1);
INSERT INTO public.together_kinds (id, label, location_kinds, sort_order) VALUES
  ('cafe', 'Prendre un café', ARRAY['cafe'], 1),
  ('sport', 'Faire du sport', ARRAY['parc'], 2),
  ('balade', 'Se promener et discuter', ARRAY['parc','place'], 3),
  ('revision', 'Réviser ensemble', ARRAY['universite'], 4),
  ('reunion', 'Réunion de travail', ARRAY['entreprise','administration','mairie'], 5);
INSERT INTO public.life_rules (id, title, duration_minutes, energy_cost, energy_gain, money_cost, progression_gain, allowed_kinds)
VALUES ('together', 'Activité à plusieurs', 60, 10, 0, 0, 0, ARRAY['cafe','parc','place','universite','entreprise','administration','mairie'])
ON CONFLICT (id) DO NOTHING;

-- 2. Tables ----------------------------------------------------------------------------------
CREATE TABLE public.player_blocks (
  blocker_id uuid NOT NULL REFERENCES public.characters(id),
  blocked_id uuid NOT NULL REFERENCES public.characters(id),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE TABLE public.player_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.characters(id),
  reported_id uuid NOT NULL REFERENCES public.characters(id),
  reason text NOT NULL CHECK (reason IN ('insultes','harcelement','arnaque','contenu','autre')),
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau','traite')),
  created_at timestamptz NOT NULL DEFAULT public.game_now()
);
CREATE TABLE public.player_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.characters(id),
  recipient_id uuid NOT NULL REFERENCES public.characters(id),
  request_key text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','collected')),
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  collected_at timestamptz,
  UNIQUE (sender_id, request_key),
  CHECK (sender_id <> recipient_id)
);
CREATE TABLE public.together_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES public.characters(id),
  invitee_id uuid NOT NULL REFERENCES public.characters(id),
  kind_id text NOT NULL REFERENCES public.together_kinds(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.game_now(),
  CHECK (inviter_id <> invitee_id)
);
CREATE TABLE public.together_rewards (
  activity_id uuid PRIMARY KEY REFERENCES public.activities(id),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  reputation integer NOT NULL,
  rewarded_at timestamptz NOT NULL DEFAULT public.game_now()
);
GRANT SELECT ON public.player_blocks, public.player_reports, public.player_transfers, public.together_invites, public.together_rewards TO authenticated;
GRANT ALL ON public.player_blocks, public.player_reports, public.player_transfers, public.together_invites, public.together_rewards TO service_role;
ALTER TABLE public.player_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.together_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.together_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY player_blocks_own ON public.player_blocks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = player_blocks.blocker_id AND c.user_id = auth.uid()));
CREATE POLICY player_reports_own ON public.player_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = player_reports.reporter_id AND c.user_id = auth.uid()));
CREATE POLICY player_transfers_own ON public.player_transfers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (player_transfers.sender_id, player_transfers.recipient_id) AND c.user_id = auth.uid()));
CREATE POLICY together_invites_own ON public.together_invites FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id IN (together_invites.inviter_id, together_invites.invitee_id) AND c.user_id = auth.uid()));
CREATE POLICY together_rewards_own ON public.together_rewards FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.characters c WHERE c.id = together_rewards.character_id AND c.user_id = auth.uid()));

-- 3. Blocage : garde commune sur toutes les interactions entre joueurs ------------------------
CREATE FUNCTION public.network_blocked(_a uuid, _b uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.player_blocks WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a))
$$;
CREATE FUNCTION public.guard_player_block() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a uuid; b uuid; BEGIN
  IF TG_TABLE_NAME = 'player_contacts' THEN a := NEW.requester_id; b := NEW.addressee_id;
  ELSIF TG_TABLE_NAME = 'player_follows' THEN a := NEW.follower_id; b := NEW.followed_id;
  ELSIF TG_TABLE_NAME = 'player_transfers' THEN a := NEW.sender_id; b := NEW.recipient_id;
  ELSIF TG_TABLE_NAME = 'together_invites' THEN a := NEW.inviter_id; b := NEW.invitee_id;
  ELSIF TG_TABLE_NAME = 'player_messages' THEN a := NEW.sender_id;
    SELECT CASE WHEN t.a_id = NEW.sender_id THEN t.b_id ELSE t.a_id END INTO b FROM public.player_threads t WHERE t.id = NEW.thread_id;
  END IF;
  IF public.network_blocked(a, b) THEN RAISE EXCEPTION 'Interaction impossible avec ce joueur'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_block BEFORE INSERT ON public.player_contacts FOR EACH ROW EXECUTE FUNCTION public.guard_player_block();
CREATE TRIGGER guard_block BEFORE INSERT ON public.player_follows FOR EACH ROW EXECUTE FUNCTION public.guard_player_block();
CREATE TRIGGER guard_block BEFORE INSERT ON public.player_messages FOR EACH ROW EXECUTE FUNCTION public.guard_player_block();
CREATE TRIGGER guard_block BEFORE INSERT ON public.player_transfers FOR EACH ROW EXECUTE FUNCTION public.guard_player_block();
CREATE TRIGGER guard_block BEFORE INSERT ON public.together_invites FOR EACH ROW EXECUTE FUNCTION public.guard_player_block();

CREATE FUNCTION public.block_player(_target uuid, _on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  IF _target = cid OR NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _target) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  IF _on THEN
    INSERT INTO public.player_blocks (blocker_id, blocked_id) VALUES (cid, _target) ON CONFLICT DO NOTHING;
    UPDATE public.player_contacts SET status = 'removed', responded_at = public.game_now()
      WHERE status IN ('pending','accepted') AND ((requester_id = cid AND addressee_id = _target) OR (requester_id = _target AND addressee_id = cid));
    DELETE FROM public.player_follows WHERE (follower_id = cid AND followed_id = _target) OR (follower_id = _target AND followed_id = cid);
    UPDATE public.together_invites SET status = 'cancelled'
      WHERE status = 'pending' AND ((inviter_id = cid AND invitee_id = _target) OR (inviter_id = _target AND invitee_id = cid));
  ELSE DELETE FROM public.player_blocks WHERE blocker_id = cid AND blocked_id = _target; END IF;
END $$;

CREATE FUNCTION public.report_player(_target uuid, _reason text, _details text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; rid uuid; BEGIN
  cid := public.social_actor();
  IF _target = cid OR NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _target) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  IF length(coalesce(_details, '')) > 500 THEN RAISE EXCEPTION 'Détails limités à 500 caractères'; END IF;
  IF (SELECT count(*) FROM public.player_reports WHERE reporter_id = cid AND created_at > public.game_now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'Trop de signalements aujourd''hui'; END IF;
  INSERT INTO public.player_reports (reporter_id, reported_id, reason, details) VALUES (cid, _target, _reason, btrim(coalesce(_details, ''))) RETURNING id INTO rid;
  RETURN rid;
END $$;

-- 4. Virements entre joueurs -----------------------------------------------------------------
CREATE FUNCTION public.transfer_collect(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _cid AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  FOR t IN SELECT tr.*, c.first_name || ' ' || c.last_name AS sender_name FROM public.player_transfers tr JOIN public.characters c ON c.id = tr.sender_id
           WHERE tr.recipient_id = _cid AND tr.status = 'pending' ORDER BY tr.created_at FOR UPDATE OF tr LOOP
    PERFORM public.economy_cash(_cid, 'transfer-in:' || t.id, t.amount, 'Virement de ' || t.sender_name, 'virement', jsonb_build_object('transfer', t.id));
    UPDATE public.player_transfers SET status = 'collected', collected_at = public.game_now() WHERE id = t.id;
  END LOOP;
END $$;

CREATE FUNCTION public.send_money(_target uuid, _amount integer, _note text, _request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.multiplayer_settings; tid uuid; sent integer; tname text; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT id INTO tid FROM public.player_transfers WHERE sender_id = cid AND request_key = _request_id::text;
  IF tid IS NOT NULL THEN RETURN tid; END IF;
  SELECT * INTO s FROM public.multiplayer_settings WHERE id = 1;
  IF NOT public.network_is_contact(cid, _target) THEN RAISE EXCEPTION 'Virements réservés à vos contacts'; END IF;
  IF _amount IS NULL OR _amount < 1 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF length(coalesce(_note, '')) > 120 THEN RAISE EXCEPTION 'Message limité à 120 caractères'; END IF;
  SELECT COALESCE(sum(amount), 0) INTO sent FROM public.player_transfers
    WHERE sender_id = cid AND (created_at AT TIME ZONE 'UTC')::date = (public.game_now() AT TIME ZONE 'UTC')::date;
  IF sent + _amount > s.transfer_daily_max THEN RAISE EXCEPTION 'Plafond de % crédits par jour de jeu (reste %)', s.transfer_daily_max, s.transfer_daily_max - sent; END IF;
  SELECT first_name || ' ' || last_name INTO tname FROM public.characters WHERE id = _target;
  INSERT INTO public.player_transfers (sender_id, recipient_id, request_key, amount, note) VALUES (cid, _target, _request_id::text, _amount, btrim(coalesce(_note, '')))
  RETURNING id INTO tid;
  PERFORM public.economy_cash(cid, 'transfer-out:' || tid, -_amount, 'Virement à ' || tname, 'virement', jsonb_build_object('transfer', tid));
  PERFORM public.network_notify(_target, 'Virement reçu', c.first_name || ' ' || c.last_name || ' vous envoie ' || _amount || ' crédits.' || CASE WHEN btrim(coalesce(_note, '')) <> '' THEN ' « ' || btrim(_note) || ' »' ELSE '' END);
  RETURN tid;
END $$;

-- 5. Activités à plusieurs --------------------------------------------------------------------
CREATE FUNCTION public.invite_together(_target uuid, _kind text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.multiplayer_settings; k public.together_kinds; loc uuid; lkind text; lname text; iid uuid; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO s FROM public.multiplayer_settings WHERE id = 1;
  IF NOT public.network_is_contact(cid, _target) THEN RAISE EXCEPTION 'Invitations réservées à vos contacts'; END IF;
  SELECT * INTO k FROM public.together_kinds WHERE id = _kind;
  IF NOT FOUND THEN RAISE EXCEPTION 'Activité inconnue'; END IF;
  SELECT p.location_id, l.kind, l.name INTO loc, lkind, lname FROM public.character_positions p JOIN public.locations l ON l.id = p.location_id WHERE p.character_id = cid;
  IF loc IS NULL OR NOT (lkind = ANY(k.location_kinds)) THEN RAISE EXCEPTION 'Rendez-vous d''abord dans un lieu adapté pour « % »', k.label; END IF;
  IF EXISTS (SELECT 1 FROM public.together_invites WHERE inviter_id = cid AND invitee_id = _target AND status = 'pending' AND expires_at > public.game_now()) THEN
    RAISE EXCEPTION 'Une invitation est déjà en attente'; END IF;
  INSERT INTO public.together_invites (inviter_id, invitee_id, kind_id, location_id, expires_at)
  VALUES (cid, _target, k.id, loc, public.game_now() + s.invite_hours * interval '1 hour') RETURNING id INTO iid;
  PERFORM public.network_notify(_target, 'Invitation', c.first_name || ' vous propose : ' || k.label || ' (' || lname || '). Rejoignez ce lieu pour accepter.');
  RETURN iid;
END $$;

CREATE FUNCTION public.respond_together(_invite uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; s public.multiplayer_settings; i public.together_invites; k public.together_kinds; other public.characters;
  t timestamptz := public.game_now(); fin timestamptz; who uuid; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT * INTO i FROM public.together_invites WHERE id = _invite AND invitee_id = cid AND status = 'pending' FOR UPDATE;
  IF NOT FOUND OR i.expires_at <= t THEN RAISE EXCEPTION 'Invitation introuvable ou expirée'; END IF;
  IF NOT _accept THEN UPDATE public.together_invites SET status = 'declined' WHERE id = i.id; RETURN; END IF;
  SELECT * INTO s FROM public.multiplayer_settings WHERE id = 1;
  SELECT * INTO k FROM public.together_kinds WHERE id = i.kind_id;
  SELECT * INTO other FROM public.characters WHERE id = i.inviter_id FOR UPDATE;
  PERFORM public.settle_daily_life(other.id);
  IF NOT EXISTS (SELECT 1 FROM public.character_positions WHERE character_id = cid AND location_id = i.location_id) THEN RAISE EXCEPTION 'Rendez-vous d''abord au lieu du rendez-vous'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.character_positions WHERE character_id = other.id AND location_id = i.location_id) THEN RAISE EXCEPTION '% n''est plus sur place', other.first_name; END IF;
  fin := t + s.together_minutes * interval '1 minute';
  FOREACH who IN ARRAY ARRAY[cid, other.id] LOOP
    IF (SELECT energy FROM public.characters WHERE id = who) < s.together_energy THEN RAISE EXCEPTION 'Énergie insuffisante pour l''un de vous deux'; END IF;
    IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = who AND status IN ('planned','running') AND start_time < fin AND end_time > t) THEN
      RAISE EXCEPTION 'L''agenda de l''un de vous deux est occupé'; END IF;
  END LOOP;
  FOREACH who IN ARRAY ARRAY[cid, other.id] LOOP
    INSERT INTO public.activities (character_id, type, title, start_time, end_time, location_id, energy_cost, status, source_key)
    VALUES (who, 'together', k.label || ' avec ' || CASE WHEN who = cid THEN other.first_name ELSE c.first_name END, t, fin, i.location_id, s.together_energy, 'running', 'together:' || i.id);
    UPDATE public.characters SET energy = energy - s.together_energy, updated_at = now() WHERE id = who;
  END LOOP;
  UPDATE public.together_invites SET status = 'accepted' WHERE id = i.id;
  PERFORM public.network_notify(other.id, 'Invitation acceptée', c.first_name || ' vous rejoint : ' || k.label || '.');
END $$;

CREATE FUNCTION public.cancel_together(_invite uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  UPDATE public.together_invites SET status = 'cancelled' WHERE id = _invite AND inviter_id = cid AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation introuvable'; END IF;
END $$;

CREATE FUNCTION public.together_completed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rep integer; BEGIN
  IF NEW.type = 'together' AND OLD.status = 'running' AND NEW.status = 'completed' THEN
    SELECT together_reputation INTO rep FROM public.multiplayer_settings WHERE id = 1;
    INSERT INTO public.together_rewards (activity_id, character_id, reputation) VALUES (NEW.id, NEW.character_id, rep) ON CONFLICT DO NOTHING;
    IF FOUND THEN
      INSERT INTO public.social_stats (character_id, reputation, influence) VALUES (NEW.character_id, rep, 0)
      ON CONFLICT (character_id) DO UPDATE SET reputation = social_stats.reputation + EXCLUDED.reputation;
      PERFORM public.network_notify(NEW.character_id, 'Activité terminée', NEW.title || ' : +' || rep || ' réputation.');
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER together_completed AFTER UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.together_completed();

-- 6. Remplacement des lectures du réseau (blocage, virements, invitations) ----------------------
CREATE OR REPLACE FUNCTION public.player_directory(_query text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; q text := btrim(coalesce(_query, '')); lim integer; loc uuid; BEGIN
  cid := public.social_actor(); SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT directory_limit INTO lim FROM public.network_settings WHERE id = 1;
  SELECT location_id INTO loc FROM public.character_positions WHERE character_id = cid;
  RETURN jsonb_build_object(
    'city', (SELECT name FROM public.cities WHERE id = c.city_id),
    'players', COALESCE((SELECT jsonb_agg(public.network_card(x.id) ORDER BY x.last_name, x.first_name) FROM (
        SELECT o.* FROM public.characters o LEFT JOIN public.player_bios pb ON pb.character_id = o.id
        WHERE o.id <> cid AND o.city_id = c.city_id AND COALESCE(pb.listed, true) AND NOT public.network_blocked(cid, o.id)
          AND (q = '' OR (o.first_name || ' ' || o.last_name) ILIKE '%' || replace(replace(q, '%', ''), '_', '') || '%')
        ORDER BY o.last_name, o.first_name LIMIT lim) x), '[]'::jsonb),
    'here', COALESCE((SELECT jsonb_agg(public.network_card(p.character_id)) FROM public.character_positions p
        WHERE p.location_id = loc AND p.character_id <> cid AND NOT public.network_blocked(cid, p.character_id)), '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.player_profile(_target uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _target) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  IF EXISTS (SELECT 1 FROM public.player_blocks WHERE blocker_id = _target AND blocked_id = cid) THEN RAISE EXCEPTION 'Profil indisponible'; END IF;
  RETURN public.network_profile(cid, _target) || jsonb_build_object(
    'blocked_by_me', EXISTS (SELECT 1 FROM public.player_blocks WHERE blocker_id = cid AND blocked_id = _target));
END $$;

CREATE OR REPLACE FUNCTION public.network_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; BEGIN
  cid := public.social_actor();
  PERFORM public.transfer_collect(cid);
  RETURN jsonb_build_object(
    'me', cid,
    'settings', (SELECT to_jsonb(s) FROM public.network_settings s WHERE id = 1),
    'multiplayer', (SELECT to_jsonb(s) FROM public.multiplayer_settings s WHERE id = 1),
    'together_kinds', (SELECT jsonb_agg(to_jsonb(k) ORDER BY k.sort_order) FROM public.together_kinds k),
    'balance', (SELECT balance FROM public.accounts WHERE character_id = cid),
    'bio', COALESCE((SELECT jsonb_build_object('bio', bio, 'listed', listed) FROM public.player_bios WHERE character_id = cid), jsonb_build_object('bio', '', 'listed', true)),
    'contacts', COALESCE((SELECT jsonb_agg(public.network_card(CASE WHEN pc.requester_id = cid THEN pc.addressee_id ELSE pc.requester_id END) || jsonb_build_object('contact_id', pc.id))
        FROM public.player_contacts pc WHERE pc.status = 'accepted' AND cid IN (pc.requester_id, pc.addressee_id)), '[]'::jsonb),
    'incoming', COALESCE((SELECT jsonb_agg(public.network_card(pc.requester_id) || jsonb_build_object('contact_id', pc.id) ORDER BY pc.created_at DESC)
        FROM public.player_contacts pc WHERE pc.status = 'pending' AND pc.addressee_id = cid), '[]'::jsonb),
    'outgoing', COALESCE((SELECT jsonb_agg(public.network_card(pc.addressee_id) || jsonb_build_object('contact_id', pc.id) ORDER BY pc.created_at DESC)
        FROM public.player_contacts pc WHERE pc.status = 'pending' AND pc.requester_id = cid), '[]'::jsonb),
    'following', COALESCE((SELECT jsonb_agg(public.network_card(f.followed_id) ORDER BY f.created_at DESC) FROM public.player_follows f WHERE f.follower_id = cid), '[]'::jsonb),
    'followers', (SELECT count(*) FROM public.player_follows WHERE followed_id = cid),
    'blocked', COALESCE((SELECT jsonb_agg(public.network_card(b.blocked_id)) FROM public.player_blocks b WHERE b.blocker_id = cid), '[]'::jsonb),
    'invites', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'mine', i.inviter_id = cid, 'kind', k.label, 'place', l.name, 'expires_at', i.expires_at,
          'other', public.network_card(CASE WHEN i.inviter_id = cid THEN i.invitee_id ELSE i.inviter_id END)) ORDER BY i.created_at DESC)
        FROM public.together_invites i JOIN public.together_kinds k ON k.id = i.kind_id JOIN public.locations l ON l.id = i.location_id
        WHERE i.status = 'pending' AND i.expires_at > public.game_now() AND cid IN (i.inviter_id, i.invitee_id)), '[]'::jsonb),
    'transfers', COALESCE((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
        SELECT tr.id, tr.amount, tr.note, tr.created_at, tr.sender_id = cid AS sent,
          public.network_card(CASE WHEN tr.sender_id = cid THEN tr.recipient_id ELSE tr.sender_id END) AS other
        FROM public.player_transfers tr WHERE cid IN (tr.sender_id, tr.recipient_id) ORDER BY tr.created_at DESC LIMIT 10) x), '[]'::jsonb),
    'sent_today', COALESCE((SELECT sum(amount) FROM public.player_transfers WHERE sender_id = cid
        AND (created_at AT TIME ZONE 'UTC')::date = (public.game_now() AT TIME ZONE 'UTC')::date), 0),
    'threads', COALESCE((SELECT jsonb_agg(x ORDER BY x.last_at DESC) FROM (
        SELECT t.id, t.last_at, public.network_card(CASE WHEN t.a_id = cid THEN t.b_id ELSE t.a_id END) AS other,
          (SELECT body FROM public.player_messages m WHERE m.thread_id = t.id ORDER BY sent_at DESC LIMIT 1) AS last_body,
          (SELECT count(*) FROM public.player_messages m WHERE m.thread_id = t.id AND m.sender_id <> cid AND m.read_at IS NULL) AS unread
        FROM public.player_threads t WHERE cid IN (t.a_id, t.b_id)) x), '[]'::jsonb)
  );
END $$;

-- 7. Élections : chaque vote de joueur pèse un pourcentage de l'électorat --------------------------
DO $patch$ DECLARE def text; nd text; BEGIN
  SELECT pg_get_functiondef('public.refresh_election(uuid)'::regprocedure) INTO def;
  nd := replace(def, 'day_start date; npc_delta numeric;', 'day_start date; npc_delta numeric; pw integer;');
  IF nd = def THEN RAISE EXCEPTION 'Décompte : déclaration introuvable, rien n''est modifié'; END IF; def := nd;
  nd := replace(def, 'SELECT count(*) INTO player_votes FROM public.election_votes WHERE election_id=e.id;',
    'SELECT count(*) INTO player_votes FROM public.election_votes WHERE election_id=e.id; pw:=GREATEST(1,round(e.eligible_voters*(SELECT player_vote_percent FROM public.multiplayer_settings WHERE id=1)/100.0)::integer); player_votes:=player_votes*pw;');
  IF nd = def THEN RAISE EXCEPTION 'Décompte : comptage des joueurs introuvable, rien n''est modifié'; END IF; def := nd;
  nd := replace(def, '(SELECT count(*)::integer FROM public.election_votes v WHERE v.election_id=e.id AND v.candidacy_id=allocations.id)',
    '(SELECT count(*)::integer FROM public.election_votes v WHERE v.election_id=e.id AND v.candidacy_id=allocations.id)*pw');
  IF nd = def THEN RAISE EXCEPTION 'Décompte : répartition introuvable, rien n''est modifié'; END IF;
  EXECUTE nd;
END $patch$;

-- 8. Droits -----------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.network_blocked(uuid,uuid), public.guard_player_block(), public.transfer_collect(uuid), public.together_completed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_player(uuid,boolean), public.report_player(uuid,text,text), public.send_money(uuid,integer,text,uuid),
  public.invite_together(uuid,text), public.respond_together(uuid,boolean), public.cancel_together(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_player(uuid,boolean), public.report_player(uuid,text,text), public.send_money(uuid,integer,text,uuid),
  public.invite_together(uuid,text), public.respond_together(uuid,boolean), public.cancel_together(uuid) TO authenticated;

DO $$ BEGIN
  IF to_regclass('public.player_contacts') IS NULL THEN RAISE EXCEPTION 'P6 doit être installé avant P7'; END IF;
  IF position('*pw' IN pg_get_functiondef('public.refresh_election(uuid)'::regprocedure)) = 0 THEN RAISE EXCEPTION 'Retouche du décompte absente'; END IF;
  IF (SELECT count(*) FROM public.together_kinds) <> 5 THEN RAISE EXCEPTION 'Activités à plusieurs incomplètes'; END IF;
  IF (SELECT count(*) FROM public.events) < 81 THEN RAISE EXCEPTION 'Événements existants perdus'; END IF;
  RAISE NOTICE 'P7 installé : blocage, signalement, virements, activités à plusieurs, poids des votes joueurs';
END $$;

COMMIT;
