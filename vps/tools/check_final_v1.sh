#!/usr/bin/env bash
# Unified read-only preflight for the final V1 delivery, NOT an installer.
set -euo pipefail
tools="$(dirname "$(realpath "$0")")"
bash "$tools/check_v1.sh"
bash "$tools/check_final_resources.sh"
printf '\nPrécontrôle terminé : présence et capacité uniquement.\n'
printf 'Restent : essais sur copie indépendante, restauration vérifiée, règles/catalogue et SQL approuvés.\n'
printf 'Aucune installation ni clôture V1 effectuée.\n'