#!/usr/bin/env bash
# CIVITAS – Correction des connexions : les comptes doivent recevoir le rôle « authenticated ».
set -euo pipefail
SECRETS=/data/civitas-live/secrets
IMG=$(docker inspect -f '{{.Config.Image}}' civitas-auth)
PORTS=$(docker inspect -f '{{range $p,$b := .HostConfig.PortBindings}}{{(index $b 0).HostIp}}:{{(index $b 0).HostPort}}:{{$p}} {{end}}' civitas-auth | sed 's/^://; s/ :/ /g')

docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' civitas-auth \
  | grep -v -E '^(PATH|GOTRUE_JWT_DEFAULT_GROUP_NAME|GOTRUE_JWT_AUD|GOTRUE_JWT_ADMIN_ROLES)=' \
  | grep -v '^$' > "$SECRETS/auth.env"
cat >> "$SECRETS/auth.env" <<'EOF'
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
GOTRUE_JWT_AUD=authenticated
GOTRUE_JWT_ADMIN_ROLES=service_role
EOF
chmod 600 "$SECRETS/auth.env"

PORT_ARGS=""
for p in $PORTS; do PORT_ARGS="$PORT_ARGS -p $p"; done

docker rm -f civitas-auth >/dev/null
docker run -d --name civitas-auth --restart unless-stopped --network civitas-net \
  $PORT_ARGS --env-file "$SECRETS/auth.env" "$IMG" >/dev/null

docker exec -i civitas-db psql -U postgres -d civitas -c \
  "update auth.users set role='authenticated', aud='authenticated' where coalesce(role,'')='' or coalesce(aud,'')='';"

sleep 3
echo "Ports : $PORTS"
docker ps --filter name=civitas-auth --format 'civitas-auth : {{.Status}}'
