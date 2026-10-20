#!/usr/bin/env bash
set -euo pipefail
root="$(dirname "$(dirname "$(dirname "$(realpath "$0")")")")"
docker exec -i civitas-db psql -X -v ON_ERROR_STOP=1 -U postgres -d civitas < "$root/vps/tools/check_v1.sql"
printf '\nIA locale : configuration présente (aucune valeur affichée)\n'
docker exec civitas-web sh -c 'if [ -n "$OLLAMA_URL" ]; then echo "OLLAMA_URL : presente"; else echo "OLLAMA_URL : absente"; fi; if [ -n "$OLLAMA_MODEL" ]; then echo "OLLAMA_MODEL : presente"; else echo "OLLAMA_MODEL : modele par defaut"; fi'
printf '\nConteneurs locaux\n'
docker ps --format '{{.Names}} {{.Status}}' | grep -E '^civitas-(db|web|ollama) ' || true