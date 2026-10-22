# Bot Discord CIVITAS

Programme séparé du jeu, sans modification des pages ni des comptes joueurs. **Préparé, pas encore en service.**

## Fonctions
- Accueil des nouveaux membres, liens Découvrir et Jouer, quatre boutons de rôles d’intérêt.
- `/heure`, `/ville nom`, `/elections`, `/classement`, `/jouer` et `/annonce texte`.
- Actualités importantes déjà publiées, annonces électorales déjà publiées et JT national enregistré : lecture toutes les cinq minutes.
- Annonces manuelles réservées à l’identifiant Discord du propriétaire, dans le serveur configuré.
- Réputation et influence publiques uniquement. Fortune exclue tant qu’un accord spécifique pour Discord n’existe pas.

Le bot ne génère pas les éditions TV, ne dépouille pas les élections et ne règle aucune échéance. Il lit les données déjà enregistrées. Les étapes électorales affichées sont les états sauvegardés, pas des étapes devinées à partir de l’heure.

## 1. Créer le bot
Sur https://discord.com/developers/applications : New Application → CIVITAS → Bot.
Activer **Server Members Intent**. Ne pas activer Message Content Intent.
Dans OAuth2 → URL Generator : choisir `bot` et `applications.commands`, puis View Channels, Send Messages, Read Message History et Manage Roles. **Ne pas donner Administrator.** Inviter le bot avec le lien généré.

Créer les salons bienvenue, actualités, élections, annonces. Créer les rôles Politique, Économie, Métiers, Annonces **sans permissions particulières**, sous le rôle du bot dans la liste des rôles.
Activer le mode développeur de Discord pour copier les identifiants du serveur, des salons, des rôles et de ton compte.
Le jeton vient de Bot → Reset Token : **ne jamais le coller dans le chat ou dans le dépôt du jeu.**

## 2. Préparer la lecture sur le VPS
La proposition `vps/migrations/0139_discord_public.DRAFT.sql` nécessite ton accord avant application. Ne pas la lancer avec les migrations habituelles.
Elle ajoute deux rôles et six vues limitées, sans accès aux comptes, bulletins de vote, messages ou adresses email. Le rôle propriétaire des vues n’est pas utilisable pour se connecter.
Avant approbation : vérifier le schéma installé, tester cette proposition dans une copie indépendante et contrôler les anciens droits des fonctions accordés à PUBLIC. Le réglage lecture seule est une protection supplémentaire, pas une preuve qu’une ancienne fonction publique ne peut jamais écrire.
Après approbation et installation, définir le mot de passe de `civitas_discord` avec `\password civitas_discord` dans une console PostgreSQL interactive ; pas de mot de passe dans une commande sauvegardée.

## 3. Configuration privée sur le VPS
Créer `/data/civitas-live/secrets/discord.env`, permissions **600**, propriétaire root. Ne pas utiliser le fichier du jeu, ni une clé administrateur.

Noms des réglages à remplir dans ce fichier privé :

| Nom | Valeur à fournir |
| --- | --- |
| DISCORD_BOT_TOKEN | Jeton du bot Discord |
| DISCORD_GUILD_ID | Identifiant du serveur |
| DISCORD_OWNER_ID | Ton identifiant Discord personnel |
| DISCORD_WELCOME_CHANNEL_ID | Salon bienvenue |
| DISCORD_NEWS_CHANNEL_ID | Salon actualités |
| DISCORD_ELECTION_CHANNEL_ID | Salon élections |
| DISCORD_ANNOUNCEMENT_CHANNEL_ID | Salon annonces |
| DISCORD_POLITIQUE_ROLE_ID | Rôle Politique |
| DISCORD_ECONOMIE_ROLE_ID | Rôle Économie |
| DISCORD_METIERS_ROLE_ID | Rôle Métiers |
| DISCORD_ANNONCES_ROLE_ID | Rôle Annonces |
| DISCORD_DATABASE_URL | URL PostgreSQL interne, utilisateur civitas_discord, hôte civitas-db, base civitas ; mot de passe encodé pour URL |
| GAME_URL | Adresse HTTPS publique du jeu |

Le bot utilise une connexion Discord permanente, séparée du site ; ses réglages doivent être disponibles sur le VPS. Les secrets du site dans Lovable ne sont pas automatiquement copiés vers ton VPS.

Puis, depuis le dossier du jeu :
```bash
bash vps/setup-discord-bot.sh
docker logs --tail 30 civitas-discord
```
Ce script ne met pas à jour le jeu et n’applique pas de SQL. Il ne publie aucun port et conserve son journal hors du conteneur.

## Messages et reprises
Au premier démarrage, les 100 informations publiques les plus récentes sont repérées sans envoi, pour éviter une avalanche d’archives. Ensuite, jusqu’à 100 informations des sept derniers jours du jeu sont lues par passage. Une longue interruption ou plus de 100 nouvelles informations peut donc laisser des annonces non publiées.
Un envoi est marqué « en attente » **avant** de contacter Discord. Une réponse perdue ou un arrêt brutal laisse cet envoi en attente et ne le renvoie jamais automatiquement : il peut manquer, mais il ne se répète pas aveuglément. Le journal `/data/civitas-live/discord/posts.json` conserve les identifiants publics et les confirmations, sans messages joueurs. Ne pas supprimer ce journal lors des mises à jour.
Avant toute reprise manuelle d’un envoi incertain, vérifier le salon. Il n’existe pas de garantie transactionnelle d’envoi unique entre Discord et la base du jeu.

## Contrôles avant ouverture
- Tester arrivée d’un nouveau membre et ajout/retrait de chaque rôle.
- Tester les six commandes avec les données du VPS.
- Un autre membre doit être refusé par `/annonce` ; le propriétaire doit réussir.
- Vérifier qu’une actualité publique apparaît une fois, même après redémarrage ; qu’un brouillon ou événement personnel n’apparaît pas.
- Vérifier que le compte `civitas_discord` ne lit aucune table brute, ne possède aucune autre appartenance et ne peut appeler aucune fonction de jeu à effet via des droits hérités de PUBLIC.
- Tester retrait des permissions et interruption réseau ; examiner les envois en attente sans les relancer aveuglément.

Tests locaux : `node --test discord-bot/test/*.test.mjs`.