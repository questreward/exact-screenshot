-- CIVITAS 0126 : inviter des joueurs à visiter son logement (lecture seule de l'intérieur).
-- Prérequis : 0089, 0090 (aménagement), 0054 (blocages). Aucune écriture d'argent ni de meubles.
-- Le visiteur ne voit que : nom du logement, pièces et meubles posés. Tout ou rien.
BEGIN;

DO $$ BEGIN
  IF to_regprocedure('public.rental_furnishing_save(uuid,integer,jsonb,jsonb,uuid)') IS NULL THEN RAISE EXCEPTION '0126: installer 0090 d''abord'; END IF;
  IF to_regprocedure('public.network_blocked(uuid,uuid)') IS NULL THEN RAISE EXCEPTION '0126: installer 0054 d''abord'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.home_invites (
  owner_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  home_key text NOT NULL CHECK (length(home_key) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (owner_id, guest_id),
  CHECK (owner_id <> guest_id)
);
GRANT SELECT ON public.home_invites TO authenticated;
GRANT ALL ON public.home_invites TO service_role;
ALTER TABLE public.home_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS home_invites_parties ON public.home_invites;
CREATE POLICY home_invites_parties ON public.home_invites FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.characters c WHERE c.user_id = auth.uid() AND c.id IN (owner_id, guest_id)));

-- Layout of one home of a character, visitor-safe (no prices, no unplaced items).
CREATE OR REPLACE FUNCTION public.home_visit_layout(_owner uuid, _key text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r jsonb; lid uuid; aid uuid;
BEGIN
  IF _key LIKE 'rental:%' THEN
    lid := substring(_key FROM 8)::uuid;
    SELECT jsonb_build_object('name', l.title,
      'rooms', CASE WHEN ec.config->>'rooms' ~ '^[1-9][0-9]?$' THEN (ec.config->>'rooms')::integer ELSE 1 END,
      'room_names', COALESCE(rl.room_names, '[]'),
      'placements', COALESCE((SELECT jsonb_agg(jsonb_build_object('asset_id', p.asset_id, 'room', p.room, 'x', p.x, 'y', p.y, 'rotation', p.rotation))
        FROM public.rental_home_placements p WHERE p.lease_id = l.id AND p.character_id = _owner), '[]'),
      'furniture', COALESCE((SELECT jsonb_agg(jsonb_build_object('asset_id', a.id, 'name', ec2.name, 'visual', f.visual, 'width', f.width, 'height', f.height, 'placed_home', _key))
        FROM public.rental_home_placements p JOIN public.personal_assets a ON a.id = p.asset_id AND a.character_id = _owner
        JOIN public.economy_catalog ec2 ON ec2.id = a.catalog_id JOIN public.furnishing_catalog f ON f.catalog_id = a.catalog_id
        WHERE p.lease_id = l.id AND p.character_id = _owner), '[]'))
    INTO r FROM public.housing_leases l LEFT JOIN public.economy_catalog ec ON ec.id = l.property_id
      LEFT JOIN public.rental_home_layouts rl ON rl.lease_id = l.id AND rl.character_id = _owner
    WHERE l.id = lid AND l.character_id = _owner AND l.kind = 'location' AND l.status = 'actif' AND l.ended_at IS NULL;
  ELSE
    aid := _key::uuid;
    SELECT jsonb_build_object('name', ec.name,
      'rooms', CASE WHEN ec.config->>'rooms' ~ '^[1-9][0-9]?$' THEN (ec.config->>'rooms')::integer ELSE 1 END,
      'room_names', COALESCE(hl.room_names, '[]'),
      'placements', COALESCE((SELECT jsonb_agg(jsonb_build_object('asset_id', p.asset_id, 'room', p.room, 'x', p.x, 'y', p.y, 'rotation', p.rotation))
        FROM public.home_placements p WHERE p.home_asset_id = a.id AND p.character_id = _owner), '[]'),
      'furniture', COALESCE((SELECT jsonb_agg(jsonb_build_object('asset_id', i.id, 'name', ec2.name, 'visual', f.visual, 'width', f.width, 'height', f.height, 'placed_home', _key))
        FROM public.home_placements p JOIN public.personal_assets i ON i.id = p.asset_id AND i.character_id = _owner
        JOIN public.economy_catalog ec2 ON ec2.id = i.catalog_id JOIN public.furnishing_catalog f ON f.catalog_id = i.catalog_id
        WHERE p.home_asset_id = a.id AND p.character_id = _owner), '[]'))
    INTO r FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id
      LEFT JOIN public.home_layouts hl ON hl.home_asset_id = a.id AND hl.character_id = _owner
    WHERE a.id = aid AND a.character_id = _owner AND ec.config->>'realestate' = 'true';
  END IF;
  RETURN r;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.home_visit_layout(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.home_invite(_guest uuid, _home text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid() FOR UPDATE;
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  IF _guest IS NULL OR _guest = cid OR NOT EXISTS (SELECT 1 FROM public.characters WHERE id = _guest) THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  IF public.network_blocked(cid, _guest) THEN RAISE EXCEPTION 'Interaction impossible avec ce joueur'; END IF;
  IF public.home_visit_layout(cid, _home) IS NULL THEN RAISE EXCEPTION 'Logement non disponible'; END IF;
  INSERT INTO public.home_invites(owner_id, guest_id, home_key, expires_at) VALUES (cid, _guest, _home, now() + interval '7 days')
  ON CONFLICT (owner_id, guest_id) DO UPDATE SET home_key = EXCLUDED.home_key, created_at = now(), expires_at = EXCLUDED.expires_at;
END $$;

CREATE OR REPLACE FUNCTION public.home_invite_revoke(_guest uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid;
BEGIN
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  DELETE FROM public.home_invites WHERE (owner_id = cid AND guest_id = _guest) OR (guest_id = cid AND owner_id = _guest);
END $$;

CREATE OR REPLACE FUNCTION public.home_invitations() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid;
BEGIN
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  RETURN jsonb_build_object(
    'received', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.first_name || ' ' || c.last_name, 'expires_at', i.expires_at) ORDER BY i.created_at DESC)
      FROM public.home_invites i JOIN public.characters c ON c.id = i.owner_id
      WHERE i.guest_id = cid AND i.expires_at > now() AND NOT public.network_blocked(cid, i.owner_id)), '[]'),
    'sent', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.first_name || ' ' || c.last_name, 'expires_at', i.expires_at) ORDER BY i.created_at DESC)
      FROM public.home_invites i JOIN public.characters c ON c.id = i.guest_id
      WHERE i.owner_id = cid AND i.expires_at > now()), '[]'));
END $$;

CREATE OR REPLACE FUNCTION public.home_visit(_owner uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; k text; layout jsonb;
BEGIN
  SELECT id INTO cid FROM public.characters WHERE user_id = auth.uid();
  IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
  SELECT home_key INTO k FROM public.home_invites WHERE owner_id = _owner AND guest_id = cid AND expires_at > now();
  IF k IS NULL OR public.network_blocked(cid, _owner) THEN RAISE EXCEPTION 'Pas d''invitation pour ce logement'; END IF;
  layout := public.home_visit_layout(_owner, k);
  IF layout IS NULL THEN RAISE EXCEPTION 'Ce logement n''est plus disponible'; END IF;
  RETURN layout || jsonb_build_object('host', (SELECT first_name || ' ' || last_name FROM public.characters WHERE id = _owner),
    'grid', (SELECT grid_size FROM public.furnishing_settings WHERE id));
END $$;

REVOKE ALL ON FUNCTION public.home_invite(uuid, text), public.home_invite_revoke(uuid), public.home_invitations(), public.home_visit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.home_invite(uuid, text), public.home_invite_revoke(uuid), public.home_invitations(), public.home_visit(uuid) TO authenticated, service_role;

COMMIT;
