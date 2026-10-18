# Bloc 13 — Communication et état du monde (proposition)

Statut : analyse uniquement. Aucun SQL appliqué, aucune donnée modifiée, aucun développement. Bloc 12 validé et gelé. Bloc 14 non commencé.

## Constat de l'existant
Trois entrées affichent encore « Disponible dans une prochaine étape » :
- Téléphone → **Messages**
- Téléphone → **Réseau social**
- Menu → **Monde**

Tout le reste (Banque, Agenda, Contacts, Organisations, Actualités, Ma Ville, Politique, Mandat, Démarches, Événements) est livré. Le Bloc 13 propose donc de terminer ces trois entrées en réutilisant les systèmes existants, sans créer de système parallèle.

## Fonctionnalités prévues

### 1. Messages (Téléphone)
- Conversations privées avec les personnages fictifs déjà présents dans Contacts (pas de messagerie entre vrais joueurs : multijoueur complet hors périmètre).
- Messages entrants générés à partir de faits déjà existants : relation qui progresse, invitation d'une organisation, rappel d'un événement inscrit à l'Agenda, félicitations après une élection, embauche, etc.
- Réponses à choix (3 réponses proposées), chaque réponse réutilisant l'action sociale existante (`social_interact`) : mêmes effets, mêmes plafonds, même énergie. Aucun nouveau calcul de relation.
- Invitation reçue par message → bouton « Ajouter à l'Agenda » qui passe par le système d'activités existant.
- Lu / non lu privé, pastille sur l'icône du téléphone.

### 2. Réseau social (Téléphone)
- Fil fictif « Civi » : publications courtes de personnages fictifs, médias fictifs, organisations, partis et mairie, alimentées par les articles et événements existants (pas de nouveau générateur d'actualité).
- Le joueur peut publier un message court à partir de modèles (pas de texte libre visible par d'autres : pas de modération à gérer), aimer et partager.
- Effet limité et plafonné sur la réputation/influence existantes, via les mêmes registres anti-doublon (une récompense par publication, plafond quotidien).
- Les publications du joueur restent visibles uniquement par lui et par la simulation fictive (pas d'exposition aux autres joueurs).

### 3. Monde (Menu)
- Tableau de bord en lecture seule : date et heure du monde, météo, indicateurs des cinq villes (déjà en base), maires et résultats municipaux, événements nationaux en cours, chiffres de population fictive.
- Aucune nouvelle règle, uniquement l'affichage de données existantes.

## Données concernées
- Lecture seule : `world_state`, `cities`, `city_indicators`, `city_weather`, `municipal_mandates`, `elections`, `events`, `news`, `social_npcs`, `social_relations`, `organizations`.
- Nouvelles tables envisagées (migration à proposer séparément) :
  - `messages_threads` / `messages` : conversations privées joueur ↔ personnage fictif, clé unique par fait source (pas de message en double).
  - `social_posts` / `social_post_reactions` : publications fictives et du joueur, clé unique par source.
- Réutilisés sans modification : `social_interact`, `activities`, `notifications`, `news`, registres de récompenses sociales/politiques.
- Aucune modification ni suppression des tables des Blocs 1 à 12.

## Risques
- Doublons de messages/publications lors des recharges : traités par clés uniques par fait source.
- Gonflement de la réputation par publications répétées : plafond quotidien côté serveur.
- Fuite de données privées entre joueurs : chaque conversation et publication du joueur liée à son seul personnage, lecture limitée au propriétaire.
- Volume de notifications : réutilisation du plafond existant.

## Limites assumées
- Pas de messagerie ni de réseau entre vrais joueurs.
- Pas de texte libre publié, uniquement des modèles.
- Pas d'IA générative pour les conversations.
- Les trois limites du Bloc 12 restent reportées.

## Tests prévus
1. Message entrant créé une seule fois après un fait (recharge, reconnexion).
2. Réponse à un message : effet identique à l'action sociale équivalente, une seule fois (double clic).
3. Invitation par message ajoutée à l'Agenda sans doublon ni conflit horaire.
4. Lu/non lu persistant et pastille correcte.
5. Fil social alimenté par articles/événements existants sans doublon.
6. Publication du joueur : récompense unique et plafond quotidien respecté.
7. Confidentialité : un second compte ne voit ni messages ni publications du premier.
8. Page Monde : données cohérentes avec Carte, Ma Ville et Mandat.
9. Écritures directes refusées sur les nouvelles tables.
10. Régressions : parcours 30/30, cas limites 23, réembauche 10/10, loyers 8/8, Bloc 11, Bloc 12 (27), tests automatiques.

Tous les tests sur compte temporaire isolé, supprimé ensuite, avec empreinte des données existantes avant/après.

## Étapes
1. Votre approbation de ce contenu (ou ajustements).
2. Présentation du SQL exact, séparément, pour approbation.
3. Développement, tests, rapport final — sans déclarer le Bloc 13 validé.
