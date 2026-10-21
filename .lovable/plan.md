# Bot Discord CIVITAS

Un bot automatique sur le serveur Discord, qui n'utilise que des informations publiques du jeu. Aucun compte relié, aucune donnée privée.

## Ce que fera le bot

1. **Accueil des nouveaux**
   - Message de bienvenue en français avec le slogan, le lien d'inscription et le lien « Découvrir ».
   - Rappel des règles du serveur et bouton pour choisir des rôles d'intérêt (Politique, Économie, Métiers, Annonces).

2. **Actualités du jeu (automatique)**
   - Salon « actualités » : les grands événements publics, à l'heure (titres déjà publiés dans le jeu, jamais inventés).
   - Salon « élections » : ouverture des candidatures, jour du vote, résultats officiels.
   - Le JT du jour annoncé une fois par jour avec un lien vers le jeu.
   - Chaque info n'est publiée qu'une seule fois.

3. **Commandes pour les joueurs**
   - `/heure` : date et heure du jeu, vitesse ×4.
   - `/ville <nom>` : jauges publiques du quartier et événements en cours.
   - `/elections` : prochain scrutin et étape du calendrier.
   - `/classement` : classements publics (fortune seulement pour les joueurs qui l'ont accepté).
   - `/jouer` : lien d'invitation vers le jeu.

4. **Annonces de mises à jour**
   - Une commande réservée à toi (`/annonce`) pour publier une nouveauté ou une maintenance, joliment mise en forme.
   - Possibilité de publier automatiquement une annonce après chaque mise à jour du serveur.

## Ce que tu devras faire (une seule fois)
- Créer le bot sur le portail développeurs Discord et me donner son jeton (formulaire sécurisé).
- L'inviter sur ton serveur et créer les salons : bienvenue, actualités, élections, annonces.
- Lancer une commande dans Termius pour le démarrer sur le VPS.

## Détails techniques
- Petit programme séparé (discord.js) dans `discord-bot/`, lancé dans son propre conteneur Docker sur `civitas-net`, redémarrage automatique.
- Lecture seule de la base via un rôle SQL dédié limité aux vues publiques (news, événements, calendrier électoral, jauges, classements consentis) — migration 0138 avec BEGIN/COMMIT.
- Table `discord_posts` avec clé unique par info publiée pour garantir l'envoi unique ; scrutation toutes les 5 minutes.
- Jeton et identifiants de salons dans `.env` du VPS, jamais dans le code ni côté navigateur.
- `/annonce` limité à l'identifiant Discord d'Alex.
- Script `vps/setup-discord-bot.sh` + tests des fonctions de mise en forme et de filtrage des données publiques.
