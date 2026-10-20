#!/usr/bin/env bash
# Full backup, isolated restore, reviewed 0117 tests; NEVER installs on live DB.
set -euo pipefail
root="$(dirname "$(dirname "$(dirname "$(realpath "$0")")")")"
backup_dir=/data/civitas-live/backups
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="$backup_dir/civitas-before-0117-$stamp.dump"
copy_db="civitas_check_cp_presidency_$stamp"
toc="$backup_dir/civitas-final-$stamp.restore-list"
container_toc="/tmp/civitas-final-$stamp.restore-list"
for name in 0117_civil_protection_presidency.sql; do
 test -s "$root/vps/migrations/$name" || { echo "SQL manquant : $name"; exit 1; }
done
docker exec civitas-db pg_dump -U postgres -d civitas -Fc > "$backup"
test -s "$backup"
echo "Sauvegarde complète créée : $backup"
docker exec -i civitas-db pg_restore -l < "$backup" | python3 "$root/vps/tools/filter_restore_toc.py" > "$toc"
docker exec civitas-db createdb -U postgres "$copy_db"
cleanup() {
 docker exec civitas-db dropdb -U postgres --if-exists "$copy_db" >/dev/null
 docker exec civitas-db rm -f "$container_toc"
}
trap cleanup EXIT
docker exec -i civitas-db sh -c 'cat > "$1"' sh "$container_toc" < "$toc"
docker exec -i civitas-db pg_restore -U postgres -d "$copy_db" --use-list="$container_toc" --single-transaction --exit-on-error < "$backup"
echo 'Restauration isolée réussie ; pg_cron exclu uniquement de la copie.'
for name in 0117_civil_protection_presidency.sql; do
 python3 - "$root/vps/migrations/$name" <<'PY' | docker exec -i civitas-db psql -X -v ON_ERROR_STOP=1 -U postgres -d "$copy_db"
import pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text().rstrip()
if not text.endswith('COMMIT;'):
    raise SystemExit('SQL inattendu : arrêt')
print(text[:-len('COMMIT;')] + 'ROLLBACK;')
PY
 echo "$name : essai à blanc réussi, ROLLBACK."
done
echo 'L’essai a réussi. Jeu réel inchangé ; installation réelle et parcours en jeu restent à faire.'