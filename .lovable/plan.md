# CIVITAS — Roadmap complète des prochains blocs (analyse seule)

## Ce qui sera livré
Un seul document de lecture, `CIVITAS_Roadmap_complete.md`, dans vos Fichiers, structuré exactement en A → K, plus la liste courte « À décider par le propriétaire ».
Aucun SQL, aucune migration, aucune donnée, aucun compte, aucun test, aucune modification du jeu ni du Bloc 15.

## Méthode
1. Relire l'existant réel : 43 migrations appliquées (0000 → 0042), 14 sections et 15 applis Téléphone toutes actives, rapports de validation des Blocs 3 à 10, mémoire du projet, cahiers des charges reçus, SQL v3 du Bloc 15 (gelé).
2. Classer chacune des 31 fonctionnalités citées en 5 états : prévue / reportée explicitement / déjà réalisée / seulement évoquée / décision requise. Une fonctionnalité sans source écrite sera marquée « évoquée », jamais inventée.
3. Pour chacune : dépendances, données, fonctions serveur, écrans, confidentialité, doublons/reconnexion, horloge, régressions Blocs 1–15.
4. Ordonner selon les dépendances techniques, pas l'intérêt.

## Constats déjà établis (à détailler dans le document)
- Déjà réalisé, à retirer de la liste : messages entre personnages et Civi (Bloc 13, limités, sans récompense), carte et marqueurs (14), perturbations des transports publics (14), fiscalité pédagogique simple (11), logement/loyers/épargne (10), événements vivants (12).
- Explicitement reportés dans les documents : multijoueur complet, romance et discussion libre, économie avancée, entreprises complexes, investissements/trading, véhicules personnels dynamiques, diplomatie, monde procédural.
- Seulement évoqués, sans cahier des charges : crypto, actions, marchés, boutique, anglais, double authentification, autres parcours, nouvelles règles d'âge, espaces intérieurs, voyages entre villes, JT, manifestations, PNJ autonomes.

## Proposition d'ordre (à justifier dans le document, numérotation à partir de 16)
```text
16 Déplacements entre villes et espaces intérieurs   (indépendant du Bloc 15)
17 PNJ avancés : emploi du temps autonome            (base de 18 et 19)
18 Organisations vivantes : création libre,
   évolution collective, budget d'organisation       (budget séparé de l'argent perso et municipal)
19 Mobilisation et médias : manifestations, JT       (volet national dépend du Bloc 15)
20 Économie avancée niveau 1 : entreprises jouables,
   crédit immobilier, assurance, fiscalité avancée   (décision requise, levée d'exclusion)
21 Couche joueurs visibles : profils publics,
   réseau social entre joueurs                       (prérequis du multijoueur)
22 Multijoueur complet                                (en dernier)
Plus tard / hors roadmap : actions, trading, crypto, marchés, plusieurs pays,
diplomatie, monde procédural, boutique, romance.
Transverses à placer quand vous le décidez : anglais, double authentification.
```
Chaque bloc aura ses 12 rubriques demandées (objectif → hors périmètre), avec plan de tests sur comptes temporaires isolés et régressions.

## Point particulier Bloc 15
- Blocs 16, 17, 18 et 20 ne lisent aucune table nationale : préparables et applicables sans le Bloc 15.
- Le volet national de 19 (manifestations nationales, JT politique) dépend du Bloc 15 ; son volet municipal non.
- Risque d'ordre : la règle « migrations appliquées dans l'ordre » entre en conflit si le Bloc 16 doit passer avant le 0043 gelé. Décision nécessaire (attendre, ou autoriser des blocs indépendants avant 0043 sans dépendance croisée).
- Aucune modification de la v3 n'est proposée.

## Risques globaux à couvrir (J)
Horloge commune et rattrapages, doubles gains à la reconnexion, mélange argent personnel / municipal / organisation / national, fuite de données privées quand des profils deviennent visibles, montée en charge des PNJ autonomes, exécuteur atomique manquant (déjà bloquant pour le Bloc 15).

## À décider par le propriétaire (liste courte prévue)
- Ordre migrations : attendre le Bloc 15 ou avancer les blocs indépendants avant lui.
- Levée ou maintien des exclusions : économie avancée, entreprises, crédit, multijoueur, romance.
- Le Bloc 16 ex-« exclu » devient-il le bloc « Déplacements entre villes » ?
- Anglais et double authentification : dans la roadmap ou non.
- Crypto, trading, plusieurs pays, monde procédural : définitivement écartés ?

## Détails techniques
Lecture seule : fichiers du dépôt, `drizzle/migrations/*`, `src/game/navigation.ts`, rapports `BLOC_*.md`, mémoire projet. Seule écriture : le document final dans les Fichiers (hors projet).
