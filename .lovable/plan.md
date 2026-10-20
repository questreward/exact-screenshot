# Logements — aménager aussi sa location

## Ce que cette livraison apporte
- Étendre **Logement → Chez moi** aux locations actives du joueur, en conservant l’aménagement des biens achetés.
- Identifier clairement « Propriété » et « Location » dans le choix du logement.
- Réutiliser les objets déjà possédés : placer, déplacer, tourner, ranger, renommer les pièces et enregistrer.
- Rendre les intérieurs plus lisibles : aperçu des pièces, mobilier mieux identifiable et sélection plus visible, avec de grandes commandes sur téléphone.
- Conserver le nombre de pièces connu ; lorsqu’il manque, afficher un seul espace générique, sans inventer de surfaces réelles.

## Protections
- L’aménagement du locataire est privé et distinct de celui du propriétaire ; aucun accès aux meubles ou aux pièces privées d’un autre joueur.
- Un objet ne peut pas être placé simultanément dans plusieurs logements.
- Quand le bail n’est plus actif, l’ancien aménagement ne peut plus être modifié ; les meubles restent possédés et doivent pouvoir être réutilisés ailleurs.
- Aucun changement de loyer, dépôt, frais d’agence, achat, crédit, valeur du logement ou règles de fin de bail.
- Aucune modification des sauvegardes déjà créées avec 0089 et aucune dépendance à une IA ou à un service extérieur.

## Livraison et vérifications
1. Préparer l’écran et une proposition d’installation complémentaire.
2. Tester propriété et location, confidentialité propriétaire/locataire, bail terminé, objet unique, sauvegarde répétée et version obsolète, sans modifier les comptes réels.
3. Vérifier l’affichage et les actions sur téléphone et ordinateur.
4. Présenter les ajouts exacts et le SQL complet pour un accord distinct, puis fournir les commandes VPS avec sauvegarde.
5. Confirmer l’installation et la sauvegarde/relecture sur le site réel ; ne pas les annoncer comme vérifiées avant ce contrôle.

## Détails techniques
- Réutiliser les baux existants, les objets de `personal_assets`, l’éditeur Chez moi et les accès centralisés de `src/services/game.ts`.
- Ajouter des sauvegardes privées séparées, rattachées à l’identifiant du bail ; conserver les tables et sauvegardes 0089, sans remplacer les fonctions financières ni ouvrir les écritures directes aux joueurs.
- Les contrôles de locataire, de bail actif, de possession, de collision et de version sont imposés par les fonctions sécurisées de la base.
- Privilégier de nouvelles fonctions pour les locations ; tout ajustement nécessaire de 0089 pour l’unicité des meubles sera protégé contre une installation incompatible et couvert par des essais de non-régression.
- L’installation proposée sera atomique : ajouts, configuration et contrôles dans une seule transaction ; aucune application avant accord sur le SQL exact.