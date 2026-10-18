# Bloc 12 — Monde vivant et événements : structure proposée (étape 1)

Cette étape ne fait que proposer la structure, comme le demande le cahier des charges (section 27). Rien n'est appliqué. Une fois la structure approuvée, le SQL exact complet sera présenté pour une seconde approbation.

## Constat sur l'existant
- Le jeu possède déjà **un** système d'événements : la table `events` (39 lignes), qui alimente les Actualités (`news`) et les Notifications. Elle porte déjà titre, description, catégorie, ville, lieu, organisation, importance, statut, portée (locale, régionale, nationale) et une clé unique `event_key`.
- L'Agenda repose sur `activities`, avec une clé unique `(character_id, source_key)` qui empêche les doublons, et un règlement à l'heure du monde (`settle_daily_life`). Une activité prévue et non commencée passe en « annulée » à sa fin.
- La Banque passe par `economy_cash`, protégée par une clé d'opération unique. Elle n'est pas exécutable par les joueurs.
- Le cahier propose `world_events`, mais une telle table **doublerait** `events`. Proposition : étendre `events` et ajouter seulement ce qui manque.

## 1. Extension de `events` (ajouts uniquement)
Nouvelles colonnes, toutes facultatives. Les 39 événements existants restent identiques et continuent d'alimenter les Actualités comme avant.
- `ends_at` : date de fin. Si elle est vide, l'événement est instantané ou permanent.
- `duration_kind` : instantané, temporaire, récurrent ou permanent.
- `template_id` : modèle d'origine (voir 2).
- `character_id` : rempli uniquement pour un événement personnel, visible du seul joueur concerné.
- `game_category` : les 11 catégories du cahier, à côté de la catégorie de presse existante.
- `interactive` : indique si l'événement propose « Participer / Ignorer ».
- `reason` : texte « pourquoi cela vous concerne ».

Deux contraintes s'élargissent sans rien retirer :
- statut : ajout de « en cours » et « terminé » aux valeurs actuelles (prévu, publié, annulé) ;
- type de cible : ajout de « personnel ».

**Lecture côté joueur :** les événements généraux restent lisibles comme aujourd'hui. Un événement personnel n'est lisible que par son joueur ; c'est une règle de lecture en plus, sans perte pour l'existant.

## 2. Nouvelle table `world_event_templates` (réglages du jeu)
Elle sert de catalogue configurable : identifiant, catégorie, portée, titre et description, sorte de lieu visé sur la carte existante, probabilité par jour et par ville (0 à 100), durée, récurrence (aucune, hebdomadaire ou mensuelle, avec jour et heure), conditions (âge minimum et maximum, parcours admis, emploi exigé, études exigées, compétence minimale, ville), participation possible ou non, énergie, gains (argent fixé par le jeu, compétence, relation, réputation, engagement civique, influence politique), règle de réussite, diffusion en actualité, notification.

Lecture seule pour les joueurs ; aucune écriture possible.

## 3. Nouvelle table `world_event_settings` (une seule ligne)
- Événements personnels au maximum par joueur et par jour (proposé : 1).
- Notifications d'événements au maximum par jour (proposé : 3).
- Horizon de planification (proposé : 7 jours).
- Événements générés au maximum par ville et par jour (proposé : 2).
- Interrupteur général.

Lecture seule pour les joueurs.

## 4. Nouvelle table `world_event_participations`
Champs : événement, personnage, choix (participer ou ignorer), statut (inscrit, réussi, échoué, absent, ignoré), activité d'Agenda liée, résultat enregistré, tirage enregistré, date de récompense.

- **Unicité (événement, personnage)** : une seule participation, même avec quatre clics simultanés.
- Lecture par le seul propriétaire ; aucune écriture directe. Le joueur ne peut donc modifier ni son résultat ni ses gains.

## 5. Nouvelle table `world_event_effects` (registre des conséquences)
Champs : personnage, événement, **clé d'effet unique**, nature (argent, énergie, compétence, relation, réputation, civique, politique, notification), montant, date.

Chaque conséquence est inscrite une seule fois. Une recharge, une reconnexion ou un rattrapage hors connexion ne peut pas la rejouer. L'argent passe toujours par la Banque, avec la même clé.

Lecture par le seul propriétaire ; aucune écriture directe.

## 6. Réglage de l'Agenda
Ajout d'une ligne de règle `world_event` dans les règles de vie existantes. Ce type d'activité est exigé par l'Agenda. Ajout seulement : aucune règle existante n'est modifiée.

## 7. Fonctions serveur prévues
- `refresh_world_events()` : génération contrôlée, sous verrou, sur l'horizon de planification uniquement, donc sans infinité d'enregistrements.
  - Le tirage est déterministe : il dépend du modèle, de la ville et de la date, et donne toujours le même résultat.
  - Clé unique par événement, donc aucun doublon.
  - Les événements importants passent par le circuit existant de publication des actualités.
  - Le lancement suit le traitement horaire des actualités, jamais l'ouverture d'une page.
- `world_events_state()` : écran Événements du joueur, avec les onglets Aujourd'hui, À venir, Pour vous, Ma ville et Récents.
  - Elle rattrape le temps écoulé : fin des événements, résultats et récompenses dus, une seule fois chacun.
  - Elle crée au plus un événement personnel par jour, compatible avec l'âge, le parcours, la ville, l'emploi et le niveau.
  - Elle signale les conflits d'Agenda.
- `world_event_action(événement, choix)` : verrou sur le personnage, puis vérification de la ville, de l'âge, du parcours, des conditions, de la date et de l'absence de participation antérieure.
  - « Participer » ajoute l'activité à l'Agenda, après signalement d'un éventuel conflit et sans rien ajouter à l'insu du joueur.
  - « Ignorer » est enregistré.
- Règlement : à la fin de l'activité, le joueur est « présent » s'il l'a commencée depuis l'Agenda, et « absent » sinon.
  - Le résultat est calculé à partir de la compétence et de l'énergie, puis enregistré. Il ne change jamais.
  - Les gains passent par le registre des effets et la Banque.

## 8. Interface
- Nouvelle section **Événements** (menu et téléphone), avec des cartes indiquant quoi, où, quand, pourquoi vous êtes concerné et ce que vous pouvez faire.
- Repères sur la Carte, avec ouverture du lieu existant.
- Événements visibles dans l'Agenda.
- Les fonctionnalités non prévues afficheront « Disponible dans une prochaine étape ».

## Données touchées
- **Aucune suppression ni réécriture de données existantes.**
- `events` reçoit des colonnes facultatives vides pour les 39 lignes actuelles.
- `life_rules` reçoit une ligne.
- Les nouvelles tables reçoivent des modèles et des réglages par défaut.
- Aucune modification des Blocs 1 à 11 en dehors de ces ajouts.

## Décisions à prendre
1. Approuvez-vous l'extension de `events` plutôt qu'une table `world_events` séparée ?
2. Approuvez-vous les fréquences proposées (1 événement personnel par jour, 3 notifications par jour, 2 événements par ville et par jour, horizon de 7 jours) ?
3. Montant maximal d'une récompense en argent : je propose 50 € par événement.

Après accord : présentation du SQL exact complet (étape 2), puis développement, tests des sections 33 à 44 sur comptes temporaires et rapport final. Le Bloc 13 ne sera pas commencé.
