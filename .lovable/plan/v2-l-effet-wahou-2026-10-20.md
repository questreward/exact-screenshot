# V2 — L'effet « Wahou »

Objectif : qu'on ait envie de filmer le jeu pour TikTok dès demain. Images réalistes + scènes où l'on touche les objets + sons (bouton pour couper). Tout est livré avec le jeu sur ton serveur, aucun service extérieur.

## 1. Secours et interventions (priorité)
- **Vrais intérieurs** en images réalistes : cabine et cellule du camion de pompiers (FPT), voiture de police, fourgon de gendarmerie, ambulance SAMU, véhicule de Protection civile (VPSP).
- **Scène interactive** : on touche les objets — radio (message d'appel), carte GPS, sac de secours, défibrillateur, brancard, lance, menottes/bloc-notes — pour faire avancer l'étape d'intervention déjà enregistrée.
- **Arrivée sur les lieux** : image réaliste du lieu (feu d'appartement, accident, malaise, rixe), gyrophares qui clignotent, sirène qui s'éteint à l'arrivée.
- **Paperasse** : compte rendu façon formulaire officiel (fictif) rempli avec les vrais choix du joueur.
- Rien d'inventé : chaque scène suit exactement l'étape et le résultat calculés par le serveur.

## 2. Manifestations
- Image réaliste du cortège dans ta ville, foule qui grossit selon le vrai nombre d'inscrits, banderoles avec le vrai slogan, forces de l'ordre en fond.
- Touches interactives : prendre le mégaphone, lever la pancarte, avancer avec le cortège (illustration, sans gain en plus).
- Son de foule et de slogans.

## 3. Accueil du jeu
- Premier écran plein téléphone : une courte séquence d'images (pompiers en route, Assemblée, manif, mairie) qui défile, slogan « Votre vie. Votre pouvoir. », gros bouton « Commencer ».
- Après la création du personnage : une petite arrivée en ville animée.

## 4. JT
- Habillage façon vraie chaîne d'info : générique sonore, bandeau défilant, plateau avec présentateur illustré, images réalistes par sujet (manif, intervention, loi, élection), reprises des faits enregistrés uniquement.

## Ordre de livraison
1. Bibliothèque d'images réalistes + sons (une fois, réutilisée partout).
2. Secours (5 services).
3. Manifestations.
4. Accueil.
5. JT.
Chaque étape : je te montre des captures téléphone, tu valides, puis commande habituelle sur le serveur. Aucune modification de la base n'est prévue ; si une devient nécessaire, je te présente le SQL avant.

## Détails techniques
- Images générées une fois, compressées (webp, ~150 Ko) dans `src/assets/v2/`, chargées à la demande pour rester rapide sur téléphone.
- Zones cliquables posées en surcouche sur les images (grandes cibles tactiles), animations CSS légères (gyrophares, foule, bandeau).
- Sons courts libres de droits fournis avec le jeu, coupés par défaut jusqu'au premier toucher, réglage « Sons » mémorisé sur l'appareil.
- Réutilise `MissionScene`, `VehicleInterior`, `ProtestsCard`, page JT : seule la présentation change, aucune règle de jeu.
- Tests d'affichage pour le choix d'image selon le métier/l'étape.
