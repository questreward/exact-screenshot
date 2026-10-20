#!/usr/bin/env bash
# Read-only capacity report. No database rows, environment values or AI prompts.
set -euo pipefail
printf '=== CIVITAS : capacité du VPS (lecture seule) ===\n'
printf '\nProcesseurs disponibles\n'
getconf _NPROCESSORS_ONLN
printf '\nMémoire du serveur\n'
free -m
printf '\nEspace disque du jeu\n'
df -h /data/civitas-live/app
printf '\nConsommation actuelle des services\n'
docker stats --no-stream --format '{{.Name}} | CPU {{.CPUPerc}} | RAM {{.MemUsage}}' civitas-web civitas-db civitas-ollama
printf '\nModèles locaux installés (aucun téléchargement)\n'
docker exec civitas-ollama ollama list
printf '\nAccélération graphique disponible\n'
if command -v nvidia-smi >/dev/null 2>&1; then
  nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader
elif command -v lspci >/dev/null 2>&1; then
  lspci | grep -Ei 'VGA|3D|Display' || true
else
  printf 'Matériel graphique non identifié par les outils disponibles.\n'
fi
printf '\nOutils locaux de production vidéo\n'
if docker exec civitas-web sh -c 'command -v ffmpeg >/dev/null 2>&1'; then
  printf 'FFmpeg présent dans le service du jeu.\n'
else
  printf 'FFmpeg absent du service du jeu.\n'
fi
printf '\nRapport terminé. Aucun test de génération vidéo ni modification du jeu.\n'