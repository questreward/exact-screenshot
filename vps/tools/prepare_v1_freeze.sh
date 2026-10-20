#!/usr/bin/env bash
# Backup, isolated restoration and 0114 rollback test. Never installs 0114.
set -euo pipefail
root="$(dirname "$(dirname "$(dirname "$(realpath "$0")")")")"
sql="$root/vps/migrations/0114_volunteer_dossier.sql"
test -s "$sql" || { echo 'SQL 0114 absent : attendre la synchronisation, puis relancer.'; exit 1; }
backup_dir='/data/civitas-live/backups'
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="$backup_dir/civitas-before-0114-$stamp.dump"
copy_db="civitas_check_0114_$stamp"
toc="$backup_dir/civitas-before-0114-$stamp.restore-list"
container_toc="/tmp/civitas-check-0114-$stamp.restore-list"
umask 077
docker exec civitas-db pg_dump -U postgres -d civitas -Fc > "$backup"
test -s "$backup"
docker exec -i civitas-db pg_restore -l < "$backup" |
  python3 "$root/vps/tools/filter_restore_toc.py" > "$toc"
echo "Sauvegarde créée : $backup"
# Restores only into a brand-new temporary DB; original game is untouched.
docker exec civitas-db createdb -U postgres "$copy_db"
cleanup() {
  docker exec civitas-db dropdb -U postgres --if-exists "$copy_db" >/dev/null
  docker exec civitas-db rm -f "$container_toc"
}
trap cleanup EXIT
docker exec -i civitas-db sh -c 'cat > "$1"' sh "$container_toc" < "$toc"
docker exec -i civitas-db pg_restore -U postgres -d "$copy_db" --use-list="$container_toc" --single-transaction --exit-on-error < "$backup"
echo 'Restauration isolée des données du jeu réussie (pg_cron exclu de la copie uniquement).'
echo 'La sauvegarde complète conserve pg_cron ; ses tâches ne sont pas testées par cette copie.'
python3 - "$sql" <<'PY' | docker exec -i civitas-db psql -X -v ON_ERROR_STOP=1 -U postgres -d "$copy_db"
import pathlib, sys
sql = pathlib.Path(sys.argv[1]).read_text()
if not sql.rstrip().endswith('COMMIT;'):
    raise SystemExit('SQL inattendu : arrêt')
print(sql.rstrip()[:-len('COMMIT;')] + 'ROLLBACK;')
PY
echo '0114 : essai à blanc réussi sur la copie, aucun changement conservé.'
echo 'Aucune installation réelle ni clôture des parcours effectuée.'
echo 'Envoyer cette sortie avant de passer à l’installation réelle.'
