# CIVITAS — Roadmap complète jusqu'à la finalisation (analyse seule)

## Ce qui sera livré
Un seul document de lecture, `CIVITAS_Roadmap_complete.md`, dans vos Fichiers. Il suit le format de votre dernier document (A à G + liste numérotée finale) et reprend aussi les rubriques demandées dans le précédent (dépendances, décisions du propriétaire, risques globaux).
Aucun SQL, aucune migration, aucune donnée, aucun compte, aucun test, aucun écran, aucune modification du jeu ni du Bloc 15.

## Méthode
1. Relire l'existant réel : 43 migrations appliquées (0000 → 0042), 14 sections et 15 applis Téléphone actives, rapports de validation, mémoire du projet, cahiers des charges reçus, SQL v3 du Bloc 15 (gelé).
2. Pour chaque élément : origine notée « déjà validé / explicitement prévu / explicitement différé / simplement suggéré / non spécifié », avec la source. Rien d'évoqué ne devient obligatoire.
3. Pour chaque fonctionnalité restante : dépendances, complexité, données, écrans, fonctions serveur, confidentialité, doublons/reconnexion, horloge, risques, tests.
4. Ordonner selon les dépendances techniques, pas l'intérêt.

## Constats déjà établis
- Déjà validé : Blocs 1 à 14 (dont messages et Civi limités, carte et marqueurs, retards des transports publics, fiscalité pédagogique simple, logement/loyers/épargne, événements vivants).
- Explicitement différé dans les documents : multijoueur complet, romance et discussion libre, économie avancée, entreprises complexes, investissements/trading, véhicules personnels dynamiques, diplomatie, monde procédural.
- Simplement suggéré ou non spécifié : crypto, actions, marchés, boutique, anglais, double authentification, autres parcours, nouvelles règles d'âge, espaces intérieurs, voyages entre villes, JT, manifestations, PNJ autonomes.

## Proposition de regroupement (numéros provisoires)
Le « Bloc 16 » n'étant pas défini, les blocs proposés seront nommés P1, P2… ; leur numéro officiel ne sera attribué qu'après votre validation.
```text
Bloc 15  Politique nationale          (spécifié, gelé : exécuteur atomique)
P1 Déplacements entre villes et espaces intérieurs   (indépendant du Bloc 15)
P2 PNJ avancés : emploi du temps autonome            (base de P3 et P4)
P3 Organisations avancées : création libre,
   évolution collective, budget d'organisation       (séparé des argents perso/municipal)
P4 Mobilisation et médias : manifestations, JT       (volet national dépend du Bloc 15)
P5 Économie avancée niveau 1 : entreprises, crédit
   immobilier, assurance, fiscalité avancée          (levée d'exclusion requise)
P6 Joueurs visibles : profils publics, réseau social  (prérequis du multijoueur)
P7 Multijoueur complet                                (uniquement avec cahier des charges)
Plus tard / hors roadmap : actions, trading, crypto, marchés, plusieurs pays,
diplomatie, monde procédural, boutique, romance.
Transverses à placer sur décision : anglais, double authentification, parcours/âges.
```
Chaque bloc : objectif, inclus/exclus, dépendances, données, fonctions, écrans, sécurité, tests (comptes temporaires isolés + régressions), critères de validation.

## Plan de migration futur (F)
Par bloc : objets à créer, objets existants touchés (objectif : aucun), risques, stratégie (une migration atomique par bloc), retour arrière, dépendances. Aucun SQL produit.

## Bloc 15 séparément (G)
Repris tel quel : spécifié et validé (v3, empreinte inchangée), points encore ouverts, blocage d'exécution atomique, capacité demandée au support, et éléments préparables sans base (écrans maquettés hors projet, textes des lois, tests rédigés). Aucune modification de la v3.

## Points de vigilance
- Ordre des migrations : P1, P2, P3 et P5 ne lisent aucune table nationale, mais votre règle « dans l'ordre » impose de décider s'ils peuvent passer avant le 0043 gelé.
- Risques globaux : horloge commune, doubles gains à la reconnexion, mélange des argents personnel/municipal/organisation/national, fuite de données privées avec profils visibles, charge des PNJ autonomes, exécuteur atomique manquant.

## Liste finale prévue
1 prochain bloc à préparer · 2 blocs suivants · 3 dépendances critiques · 4 éléments préparables sur votre terminal sans Lovable · 5 éléments exigeant une migration de la base, plus « À décider par le propriétaire ».

## Détails techniques
Lecture seule : dépôt, migrations, navigation, rapports de validation, mémoire projet, historique de discussion. Seule écriture : le document final dans les Fichiers (hors projet).
