# Quartiers qui changent — 2 étapes

## Étape 1 — Affichage (rien à installer dans la base)
La carte et la fiche de chaque quartier montrent son état, calculé à partir de ce que le jeu enregistre déjà.

Badges possibles (plusieurs à la fois si besoin) :
- **En chantier** : travaux municipaux en cours, lieu en travaux, projet citoyen en travaux, signalement en cours de traitement.
- **Rénové** : lieu rénové ou travaux municipaux terminés récemment.
- **En crise** : crise active liée à ce quartier (les crises de toute la ville sont affichées à part, « contexte ville »).
- **Animé** : événements publics en cours dans un lieu du quartier.
- **Délaissé** : plusieurs signalements graves non résolus et aucune intervention récente — indiqué clairement comme une estimation.

Sur la carte : couleur/contour du quartier selon son badge principal, petite icône. Dans la fiche du quartier : la liste des raisons (« 2 chantiers », « 1 crise »), avec lien vers le lieu concerné. Mobile d'abord, grandes zones à toucher.

Aucune règle, aucun argent, aucun effet modifié. Si une info manque (ex. crises pas encore installées), le badge ne s'affiche simplement pas.

## Étape 2 — Vraie évolution (préparée après l'étape 1, SQL à valider)
Chaque quartier aura ses propres jauges (ex. cadre de vie, animation, tranquillité) qui évoluent dans le temps selon travaux, crises, événements et signalements, avec un historique. Les règles chiffrées te seront proposées avant toute écriture, puis le SQL exact avant installation sur ton VPS.

## Détails techniques
- `src/game/districts-state.ts` : fonction pure `districtBadges(...)` (seuils de récence et de gravité en constantes de présentation) + tests.
- Lectures : SELECT directs autorisés (public_decisions, locations.civic_state, public_issues, crises, citizen_projects, events) via une query option dans `src/services/game.ts` ; jamais les RPC `*_state` qui font avancer la simulation. Repli silencieux si une table est absente (PGRST/42P01).
- `WorldMap.tsx` : style des rectangles de quartier + panneau `DistrictStatus.tsx`.
- Étape 2 : future migration VPS atomique (table d'état + historique à clé unique), non écrite dans cette étape.
