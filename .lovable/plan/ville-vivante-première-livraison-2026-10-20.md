# Ville vivante — première livraison

Donner vie à la carte et aux lieux à partir des informations réellement présentes dans CIVITAS, sans changer les règles du jeu.

## Ce que verra le joueur
- **Ambiance du lieu** : illustration légère, heure du jeu et météo simulée existante ; aucune météo réelle ni service externe.
- **Ce qui se passe ici** : événements publics en cours rattachés au lieu ou à la ville, avec accès à leur détail. Ne pas faire apparaître une manifestation dans une rue si son lieu n’est pas renseigné.
- **Transformations locales** : montrer les projets municipaux déjà liés au lieu, en distinguant prévu, en cours et terminé ; aucun effet annoncé comme réalisé avant sa confirmation par le jeu.
- **Habitants présents** : réutiliser les présences fictives existantes, sans inventer une foule ou révéler les déplacements privés des joueurs.
- Conserver la carte, les accès et les déplacements actuels, avec des commandes faciles à toucher sur téléphone.

## Limites de cette livraison
- Aucun nouveau blocage de rue, coût, délai de transport, récompense ou déplacement automatique. Un blocage ne sera montré que si une information officielle le confirme.
- Pas de nouveau moteur d’événements, de météo ou de personnages.
- Pas d’AI Gateway : images et expérience hébergées sur le VPS.
- Archives, logements aménageables et CIVITAS Services restent les étapes suivantes.

## Préparation et vérification
1. Réutiliser les lectures existantes de carte, météo, présences, événements et projets ; vérifier leurs limites de confidentialité.
2. Préparer les illustrations et intégrer l’ambiance dans les lieux, sans remplacer la carte par une nouvelle page.
3. Tester les lieux sans événement, avec événement, et avec projet ; préserver les déplacements et vérifier l’affichage sur téléphone et ordinateur.
4. Toute modification nécessaire de la base sera expliquée et présentée en SQL exact pour accord distinct avant installation ; ne rien installer automatiquement.
5. Fournir les commandes directes de mise à jour puis vérifier le parcours sur le VPS avec Alex. Les essais simulés ne remplacent pas ce contrôle réel.

## Détails techniques
- Point d’entrée : carte existante et `WorldMap` ; accès aux données par les requêtes de `src/services/game.ts`.
- Réutiliser `weatherQuery`, `locationPresenceQuery` et `locationProjectsQuery` lorsque leurs données sont disponibles ; ne pas déduire une transformation depuis un titre d’actualité.
- Séparer les clés de cache pour toute nouvelle forme de réponse et utiliser des lectures limitées aux informations publiques autorisées.
- Préférer une livraison sans migration ; si les données publiques utiles ne sont pas accessibles, proposer une projection de lecture minimale plutôt que d’élargir l’accès aux informations privées.