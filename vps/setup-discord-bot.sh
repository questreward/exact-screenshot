#!/usr/bin/env bash
set -euo pipefail
APP=/data/civitas-live/app
ENV=/data/civitas-live/secrets/discord.env
DATA=/data/civitas-live/discord
test -s "$ENV" || { printf 'Configuration Discord manquante : suivre discord-bot/README.md.\n'; exit 1; }
test "$(stat -c %a "$ENV")" = 600 || { printf 'Le fichier privé doit avoir les permissions 600.\n'; exit 1; }
docker network inspect civitas-net >/dev/null
mkdir -p "$DATA"
chown 1000:1000 "$DATA"
chmod 700 "$DATA"
docker build -t civitas-discord "$APP/discord-bot"
docker rm -f civitas-discord 2>/dev/null || true
docker run -d --name civitas-discord --restart unless-stopped --network civitas-net \
  --memory 256m --cpus 0.5 --cap-drop ALL --security-opt no-new-privileges \
  --env-file "$ENV" -v "$DATA:/app/data" civitas-discord >/dev/null
printf 'Bot lancé séparément du jeu. Vérifier : docker logs --tail 30 civitas-discord\n'