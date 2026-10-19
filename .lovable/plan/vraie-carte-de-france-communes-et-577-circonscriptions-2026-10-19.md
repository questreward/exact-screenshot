# Vraie carte de France — communes et 577 circonscriptions

Objectif : une carte de France réelle, consultable sur téléphone, avec toutes les communes et les 577 circonscriptions législatives, hébergée entièrement sur le VPS (aucun service de carte externe, aucune clé).

## Ce que le joueur verra

- Nouvelle page « France » (menu + téléphone) : carte zoomable au doigt.
- Vue d'ensemble : 13 régions métropolitaines + outre-mer en encarts.
- En zoomant : 101 départements, puis les 577 circonscriptions (contours colorés).
- Encore plus près : toutes les communes (~35 000) apparaissent en points, chargées département par département pour rester fluide.
- Recherche d'une commune par nom ou code postal.
- Fiche au toucher :
  - Commune : département, région, population, circonscription.
  - Circonscription : numéro, département, communes incluses.
  - Les 5 villes jouables sont mises en avant avec un bouton « Y aller » (trajet train/car existant).
  - Les autres communes : « Disponible dans une prochaine étape » (pas encore habitables).
- Bouton « Ma position » qui centre sur la ville du personnage.

## Découpage en étapes

1. **Carte 1 — fond réel** : régions, départements, 5 villes jouables, zoom/pan, fiches. Aucune modification de la base.
2. **Carte 2 — communes** : toutes les communes, recherche, fiches communes.
3. **Carte 3 — 577 circonscriptions** : contours, fiches, rattachement commune → circonscription. Affichage seulement.
4. **Plus tard, sur accord séparé** : faire voter les élections législatives par circonscription réelle (change le système d'élection nationale, migration présentée avant).

Chaque étape est livrée, installée sur le VPS et validée avant la suivante.

## Données (publiques, gratuites)

- Contours régions / départements / communes : données ouvertes IGN « Admin Express » via geo.api.gouv.fr (licence ouverte Etalab).
- Circonscriptions législatives : fichier officiel publié sur data.gouv.fr.
- Fichiers simplifiés une fois, puis servis par le site lui-même depuis le VPS.

## Détails techniques

- Données préparées hors ligne par un script (`vps/tools/build_france_map.*`) : simplification des contours (mapshaper), conversion TopoJSON, découpage par département pour les communes. Fichiers statiques dans `public/geo/` (régions + départements ≈ 300 Ko, circonscriptions ≈ 1–2 Mo, communes ≈ 101 fichiers de 20–80 Ko).
- Rendu : MapLibre GL sans fond de tuiles externe (couches GeoJSON uniquement, fond ardoise), chargé côté navigateur uniquement (import dynamique, hors rendu serveur). Gestes tactiles natifs.
- Les communes ne sont dessinées qu'au-delà d'un certain zoom, et seulement pour les départements visibles.
- Lien avec le jeu : correspondance entre les 5 `cities` existantes et leur code INSEE, définie côté interface (étapes 1–3 sans migration). Le bouton « Y aller » réutilise le voyage interurbain existant.
- Étape 4 (législatives réelles) : nécessitera une migration (tables circonscriptions/communes) présentée en SQL avant toute application.
