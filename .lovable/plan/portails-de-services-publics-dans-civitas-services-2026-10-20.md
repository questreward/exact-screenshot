# Portails de services publics dans CIVITAS Services

## Ce que cette livraison apporte
- Dans **CIVITAS Services**, une nouvelle rubrique **Portails** avec des espaces inspirés des services publics français, sous des noms fictifs et un logo neutre (pas de logo officiel) :
  - **Caisse des aides** (équivalent CAF) : aides au logement et familiales.
  - **Espace impôts** (équivalent impots.gouv) : déclaration, avis et paiement simulés.
  - **Emploi CIVITAS** (équivalent France Travail) : chercher un emploi, chômage, entretiens.
  - **Santé CIVITAS** (équivalent Ameli) : médecin, moral, assurance santé.
  - **Titres et papiers** (équivalent ANTS/préfecture) : carte d'identité, documents.
- Chaque portail est une page claire sur téléphone : à quoi sert ce service dans la vraie vie, ce que tu peux y faire dans le jeu, et de grands boutons qui ouvrent les écrans existants (Mes démarches, Vie administrative, Carrière, Recrutement, Santé, Mon profil, Mes documents, Logement…).
- Mention visible « Simulation CIVITAS — pas un vrai service public ».

## Règles
- Aucune nouvelle démarche, aide, montant ou règle : les portails orientent vers ce qui existe déjà et restent cohérents avec ses calculs.
- Une action qui n'existe pas encore affiche « Disponible dans une prochaine étape ».
- Aucune installation de base de données ; seulement la mise à jour du site.

## Livraison et vérifications
1. Créer les cinq portails et la rubrique dans CIVITAS Services (recherche comprise : « caf », « impôts », « chômage »…).
2. Tester que chaque bouton mène à une page existante.
3. Vérifier téléphone et ordinateur.
4. Fournir le bloc de mise à jour du site.

## Détails techniques
- Données de présentation dans `src/game/civitas-portals.ts` (identifiant, nom fictif, équivalent réel, explications, liens vers routes existantes) avec tests (routes existantes, recherche par mot-clé réel).
- Route dynamique `src/routes/_authenticated/_game/portail.$id.tsx` (404 propre si inconnu) et rubrique Portails sur `civitas-services.tsx`.
- Aucune migration SQL.
