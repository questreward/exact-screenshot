# Bloc 4 — Vie sociale et organisations

## Résultat attendu
Permettre une première expérience sociale complète : rencontrer une personne, développer une relation, rejoindre une organisation fictive, participer à une activité, gagner de la réputation et de l’influence, puis retrouver tout après reconnexion.

Les Blocs 1, 2 et 3 sont validés et restent inchangés dans leur fonctionnement.

## Construction
1. **Rencontres et contacts** : population limitée de PNJ fictifs dans les cinq villes, rattachés à des lieux et contextes. Interactions simples, historique et cinq niveaux de relation.
2. **Organisations locales** : six catégories prévues dans votre document, pages dédiées, siège, membres visibles selon les permissions, adhésion au rôle Membre et départ avec conservation de l’historique.
3. **Activités collectives** : réunions, ateliers et rencontres intégrés à l’agenda actuel. Participation validée, récompenses attribuées une seule fois après la durée prévue et rencontres avec les autres participants.
4. **Réputation et influence** : deux valeurs persistantes, distinctes de l’argent, avec règles configurables et aucun achat direct d’influence.
5. **Écrans existants** : Contacts et Organisations sur le téléphone, rubrique sociale compacte sur l’accueil et le personnage, notifications pertinentes, accès au bon lieu depuis une organisation.
6. **Vérification** : dix tests du cahier des charges, essais avec des personnages temporaires, contrôle sur téléphone et ordinateur, puis rapport des résultats et limites.

## Choix de départ
- PNJ et organisations entièrement fictifs ; population préremplie et maîtrisée, sans génération massive.
- Rencontres et adhésions locales ; les autres villes restent consultables, sans ajouter de voyage.
- Équilibrage initial explicite dans le rapport : gains, durées, fréquence des interactions et conditions d’accès. Les exemples chiffrés du document ne sont pas considérés comme des obligations définitives.
- Membres réels : uniquement les informations du personnage autorisées ; aucune donnée personnelle ou bancaire.

## Détails techniques
- Étendre les organisations et adhésions existantes par ajouts, sans remplacer leurs tables.
- Ajouter les PNJ, relations privées, statistiques sociales, règles et participations avec accès protégés.
- Contrôler interactions, rôles, adhésions et récompenses dans des fonctions de base de données authentifiées ; le navigateur transmet uniquement les identifiants d’actions.
- Réutiliser les activités et l’horloge du jeu pour les échéances et un règlement idempotent après reconnexion ; conserver un seul agenda et un seul système de position.
- Centraliser les indications et configurations dans `src/game/`, avec leur validation autoritaire côté serveur ; accès aux données par `src/services/game.ts` et pages suivant les conventions existantes.

## Hors périmètre
Politique, élections, institutions, romance, création libre et économie des organisations, messagerie complète, réseau social complet et multijoueur complet.

Le Bloc 5 ne commencera pas automatiquement. Le Bloc 4 sera présenté pour validation après les tests.