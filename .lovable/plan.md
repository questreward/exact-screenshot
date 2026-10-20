# CIVITAS Services — porte d'entrée commune

## Ce que cette livraison apporte
- Une nouvelle page **CIVITAS Services**, accessible depuis le menu (rubrique Quotidien) et un raccourci de l'accueil.
- Les services existants regroupés par besoin de vie, en grandes cartes faciles à toucher sur téléphone :
  - **Se loger** : Logement, Chez moi, Agence immobilière, Construction, Boutique Immobilier.
  - **Travailler** : Ma carrière, Recrutement, Vie (études et travail), Mon parcours.
  - **Démarches et aides** : Mes démarches, Vie administrative, Mes documents.
  - **Argent et protection** : Patrimoine/banque, Assurances, Concessionnaire.
  - **Santé, justice, droits** : Santé, Justice, Syndicats.
  - **Entreprises de services** : Garages, déménageurs et autres services des joueurs.
- Une barre de recherche simple (« je veux… louer, assurer, travailler… ») qui filtre les cartes par mots-clés.
- Un court texte pédagogique par service : à quoi il sert dans la vraie vie, marqué « simulation CIVITAS ».
- Un rappel que les entreprises de joueurs passent en priorité, les entreprises fictives servant de relais (règle déjà en place dans chaque service).

## Protections
- Aucune nouvelle règle, aucun prix, aucun paiement : la page ne fait qu'orienter vers les écrans existants.
- Aucune installation sur la base de données ; seule une mise à jour du site sera nécessaire.
- Aucun service inventé : un service absent du jeu n'apparaît pas ou affiche « Disponible dans une prochaine étape ».

## Livraison et vérifications
1. Créer la page, les groupes et la recherche.
2. Tester que chaque carte mène à une page qui existe et que la recherche trouve les bons services.
3. Vérifier téléphone et ordinateur.
4. Fournir le bloc de mise à jour du site VPS.

## Détails techniques
- Catalogue des services en données de présentation (`src/game/civitas-services.ts`) réutilisant les identifiants de `SECTIONS` ; tests unitaires sur le regroupement et la recherche (accents ignorés).
- Route `src/routes/_authenticated/_game/civitas-services.tsx`, section ajoutée à `navigation.ts` et au groupe Quotidien, raccourci d'accueil.
- Aucune migration SQL.
