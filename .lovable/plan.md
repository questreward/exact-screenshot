# Monde mis en scène — prochaine livraison

Après les quatre entreprises installées, enrichir les événements et le journal télévisé, sans modifier les règles du jeu.

## Ce que verra le joueur
- **Événements marquants** : utiliser leur importance existante pour distinguer le quotidien des grands moments, sans multiplier les notifications.
- **Scènes illustrées** : manifestations, élections, crises et grands rendez-vous avec des images légères adaptées au téléphone, sans scènes choquantes.
- **JT enrichi** : relier chaque reportage à son événement réel ; reprendre les interviews existantes lorsqu’elles sont disponibles, sans inventer de propos attribués aux joueurs.

## Préservation du jeu
- Aucun changement des récompenses, contrats, votes, budgets ou déplacements.
- Aucun nouveau moteur d’événements, aucun appel à AI Gateway ; les images restent hébergées sur le VPS.
- Ne pas inventer une foule, une météo ou une interview si le jeu ne fournit pas cette information ; utiliser une illustration clairement identifiée lorsque nécessaire.
- Garder les accès actuels et des commandes faciles à toucher sur téléphone.

## Livraison et installation
1. Comparer les événements et le JT existants pour réutiliser leurs informations.
2. Préparer les scènes et les changements nécessaires ; tester les anciens événements et JT ainsi que le nouvel affichage.
3. Si une modification de la base est nécessaire, présenter les éléments touchés et le SQL exact, puis attendre l’accord avant installation.
4. Fournir les commandes à copier directement sur le VPS, sans téléchargement séparé, avec sauvegarde et arrêt en cas d’erreur.
5. Vérifier ensuite le parcours sur le site avec Alex ; une installation réussie ne remplace pas cet essai.

## Détails techniques
- `WorldEvent` expose déjà `importance` : vérifier son échelle actuelle et définir une correspondance de présentation vers les cinq niveaux prévus, sans changer l’importance utilisée par les anciens événements.
- Réutiliser `events`, les actualités et les éditions TV existantes ; enrichir uniquement les données de présentation nécessaires.
- Les anciens sujets sans lien structuré restent lisibles avec une illustration générique, sans attribuer arbitrairement un événement.
- Le JT expose actuellement un lien vers l’article, pas vers l’événement : vérifier les fonctions SQL existantes avant d’ajouter une relation ; les interviews rattachées aux grands événements concernent les niveaux de présentation 4 et 5, sans supprimer les interviews actuelles.
- Toute migration éventuelle est atomique, avec droits explicites, protection des données privées et contrôles d’intégrité ; aucune exécution sur le VPS depuis cette préparation.

La ville vivante, les archives, les logements aménageables et CIVITAS Services restent les étapes suivantes, hors de cette livraison.