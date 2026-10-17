# Fondation V1 — Jeu de simulation politique et sociale

## Étape 1 — Identité retenue : CIVITAS
- Slogan : « Votre vie. Votre pouvoir. » (fixe, ne change plus sans demande)
- Style : stratégie moderne, ardoise profonde + corail, élégant et lisible.
- Logo CIVITAS + symbole (colonne/cité stylisée) générés en image.
- Typographies : Sora (titres) + Manrope (texte).
- Boutons, cartes, navigation et écrans de connexion harmonisés avec cette identité.

## Étape 2 — Construction
1. **Écran d'accueil** : grande illustration de ville vivante (bâtiments, circulation, passants, mairie), légères animations (nuages, lumières), logo, slogan, boutons COMMENCER / SE CONNECTER / DÉCOUVRIR LE JEU, pied de page (Actualités, Communauté, Réseaux, Paramètres, Mentions légales, Confidentialité). Pages « Découvrir », mentions légales et confidentialité.
2. **Comptes** (Lovable Cloud) : inscription, connexion, déconnexion, mot de passe oublié + page de réinitialisation, page profil.
3. **Création du personnage** en 4 étapes animées : Identité (prénom, nom, âge 16–30) → Apparence (silhouette, cheveux, visage, vêtements, style, avec aperçu illustré) → Ville de départ (Paris, Lyon, Marseille, Bordeaux, Lille…) → Parcours (Étudiant, Jeune actif, Début de carrière). Les 16–17 ans ne peuvent choisir que « Étudiant » — règle vérifiée par le serveur, pas seulement à l'écran.
4. **Tableau de bord** : carte du personnage, ville, parcours, argent, énergie, notifications, événements, raccourcis.
5. **Navigation principale** : Monde, Carte, Téléphone, Personnage, Vie, Politique, Organisations, Actualités, Paramètres. Les sections non prêtes affichent clairement « Arrive dans une prochaine étape ».
6. **Téléphone** : écran de téléphone avec 9 applis ; Profil et Banque (solde réel) fonctionnent, les autres sont verrouillées avec un cadenas.
7. **Paramètres** : préférences enregistrées en ligne.

Test final : créer un compte → personnage → déconnexion → reconnexion → même personnage retrouvé.

Hors périmètre : élections, parlement, économie avancée, multijoueur complet, etc.

## Détails techniques
- Tables : profiles, characters, cities, locations, organizations, memberships, jobs, accounts, transactions, events, news, notifications, user_settings, world_state (date/heure du monde). Villes et parcours préremplis.
- Sécurité : RLS sur toutes les tables ; chacun ne lit/modifie que ses données. Argent, comptes et transactions en lecture seule côté joueur ; création du personnage + compte bancaire initial via une fonction serveur qui valide âge/parcours et fixe l'argent de départ.
- Parcours et règles d'âge dans un module de configuration extensible (`src/game/`).
- Structure : `src/components/ui`, `src/components/game`, `src/routes` (zone protégée `_authenticated`), `src/game` (règles), `src/services` (accès données), `src/types`.
- Chargement via loaders + React Query ; illustrations générées et optimisées.
- Mobile-first pour le confort au doigt tout en soignant l'affichage ordinateur.
