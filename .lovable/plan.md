# P1 — Déplacements entre villes et espaces intérieurs : préparation (analyse seule)

## Ce qui sera livré
Un document `CIVITAS_P1_preparation.md` dans vos Fichiers : analyse de l'existant, cahier des charges proposé, et décisions « À valider ». Aucun développement, aucun SQL, aucune migration, aucun compte, aucun test. La roadmap approuvée sera aussi livrée comme document de référence.

## Existant déjà vérifié
- Les déplacements sont aujourd'hui limités à la ville du personnage : règle d'affichage `movementAllowed` (test « interdit le voyage vers une autre ville ») et contrôle serveur dans `move_character`.
- Cinq villes, 20 quartiers, 60 lieux ; position privée persistante (`character_positions`).
- Espaces intérieurs : table `location_spaces` déjà prévue (lieu parent, sous-espace, accessible), avec quelques espaces créés (amphithéâtres, salles du conseil) mais tous marqués non accessibles.
- Transport public local (activité + énergie + durée) et retards des travaux figés au départ (Bloc 14).
- Le personnage possède une ville de résidence, liée à logement, emploi, études, élections, Ma Ville et démarches.

## Contenu du document
1. Existant détaillé, avec source pour chaque point.
2. Fonctionnalités proposées, chacune marquée « À valider » :
   - trajet vers une autre ville comme activité de l'Agenda (départ, durée, coût, énergie) réutilisant le transport public existant ;
   - distinction stricte entre ville de résidence (inchangée) et ville où l'on se trouve ;
   - entrée et sortie des espaces intérieurs d'un lieu, sans nouvel espace inventé au-delà de ceux existants sauf décision.
3. Ce qui ne bouge pas : horloge, véhicules personnels, élections (vote seulement dans sa ville de résidence), loyers, salaires, Bloc 15.
4. Données, fonctions serveur et écrans concernés (Carte, Agenda, Téléphone, fiche de lieu), sans SQL.
5. Confidentialité : position et trajets restent privés ; jamais visibles des autres joueurs.
6. Doublons et reconnexion : un seul trajet en cours, arrivée réglée une seule fois à la lecture, refus pendant une autre activité.
7. Impact sur les Blocs 1–14 et cas limites (travail ou cours dans sa ville pendant qu'on est ailleurs, loyer, événements locaux, retards travaux).
8. Plan de tests (comptes temporaires isolés) et régressions prévus.
9. Plan de migration futur : objets nécessaires, aucune modification destructive, stratégie de retour arrière ; indépendance vis-à-vis du Bloc 15 et question de l'ordre des migrations.

## Décisions à vous soumettre dans le document
- Durée, prix et énergie d'un trajet entre villes (ou par paire de villes).
- Moyens disponibles : train seul, ou train et car.
- Peut-on travailler, étudier ou voter depuis une autre ville ? (proposition : non, retour obligatoire).
- Déménagement définitif (changer de ville de résidence) : inclus ou exclu du P1.
- Espaces intérieurs : rendre accessibles seulement ceux existants, ou en ajouter (lesquels).
- Les événements et Actualités d'une ville visitée s'affichent-ils pendant la visite.

## Détails techniques
Lecture seule : `src/game/world.ts`, migrations 0001–0003 et 0042, `move_character`, `character_positions`, `location_spaces`, transport public et Agenda. Seule écriture prévue : les documents dans les Fichiers.
