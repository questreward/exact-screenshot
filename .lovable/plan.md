# Bloc 12 — Étape 2 : SQL exact proposé (NON APPLIQUÉ)

Le SQL complet, prêt à être appliqué tel quel après votre accord, se trouve dans le fichier du projet `.lovable/proposed_0039_bloc12_world_events.sql`. Il ne contient ni suppression, ni remplacement de données, ni modification de fonction existante.

## Ce qui change

### Table existante `events` (ajouts uniquement)
- **Sept colonnes facultatives :**
  - `ends_at` : date de fin ;
  - `duration_kind` : instantané, temporaire, récurrent ou permanent ;
  - `template_id` : modèle d'origine ;
  - `character_id` : rempli uniquement pour un événement personnel ;
  - `game_category` : les 11 catégories du cahier ;
  - `interactive` : `false` par défaut ;
  - `reason` : « pourquoi cela vous concerne ».
- **Deux index de lecture**, l'un pour les événements personnels, l'autre par ville et date.
- **Les 39 événements existants :** leurs valeurs ne changent pas, les nouvelles colonnes restent vides et `interactive` vaut `false`. La règle de lecture, la publication en Actualités et les Notifications restent intactes.
- **Simplification par rapport à l'étape 1 :** aucune contrainte existante n'est élargie. Les statuts « en cours » et « terminé » sont calculés à l'affichage à partir des dates.

### Table existante `life_rules`
Ajout d'une ligne `world_event` (« Événement », 60 min, utilisable dans tous les lieux existants), exigée par l'Agenda. Si elle existe déjà, rien ne se passe. Aucune règle existante n'est modifiée.

### Nouvelles tables (avec RLS et droits)
- **`world_event_templates`** : catalogue configurable de 13 modèles (8 locaux ou nationaux, 5 personnels). On y règle :
  - probabilité, récurrence, heure et durée ;
  - conditions : âge, parcours, emploi exigé ou interdit, études, adhésion politique, compétence ;
  - énergie et taux de réussite ;
  - gains, avec une **règle qui interdit plus de 50 €**.

  Lecture seule pour les joueurs.
- **`world_event_settings`** : une ligne avec vos réglages : interrupteur activé, 1 événement personnel par jour, 3 notifications par jour, 2 événements par ville et par jour, horizon de 7 jours, 50 € maximum. Lecture seule.
- **`world_event_generation`** : repère « ville + jour déjà générés ». Il borne le nombre d'enregistrements. Aucun accès pour les joueurs.
- **`world_event_participations`** : participations, avec unicité **(événement, personnage)**. Le joueur voit les siennes uniquement et ne peut rien écrire.
- **`world_event_effects`** : registre des conséquences, avec unicité **(personnage, clé d'effet)**. Lecture par le propriétaire uniquement.

### Nouvelles fonctions
- **Fonctions internes**, non exécutables par les joueurs :
  - `world_event_roll` : tirage déterministe, toujours identique ;
  - `world_event_eligible` : compatibilité avec le profil réel ;
  - `world_event_notify` : plafond de 3 notifications par jour ;
  - `world_event_effect` : application unique d'un effet ;
  - `world_events_generate` : génération sous verrou, sur l'horizon de 7 jours, au plus 2 événements par ville et par jour, avec clé unique ;
  - `world_events_personal` : au plus 1 événement personnel par jour, avec la clé unique `wevp:personnage:jour` ;
  - `world_events_settle` : règlement présence ou absence, résultat figé, récompenses.
- **Fonctions joueur :**
  - `world_events_state()` : écran Événements. Elle rattrape le temps écoulé (génération, événement personnel, règlement) et ne renvoie que les événements de sa ville, les événements nationaux et **ses propres** événements personnels.
  - `world_event_action(événement, choix)` : « participer » ou « ignorer ».

## Garanties
- **Banque :** l'argent passe uniquement par `economy_cash`, avec la clé unique `wevent:<événement>`, plafonnée à 50 €. Le montant vient du modèle, jamais du joueur.
- **Idempotence :**
  - une participation unique en base, et le personnage est verrouillé pendant l'action ;
  - l'activité d'Agenda est unique grâce à `wevent:<événement>` ;
  - chaque effet est unique par clé ;
  - le tirage est enregistré une fois, au moment de l'inscription ;
  - les notifications sont uniques par clé.

  Une recharge, une reconnexion, des clics multiples ou un rattrapage hors connexion ne créent donc rien de plus.
- **Vie privée :** un événement personnel reste toujours au statut « prévu » et sans journal source. Il n'est donc jamais lisible par d'autres joueurs, ni publié en Actualités.
- **Actualités :** seuls les événements généraux marqués « diffusés » reçoivent un journal source. Le traitement horaire existant les publie à leur date, comme aujourd'hui.
- **Agenda :** en cas de conflit, la participation est refusée avec le message « Conflit avec votre agenda : … ». Rien n'est ajouté sans prévenir. Le joueur est « présent » s'il commence l'activité depuis l'Agenda, et « absent » sinon.
- **Résultat :** réussite si le tirage enregistré est inférieur au taux de réussite, augmenté de la compétence. Le résultat est figé dès le règlement.
- **Sécurité :** un joueur ne peut ni créer ni modifier un événement, une récompense, un résultat ou une date. Il ne peut pas participer à un événement expiré, à l'événement personnel d'un autre joueur, ni deux fois.

## Données touchées à l'application
- **Ajouts :** 1 ligne dans `life_rules`, 13 modèles et 1 ligne de réglages dans les nouvelles tables.
- **Événements existants :** aucune valeur modifiée.
- **Aucune suppression.**

## Après votre accord
Application à l'identique, puis développement de l'écran Événements, des repères sur la Carte et de l'Agenda. Ensuite, tests des sections 33 à 44 sur comptes temporaires, régression des Blocs 1 à 11 et rapport final. Le Bloc 13 ne sera pas commencé.
