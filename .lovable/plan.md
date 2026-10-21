# Une interface qui fait « jeu », pas « logiciel »

Uniquement de l'affichage : aucune règle du jeu, aucun montant ni aucune donnée ne change.

## 1. Une présentation en haut de chaque page (85 pages)
Chaque page s'ouvre sur un bandeau illustré, à la manière d'une scène :
- une grande icône ou une image du lieu (guichet de banque, bureau de retraite…), le nom du lieu et une phrase d'ambiance (« Bienvenue à la Banque Horizon, conseillère Mme Laurent »)
- « À quoi ça sert » : 2 ou 3 lignes simples (ex. Patrimoine : « Ici, tu suis ce que tu possèdes : épargne, maison, voiture. Plus ton patrimoine grandit, plus tu peux investir et voter des projets »)
- 2 ou 3 actions principales sous forme de grosses tuiles
- un bouton « J'ai compris » qui replie le bandeau ; on peut le rouvrir avec « ? »

Les textes des 85 pages seront rédigés et regroupés au même endroit, pour rester cohérents.

## 2. Plus de réalisme sur les lieux clés
En priorité : Banque, Retraite, Patrimoine, Impôts, La Poste, CAF, Préfecture.
- un décor de guichet ou d'écran d'agence en haut (on réutilise les décors existants)
- un personnage qui t'accueille, avec une bulle de dialogue qui change selon ta situation (« Ton solde est bas ce mois-ci… »)
- les montants affichés comme de vrais documents : relevé, carte bancaire, relevé de carrière façon papier officiel
- toujours avec la mention FICTIF

## 3. Fin des menus déroulants (39 écrans)
On les remplace selon les cas :
- **peu de choix (2 à 6)** : grosses tuiles cliquables avec icône, comme des cartes à jouer
- **beaucoup de choix** (contacts, villes, mois) : un panneau qui monte depuis le bas de l'écran, avec une recherche et de grandes lignes faciles à toucher
- **mois, dates, créneaux** : une frise horizontale à faire glisser
- **montants** : boutons rapides (10 €, 50 €, 100 €) en plus de la saisie

Toutes ces zones auront au moins la taille d'un pouce sur téléphone.

## Ordre de réalisation
1. Créer les trois nouveaux éléments (bandeau, tuiles de choix, panneau de choix) et les tester sur téléphone
2. Banque, Retraite, Patrimoine : la version complète, pour que tu valides le style
3. Supprimer les menus déroulants sur les 39 écrans
4. Mettre le bandeau de présentation sur toutes les autres pages
5. Vérification sur écran de téléphone de chaque page, tests et mise en ligne avec la commande habituelle (sans installation de base de données)

## Détails techniques
- Nouveaux composants : `PageIntro` (textes centralisés dans `src/game/page-intros.ts`, état replié stocké sur l'appareil), `ChoiceTiles` (radiogroup accessible), `ChoiceSheet` (Drawer existant + recherche), `MonthStrip`
- Remplacement des `<select>` natifs et du `Select` shadcn dans les 39 fichiers ; mêmes valeurs envoyées au serveur
- Test : chaque route de `_game` dispose d'une présentation dans `page-intros.ts`
- Aucune migration, aucune modification des fonctions serveur
