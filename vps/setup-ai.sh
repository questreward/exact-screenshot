#!/usr/bin/env bash
# Installe l'IA locale (Ollama) pour l'analyse des projets de loi. Avis seulement.
set -euo pipefail
mkdir -p /data/civitas-live/ollama
docker rm -f civitas-ollama 2>/dev/null || true
docker run -d --name civitas-ollama --restart unless-stopped --network civitas-net \
  --memory 4g -v /data/civitas-live/ollama:/root/.ollama ollama/ollama
sleep 5
docker exec civitas-ollama ollama pull qwen2.5:3b
ENV=/data/civitas-live/app/.env
ANON=$(cat /data/civitas-live/secrets/anon_key)
grep -q '^OLLAMA_URL=' "$ENV" || echo 'OLLAMA_URL=http://civitas-ollama:11434' >> "$ENV"
grep -q '^OLLAMA_MODEL=' "$ENV" || echo 'OLLAMA_MODEL=qwen2.5:3b' >> "$ENV"
grep -q '^SUPABASE_URL=' "$ENV" || echo 'SUPABASE_URL=https://civitas-simulator.com' >> "$ENV"
grep -q '^SUPABASE_PUBLISHABLE_KEY=' "$ENV" || echo "SUPABASE_PUBLISHABLE_KEY=$ANON" >> "$ENV"
echo "IA installée. Reconstruisez le site comme d'habitude."
