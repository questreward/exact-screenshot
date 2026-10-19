# P4 — Manifestations et journal télévisé

## Ce que le joueur pourra faire
- **Appeler à manifester** (tout citoyen majeur) : choisir une cause, un lieu public de sa ville, une heure (8 h–20 h, au moins 2 h plus tard), et optionnellement une consultation ou une décision locale en cours à soutenir ou contester.
- **Rejoindre une manifestation** : elle s'inscrit dans l'agenda comme une activité (énergie et temps, comme les autres activités).
- **Habitants fictifs** : certains rejoignent selon leur parti/organisation et la cause (calcul fixe, identique pour tous).
- **Résultat** à la fin : réussie si participants (joueurs + fictifs) ≥ seuil. Réussie = réputation et influence pour l'organisateur et les participants, article d'actualité, et **pression** sur la consultation/décision liée (petit bonus de voix pour l'option défendue, ou indicateur « contestée » sur la décision). Échouée = petit article, rien d'autre.
- **JT** : nouvelle application « JT » (téléphone + menu) :
  - Un JT local par ville et par jour de jeu, un JT national par jour.
  - Sujets repris automatiquement : manifestations, élections, décisions, lois, événements du monde.
  - **Interviews** : les joueurs les plus influents de la ville (et les députés pour le national) reçoivent une invitation ; ils peuvent répondre par une courte déclaration (280 caractères) diffusée dans le JT du lendemain. Sans réponse, le sujet passe sans interview.

## Réglages (modifiables plus tard)
- Seuil de réussite : 8 participants ; âge 18 ans ; 1 manifestation organisée à la fois par joueur ; durée 1 h ; énergie 15.
- Gains : organisateur +5 réputation +3 influence ; participant +2 / +1 (une seule fois par manifestation).
- Pression : +5 % de voix pour l'option soutenue ; décision marquée « contestée » (affichage seulement, pas d'annulation).
- 3 interviews max par JT, réponse sous 1 jour de jeu.

## Sécurité
- Tout passe par des actions protégées côté serveur, avec clés uniques : aucun gain doublé, aucune pression doublée.
- Contenu des déclarations : longueur limitée, aucun lien.
- JT et manifestations calculés à la lecture (pas de tâche planifiée), déterministes.

## Détails techniques
- Migration `vps/migrations/0048_p4_protests_tv.sql`, ajouts uniquement, BEGIN/COMMIT, contrôles finaux (≥ 81 événements conservés).
- Tables : `protest_settings`, `protests` (étend la logique des `events` existants : un `events` public par manifestation), `protest_participations` (réutilise `activities`), `protest_effects` (registre unique), `tv_broadcasts` (city_id null = national, unique par jour), `tv_segments`, `tv_interviews`.
- Fonctions : `call_protest`, `join_protest`, `settle_protest` (à la lecture), `tv_broadcast_state(_city)` (génère le JT du jour si absent), `answer_tv_interview`.
- Articles via `civic_news` ; réputation via `award_political`.
- Front : `ProtestsCard` dans Ma Ville, nouvelle page `/jt`, entrée navigation, requêtes dans `src/services/game.ts`, tests des règles d'affichage.
- Commande VPS habituelle (git pull + psql + reconstruction).
