# V2 — Polir tout le jeu (aucune nouvelle fonctionnalité)

But : que CIVITAS ressemble à un jeu, pas à un logiciel. On garde toutes les règles et données ; on change la présentation, l'ambiance et la sensation de jouer. Seule exception : un petit ajout si un écran est inutilisable sans lui (présenté avant).

## 1. Une identité de jeu commune (base de tout)
- Écran principal façon « jeu » : ta ville en grande image vivante (jour/nuit selon l'heure du jeu), ton personnage au premier plan, énergie / argent / humeur en jauges de jeu en haut.
- Navigation par grosses icônes illustrées (lieux de la ville) au lieu de listes de menus.
- Cartes de contenu avec image, effets d'apparition, petites récompenses animées (+20 €, +2 réputation qui s'envolent) quand le serveur confirme un gain.
- Sons discrets (déjà prêts), bouton couper.

## 2. Personnages
- Personnages plus détaillés et expressifs (tenue selon le métier, humeur visible), même style partout : agenda, rencontres, PNJ, JT.
- Dialogues en bulles façon jeu pour les PNJ et l'IA locale, au lieu de formulaires.

## 3. Travail et métiers (tous, pas seulement les secours)
- Chaque métier a son décor réaliste (boulangerie, bureau, chantier, hôpital, mairie…) et ses scènes.
- Journée de travail jouée en scène : arrivée, tâches illustrées, fin de journée avec bulletin animé.
- Secours : relier les objets touchés dans le véhicule aux choix déjà existants de l'intervention.

## 4. Véhicules et déplacements
- Intérieurs réalistes aussi pour voiture perso, bus, train, car ; trajet animé (paysage qui défile, arrivée en gare).

## 5. Espaces administratifs (CAF, France Travail, ameli, Banque, Poste, Impôts, Préfecture)
- Aspect encore plus proche des vrais sites (fictifs, sans logos), mais intégrés au jeu : on « entre » au guichet ou devant l'ordinateur du personnage, courriers animés à ouvrir.

## 6. Ville, logements, manifestations, politique, JT
- Lieux en images réalistes, foule et PNJ animés.
- Mairie, Assemblée, Élysée : décors pour les votes et discours.
- JT façon chaîne d'info (plateau, bandeau, générique).
- Accueil du site spectaculaire pour la promo.

## Ordre de livraison (une étape = captures téléphone → ton accord → mise à jour serveur)
1. Identité commune + écran principal.
2. Personnages.
3. Travail et métiers.
4. Véhicules et trajets.
5. Espaces administratifs.
6. Ville, politique, JT, accueil.

## Détails techniques
- Présentation uniquement : aucun changement des règles côté serveur ni de la base ; si un ajout devient indispensable, SQL présenté avant.
- Images générées une fois, en webp léger, livrées avec le jeu (aucun service extérieur). Chargement à la demande pour rester fluide sur téléphone.
- Composants communs réutilisés partout (décor, jauges, gains animés, bulles), animations coupées si le téléphone demande moins d'animations.
- Tests d'affichage pour les choix de décor et les gains affichés.
