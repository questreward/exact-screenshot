# Nettoyage du VPS et rapidité du jeu

## 1. Supprimer les anciennes versions sur le VPS
Je te donne une seule commande à copier dans Termius :
- elle affiche d'abord l'espace libre et les versions présentes ;
- elle supprime les anciennes images et conteneurs arrêtés de CIVITAS ainsi que le cache de construction ;
- elle garde la version en ligne, la base de données et les données des joueurs (aucun volume supprimé) ;
- elle affiche ensuite l'espace libéré.

## 2. Accélérer la connexion et l'affichage des pages
On commence par mesurer, puis on corrige uniquement ce qui ralentit vraiment :
- **Mesure** : temps de connexion et d'ouverture des pages principales (accueil, tableau de bord, carte, banque, téléphone) sur téléphone et ordinateur, pour trouver les plus lentes.
- **Connexion** : le bouton réagit au premier appui, la session est vérifiée une seule fois, et l'arrivée dans le jeu affiche tout de suite un écran de chargement clair.
- **Pages** : charger d'abord ce qui est visible, le reste ensuite ; réutiliser les informations déjà chargées au lieu de tout redemander ; précharger la page suivante quand le joueur touche un bouton.
- **Images et carte** : images allégées et chargées seulement quand elles apparaissent à l'écran.
- **Base de données** : repérer les demandes les plus lentes et ajouter les accélérations nécessaires (proposées avant installation).
- **Serveur** : vérifier dans la commande VPS que la compression et la mise en cache des fichiers sont actives.

Aucune règle du jeu, argent ou donnée joueur n'est modifié.

## 3. Vérification
Tests complets, construction réussie, mesures avant/après, puis commande d'installation VPS.

## Détails techniques
- `docker image prune -a` filtré sur civitas, `docker container prune`, `docker builder prune`, jamais `docker volume prune`.
- Profilage des loaders/`ensureQueryData`, `staleTime`, découpage des bundles (lazy routes), `preload="intent"`.
- `supabase--slow_queries` + EXPLAIN, index via migration approuvée.
- Vérifier gzip/brotli et en-têtes Cache-Control des assets dans le proxy du VPS.
