# CIVITAS — suite après les voyages

Les quatre axes choisis seront livrés par étapes, sans toucher aux règles validées ni installer de changement sur ton serveur sans accord.

## 1. Contrôler le lot installé
- Les 16 essais disponibles sur les calculs, missions, voyages et conversations passent déjà.
- Préparer un contrôle en lecture seule sur ton VPS : présence des fonctions, protections des données privées et configuration de l’IA locale. Aucun secret ne doit apparaître dans la sortie.
- Distinguer ce contrôle des vrais essais en jeu : achats refusés par une carte bloquée, mission sans résultat doublé, taxe reçue par la bonne mairie, voyage et retour sans double paiement ni récompense.
- Faire les essais qui modifient des données sur une copie isolée, pas sur ton personnage ni sur les parties des autres joueurs. Si cette copie n’est pas disponible, présenter la marche à suivre et signaler ce qui reste non vérifié.

## 2. Conversations et IA locale
- Conserver Ollama sur ton VPS, sans service extérieur ni solution de remplacement payante.
- Améliorer la reprise d’une conversation, la gestion des erreurs et la possibilité de recommencer l’échange.
- Préparer une mémoire privée, facultative, par personnage et habitant fictif, avec consultation et effacement par le joueur. Présenter les règles de conservation et le SQL exact avant toute sauvegarde durable.
- Utiliser les faits déjà accessibles au joueur : habitant rencontré, relation et événements publics. Ne jamais révéler les données privées d’un autre joueur.
- L’IA produit du dialogue uniquement : aucun argent, vote, sanction, récompense ou résultat de mission décidé par elle. Le jeu reste utilisable quand Ollama est indisponible.

## 3. Interventions plus immersives
- Commencer par les missions existantes des pompiers, de la police/gendarmerie et des secours médicaux.
- Ajouter des scènes avec les petits bonshommes, les véhicules et un décor adapté ; faire évoluer la présentation avec l’étape réellement enregistrée.
- Garder exactement les choix, délais et conséquences actuels. Aucun nouveau résultat inventé par l’animation.
- Proposer un dossier de mission consultable, portant « DOCUMENT FICTIF — CIVITAS », avec uniquement les informations existantes de la mission.
- Vérifier la lisibilité sur téléphone et ordinateur, les grandes commandes tactiles et le mode sans animations.

## 4. Documents et espaces français
- Inventorier les documents et portails déjà présents avant d’ajouter quoi que ce soit.
- Présenter une liste précise des manques, avec la provenance des informations de chaque document ; ne pas créer de démarches doublonnant CAF, emploi, santé, impôts, banque ou titres sécurisés.
- Compléter d’abord les justificatifs fondés sur des données existantes, puis soumettre les démarches nécessitant de nouvelles règles.
- Tous les documents restent clairement fictifs, sans logo officiel ni identifiant présenté comme réel.

## Livraison et validations
- Première livraison : rapport de contrôle, améliorations des conversations sans sauvegarde durable, scènes des interventions existantes et inventaire des documents manquants.
- La mémoire durable et toute nouvelle démarche nécessitant une migration feront l’objet d’une proposition séparée : tables, colonnes, fonctions, données touchées, nécessité et SQL exact.
- Aucun changement de la base du VPS pendant cette préparation. Une installation réussie ne sera pas présentée comme une vérification complète du jeu.

## Détails techniques
- Réutiliser `NpcChat`, la validation des échanges et le serveur Ollama existants ; appliquer les contrôles d’identité et de présence existants.
- Réutiliser `JobMissionCard`, les composants Bonhomme et le coffre-fort des documents ; la présentation ne modifie pas les RPCs, ledgers ni règles de mission.
- Étendre les tests ciblés et vérifier les parcours accessibles. Ne pas confondre la base Lovable Cloud de prévisualisation avec la base PostgreSQL du VPS.
- Point d’audit : la création des politiques de voyage dans 0113 est conditionnée par une seule politique. Contrôler les trois protections sur le VPS avant de proposer un éventuel correctif ; ne pas réinstaller la migration par défaut.