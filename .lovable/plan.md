# Bloc 9 — Mandat, gouvernance et monde réactif

## Objectif
Transformer le mandat obtenu au Bloc 8 en une phase jouable : choisir trois priorités, étudier des dossiers, négocier, soumettre une décision au conseil, financer et suivre un projet, puis constater les réactions et les conséquences dans la ville.

Les Blocs 1 à 8 restent préservés. Le Bloc 10, les réélections et les institutions nationales ne seront pas commencés.

## Expérience proposée
- **Mandat** : fonction, ville, parti éventuel, dates, priorités, réputation et influence politiques, dossiers, décisions et bilan factuel.
- **Conseil municipal** : groupes issus des partis existants, sièges cohérents avec les résultats électoraux, majorité, opposition et indépendants. Soutien et vote non garantis ; discussion et compromis possibles, jamais achat de voix.
- **Ma Ville** : neuf indicateurs distincts entre 0 et 100, leur évolution et leur tendance ; problèmes rattachés à un quartier et à un indicateur. Aucun score unique de la ville.
- **Dossiers et projets** : objectif, responsable, lieu, coût, délai, statut, impacts prévus et réels. Parcours idée → étude → proposition → vote → financement → travaux → achèvement, avec rejet ou abandon possible.
- **Budget municipal** : recettes, dépenses, réserve, solde et catégories, entièrement séparés de la Banque personnelle. Chaque financement est débité une seule fois.
- **Monde réactif** : progression des travaux, effets immédiats et différés, perturbations temporaires, retards ou échecs simples, réactions des groupes et des habitants, nouveaux problèmes ou opportunités.
- **Fin du mandat** : arrêt des nouvelles actions et bilan avant/après, sans lancer de nouvelle élection. Les projets déjà financés continuent leur évolution municipale.

## Réutilisation des pages et systèmes
- Ajouter une page **Mandat** et les liens depuis Élections, Politique, Ma Ville et le téléphone.
- Afficher **Mon mandat** uniquement pour le titulaire ; permettre aux autres joueurs de suivre la vie politique, les décisions et les projets, sans leur accorder les commandes d’un élu.
- Afficher les projets sur la carte existante au bon lieu et quartier, avec statut, coût, délai et effets.
- Utiliser l’agenda et l’énergie existants pour les études, réunions, négociations et événements. Aucun calendrier parallèle.
- Réutiliser les consultations, signalements, institutions, relations et personnalités politiques existantes.
- Publier les changements importants dans les actualités fictives et les notifications existantes, avec dédoublonnage et ciblage pour éviter le spam.
- Ne pas ajouter de commentaires ou de messagerie inexistants.

## Règles de fonctionnement
- Trois priorités actives au maximum, sans bonus automatique ; elles orientent les dossiers, événements, consultations et réactions disponibles.
- Les durées et toutes les échéances suivent exclusivement l’horloge du monde.
- Les conséquences peuvent être favorables ou défavorables et toucher plusieurs indicateurs. Les consultations éclairent le conseil sans remplacer son vote.
- Les choix d’équilibrage non chiffrés dans le document seront configurables et identifiés dans le rapport comme valeurs initiales fictives.
- Aucun gain de réputation ou d’influence n’est garanti ; les conséquences politiques restent distinctes du social et de l’argent personnel.

## Détails techniques
- Extensions additives des mandats, problèmes, consultations et décisions existants ; nouvelles données uniquement pour le conseil, les indicateurs, les dossiers/projets, les règles et le registre budgétaire municipal.
- Accès et actions centralisés dans les services actuels ; pages chargées selon les conventions existantes. Les règles de présentation et le catalogue de configuration résident dans `src/game/`, avec leurs paramètres autoritaires persistés côté serveur, jamais acceptés depuis le navigateur.
- Actions sécurisées vérifiant le personnage, le mandat actif, la ville, le lieu, l’énergie, l’agenda, la procédure et les fonds. Écritures directes interdites aux joueurs sur budgets, projets, votes, indicateurs et statistiques.
- Verrous et registres uniques pour garantir un seul financement, un seul résultat de vote et une seule application de chaque effet. Préserver la confidentialité des autres joueurs.
- Évolution déterministe via une tâche planifiée SQL indépendante des visites, complétée par un rattrapage à la lecture. Échéances enregistrées pour appliquer les effets dans l’ordre même après une longue absence.
- Les consultations créées pour un dossier du mandat restent consultatives : leur clôture ne finance ni n’adopte automatiquement ce dossier. Les consultations déjà validées gardent leur fonctionnement actuel.
- Préserver les effets locaux et les décisions des anciens blocs ; rattacher chaque nouvelle conséquence à son dossier pour éviter les traitements concurrents contradictoires.

## Validation avant conclusion
1. Les **16 scénarios obligatoires** : mandat, conseil, problème, dossier, décision, budget unique, progression, temps du monde, conséquences, opposition, consultation, carte, agenda, réputation, reconnexion et sécurité.
2. Le parcours complet : élection gagnée → mandat → trois priorités → étude → vote → financement → projet → réactions → achèvement → conséquences → actualités → bilan.
3. Les refus : non-élu, autre ville, mandat terminé, budget insuffisant, vote rejeté, action chevauchant l’agenda et tentatives de modification directe.
4. La régression transversale demandée : connexion → personnage → Banque → travail → agenda → relations → politique → mandat → décision → projet → carte → actualités → déconnexion/reconnexion.
5. Vérification sur téléphone et ordinateur, essais avec données réelles et comptes temporaires nettoyés. Les accélérations d’essai ne doivent pas modifier l’horloge visible par les autres parties.

## Livraison
Rapport final avec fonctionnalités construites, nombre de tests, réussites et échecs, corrections, régressions éventuelles, limitations et valeurs initiales à confirmer. Le Bloc 9 ne sera déclaré terminé qu’après ces vérifications ; ensuite, attendre les prochaines instructions sans commencer le Bloc 10.