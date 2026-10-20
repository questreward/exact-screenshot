# IA locale — discuter avec les habitants

## Ce que cette livraison apporte
- Dans la fiche d'un habitant fictif (Contacts, lieux de la carte), un bouton **Discuter** ouvre une petite conversation écrite.
- L'habitant répond en français avec sa personnalité : prénom, âge, métier, description, traits de caractère, lieu où il se trouve, niveau de relation avec toi.
- Il peut parler de la ville à partir des faits publics du jeu (heure, lieu, événements publics en cours), jamais de données privées d'autres joueurs.
- Grandes zones de saisie et bulles lisibles sur téléphone ; phrases d'accroche proposées (« Comment ça va ? », « Quoi de neuf en ville ? »).

## Règles
- **L'IA raconte, le jeu décide** : discuter ne donne ni relation, ni argent, ni réputation, ni énergie. Les actions existantes (se présenter, inviter…) restent les seules à faire évoluer la relation.
- Il faut être sur le même lieu que l'habitant, comme pour les actions existantes.
- Uniquement l'IA de ton VPS (Ollama). Aucun appel à un service extérieur, aucun secours automatique.
- Si l'IA est arrêtée ou lente, un message clair s'affiche (« L'habitant ne peut pas répondre pour le moment ») ; le reste du jeu fonctionne normalement.
- La conversation n'est pas enregistrée : elle disparaît en quittant la fiche (pas de mémoire durable dans cette première livraison).
- Limites : message de 300 caractères maximum, 8 derniers échanges gardés pendant la discussion, réponses courtes.

## Livraison et vérifications
1. Préparer la discussion et la fiche habitant.
2. Tester : présence obligatoire, refus si non connecté, messages trop longs, IA indisponible, aucune donnée privée envoyée à l'IA, aucune récompense.
3. Vérifier téléphone et ordinateur.
4. Aucune installation de base de données : seulement la mise à jour du site. L'IA (Ollama, déjà prévue par `setup-ai.sh`) doit tourner sur le VPS ; je fournirai la commande de vérification.

## Détails techniques
- Fonction serveur authentifiée sur le modèle de l'analyse de loi : lit l'habitant, la relation et la position du joueur avec ses propres droits (RLS), construit un contexte minimal, appelle `OLLAMA_URL/api/chat` avec délai maximum, nettoie la réponse.
- Logique de présentation et validation (longueur, historique tronqué, consignes) dans `src/game/npc-chat.ts` avec tests unitaires.
- Composant `NpcChat` branché dans la fiche existante de `SocialContacts`.
- Aucune migration SQL.
