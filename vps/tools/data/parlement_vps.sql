root@VPS-U-47229:/data/civitas-live/app# cd /data/civitas-live/app && git pull && docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0056_player_press.sql && docker build -t civitas-web . && docker rm -f civitas-web && docker run -d --name civitas-web --restart unless-stopped --network civitas-net --env-file .env -p 127.0.0.1:3000:3000 civitas-web
remote: Enumerating objects: 164, done.
remote: Counting objects: 100% (164/164), done.
remote: Compressing objects: 100% (77/77), done.
remote: Total 142 (delta 66), reused 140 (delta 64), pack-reused 0 (from 0)
Receiving objects: 100% (142/142), 23.12 MiB | 9.97 MiB/s, done.
Resolving deltas: 100% (66/66), completed with 17 local objects.
From https://github.com/questreward/exact-screenshot
   ecdca04..0cf3b5e  main       -> origin/main
Updating ecdca04..0cf3b5e
Fast-forward
 public/tv/economie.mp4                  | Bin 0 -> 503521 bytes
 public/tv/logement.mp4                  | Bin 0 -> 310360 bytes
 public/tv/mairie.mp4                    | Bin 0 -> 337843 bytes
 public/tv/manif.mp4                     | Bin 0 -> 742937 bytes
 public/tv/meteo.mp4                     | Bin 0 -> 254105 bytes
 public/tv/parlement.mp4                 | Bin 0 -> 211346 bytes
 public/tv/societe.mp4                   | Bin 0 -> 481139 bytes
 public/tv/transport.mp4                 | Bin 0 -> 384218 bytes
 public/tv/ville-nuit.mp4                | Bin 0 -> 256823 bytes
 public/tv/vote.mp4                      | Bin 0 -> 206758 bytes
 src/assets/tv/j01.jpg                   | Bin 0 -> 58344 bytes
 src/assets/tv/j02.jpg                   | Bin 0 -> 84181 bytes
 src/assets/tv/j03.jpg                   | Bin 0 -> 114571 bytes
 src/assets/tv/j04.jpg                   | Bin 0 -> 104884 bytes
 src/assets/tv/j05.jpg                   | Bin 0 -> 127650 bytes
 src/assets/tv/j06.jpg                   | Bin 0 -> 94721 bytes
 src/assets/tv/j07.jpg                   | Bin 0 -> 73555 bytes
 src/assets/tv/j08.jpg                   | Bin 0 -> 102108 bytes
 src/assets/tv/j09.jpg                   | Bin 0 -> 98632 bytes
 src/assets/tv/j10.jpg                   | Bin 0 -> 97030 bytes
 src/assets/tv/j11.jpg                   | Bin 0 -> 138875 bytes
 src/assets/tv/j12.jpg                   | Bin 0 -> 105505 bytes
 src/assets/tv/j13.jpg                   | Bin 0 -> 131842 bytes
 src/assets/tv/j14.jpg                   | Bin 0 -> 115546 bytes
 src/assets/tv/j15.jpg                   | Bin 0 -> 63459 bytes
 src/assets/tv/j16.jpg                   | Bin 0 -> 97877 bytes
 src/assets/tv/j17.jpg                   | Bin 0 -> 121476 bytes
 src/components/game/GameShell.tsx       |   1 +
 src/components/game/LifeControls.tsx    |   2 +-
 src/game/navigation.ts                  |   1 +
 src/game/press.test.ts                  |   7 +
 src/game/press.ts                       |   8 +
 src/game/tv.test.ts                     |  16 +-
 src/game/tv.ts                          |  66 +++++++
 src/lib/press-moderation.functions.ts   |  26 +++
 src/routeTree.gen.ts                    |  21 ++
 src/routes/_authenticated/_game/jt.tsx  |  47 ++++-
 .../_authenticated/_game/presse.tsx     | 130 +++++++++++++
 src/services/game.ts                    |  29 +++
 vps/migrations/0056_player_press.sql    | 117 +++++++++++
 40 files changed, 460 insertions(+), 11 deletions(-)
 create mode 100644 public/tv/economie.mp4
 create mode 100644 public/tv/logement.mp4
 create mode 100644 public/tv/mairie.mp4
 create mode 100644 public/tv/manif.mp4
 create mode 100644 public/tv/meteo.mp4
 create mode 100644 public/tv/parlement.mp4
 create mode 100644 public/tv/societe.mp4
 create mode 100644 public/tv/transport.mp4
 create mode 100644 public/tv/ville-nuit.mp4
 create mode 100644 public/tv/vote.mp4
 create mode 100644 src/assets/tv/j01.jpg
 create mode 100644 src/assets/tv/j02.jpg
 create mode 100644 src/assets/tv/j03.jpg
 create mode 100644 src/assets/tv/j04.jpg
 create mode 100644 src/assets/tv/j05.jpg
 create mode 100644 src/assets/tv/j06.jpg
 create mode 100644 src/assets/tv/j07.jpg
 create mode 100644 src/assets/tv/j08.jpg
 create mode 100644 src/assets/tv/j09.jpg
 create mode 100644 src/assets/tv/j10.jpg
 create mode 100644 src/assets/tv/j11.jpg
 create mode 100644 src/assets/tv/j12.jpg
 create mode 100644 src/assets/tv/j13.jpg
 create mode 100644 src/assets/tv/j14.jpg
 create mode 100644 src/assets/tv/j15.jpg
 create mode 100644 src/assets/tv/j16.jpg
 create mode 100644 src/assets/tv/j17.jpg
 create mode 100644 src/game/press.test.ts
 create mode 100644 src/game/press.ts
 create mode 100644 src/lib/press-moderation.functions.ts
 create mode 100644 src/routes/_authenticated/_game/presse.tsx
 create mode 100644 vps/migrations/0056_player_press.sql
BEGIN
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
GRANT
GRANT
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
INSERT 0 1
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
REVOKE
GRANT
DO
COMMIT
[+] Building 170.6s (11/11) FINISHED          docker:default
 => [internal] load build definition from Dockerfile    0.0s
 => => transferring dockerfile: 291B                    0.0s
 => [internal] load metadata for docker.io/oven/bun:1-  0.7s
 => [internal] load .dockerignore                       0.1s
 => => transferring context: 2B                         0.0s
 => [internal] load build context                       0.6s
 => => transferring context: 30.00MB                    0.5s
 => [builder 1/5] FROM docker.io/oven/bun:1-alpine@sha  0.1s
 => => resolve docker.io/oven/bun:1-alpine@sha256:629e  0.1s
 => CACHED [builder 2/5] WORKDIR /app                   0.0s
 => [builder 3/5] COPY . .                              2.9s
 => [builder 4/5] RUN bun install --frozen-lockfile     5.8s
 => [builder 5/5] RUN bun run build                    30.1s
 => [stage-1 3/3] COPY --from=builder /app /app        29.7s
 => exporting to image                                 64.1s
 => => exporting layers                                50.0s
 => => exporting manifest sha256:790a7879c1b9d6a20aa28  0.1s
 => => exporting config sha256:8767d843e3a91c7457cb24a  0.0s
 => => exporting attestation manifest sha256:e2eb8d90f  0.1s
 => => exporting manifest list sha256:d522f930aaf22098  0.0s
 => => naming to docker.io/library/civitas-web:latest   0.0s
 => => unpacking to docker.io/library/civitas-web:lat  13.8s
civitas-web
ad8bb1530bdf341609d790217da016571837ce45ba70e8151203e23ebc5d4695
root@VPS-U-47229:/data/civitas-live/app# cd /data/civitas-live/app && git pull && docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0056_player_press.sql && docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0057_legislatives_base_2024.sql && docker build -t civitas-web . && docker rm -f civitas-web && docker run -d --name civitas-web --restart unless-stopped --network civitas-net --env-file .env -p 127.0.0.1:3000:3000 civitas-web
remote: Enumerating objects: 77, done.
remote: Counting objects: 100% (77/77), done.
remote: Compressing objects: 100% (19/19), done.
remote: Total 60 (delta 43), reused 58 (delta 41), pack-reused 0 (from 0)
Unpacking objects: 100% (60/60), 243.01 KiB | 2.86 MiB/s, done.
From https://github.com/questreward/exact-screenshot
   0cf3b5e..cd56b4d  main       -> origin/main
Updating 0cf3b5e..cd56b4d
Fast-forward
 ...ns-deux-tours-base-20-2026-10-19.md" |   31 +
 public/geo/legislatives-2024.json       |    1 +
 src/components/game/FranceMap.tsx       |   11 +-
 src/game/legislatives.test.ts           |   13 +
 src/game/legislatives.ts                |   17 +
 .../_authenticated/_game/france.tsx     |   36 +-
 .../0057_legislatives_base_2024.sql     | 6007 ++++++++++++
 vps/tools/build_legislatives_2024.py    |  103 +
 vps/tools/data/legislatives2024_t1.csv  |  578 ++
 vps/tools/data/legislatives2024_t2.csv  |  502 +
 10 files changed, 7296 insertions(+), 3 deletions(-)
 create mode 100644 ".lovable/plan/l\303\251gislatives-r\303\251elles-577-circonscriptions-deux-tours-base-20-2026-10-19.md"
 create mode 100644 public/geo/legislatives-2024.json
 create mode 100644 src/game/legislatives.test.ts
 create mode 100644 src/game/legislatives.ts
 create mode 100644 vps/migrations/0057_legislatives_base_2024.sql
 create mode 100644 vps/tools/build_legislatives_2024.py
 create mode 100644 vps/tools/data/legislatives2024_t1.csv
 create mode 100644 vps/tools/data/legislatives2024_t2.csv
BEGIN
ERROR:  relation "press_settings" already exists
root@VPS-U-47229:/data/civitas-live/app# cd /data/civitas-live/app && docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0057_legislatives_base_2024.sql && docker build -t civitas-web . && docker rm -f civitas-web && docker run -d --name civitas-web --restart unless-stopped --network civitas-net --env-file .env -p 127.0.0.1:3000:3000 civitas-web
BEGIN
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
GRANT
GRANT
ALTER TABLE
CREATE POLICY
ALTER TABLE
CREATE POLICY
ALTER TABLE
CREATE POLICY
ALTER TABLE
CREATE POLICY
INSERT 0 22
INSERT 0 577
INSERT 0 4800
INSERT 0 577
DO
COMMIT
[+] Building 173.9s (11/11) FINISHED          docker:default
 => [internal] load build definition from Dockerfile    0.0s
 => => transferring dockerfile: 291B                    0.0s
 => [internal] load metadata for docker.io/oven/bun:1-  0.6s
 => [internal] load .dockerignore                       0.0s
 => => transferring context: 2B                         0.0s
 => [internal] load build context                       0.2s
 => => transferring context: 1.35MB                     0.2s
 => [builder 1/5] FROM docker.io/oven/bun:1-alpine@sha  0.1s
 => => resolve docker.io/oven/bun:1-alpine@sha256:629e  0.0s
 => CACHED [builder 2/5] WORKDIR /app                   0.0s
 => [builder 3/5] COPY . .                              1.5s
 => [builder 4/5] RUN bun install --frozen-lockfile     8.2s
 => [builder 5/5] RUN bun run build                    30.2s
 => [stage-1 3/3] COPY --from=builder /app /app        30.7s
 => exporting to image                                 71.9s
 => => exporting layers                                58.3s
 => => exporting manifest sha256:4a0003bbb80912f5cbe8c  0.0s
 => => exporting config sha256:d0931524b8c215642439756  0.1s
 => => exporting attestation manifest sha256:356632bea  0.1s
 => => exporting manifest list sha256:ba2b74139f685594  0.0s
 => => naming to docker.io/library/civitas-web:latest   0.0s
 => => unpacking to docker.io/library/civitas-web:lat  13.4s
civitas-web
a75721a3c6d409a2ee20175660426b0714c6efd1ef2483c08aa60ee2cd6d905c
root@VPS-U-47229:/data/civitas-live/app# docker exec civitas-db psql -U postgres -d civitas -At -c "select pg_get_functiondef(p.oid) || ';' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'national%' order by p.proname" > /root/parlement.sql && docker exec civitas-db psql -U postgres -d civitas -c "select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint where conrelid::regclass::text like '%national%' and contype='c'" >> /root/parlement.sql && wc -l /root/parlement.sql
882 /root/parlement.sql
root@VPS-U-47229:/data/civitas-live/app# cat /root/parlement.sql
CREATE OR REPLACE FUNCTION public.national_action(_command text, _request_id uuid, _input jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.characters; old public.national_requests; e public.national_elections; k public.national_candidacies; l public.national_laws; t public.national_law_templates; s public.national_sessions; seat public.national_seats; r jsonb; aid uuid; oid uuid; lid uuid; result jsonb; pp public.character_positions; loc public.locations; activity public.activities;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 SELECT * INTO c FROM public.characters WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 IF _request_id IS NULL OR _command IS NULL OR _input IS NULL OR jsonb_typeof(_input)<>'object' THEN RAISE EXCEPTION 'Demande invalide'; END IF;
 SELECT * INTO old FROM public.national_requests WHERE character_id=c.id AND request_id=_request_id;
 IF FOUND THEN
  IF old.command<>_command OR old.input<>_input THEN RAISE EXCEPTION 'Clé réutilisée avec une autre demande'; END IF;
  RETURN old.result;
 END IF;
 c:=public.national_actor();
 UPDATE public.activities SET status='completed' WHERE character_id=c.id AND type='national' AND status='running' AND end_time<=public.game_now();
 SELECT rules INTO r FROM public.national_settings WHERE id=1;
 CASE _command
 WHEN 'candidacy' THEN
  SELECT * INTO e FROM public.national_elections WHERE id=(_input->>'election_id')::uuid FOR UPDATE;
  IF NOT FOUND OR e.status IN('completed','cancelled') OR public.game_now()<e.candidacies_at OR public.game_now()>=e.candidacies_end_at THEN RAISE EXCEPTION 'Candidatures fermées'; END IF;
  oid:=(_input->>'organization_id')::uuid;
  IF jsonb_typeof(COALESCE(_input->'program','{}'::jsonb))<>'object' OR octet_length(COALESCE(_input->'program','{}'::jsonb)::text)>12000 THEN RAISE EXCEPTION 'Programme invalide'; END IF;
  IF NOT public.national_eligible(c.id,e.rules) OR NOT EXISTS(SELECT 1 FROM public.memberships m JOIN public.national_party_profiles p ON p.organization_id=m.organization_id JOIN public.organizations o ON o.id=m.organization_id WHERE m.character_id=c.id AND m.organization_id=oid AND m.status='active' AND o.kind='party' AND o.status='active' AND o.scope='national' AND (e.rules->'party_snapshot') ? oid::text) THEN RAISE EXCEPTION 'Conditions ou parti non remplis'; END IF;
  INSERT INTO public.national_candidacies(election_id,city_id,character_id,organization_id,display_name,program)
  VALUES(e.id,c.city_id,c.id,oid,c.first_name||' '||c.last_name,COALESCE(_input->'program','{}'::jsonb)) RETURNING id INTO lid;
  result:=jsonb_build_object('id',lid);
 WHEN 'program' THEN
  SELECT * INTO k FROM public.national_candidacies WHERE id=(_input->>'candidacy_id')::uuid AND character_id=c.id FOR UPDATE;
  SELECT * INTO e FROM public.national_elections WHERE id=k.election_id;
  IF k.id IS NULL OR e.status IN('completed','cancelled') OR k.status<>'accepted' OR public.game_now()<e.candidacies_at OR public.game_now()>=e.candidacies_end_at OR _input->'program' IS NULL OR jsonb_typeof(_input->'program')<>'object' OR octet_length((_input->'program')::text)>12000 THEN RAISE EXCEPTION 'Programme invalide ou période fermée'; END IF;
  UPDATE public.national_candidacies SET program=_input->'program' WHERE id=k.id;
  result:=jsonb_build_object('id',k.id);
 WHEN 'vote' THEN
  SELECT * INTO e FROM public.national_elections WHERE id=(_input->>'election_id')::uuid FOR UPDATE;
  IF NOT FOUND OR e.status IN('completed','cancelled') OR c.age<18 OR public.game_now()<e.vote_at OR public.game_now()>=e.vote_end_at THEN RAISE EXCEPTION 'Vote inaccessible'; END IF;
  SELECT * INTO k FROM public.national_candidacies WHERE id=(_input->>'candidacy_id')::uuid AND election_id=e.id AND city_id=c.city_id AND status='accepted' AND published_at<=public.game_now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidat de votre circonscription requis'; END IF;
  IF EXISTS(SELECT 1 FROM public.national_ballots WHERE election_id=e.id AND character_id=c.id AND candidacy_id<>k.id) THEN RAISE EXCEPTION 'Vote déjà enregistré, immuable'; END IF;
  INSERT INTO public.national_ballots(election_id,character_id,city_id,candidacy_id) VALUES(e.id,c.id,c.city_id,k.id) ON CONFLICT(election_id,character_id) DO NOTHING;
  result:=jsonb_build_object('voted',true);
 WHEN 'law' THEN
  SELECT ns.* INTO seat FROM public.national_seats ns JOIN public.national_legislatures nl ON nl.id=ns.legislature_id WHERE ns.character_id=c.id AND nl.starts_at<=public.game_now() AND nl.ends_at>public.game_now() ORDER BY ns.chamber LIMIT 1;
  IF seat.id IS NULL OR NOT public.national_eligible(c.id,r) THEN RAISE EXCEPTION 'Réservé à un parlementaire éligible'; END IF;
  SELECT * INTO t FROM public.national_law_templates WHERE id=_input->>'template_id' AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modèle non validé'; END IF;
  INSERT INTO public.national_laws(legislature_id,author_character_id,author_label,status,proposed_at)
  VALUES(seat.legislature_id,c.id,c.first_name||' '||c.last_name,'proposed',public.game_now()) RETURNING id INTO lid;
  INSERT INTO public.national_law_versions(law_id,version,template_id,title,description,category,effects,cost,delay_minutes,budget_allocations)
  VALUES(lid,1,t.id,_input->>'title',_input->>'description',t.category,t.effects,t.cost,t.delay_minutes,t.budget_allocations);
  result:=jsonb_build_object('id',lid);
 WHEN 'amend' THEN
  SELECT * INTO l FROM public.national_laws WHERE id=(_input->>'law_id')::uuid AND author_character_id=c.id FOR UPDATE;
  IF NOT FOUND OR l.status NOT IN('proposed','refused') OR EXISTS(SELECT 1 FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND status='open') OR NOT public.national_eligible(c.id,r) OR NOT EXISTS(SELECT 1 FROM public.national_seats ns JOIN public.national_legislatures nl ON nl.id=ns.legislature_id WHERE ns.character_id=c.id AND ns.legislature_id=l.legislature_id AND nl.ends_at>public.game_now()) THEN RAISE EXCEPTION 'Version non amendable'; END IF;
  SELECT * INTO t FROM public.national_law_templates WHERE id=_input->>'template_id' AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modèle non validé'; END IF;
  INSERT INTO public.national_law_versions(law_id,version,template_id,title,description,category,effects,cost,delay_minutes,budget_allocations)
  VALUES(l.id,l.current_version+1,t.id,_input->>'title',_input->>'description',t.category,t.effects,t.cost,t.delay_minutes,t.budget_allocations);
  UPDATE public.national_laws SET current_version=current_version+1,status='proposed',adopted_at=NULL WHERE id=l.id;
  result:=jsonb_build_object('id',l.id,'version',l.current_version+1);
 WHEN 'reserve_session' THEN
  SELECT * INTO s FROM public.national_sessions WHERE id=(_input->>'session_id')::uuid FOR UPDATE;
  SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
  SELECT * INTO seat FROM public.national_seats WHERE legislature_id=l.legislature_id AND chamber=s.chamber AND character_id=c.id;
  IF seat.id IS NULL OR s.id IS NULL OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version OR public.game_now()>=s.starts_at THEN RAISE EXCEPTION 'Séance inaccessible'; END IF;
  IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=c.id AND status IN('planned','running') AND start_time<s.ends_at AND end_time>s.starts_at) THEN RAISE EXCEPTION 'Chevauchement avec votre agenda'; END IF;
  -- Lieu administratif existant ; aucune téléportation ou modification des positions.
  SELECT ll.* INTO loc FROM public.locations ll JOIN public.districts dd ON dd.id=ll.district_id WHERE ll.city_id=c.city_id AND ll.kind IN('administration','mairie') AND ll.accessible AND dd.available ORDER BY ll.id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lieu de séance indisponible'; END IF;
  INSERT INTO public.activities(character_id,type,title,start_time,end_time,location_id,energy_cost,source_key)
  VALUES(c.id,'national','Séance nationale',s.starts_at,s.ends_at,loc.id,(r->>'session_energy')::int,'national-session:'||s.id) RETURNING id INTO aid;
  result:=jsonb_build_object('activity_id',aid);
 WHEN 'start_session' THEN
  -- Départ explicite ; aucune auto-présence et aucun règlement salaire/loyer.
  SELECT * INTO s FROM public.national_sessions WHERE id=(_input->>'session_id')::uuid FOR UPDATE;
  SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
  IF s.id IS NULL OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version OR public.game_now()<s.starts_at OR public.game_now()>=s.ends_at THEN RAISE EXCEPTION 'Séance inaccessible'; END IF;
  SELECT * INTO activity FROM public.activities WHERE character_id=c.id AND type='national' AND source_key='national-session:'||s.id AND status IN('planned','running') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Réservation requise'; END IF;
  IF activity.status='running' THEN
   result:=jsonb_build_object('activity_id',activity.id);
  ELSE
   IF EXISTS(SELECT 1 FROM public.activities WHERE character_id=c.id AND status='running') OR EXISTS(SELECT 1 FROM public.activities WHERE character_id=c.id AND id<>activity.id AND status='planned' AND start_time<activity.end_time AND end_time>public.game_now()) THEN RAISE EXCEPTION 'Votre agenda est occupé'; END IF;
   SELECT * INTO pp FROM public.character_positions WHERE character_id=c.id;
   IF pp.location_id IS DISTINCT FROM activity.location_id OR NOT EXISTS(SELECT 1 FROM public.locations ll JOIN public.districts dd ON dd.id=ll.district_id WHERE ll.id=activity.location_id AND ll.city_id=c.city_id AND ll.accessible AND dd.available AND ll.kind IN('administration','mairie')) THEN RAISE EXCEPTION 'Rejoignez le lieu administratif prévu'; END IF;
   IF c.energy<activity.energy_cost THEN RAISE EXCEPTION 'Énergie insuffisante'; END IF;
   -- Seule écriture sur personnage : coût d’énergie de LA séance autorisée.
   UPDATE public.characters SET energy=energy-activity.energy_cost WHERE id=c.id;
   -- Autorisation privée persistée dans la même transaction avant la transition.
   INSERT INTO public.national_requests(character_id,request_id,command,input,result)
   VALUES(c.id,_request_id,_command,_input,jsonb_build_object('activity_id',activity.id));
   UPDATE public.activities SET status='running' WHERE id=activity.id;
   result:=jsonb_build_object('activity_id',activity.id);
  END IF;
 WHEN 'parliament_vote' THEN
  SELECT * INTO s FROM public.national_sessions WHERE id=(_input->>'session_id')::uuid FOR UPDATE;
  SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
  SELECT * INTO seat FROM public.national_seats WHERE legislature_id=l.legislature_id AND chamber=s.chamber AND character_id=c.id;
  IF seat.id IS NULL OR s.id IS NULL OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version OR public.game_now()<s.starts_at OR public.game_now()>=s.ends_at OR _input->>'vote' IS NULL OR _input->>'vote' NOT IN('yes','no','abstain') THEN RAISE EXCEPTION 'Vote parlementaire inaccessible'; END IF;
  SELECT a.id INTO aid FROM public.activities a WHERE a.character_id=c.id AND a.source_key='national-session:'||s.id AND a.status='running' AND a.start_time<=public.game_now() AND a.end_time>public.game_now();
  IF aid IS NULL OR NOT EXISTS(SELECT 1 FROM public.activities a JOIN public.character_positions p ON p.character_id=a.character_id AND p.location_id=a.location_id WHERE a.id=aid AND a.type='national') THEN RAISE EXCEPTION 'Présence à la séance requise'; END IF;
  IF EXISTS(SELECT 1 FROM public.national_parliamentary_votes WHERE session_id=s.id AND seat_id=seat.id AND vote<>_input->>'vote') THEN RAISE EXCEPTION 'Vote parlementaire déjà enregistré, immuable'; END IF;
  INSERT INTO public.national_parliamentary_votes(session_id,seat_id,character_id,activity_id,vote) VALUES(s.id,seat.id,c.id,aid,_input->>'vote') ON CONFLICT(session_id,seat_id) DO NOTHING;
  result:=jsonb_build_object('voted',true);
 ELSE RAISE EXCEPTION 'Commande nationale inconnue';
 END CASE;
 IF NOT EXISTS(SELECT 1 FROM public.national_requests WHERE character_id=c.id AND request_id=_request_id) THEN
  INSERT INTO public.national_requests(character_id,request_id,command,input,result) VALUES(c.id,_request_id,_command,_input,result);
 END IF;
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_activity_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s public.national_sessions; l public.national_laws;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.type='national' THEN RAISE EXCEPTION 'Historique de séance immuable'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.type='national' AND NEW.type IS DISTINCT FROM OLD.type THEN RAISE EXCEPTION 'Type national immuable'; END IF;
 IF NEW.type<>'national' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN RAISE EXCEPTION 'Séance nationale immuable'; END IF;
  IF NOT (NEW.status=OLD.status OR (OLD.status='planned' AND NEW.status IN('running','cancelled')) OR (OLD.status='running' AND NEW.status='completed')) THEN RAISE EXCEPTION 'Transition de séance interdite'; END IF;
 END IF;
 IF NEW.source_key IS NULL OR NEW.source_key NOT LIKE 'national-session:%' OR NEW.economy_payload IS DISTINCT FROM '{}'::jsonb OR NEW.target_location_id IS NOT NULL OR NEW.organization_event_id IS NOT NULL OR NEW.social_npc_id IS NOT NULL OR NEW.campaign_action_id IS NOT NULL OR NEW.governance_action_id IS NOT NULL OR NEW.travel_delay_minutes IS DISTINCT FROM 0 OR cardinality(NEW.travel_event_ids) IS DISTINCT FROM 0 OR NEW.reward IS DISTINCT FROM 0 OR NEW.money_cost IS DISTINCT FROM 0 OR NEW.energy_gain IS DISTINCT FROM 0 OR NEW.progression_gain IS DISTINCT FROM 0 OR NEW.political_reputation_gain IS DISTINCT FROM 0 OR NEW.political_influence_gain IS DISTINCT FROM 0 OR NEW.political_engagement_gain IS DISTINCT FROM 0 OR NEW.social_reputation_gain IS DISTINCT FROM 0 OR NEW.social_influence_gain IS DISTINCT FROM 0 OR NEW.social_relation_gain IS DISTINCT FROM 0 OR NEW.civic_engagement_gain IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Activité nationale invalide'; END IF;
 SELECT * INTO s FROM public.national_sessions WHERE id=substring(NEW.source_key from 18)::uuid;
 SELECT * INTO l FROM public.national_laws WHERE id=s.law_id;
 IF s.id IS NULL OR NEW.start_time<>s.starts_at OR NEW.end_time<>s.ends_at OR NEW.energy_cost IS DISTINCT FROM (SELECT (rules->>'session_energy')::int FROM public.national_settings WHERE id=1) THEN RAISE EXCEPTION 'Séance invalide'; END IF;
 IF (TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.status='running' AND OLD.status<>'running')) AND NOT EXISTS(SELECT 1 FROM public.national_seats ns JOIN public.national_legislatures nl ON nl.id=ns.legislature_id WHERE ns.legislature_id=l.legislature_id AND ns.chamber=s.chamber AND ns.character_id=NEW.character_id AND nl.starts_at<=NEW.start_time AND nl.ends_at>=NEW.end_time) THEN RAISE EXCEPTION 'Mandat de séance invalide'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'planned' OR NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) OR public.game_now()>=s.starts_at OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version THEN RAISE EXCEPTION 'Réservation nationale invalide'; END IF;
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
  IF NEW.status='running' AND NOT EXISTS(SELECT 1 FROM public.national_requests nr WHERE nr.character_id=NEW.character_id AND nr.command='start_session' AND nr.input->>'session_id'=s.id::text AND nr.result->>'activity_id'=NEW.id::text) THEN RAISE EXCEPTION 'Démarrage national explicite requis'; END IF;
  IF NEW.status='running' AND (public.game_now()<s.starts_at OR public.game_now()>=s.ends_at OR s.status<>'open' OR l.status NOT IN('proposed','examining') OR l.current_version<>s.version) THEN RAISE EXCEPTION 'Séance fermée ou ancienne version'; END IF;
  IF NEW.status='completed' AND public.game_now()<s.ends_at THEN RAISE EXCEPTION 'Séance non terminée'; END IF;
 END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_actor()
 RETURNS characters
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.characters;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 SELECT * INTO c FROM public.characters WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 RETURN c;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_allocate_simulated(_lid uuid, _chamber text, _weights jsonb, _count integer, _offset integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.national_legislatures; e public.national_elections; approved jsonb; x record; total numeric; gid uuid; n integer; seat_index integer:=5;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 IF _chamber IS DISTINCT FROM 'assembly' OR _count IS DISTINCT FROM 45 OR _offset IS DISTINCT FROM 5 THEN RAISE EXCEPTION 'Répartition du Sénat non validée ; seule Assemblée 45+5 autorisée'; END IF;
 SELECT * INTO l FROM public.national_legislatures WHERE id=_lid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Législature introuvable'; END IF;
 SELECT * INTO e FROM public.national_elections WHERE id=l.election_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scrutin introuvable'; END IF;
 SELECT jsonb_object_agg(key,(value->>'weight')::numeric) INTO approved FROM jsonb_each(e.rules->'party_snapshot');
 IF approved IS NULL OR _weights IS DISTINCT FROM approved THEN RAISE EXCEPTION 'Poids différents de l’instantané électoral'; END IF;
 IF (SELECT count(*) FROM public.national_seats WHERE legislature_id=l.id AND chamber='assembly' AND seat_no<=5)<>5 THEN RAISE EXCEPTION 'Cinq gagnants territoriaux réels requis avant le complément simulé'; END IF;
 IF EXISTS(SELECT 1 FROM public.national_seats WHERE legislature_id=l.id AND chamber='assembly' AND seat_no>5) THEN
  IF (SELECT count(*) FROM public.national_seats WHERE legislature_id=l.id AND chamber='assembly' AND seat_no>5)=45 THEN RETURN; END IF;
  RAISE EXCEPTION 'Répartition partielle incohérente';
 END IF;
 SELECT sum(value::numeric) INTO total FROM jsonb_each_text(approved);
 IF total IS NULL OR total<=0 THEN RAISE EXCEPTION 'Poids manquants'; END IF;
 -- Plus forts restes exacts en NUMERIC, pas de flottants ni de tirage au rattrapage.
 -- Départage proposé transparent : MD5(graine UUID || ':' || UUID parti),
 -- ordre hexadécimal croissant, UUID en dernier recours si collision.
 FOR x IN WITH weights AS (SELECT key::uuid oid,value::numeric w FROM jsonb_each_text(approved)),
 quotas AS (SELECT oid,((45*w-mod(45*w,total))/total)::int base,mod(45*w,total) remainder FROM weights),
 ordered AS (SELECT *,row_number() OVER(ORDER BY remainder DESC,md5(e.tie_seed::text||':'||oid::text),oid) rn,45-sum(base) OVER() remaining FROM quotas)
 SELECT oid,base+CASE WHEN rn<=remaining THEN 1 ELSE 0 END seats FROM ordered ORDER BY oid LOOP
  SELECT id INTO gid FROM public.national_groups WHERE legislature_id=l.id AND chamber='assembly' AND organization_id=x.oid;
  IF gid IS NULL THEN
   INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name,support)
   SELECT l.id,'assembly',o.id,o.name,NULL FROM public.organizations o WHERE o.id=x.oid RETURNING id INTO gid;
   -- Aucune préférence de vote inventée ; clôture simulée toujours bloquée.
  END IF;
  IF gid IS NULL THEN RAISE EXCEPTION 'Parti introuvable'; END IF;
  FOR n IN 1..x.seats LOOP
   seat_index:=seat_index+1;
   INSERT INTO public.national_seats(legislature_id,chamber,seat_no,group_id,display_name,simulated)
   VALUES(l.id,'assembly',seat_index,gid,'Siège simulé '||seat_index,true);
  END LOOP;
 END LOOP;
 IF seat_index<>50 THEN RAISE EXCEPTION 'Quarante-cinq sièges simulés requis'; END IF;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_apply_law(_law uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.national_laws; v public.national_law_versions; ci record; d record; cur integer; nxt integer; funds bigint; k text;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_laws WHERE id=_law FOR UPDATE;
 IF NOT FOUND OR l.status NOT IN('adopted','applied') THEN RETURN false; END IF;
 IF l.status='applied' THEN RETURN true; END IF;
 SELECT * INTO v FROM public.national_law_versions WHERE law_id=l.id AND version=l.current_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version de loi introuvable'; END IF;
 IF l.adopted_at IS NULL THEN RAISE EXCEPTION 'Date d’adoption manquante'; END IF;
 IF public.game_now()<l.adopted_at+interval '24 hours' THEN RETURN false; END IF;
 IF (SELECT count(DISTINCT chamber) FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND status='approved' AND yes_votes>=majority_required AND ends_at<=public.game_now())<>2 THEN RAISE EXCEPTION 'Deux majorités réelles sur la même version requises'; END IF;
 IF l.adopted_at IS DISTINCT FROM (SELECT max(ends_at) FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND status='approved') THEN RAISE EXCEPTION 'Date d’adoption incohérente avec les séances'; END IF;
 SELECT balance INTO funds FROM public.national_treasury WHERE id=1 FOR UPDATE;
 IF funds IS NULL OR funds<v.cost THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.national_budgets WHERE law_id=l.id) OR EXISTS(SELECT 1 FROM public.national_ledger WHERE law_id=l.id) OR EXISTS(SELECT 1 FROM public.national_city_effects WHERE law_id=l.id) THEN RAISE EXCEPTION 'Registre partiel incohérent : application refusée'; END IF;
 -- Tout ou rien : prévalidation de la présence de tous les indicateurs, ordre stable.
 IF EXISTS(SELECT 1 FROM public.national_constituencies c CROSS JOIN jsonb_each_text(v.effects) d WHERE NOT EXISTS(SELECT 1 FROM public.city_indicators i WHERE i.city_id=c.city_id AND i.indicator=d.key)) THEN RAISE EXCEPTION 'Indicateur de ville manquant'; END IF;
 INSERT INTO public.national_budgets(law_id,version,allocations,total,funded_at) VALUES(l.id,v.version,v.budget_allocations,v.cost,public.game_now());
 IF FOUND THEN
  UPDATE public.national_treasury SET balance=balance-v.cost WHERE id=1;
  INSERT INTO public.national_ledger(entry_key,law_id,version,amount,occurred_at) VALUES('law:'||l.id||':'||v.version,l.id,v.version,-v.cost,public.game_now());
 END IF;
 FOR ci IN SELECT city_id FROM public.national_constituencies ORDER BY city_id LOOP
  FOR d IN SELECT * FROM jsonb_each_text(v.effects) ORDER BY key LOOP
   SELECT value INTO cur FROM public.city_indicators WHERE city_id=ci.city_id AND indicator=d.key FOR UPDATE;
   nxt:=LEAST(100,GREATEST(0,cur+d.value::int));
   INSERT INTO public.national_city_effects(law_id,version,city_id,indicator,requested_delta,before_value,after_value,applied_at)
   VALUES(l.id,v.version,ci.city_id,d.key,d.value::int,cur,nxt,public.game_now());
   IF FOUND THEN
    UPDATE public.city_indicators SET value=nxt WHERE city_id=ci.city_id AND indicator=d.key;
    k:='national:'||l.id||':'||v.version||':'||ci.city_id;
    INSERT INTO public.indicator_history(city_id,indicator,before_value,after_value,effect_key,occurred_at) VALUES(ci.city_id,d.key,cur,nxt,k,public.game_now());
   END IF;
  END LOOP;
 END LOOP;
 UPDATE public.national_laws SET status='applied',applied_at=public.game_now() WHERE id=l.id;
 PERFORM public.national_publish('law-applied:'||l.id||':'||v.version,'Application d’une loi nationale',(SELECT title FROM public.national_law_templates WHERE id=v.template_id));
 RETURN true;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_candidate_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e public.national_elections;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Candidature conservée dans l’historique'; END IF;
 SELECT * INTO e FROM public.national_elections WHERE id=NEW.election_id;
 IF NOT FOUND OR NEW.organization_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.national_party_profiles p JOIN public.organizations o ON o.id=p.organization_id WHERE p.organization_id=NEW.organization_id AND o.kind='party' AND o.status='active' AND (e.rules->'party_snapshot') ? o.id::text) THEN RAISE EXCEPTION 'Candidature indépendante/non configurée interdite'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'program'-'published_at') IS DISTINCT FROM (to_jsonb(OLD)-'program'-'published_at') THEN RAISE EXCEPTION 'Candidature figée'; END IF;
  IF NEW.published_at IS DISTINCT FROM OLD.published_at AND (OLD.published_at IS NOT NULL OR public.game_now()<e.candidacies_end_at) THEN RAISE EXCEPTION 'Publication unique à la clôture des candidatures'; END IF;
  IF NEW.program IS DISTINCT FROM OLD.program AND public.game_now()>=e.candidacies_end_at THEN RAISE EXCEPTION 'Programme figé'; END IF;
 END IF;
 IF TG_OP='INSERT' AND (NEW.published_at IS NOT NULL OR NEW.fictional_votes<>0) THEN RAISE EXCEPTION 'Candidature initiale invalide'; END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_close_session(_sid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s public.national_sessions; l public.national_laws; v public.national_law_versions; y integer:=0; nn integer:=0; a integer:=0; st record; vote text; ok boolean; title text;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO s FROM public.national_sessions WHERE id=_sid FOR UPDATE;
 IF NOT FOUND OR s.status<>'open' OR public.game_now()<s.ends_at THEN RETURN; END IF;
 SELECT * INTO l FROM public.national_laws WHERE id=s.law_id FOR UPDATE;
 SELECT * INTO v FROM public.national_law_versions WHERE law_id=s.law_id AND version=s.version;
 FOR st IN SELECT ns.id, ns.character_id, g.organization_id FROM jsonb_array_elements(s.electorate) x
   JOIN public.national_seats ns ON ns.id=(x->>'seat_id')::uuid JOIN public.national_groups g ON g.id=ns.group_id LOOP
  IF st.character_id IS NOT NULL THEN
   SELECT pv.vote INTO vote FROM public.national_parliamentary_votes pv WHERE pv.session_id=s.id AND pv.seat_id=st.id;
  ELSE
   SELECT p.vote INTO vote FROM public.national_law_positions p WHERE p.template_id=v.template_id AND p.party_key=COALESCE(st.organization_id::text,'divers');
  END IF;
  IF vote='yes' THEN y:=y+1; ELSIF vote='no' THEN nn:=nn+1; ELSE a:=a+1; END IF;
  vote:=NULL;
 END LOOP;
 ok:= y>=s.majority_required;
 UPDATE public.national_sessions SET status=CASE WHEN ok THEN 'approved' ELSE 'rejected' END, yes_votes=y, no_votes=nn, abstentions=a WHERE id=s.id;
 UPDATE public.activities SET status='completed' WHERE type='national' AND source_key='national-session:'||s.id AND status='running';
 UPDATE public.activities SET status='cancelled' WHERE type='national' AND source_key='national-session:'||s.id AND status='planned';
 title:=v.title||' — '||CASE s.chamber WHEN 'assembly' THEN 'Assemblée' ELSE 'Sénat' END;
 IF NOT ok THEN
  UPDATE public.national_laws SET status='refused' WHERE id=l.id;
  PERFORM public.national_publish('session:'||s.id,'Loi rejetée : '||title, y||' pour, '||nn||' contre, '||a||' abstentions.');
 ELSE
  PERFORM public.national_publish('session:'||s.id,'Loi approuvée : '||title, y||' pour, '||nn||' contre, '||a||' abstentions.');
  IF (SELECT count(DISTINCT chamber) FROM public.national_sessions WHERE law_id=l.id AND version=s.version AND status='approved')=2 THEN
   UPDATE public.national_laws SET status='adopted', adopted_at=(SELECT max(ends_at) FROM public.national_sessions WHERE law_id=l.id AND version=s.version AND status='approved') WHERE id=l.id;
   PERFORM public.national_publish('law-adopted:'||l.id||':'||s.version,'Loi adoptée par le Parlement',v.title||' entrera en vigueur dans 24 heures.');
  END IF;
 END IF;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_compose_senate(_lid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.national_legislatures; e public.national_elections; source jsonb; weights jsonb; at_time timestamptz:=public.game_now(); x record; gid uuid; n integer; seat_index integer:=0; total numeric;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_legislatures WHERE id=_lid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Législature introuvable'; END IF;
 IF l.senate_composed_at IS NOT NULL THEN RETURN true; END IF;
 IF at_time<l.starts_at OR at_time>=l.ends_at THEN RETURN false; END IF;
 SELECT * INTO e FROM public.national_elections WHERE id=l.election_id;
 SELECT jsonb_agg(jsonb_build_object('mandate_id',m.id,'group_id',g.id,'organization_id',g.organization_id,'seats',g.seats) ORDER BY m.id,g.id)
 INTO source FROM public.municipal_mandates m JOIN public.municipal_council_groups g ON g.mandate_id=m.id
 WHERE m.status='active' AND m.starts_at<=at_time AND m.ends_at>at_time AND g.seats>0;
 IF source IS NULL THEN
  source:=jsonb_build_array(jsonb_build_object('initial_fictional_senate',true));
  SELECT jsonb_object_agg(k,1) INTO weights FROM (SELECT p.organization_id::text k FROM public.national_party_profiles p UNION ALL SELECT 'divers') q;
 ELSE
  SELECT jsonb_object_agg(k,s) INTO weights FROM (
   SELECT CASE WHEN p.organization_id IS NULL THEN 'divers' ELSE p.organization_id::text END k, sum((src.value->>'seats')::int) s
   FROM jsonb_array_elements(source) src LEFT JOIN public.national_party_profiles p ON p.organization_id=(src.value->>'organization_id')::uuid
   GROUP BY 1) q;
 END IF;
 SELECT sum(value::numeric) INTO total FROM jsonb_each_text(weights);
 FOR x IN WITH w AS (SELECT key k, value::numeric v FROM jsonb_each_text(weights)),
  q AS (SELECT k,((25*v-mod(25*v,total))/total)::int base, mod(25*v,total) rem FROM w),
  o AS (SELECT *, row_number() OVER (ORDER BY rem DESC, md5(e.tie_seed::text||':senate:'||k), k) rn, 25-sum(base) OVER () remaining FROM q)
  SELECT k, base+CASE WHEN rn<=remaining THEN 1 ELSE 0 END seats FROM o ORDER BY k LOOP
  CONTINUE WHEN x.seats=0;
  IF x.k='divers' THEN
   INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name) VALUES(l.id,'senate',NULL,'Divers') RETURNING id INTO gid;
  ELSE
   INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name)
   SELECT l.id,'senate',o.id,o.name FROM public.organizations o WHERE o.id=x.k::uuid RETURNING id INTO gid;
  END IF;
  FOR n IN 1..x.seats LOOP
   seat_index:=seat_index+1;
   INSERT INTO public.national_seats(legislature_id,chamber,seat_no,group_id,display_name,simulated)
   VALUES(l.id,'senate',seat_index,gid,'Sénateur '||seat_index,true);
  END LOOP;
 END LOOP;
 IF seat_index<>25 THEN RAISE EXCEPTION 'Vingt-cinq sièges de Sénat requis'; END IF;
 UPDATE public.national_legislatures SET senate_composed_at=at_time, senate_source=source WHERE id=l.id;
 PERFORM public.national_publish('senate:'||l.id,'Le Sénat est constitué','Les 25 sièges du Sénat ont été attribués pour la nouvelle législature.');
 RETURN true;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_configure(_rules jsonb, _enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE approved jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT rules INTO approved FROM public.national_settings WHERE id=1;
 IF _rules IS DISTINCT FROM approved THEN RAISE EXCEPTION 'Les paramètres validés sont figés ; nouvelle proposition requise'; END IF;
 IF _enabled IS NULL THEN RAISE EXCEPTION 'Activation explicite requise'; END IF;
 UPDATE public.national_settings SET enabled=_enabled WHERE id=1;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_count_election(_eid uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e public.national_elections; lid uuid; city record; win_party uuid; win_cand uuid; npc public.social_npcs; seat_no integer:=0; weights jsonb; gid uuid; k public.national_candidacies;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO e FROM public.national_elections WHERE id=_eid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scrutin introuvable'; END IF;
 IF e.counted_at IS NOT NULL THEN SELECT id INTO lid FROM public.national_legislatures WHERE election_id=e.id; RETURN lid; END IF;
 IF public.game_now()<e.vote_end_at THEN RAISE EXCEPTION 'Vote en cours'; END IF;

 INSERT INTO public.national_legislatures(election_id,starts_at,ends_at) VALUES(e.id,e.vote_end_at,e.term_end_at) RETURNING id INTO lid;
 INSERT INTO public.national_groups(legislature_id,chamber,organization_id,name)
 SELECT lid,'assembly',o.id,o.name FROM jsonb_each(e.rules->'party_snapshot') s JOIN public.organizations o ON o.id=s.key::uuid ORDER BY o.id;

 FOR city IN SELECT city_id FROM public.national_constituencies ORDER BY city_id LOOP
  seat_no:=seat_no+1;
  -- Parti en tête : voix fictives (unité du parti ÷ 5 villes) + bulletins des joueurs.
  SELECT s.key::uuid INTO win_party FROM jsonb_each(e.rules->'party_snapshot') s
  ORDER BY ((s.value->>'fictional_votes')::int/5) + (SELECT count(*) FROM public.national_ballots b JOIN public.national_candidacies c ON c.id=b.candidacy_id WHERE b.election_id=e.id AND b.city_id=city.city_id AND c.organization_id=s.key::uuid) DESC,
   md5(e.tie_seed::text||':'||city.city_id||':'||s.key), s.key LIMIT 1;
  -- Meilleur candidat joueur de ce parti dans la ville.
  SELECT c.id INTO win_cand FROM public.national_candidacies c
  WHERE c.election_id=e.id AND c.city_id=city.city_id AND c.organization_id=win_party AND c.status='accepted' AND c.character_id IS NOT NULL
  ORDER BY (SELECT count(*) FROM public.national_ballots b WHERE b.candidacy_id=c.id) DESC, md5(e.tie_seed::text||':'||c.id), c.id LIMIT 1;
  IF win_cand IS NULL THEN
   SELECT n.* INTO npc FROM public.social_npcs n
   WHERE n.organization_id=win_party AND NOT EXISTS(SELECT 1 FROM public.national_candidacies c WHERE c.election_id=e.id AND c.npc_id=n.id)
   ORDER BY (n.city_id=city.city_id) DESC, n.influence DESC NULLS LAST, n.id LIMIT 1;
   IF npc.id IS NULL THEN RAISE EXCEPTION 'Aucun candidat fictif disponible pour ce parti'; END IF;
   INSERT INTO public.national_candidacies(election_id,city_id,npc_id,organization_id,display_name)
   VALUES(e.id,city.city_id,npc.id,win_party,npc.first_name||' '||npc.last_name) RETURNING id INTO win_cand;
  END IF;
  INSERT INTO public.national_results(election_id,city_id,candidacy_id,player_votes,fictional_votes,rank)
  SELECT e.id, city.city_id, r.id, r.pv, r.fv, row_number() OVER (ORDER BY (r.id=win_cand) DESC, r.pv+r.fv DESC, md5(e.tie_seed::text||':'||r.id), r.id)
  FROM (SELECT c.id,
    (SELECT count(*) FROM public.national_ballots b WHERE b.candidacy_id=c.id)::int pv,
    CASE WHEN c.id=win_cand THEN ((e.rules->'party_snapshot'->c.organization_id::text->>'fictional_votes')::int/5) ELSE 0 END fv
   FROM public.national_candidacies c WHERE c.election_id=e.id AND c.city_id=city.city_id AND c.status='accepted') r;
  SELECT * INTO k FROM public.national_candidacies WHERE id=win_cand;
  SELECT id INTO gid FROM public.national_groups WHERE legislature_id=lid AND chamber='assembly' AND organization_id=win_party;
  INSERT INTO public.national_seats(legislature_id,chamber,seat_no,group_id,city_id,character_id,npc_id,display_name,simulated)
  VALUES(lid,'assembly',seat_no,gid,city.city_id,k.character_id,k.npc_id,k.display_name,k.character_id IS NULL);
  win_cand:=NULL; npc:=NULL;
 END LOOP;

 SELECT jsonb_object_agg(key,(value->>'weight')::numeric) INTO weights FROM jsonb_each(e.rules->'party_snapshot');
 PERFORM public.national_allocate_simulated(lid,'assembly',weights,45,5);
 UPDATE public.national_elections SET status='completed', counted_at=public.game_now() WHERE id=e.id;
 RETURN lid;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_create_election(_name text, _candidacies_at timestamp with time zone, _candidacies_end timestamp with time zone, _vote_at timestamp with time zone, _vote_end timestamp with time zone, _term_end timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE eid uuid; prev public.national_elections; snapshot jsonb; settings jsonb; at_time timestamptz:=public.game_now();
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 IF _name IS NULL OR length(btrim(_name)) NOT BETWEEN 3 AND 120 OR _candidacies_at IS NULL OR _candidacies_at<=at_time
 OR _candidacies_end IS DISTINCT FROM _candidacies_at+interval '7 days'
 OR _vote_at IS DISTINCT FROM _candidacies_end+interval '1 day'
 OR _vote_end IS DISTINCT FROM _vote_at+interval '2 days'
 OR _term_end IS DISTINCT FROM _vote_end+interval '28 days' THEN RAISE EXCEPTION 'Calendrier national requis : 7+1+2 jours, mandat 28 jours après clôture'; END IF;
 SELECT * INTO prev FROM public.national_elections WHERE status<>'cancelled' ORDER BY candidacies_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF prev.status<>'completed' OR at_time<prev.term_end_at-interval '10 days' OR at_time>=prev.term_end_at
  OR _candidacies_at<prev.term_end_at-interval '10 days' OR _candidacies_at>=prev.term_end_at
  THEN RAISE EXCEPTION 'Un successeur seulement, préparation et ouverture dans les dix derniers jours du mandat'; END IF;
 END IF;
 SELECT jsonb_object_agg(p.organization_id::text,jsonb_build_object('weight',p.simulation_weight,'fictional_votes',p.simulation_weight::bigint*100)) INTO snapshot
 FROM public.national_party_profiles p JOIN public.organizations o ON o.id=p.organization_id JOIN public.political_profiles pp ON pp.organization_id=o.id
 WHERE o.kind='party' AND o.status='active' AND o.scope='national';
 IF snapshot IS NULL OR (prev.id IS NULL AND (SELECT count(*) FROM jsonb_object_keys(snapshot))<>4)
 OR (prev.id IS NULL AND EXISTS(SELECT 1 FROM jsonb_each(snapshot) x WHERE (x.value->>'weight')::int<>1)) THEN RAISE EXCEPTION 'Quatre partis actifs de poids initial 1 requis'; END IF;
 SELECT rules INTO settings FROM public.national_settings WHERE id=1;
 INSERT INTO public.national_elections(name,candidacies_at,candidacies_end_at,vote_at,vote_end_at,term_end_at,rules,predecessor_id)
 VALUES(_name,_candidacies_at,_candidacies_end,_vote_at,_vote_end,_term_end,settings||jsonb_build_object('party_snapshot',snapshot),prev.id) RETURNING id INTO eid;
 RETURN eid;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_election_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Historique de scrutin immuable'; END IF;
 IF (to_jsonb(NEW)-'status'-'counted_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'counted_at') THEN RAISE EXCEPTION 'Dates, règles, poids et graine du scrutin figés'; END IF;
 IF OLD.counted_at IS NOT NULL AND NEW.counted_at IS DISTINCT FROM OLD.counted_at THEN RAISE EXCEPTION 'Dépouillement immuable'; END IF;
 IF OLD.status IN('completed','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Scrutin clôturé'; END IF;
 IF NEW.status='completed' AND NEW.counted_at IS NULL THEN RAISE EXCEPTION 'Dépouillement daté requis'; END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_eligible(_cid uuid, _rules jsonb, _office boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 -- Nomination joueur hors première version, même si ses statistiques suffisent.
 IF _office IS DISTINCT FROM false THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM public.characters c
 LEFT JOIN public.civic_stats cs ON cs.character_id=c.id
 LEFT JOIN public.political_stats ps ON ps.character_id=c.id
 WHERE c.id=_cid AND c.age>=18 AND COALESCE(cs.engagement,0)>=20
 AND COALESCE(ps.reputation,0)>=15 AND COALESCE(ps.influence,0)>=10);
END $function$
;
CREATE OR REPLACE FUNCTION public.national_form_government(_lid uuid, _president uuid, _pm uuid, _ministers jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.national_legislatures; gid uuid; x record; requested jsonb; stored jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 SELECT * INTO l FROM public.national_legislatures WHERE id=_lid FOR UPDATE;
 IF NOT FOUND OR public.game_now()<l.starts_at OR public.game_now()>=l.ends_at THEN RAISE EXCEPTION 'Législature inactive'; END IF;
 IF _president IS NULL OR _pm IS NULL OR jsonb_typeof(_ministers) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Six PNJ explicitement désignés requis'; END IF;
 IF jsonb_array_length(_ministers)<>4 OR EXISTS(SELECT 1 FROM jsonb_array_elements(_ministers) x WHERE jsonb_typeof(x) IS DISTINCT FROM 'object' OR COALESCE(length(btrim(x->>'ministry')),0)=0 OR x->>'npc_id' IS NULL) THEN RAISE EXCEPTION 'Quatre ministres nommés explicitement requis'; END IF;
 requested:=jsonb_build_array(jsonb_build_object('npc_id',_president,'role','president','ministry',''),jsonb_build_object('npc_id',_pm,'role','prime_minister','ministry',''))||
 (SELECT jsonb_agg(jsonb_build_object('npc_id',(x->>'npc_id')::uuid,'role','minister','ministry',btrim(x->>'ministry'))) FROM jsonb_array_elements(_ministers) x);
 IF (SELECT count(DISTINCT x->>'npc_id') FROM jsonb_array_elements(requested) x)<>6 OR (SELECT count(DISTINCT x->>'ministry') FROM jsonb_array_elements(requested) x WHERE x->>'role'='minister')<>4 THEN RAISE EXCEPTION 'PNJ et ministères distincts requis dans cette proposition'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(requested) x WHERE NOT EXISTS(SELECT 1 FROM public.social_npcs n WHERE n.id=(x->>'npc_id')::uuid)) THEN RAISE EXCEPTION 'PNJ existant introuvable'; END IF;
 SELECT id INTO gid FROM public.national_governments WHERE legislature_id=l.id;
 IF gid IS NOT NULL THEN
  SELECT jsonb_agg(jsonb_build_object('npc_id',npc_id,'role',role,'ministry',ministry) ORDER BY role,ministry,npc_id) INTO stored FROM public.national_offices WHERE government_id=gid;
  IF stored IS DISTINCT FROM (SELECT jsonb_agg(x ORDER BY x->>'role',x->>'ministry',x->>'npc_id') FROM jsonb_array_elements(requested) x) THEN RAISE EXCEPTION 'Gouvernement déjà constitué avec d’autres nominations'; END IF;
  RETURN gid;
 END IF;
 INSERT INTO public.national_governments(legislature_id,government_no,majority_group_id,starts_at,ends_at) VALUES(l.id,1,NULL,public.game_now(),l.ends_at) RETURNING id INTO gid;
 FOR x IN SELECT value FROM jsonb_array_elements(requested) LOOP
  INSERT INTO public.national_offices(government_id,role,ministry,npc_id,display_name,starts_at,ends_at)
  SELECT gid,x.value->>'role',x.value->>'ministry',n.id,n.first_name||' '||n.last_name,public.game_now(),l.ends_at FROM public.social_npcs n WHERE n.id=(x.value->>'npc_id')::uuid;
  PERFORM public.national_publish('nomination:'||gid||':'||(x.value->>'role')||':'||(x.value->>'ministry'),'Nomination nationale',
  (SELECT first_name||' '||last_name FROM public.social_npcs WHERE id=(x.value->>'npc_id')::uuid)||' — '||(x.value->>'role'));
 END LOOP;
 -- Proposition technique explicite : six personnes distinctes, mandat exécutif
 -- limité à cette législature ; remplacements non décidés donc interdits.
 RETURN gid;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_group_proposal(_group uuid, _template text, _title text, _description text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE g public.national_groups; t public.national_law_templates; lid uuid;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO g FROM public.national_groups WHERE id=_group;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.national_legislatures WHERE id=g.legislature_id AND starts_at<=public.game_now() AND ends_at>public.game_now()) THEN RAISE EXCEPTION 'Groupe inactif'; END IF;
 SELECT * INTO t FROM public.national_law_templates WHERE id=_template AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Modèle non validé'; END IF;
 INSERT INTO public.national_laws(legislature_id,author_group_id,author_label,status,proposed_at) VALUES(g.legislature_id,g.id,g.name,'proposed',public.game_now()) RETURNING id INTO lid;
 INSERT INTO public.national_law_versions(law_id,version,template_id,title,description,category,effects,cost,delay_minutes,budget_allocations)
 VALUES(lid,1,t.id,_title,_description,t.category,t.effects,t.cost,t.delay_minutes,t.budget_allocations);
 RETURN lid;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_install_activity_rule()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
 SELECT rules INTO r FROM public.national_settings WHERE id=1 AND enabled;
 IF r IS NULL THEN RAISE EXCEPTION 'Configuration non validée'; END IF;
 INSERT INTO public.life_rules(id,title,duration_minutes,energy_cost,allowed_kinds)
 VALUES('national','Séance nationale',(r->>'session_minutes')::int,(r->>'session_energy')::int,ARRAY['administration','mairie']);
END $function$
;
CREATE OR REPLACE FUNCTION public.national_law_terminal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Historique de loi immuable'; END IF;
 IF OLD.status='applied' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Loi appliquée immuable, une seule application par loi'; END IF;
 IF OLD.status='adopted' AND NEW.current_version IS DISTINCT FROM OLD.current_version THEN RAISE EXCEPTION 'Version adoptée figée'; END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_legislature_calendar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e public.national_elections;
BEGIN
 SELECT * INTO e FROM public.national_elections WHERE id=NEW.election_id;
 IF NOT FOUND OR NEW.starts_at IS DISTINCT FROM e.vote_end_at OR NEW.ends_at IS DISTINCT FROM e.term_end_at THEN RAISE EXCEPTION 'Mandat national ancré à la clôture du vote pour 28 jours'; END IF;
 IF TG_OP='INSERT' AND (NEW.senate_composed_at IS NOT NULL OR NEW.senate_source<>'[]'::jsonb) THEN RAISE EXCEPTION 'Sénat initialement non constitué'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'senate_composed_at'-'senate_source') IS DISTINCT FROM (to_jsonb(OLD)-'senate_composed_at'-'senate_source') THEN RAISE EXCEPTION 'Mandat national immuable'; END IF;
  IF OLD.senate_composed_at IS NOT NULL AND (NEW.senate_composed_at IS DISTINCT FROM OLD.senate_composed_at OR NEW.senate_source IS DISTINCT FROM OLD.senate_source) THEN RAISE EXCEPTION 'Sénat déjà constitué, immuable'; END IF;
  IF OLD.senate_composed_at IS NULL AND NEW.senate_composed_at IS NOT NULL AND NEW.senate_source='[]'::jsonb THEN RAISE EXCEPTION 'Source du Sénat requise'; END IF;
 END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_nominate(_gov uuid, _role text, _ministry text, _cid uuid, _npc uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 RAISE EXCEPTION 'Nomination individuelle/joueur et remplacement hors première version : utiliser la formation atomique des six PNJ';
END $function$
;
CREATE OR REPLACE FUNCTION public.national_open_session(_law uuid, _chamber text, _at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.national_laws; r jsonb; sid uuid; count_seats integer; electorate jsonb; finish timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 SELECT * INTO l FROM public.national_laws WHERE id=_law FOR UPDATE;
 SELECT rules INTO r FROM public.national_settings WHERE id=1 AND enabled;
 IF l.id IS NULL OR l.status NOT IN('proposed','examining') OR r IS NULL OR _at IS NULL OR _at<public.game_now() OR _chamber IS NULL OR _chamber NOT IN('assembly','senate') THEN RAISE EXCEPTION 'Séance invalide'; END IF;
 finish:=_at+(r->>'session_minutes')::int*interval '1 minute';
 IF EXISTS(SELECT 1 FROM public.national_constituencies c WHERE NOT EXISTS(SELECT 1 FROM public.locations ll JOIN public.districts dd ON dd.id=ll.district_id WHERE ll.city_id=c.city_id AND ll.kind IN('administration','mairie') AND ll.accessible AND dd.available)) THEN RAISE EXCEPTION 'Lieu administratif manquant : séances en attente, aucun lieu inventé'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.national_legislatures WHERE id=l.legislature_id AND starts_at<=_at AND ends_at>=finish) THEN RAISE EXCEPTION 'Séance hors mandat'; END IF;
 count_seats:=CASE WHEN _chamber='assembly' THEN 50 ELSE 25 END;
 SELECT jsonb_agg(jsonb_build_object('seat_id',s.id,'simulated',s.simulated,'support',g.support) ORDER BY s.seat_no) INTO electorate FROM public.national_seats s JOIN public.national_groups g ON g.id=s.group_id WHERE s.legislature_id=l.legislature_id AND s.chamber=_chamber;
 -- Une seule séance par version/chambre : réouverture identique idempotente,
 -- nouvel examen après refus uniquement par une NOUVELLE version.
 SELECT id INTO sid FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND chamber=_chamber AND starts_at=_at;
 IF sid IS NOT NULL THEN RETURN sid; END IF;
 IF EXISTS(SELECT 1 FROM public.national_sessions WHERE law_id=l.id AND version=l.current_version AND chamber=_chamber) THEN RAISE EXCEPTION 'Cette chambre a déjà une séance pour cette version'; END IF;
 IF jsonb_array_length(COALESCE(electorate,'[]'::jsonb))<>count_seats THEN RAISE EXCEPTION 'Chambre non constituée'; END IF;
 INSERT INTO public.national_sessions(law_id,version,chamber,starts_at,ends_at,eligible_seats,majority_required,electorate)
 VALUES(l.id,l.current_version,_chamber,_at,finish,count_seats,CASE WHEN _chamber='assembly' THEN 26 ELSE 13 END,electorate) RETURNING id INTO sid;
 UPDATE public.national_laws SET status='examining' WHERE id=l.id;
 RETURN sid;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_publish(_key text, _title text, _body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE eid uuid;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RAISE EXCEPTION 'Politique nationale désactivée'; END IF;
 PERFORM pg_advisory_xact_lock(151515);
 SELECT event_id INTO eid FROM public.national_publications WHERE publication_key=_key;
 IF eid IS NOT NULL THEN RETURN eid; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.news_sources WHERE id='france-direct' AND status='active') THEN RAISE EXCEPTION 'Source nationale indisponible'; END IF;
 INSERT INTO public.events(title,description,starts_at,ends_at,scope,category,importance,status,source_id,event_key,news_title,news_summary,news_body,target_kind,character_id,template_id,interactive,travel_delay_minutes)
 VALUES(_title,_body,public.game_now(),public.game_now(),'national','Politique',75,'scheduled','france-direct','national-politics:'||_key,_title,_body,_body,'general',NULL,NULL,false,0)
 RETURNING id INTO eid;
 INSERT INTO public.national_publications(publication_key,event_id) VALUES(_key,eid);
 -- Le déclencheur existant publie l'article ; pas de nouvel effet du Bloc 14 (template NULL).
 -- notify_news actuel n'envoie pas aux target_kind='general' : aucune notification
 -- générale nationale ajoutée implicitement ni plafond existant modifié.
 RETURN eid;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_refresh()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e record; l record; s record;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RETURN; END IF;
 FOR e IN SELECT id FROM public.national_elections WHERE counted_at IS NULL AND status<>'cancelled' AND vote_end_at<=public.game_now() ORDER BY vote_end_at,id LOOP
  PERFORM public.national_count_election(e.id);
  PERFORM public.national_publish('election-result:'||e.id,'Résultats des élections nationales','Les résultats nationaux et la composition de l’Assemblée sont disponibles.');
 END LOOP;
 UPDATE public.national_elections SET status=CASE WHEN public.game_now()>=vote_at THEN 'vote' WHEN public.game_now()>=candidacies_end_at THEN 'frozen' WHEN public.game_now()>=candidacies_at THEN 'candidacies' ELSE 'scheduled' END WHERE status NOT IN('completed','cancelled');
 FOR l IN SELECT id FROM public.national_legislatures WHERE senate_composed_at IS NULL AND ends_at>public.game_now() ORDER BY starts_at,id LOOP PERFORM public.national_compose_senate(l.id); END LOOP;
 FOR s IN SELECT id FROM public.national_sessions WHERE status='open' AND ends_at<=public.game_now() ORDER BY ends_at,id LOOP PERFORM public.national_close_session(s.id); END LOOP;
 FOR l IN SELECT id FROM public.national_laws WHERE status='adopted' ORDER BY adopted_at,id LOOP PERFORM public.national_apply_law(l.id); END LOOP;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE cid uuid; result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 SELECT id INTO cid FROM public.characters WHERE user_id=auth.uid();
 IF cid IS NULL THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN
  RETURN jsonb_build_object('enabled',false,'assembly_seats',50,'territorial_seats',5,'simulated_seats',45,'senate_seats',25,'assembly_majority',26,'senate_majority',13);
 END IF;
 SELECT jsonb_build_object(
 'world_now',public.game_now(),
 'settings',(SELECT jsonb_build_object('enabled',enabled,'assembly_seats',assembly_seats,'senate_seats',senate_seats,'assembly_majority',assembly_majority,'senate_majority',senate_majority,'rules',rules) FROM public.national_settings WHERE id=1),
 'elections',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'status',e.status,'candidacies_at',e.candidacies_at,'candidacies_end_at',e.candidacies_end_at,'vote_at',e.vote_at,'vote_end_at',e.vote_end_at,'term_end_at',e.term_end_at)||jsonb_build_object('voted',EXISTS(SELECT 1 FROM public.national_ballots b WHERE b.election_id=e.id AND b.character_id=cid))) FROM public.national_elections e),'[]'::jsonb),
 'candidates',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',k.id,'election_id',k.election_id,'city_id',k.city_id,'organization_id',k.organization_id,'display_name',k.display_name,'program',CASE WHEN k.character_id=cid THEN k.program ELSE NULL END,'mine',COALESCE(k.character_id=cid,false))) FROM public.national_candidacies k WHERE k.character_id=cid OR (k.status='accepted' AND k.published_at<=public.game_now())),'[]'::jsonb),
 'legislatures',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'election_id',election_id,'starts_at',starts_at,'ends_at',ends_at,'senate_composed',senate_composed_at IS NOT NULL)) FROM public.national_legislatures),'[]'::jsonb),
 'groups',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',g.id,'legislature_id',g.legislature_id,'chamber',g.chamber,'organization_id',g.organization_id,'name',g.name,'seats',(SELECT count(*) FROM public.national_seats s WHERE s.group_id=g.id))) FROM public.national_groups g),'[]'::jsonb),
 'seats',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'legislature_id',legislature_id,'chamber',chamber,'seat_no',seat_no,'group_id',group_id,'city_id',city_id,'display_name',CASE WHEN character_id IS NULL OR character_id=cid THEN display_name ELSE 'Siège territorial' END,'simulated',simulated,'mine',COALESCE(character_id=cid,false))) FROM public.national_seats),'[]'::jsonb),
 'government',COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM public.national_governments g),'[]'::jsonb),
 'offices',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'government_id',government_id,'role',role,'ministry',ministry,'display_name',display_name,'starts_at',starts_at,'ends_at',ends_at,'mine',character_id=cid)) FROM public.national_offices),'[]'::jsonb),
 'laws',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'legislature_id',l.legislature_id,'author_label',CASE WHEN l.author_character_id IS NULL OR l.author_character_id=cid THEN l.author_label ELSE 'Parlementaire' END,'version',l.current_version,'status',l.status,'proposed_at',l.proposed_at,'adopted_at',l.adopted_at,'applied_at',l.applied_at,'mine',COALESCE(l.author_character_id=cid,false),'versions',(SELECT jsonb_agg(jsonb_build_object('version',v.version,'template_id',v.template_id,'title',CASE WHEN l.author_character_id IS NULL OR l.author_character_id=cid THEN v.title ELSE t.title END,'description',CASE WHEN l.author_character_id IS NULL OR l.author_character_id=cid THEN v.description ELSE NULL END,'category',v.category,'effects',v.effects,'cost',v.cost,'delay_minutes',v.delay_minutes)) FROM public.national_law_versions v JOIN public.national_law_templates t ON t.id=v.template_id WHERE v.law_id=l.id),'sessions',(SELECT jsonb_agg(jsonb_build_object('id',s.id,'version',s.version,'chamber',s.chamber,'starts_at',s.starts_at,'ends_at',s.ends_at,'status',s.status,'yes_votes',s.yes_votes,'no_votes',s.no_votes,'abstentions',s.abstentions)) FROM public.national_sessions s WHERE s.law_id=l.id))) FROM public.national_laws l WHERE l.status<>'draft' OR l.author_character_id=cid),'[]'::jsonb),
 'treasury',(SELECT balance FROM public.national_treasury WHERE id=1),
 'budgets',COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM public.national_budgets b),'[]'::jsonb),
 'effects',COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM public.national_city_effects f),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_state_live()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 PERFORM public.national_tick();
 RETURN public.national_state() || jsonb_build_object(
  'templates', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'category',t.category,'effects',t.effects,'cost',t.cost) ORDER BY t.id) FROM public.national_law_templates t WHERE t.active),'[]'::jsonb),
  'positions', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.national_law_positions p),'[]'::jsonb),
  'sessions', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'law_id',s.law_id,'version',s.version,'chamber',s.chamber,'starts_at',s.starts_at,'ends_at',s.ends_at,'status',s.status,'yes_votes',s.yes_votes,'no_votes',s.no_votes,'abstentions',s.abstentions) ORDER BY s.starts_at) FROM public.national_sessions s),'[]'::jsonb));
END $function$
;
CREATE OR REPLACE FUNCTION public.national_tick()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE lg record; lw record; t timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(151515);
 IF NOT COALESCE((SELECT enabled FROM public.national_settings WHERE id=1),false) THEN RETURN; END IF;
 PERFORM public.national_refresh();
 t:=public.game_now();
 -- Candidatures des joueurs rendues publiques à la clôture du dépôt.
 UPDATE public.national_candidacies c SET published_at=e.candidacies_end_at
 FROM public.national_elections e WHERE e.id=c.election_id AND c.published_at IS NULL AND c.status='accepted' AND t>=e.candidacies_end_at AND e.counted_at IS NULL;
 -- Gouvernement fictif validé, formé une fois par législature active.
 FOR lg IN SELECT id FROM public.national_legislatures WHERE starts_at<=t AND ends_at>t AND NOT EXISTS(SELECT 1 FROM public.national_governments g WHERE g.legislature_id=national_legislatures.id) LOOP
  PERFORM public.national_form_government(lg.id,
   'fba90217-b89f-44a1-ad1b-e85c5c119123',  -- Léa Weber, Présidente
   '69997cc3-d132-4f51-bf6c-24b938d4a709',  -- Hugo Mercier, Premier ministre
   '[{"npc_id":"15cdeb99-8c07-488c-afcd-42f6db298434","ministry":"Économie et Emploi"},
     {"npc_id":"a2a92987-a86b-4600-b152-5f6e4e91b5e1","ministry":"Territoires et Environnement"},
     {"npc_id":"1794d1c7-2e60-44a0-b9ef-63a74bb97cba","ministry":"Logement et Transports"},
     {"npc_id":"2cd2b419-e252-48cf-96dd-d895f4585a0a","ministry":"Intérieur et Services publics"}]'::jsonb);
 END LOOP;
 -- Séance à l'Assemblée 2 heures après le dépôt (le temps de réserver), puis au Sénat 2 heures après l'approbation.
 FOR lw IN SELECT l.id, nl.ends_at FROM public.national_laws l JOIN public.national_legislatures nl ON nl.id=l.legislature_id
   WHERE l.status IN ('proposed','examining') AND nl.ends_at>t+interval '3 hours' AND NOT EXISTS(SELECT 1 FROM public.national_sessions s WHERE s.law_id=l.id AND s.version=l.current_version AND s.chamber='assembly') LOOP
  PERFORM public.national_open_session(lw.id,'assembly',date_trunc('minute',t)+interval '2 hours');
 END LOOP;
 FOR lw IN SELECT l.id FROM public.national_laws l JOIN public.national_legislatures nl ON nl.id=l.legislature_id
   WHERE l.status='examining' AND nl.senate_composed_at IS NOT NULL AND nl.ends_at>t+interval '3 hours'
   AND EXISTS(SELECT 1 FROM public.national_sessions s WHERE s.law_id=l.id AND s.version=l.current_version AND s.chamber='assembly' AND s.status='approved')
   AND NOT EXISTS(SELECT 1 FROM public.national_sessions s WHERE s.law_id=l.id AND s.version=l.current_version AND s.chamber='senate') LOOP
  PERFORM public.national_open_session(lw.id,'senate',date_trunc('minute',t)+interval '2 hours');
 END LOOP;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_validate_template()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE d record; a record; total numeric:=0;
BEGIN
 FOR d IN SELECT * FROM jsonb_each_text(NEW.effects) LOOP
  IF d.value IS NULL OR d.key NOT IN('housing','employment','transport','environment','safety','services','commerce','culture','satisfaction') OR d.value !~ '^-?[0-9]+$' OR d.value::numeric NOT BETWEEN -100 AND 100 THEN RAISE EXCEPTION 'Effet de ville invalide'; END IF;
 END LOOP;
 FOR a IN SELECT * FROM jsonb_each_text(NEW.budget_allocations) LOOP
  -- Noms des postes budgétaires À DÉCIDER ; contrôle de format seulement.
  IF a.key='' OR a.value IS NULL OR a.value !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Poste budgétaire invalide'; END IF;
  total:=total+a.value::numeric;
 END LOOP;
 IF NEW.budget_allocations<>'{}'::jsonb AND total<>NEW.cost THEN RAISE EXCEPTION 'Budget non équilibré'; END IF;
 IF NEW.cost<>12000 OR NEW.delay_minutes<>1440 THEN RAISE EXCEPTION 'Coût global 12 000 et délai 24 heures requis'; END IF;
 IF NEW.active AND (length(btrim(NEW.title))<3 OR length(btrim(NEW.category))=0 OR NEW.effects='{}'::jsonb) THEN RAISE EXCEPTION 'Modèle incomplet : titre, catégorie et effets doivent être validés'; END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.national_version_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN RAISE EXCEPTION 'Version de loi immuable : créer une nouvelle version'; END $function$
;
CREATE OR REPLACE FUNCTION public.national_version_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE t public.national_law_templates;
BEGIN
 SELECT * INTO t FROM public.national_law_templates WHERE id=NEW.template_id AND active;
 IF NOT FOUND OR NEW.effects IS DISTINCT FROM t.effects OR NEW.category IS DISTINCT FROM t.category OR NEW.cost IS DISTINCT FROM t.cost OR NEW.delay_minutes IS DISTINCT FROM t.delay_minutes OR NEW.budget_allocations IS DISTINCT FROM t.budget_allocations THEN RAISE EXCEPTION 'Version non issue d’un modèle national validé'; END IF;
 RETURN NEW;
END $function$
;
           conrelid           |                     conname                     |                                                                                                                                                                                                                                            pg_get_constraintdef                                                                                                                                                                                                                    
------------------------------+-------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 national_settings            | national_settings_id_check                      | CHECK ((id = 1))
 national_settings            | national_settings_assembly_seats_check          | CHECK ((assembly_seats = 50))
 national_settings            | national_settings_senate_seats_check            | CHECK ((senate_seats = 25))
 national_settings            | national_settings_assembly_majority_check       | CHECK ((assembly_majority = 26))
 national_settings            | national_settings_senate_majority_check         | CHECK ((senate_majority = 13))
 national_settings            | national_settings_rules_check                   | CHECK ((jsonb_typeof(rules) = 'object'::text))
 national_constituencies      | national_constituencies_seats_check             | CHECK ((seats = 1))
 national_party_profiles      | national_party_profiles_simulation_weight_check | CHECK ((simulation_weight > 0))
 national_party_profiles      | national_party_profiles_law_support_check       | CHECK (((law_support >= 0) AND (law_support <= 100)))
 national_elections           | national_elections_status_check                 | CHECK ((status = ANY (ARRAY['scheduled'::text, 'candidacies'::text, 'frozen'::text, 'vote'::text, 'completed'::text, 'cancelled'::text])))
 national_elections           | national_elections_rules_check                  | CHECK ((jsonb_typeof(rules) = 'object'::text))
 national_elections           | national_elections_check                        | CHECK (((candidacies_end_at = (candidacies_at + '7 days'::interval)) AND (vote_at = (candidacies_end_at + '1 day'::interval)) AND (vote_end_at = (vote_at + '2 days'::interval)) AND (term_end_at = (vote_end_at + '28 days'::interval))))
 national_candidacies         | national_candidacies_status_check               | CHECK ((status = ANY (ARRAY['accepted'::text, 'withdrawn'::text])))
 national_candidacies         | national_candidacies_fictional_votes_check      | CHECK ((fictional_votes >= 0))
 national_candidacies         | national_candidacies_check                      | CHECK ((num_nonnulls(character_id, npc_id) = 1))
 national_results             | national_results_player_votes_check             | CHECK ((player_votes >= 0))
 national_results             | national_results_fictional_votes_check          | CHECK ((fictional_votes >= 0))
 national_results             | national_results_rank_check                     | CHECK ((rank > 0))
 national_legislatures        | national_legislatures_check                     | CHECK ((starts_at < ends_at))
 national_groups              | national_groups_chamber_check                   | CHECK ((chamber = ANY (ARRAY['assembly'::text, 'senate'::text])))
 national_groups              | national_groups_support_check                   | CHECK (((support >= 0) AND (support <= 100)))
 national_seats               | national_seats_chamber_check                    | CHECK ((chamber = ANY (ARRAY['assembly'::text, 'senate'::text])))
 national_seats               | national_seats_seat_no_check                    | CHECK ((seat_no > 0))
 national_seats               | national_seats_check                            | CHECK ((num_nonnulls(character_id, npc_id) <= 1))
 national_seats               | national_seats_check1                           | CHECK ((((chamber = 'assembly'::text) AND (seat_no <= 50)) OR ((chamber = 'senate'::text) AND (seat_no <= 25))))
 national_seats               | national_seats_check2                           | CHECK (((character_id IS NULL) OR (NOT simulated)))
 national_governments         | national_governments_government_no_check        | CHECK ((government_no > 0))
 national_governments         | national_governments_check                      | CHECK ((starts_at < ends_at))
 national_offices             | national_offices_role_check                     | CHECK ((role = ANY (ARRAY['president'::text, 'prime_minister'::text, 'minister'::text])))
 national_offices             | national_offices_check                          | CHECK (((character_id IS NULL) AND (npc_id IS NOT NULL)))
 national_offices             | national_offices_check1                         | CHECK ((starts_at < ends_at))
 national_offices             | national_offices_check2                         | CHECK ((((role = ANY (ARRAY['president'::text, 'prime_minister'::text])) AND (ministry = ''::text)) OR ((role = 'minister'::text) AND (length(btrim(ministry)) > 0))))
 national_law_templates       | national_law_templates_effects_check            | CHECK ((jsonb_typeof(effects) = 'object'::text))
 national_law_templates       | national_law_templates_cost_check               | CHECK ((cost = 12000))
 national_law_templates       | national_law_templates_delay_minutes_check      | CHECK ((delay_minutes = 1440))
 national_law_templates       | national_law_templates_budget_allocations_check | CHECK ((jsonb_typeof(budget_allocations) = 'object'::text))
 national_laws                | national_laws_current_version_check             | CHECK ((current_version > 0))
 national_laws                | national_laws_status_check                      | CHECK ((status = ANY (ARRAY['draft'::text, 'proposed'::text, 'examining'::text, 'adopted'::text, 'refused'::text, 'applied'::text])))
 national_laws                | national_laws_check                             | CHECK ((num_nonnulls(author_character_id, author_group_id) = 1))
 national_laws                | national_laws_check1                            | CHECK (((status <> ALL (ARRAY['adopted'::text, 'applied'::text])) OR (adopted_at IS NOT NULL)))
 national_laws                | national_laws_check2                            | CHECK (((status <> 'applied'::text) OR (applied_at IS NOT NULL)))
 national_law_versions        | national_law_versions_version_check             | CHECK ((version > 0))
 national_law_versions        | national_law_versions_title_check               | CHECK (((length(title) >= 3) AND (length(title) <= 120)))
 national_law_versions        | national_law_versions_description_check         | CHECK (((length(description) >= 10) AND (length(description) <= 4000)))
 national_law_versions        | national_law_versions_cost_check                | CHECK ((cost = 12000))
 national_law_versions        | national_law_versions_delay_minutes_check       | CHECK ((delay_minutes = 1440))
 national_sessions            | national_sessions_chamber_check                 | CHECK ((chamber = ANY (ARRAY['assembly'::text, 'senate'::text])))
 national_sessions            | national_sessions_status_check                  | CHECK ((status = ANY (ARRAY['open'::text, 'approved'::text, 'rejected'::text])))
 national_sessions            | national_sessions_eligible_seats_check          | CHECK ((eligible_seats = ANY (ARRAY[50, 25])))
 national_sessions            | national_sessions_check                         | CHECK ((((chamber = 'assembly'::text) AND (eligible_seats = 50) AND (majority_required = 26)) OR ((chamber = 'senate'::text) AND (eligible_seats = 25) AND (majority_required = 13))))
 national_sessions            | national_sessions_electorate_check              | CHECK ((jsonb_typeof(electorate) = 'array'::text))
 national_sessions            | national_sessions_check1                        | CHECK ((ends_at = (starts_at + '01:00:00'::interval)))
 national_sessions            | national_sessions_check2                        | CHECK ((((status = 'open'::text) AND (yes_votes IS NULL) AND (no_votes IS NULL) AND (abstentions IS NULL)) OR ((status <> 'open'::text) AND (yes_votes IS NOT NULL) AND (no_votes IS NOT NULL) AND (abstentions IS NOT NULL) AND (yes_votes >= 0) AND (no_votes >= 0) AND (abstentions >= 0) AND (((yes_votes + no_votes) + abstentions) = eligible_seats) AND (((status = 'approved'::text) AND (yes_votes >= majority_required)) OR ((status = 'rejected'::text) AND (yes_votes < majority_required))))))
 national_parliamentary_votes | national_parliamentary_votes_vote_check         | CHECK ((vote = ANY (ARRAY['yes'::text, 'no'::text, 'abstain'::text])))
 national_treasury            | national_treasury_id_check                      | CHECK ((id = 1))
 national_treasury            | national_treasury_balance_check                 | CHECK (((balance >= 0) AND (balance <= 100000)))
 national_budgets             | national_budgets_total_check                    | CHECK ((total >= 0))
 national_city_effects        | national_city_effects_before_value_check        | CHECK (((before_value >= 0) AND (before_value <= 100)))
 national_city_effects        | national_city_effects_after_value_check         | CHECK (((after_value >= 0) AND (after_value <= 100)))
 national_seats               | national_senate_simulated_only                  | CHECK (((chamber <> 'senate'::text) OR (simulated AND (character_id IS NULL))))
 national_seats               | national_assembly_5_plus_45                     | CHECK (((chamber <> 'assembly'::text) OR (((seat_no >= 1) AND (seat_no <= 5)) AND (NOT simulated) AND (city_id IS NOT NULL) AND (num_nonnulls(character_id, npc_id) = 1)) OR (((seat_no >= 6) AND (seat_no <= 50)) AND simulated AND (city_id IS NULL) AND (character_id IS NULL) AND (npc_id IS NULL))))
 national_law_positions       | national_law_positions_vote_check               | CHECK ((vote = ANY (ARRAY['yes'::text, 'no'::text])))
 national_law_templates       | national_law_templates_kind_check               | CHECK ((kind = ANY (ARRAY['fictive'::text, 'vigueur'::text, 'reforme'::text])))
(63 rows)

root@VPS-U-47229:/data/civitas-live/app#