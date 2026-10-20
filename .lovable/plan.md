# IA locale — aide à l'écriture

## Ce que cette livraison apporte
- Un bouton **Aide à l'écriture** à côté des zones de texte où le joueur rédige : pétitions, articles de son média, manches de débat, discours/programme de campagne lorsqu'une zone de texte existe déjà.
- Le joueur écrit le sujet et quelques idées (300 caractères max), choisit un ton (sérieux, enthousiaste, combatif, apaisé), puis reçoit un **brouillon** en français.
- Le brouillon s'affiche dans un aperçu : **Utiliser ce brouillon** le place dans la zone de texte, où le joueur peut tout modifier. Rien n'est publié automatiquement.

## Règles
- L'IA propose, le joueur décide : aucune publication, signature, vote ou dépense automatique ; les limites de longueur des écrans existants s'appliquent toujours.
- Uniquement l'IA du VPS (Ollama), sans service extérieur ni secours automatique. Si elle est indisponible, un message clair s'affiche et l'écriture manuelle reste possible.
- Consignes à l'IA : monde fictif CIVITAS, pas d'accusation ni d'attaque personnelle contre de vrais joueurs, pas de propos haineux, pas d'informations privées.
- Rien n'est enregistré par l'aide elle-même ; seul ce que le joueur publie ensuite via les écrans habituels compte.
- Réservé aux joueurs connectés ayant un personnage.

## Livraison et vérifications
1. Créer l'aide et la brancher sur les zones de texte concernées.
2. Tester : idées trop longues, type d'écrit inconnu, IA indisponible, brouillon jamais publié sans action du joueur, limites de longueur respectées.
3. Vérifier téléphone et ordinateur.
4. Aucune installation de base de données : seulement la mise à jour du site.

## Détails techniques
- `src/game/writing-help.ts` : types d'écrits (petition, article, debat, discours) avec longueur cible, tons, validation et consignes ; tests unitaires.
- `src/lib/writing-help.functions.ts` : fonction serveur authentifiée, vérifie le personnage, appelle `OLLAMA_URL/api/chat` avec délai maximum, nettoie et tronque à la longueur cible.
- `WritingHelper` réutilisable, recevant le type d'écrit, la longueur max et un rappel `onUse(texte)`.
- Aucune migration SQL.
