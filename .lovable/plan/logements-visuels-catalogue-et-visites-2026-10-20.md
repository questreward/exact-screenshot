# Logements visuels — catalogue et visites

## Première livraison
- Illustrer les logements du catalogue existant : studios, appartements et maisons, avec une présentation soignée sur téléphone.
- Ajouter des filtres immobiliers par ville et nombre de pièces, en conservant la recherche et le budget existants.
- Ouvrir une fiche « Visiter » : galerie d’illustrations, surface, pièces, quartier, DPE, prix, charges et taxe déjà connus du jeu.
- Proposer plusieurs vues cohérentes par type de logement : espace de vie et intérieur ; extérieur pour les maisons. Les images seront clairement indiquées comme des illustrations, pas comme des photos contractuelles du bien.
- Depuis la visite, accéder à la confirmation d’achat actuelle ; conserver les envies et objectifs d’achat.
- Garder les locations, l’emménagement et les agences accessibles par leurs parcours existants, sans inventer de nouvelle offre.

## Suite du chantier
L’aménagement chez soi, les objets placés dans les pièces et leur sauvegarde constituent une deuxième livraison, avec un plan distinct. Cette première livraison ne présente pas un logement personnalisable comme déjà disponible.

## Ce qui reste inchangé
Aucun nouveau prix, frais, crédit, avantage, récompense ou condition d’achat. Aucun changement des contrats, biens possédés ou déplacements. Aucune dépendance à AI Gateway : les illustrations sont servies avec le site.

## Détails techniques
- Réutiliser les produits immobiliers et leurs caractéristiques dans les lectures existantes de `src/services/game.ts`.
- Ajouter un module de présentation des logements et une galerie accessible réutilisable, intégrée à la Boutique.
- Ne pas déduire de plan coté, jardin privatif, nombre de chambres ou équipements absents des données ; omettre les caractéristiques inconnues.
- Aucun changement de données prévu. Si une modification devient nécessaire, présenter séparément le SQL exact et attendre un accord avant toute application.

## Vérifications et installation
- Vérifier filtres, caractéristiques manquantes, galerie et retour à la confirmation d’achat sans déclencher de paiement lors d’une visite.
- Tester l’affichage et les interactions sur téléphone et ordinateur, puis les essais existants concernés.
- Distinguer les contrôles réellement effectués des parcours uniquement simulés si le catalogue VPS n’est pas disponible dans l’aperçu.
- Fournir les commandes directes de mise à jour du VPS, sans téléchargement séparé.