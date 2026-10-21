#!/usr/bin/env bash
# CIVITAS – Installe la vraie carte de France sur le VPS (aucun service extérieur ensuite).
# Télécharge une seule fois : carte OpenStreetMap de la France (Protomaps), polices et icônes.
set -euo pipefail
APP=/data/civitas-live/app
TILES=/data/civitas-live/tiles
mkdir -p "$TILES" /tmp/civitas-map
cd /tmp/civitas-map

echo "1/5 Outil de découpe de carte…"
if ! command -v pmtiles >/dev/null 2>&1; then
  TAG=$(curl -fsSI https://github.com/protomaps/go-pmtiles/releases/latest | grep -i '^location:' | sed 's#.*/tag/##' | tr -d '\r\n')
  curl -fsSL "https://github.com/protomaps/go-pmtiles/releases/download/${TAG}/go-pmtiles_${TAG#v}_Linux_x86_64.tar.gz" | tar xz pmtiles
  install -m 755 pmtiles /usr/local/bin/pmtiles
fi

echo "2/5 Recherche de la carte mondiale la plus récente…"
BUILD=""
for i in $(seq 0 40); do
  D=$(date -u -d "-$i day" +%Y%m%d)
  if curl -fsSI "https://build.protomaps.com/$D.pmtiles" >/dev/null 2>&1; then BUILD=$D; break; fi
done
[ -n "$BUILD" ] || { echo "ERREUR : carte mondiale introuvable"; exit 1; }
echo "   Carte du $BUILD"

echo "3/5 Découpe de la France (plusieurs Go, 10 à 40 minutes)…"
if [ ! -s "$TILES/france.pmtiles" ]; then
  pmtiles extract "https://build.protomaps.com/$BUILD.pmtiles" "$TILES/france.pmtiles.part" --bbox=-5.5,41.2,9.8,51.3 --maxzoom=15
  mv "$TILES/france.pmtiles.part" "$TILES/france.pmtiles"
else
  echo "   Déjà installée, on garde."
fi

echo "4/5 Polices et icônes de la carte…"
curl -fsSL https://github.com/protomaps/basemaps-assets/archive/refs/heads/main.tar.gz | tar xz
rm -rf "$TILES/fonts" "$TILES/sprites"
cp -r basemaps-assets-main/fonts basemaps-assets-main/sprites "$TILES/"

echo "5/5 Serveur de carte et mise à jour du site…"
docker rm -f civitas-tiles >/dev/null 2>&1 || true
docker run -d --name civitas-tiles --restart unless-stopped --network civitas-net \
  -v "$TILES":/usr/share/nginx/html:ro nginx:alpine >/dev/null
cd "$APP"
grep -q '^TILES_ORIGIN=' .env || echo 'TILES_ORIGIN=http://civitas-tiles' >> .env
docker build -t civitas-web . && docker rm -f civitas-web >/dev/null \
  && docker run -d --name civitas-web --restart unless-stopped --network civitas-net --env-file .env -p 127.0.0.1:3000:3000 civitas-web >/dev/null
sleep 5
du -sh "$TILES/france.pmtiles"
curl -fsS -o /dev/null -w "Test carte via le site : %{http_code} (206 = OK)\n" -H 'Range: bytes=0-15' http://127.0.0.1:3000/tiles/france.pmtiles || echo "Test carte : ÉCHEC"
rm -rf /tmp/civitas-map
