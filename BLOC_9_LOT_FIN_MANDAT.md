# CIVITAS — Rapport du lot « Fin de mandat »

## Résultat
Lot limité à la clôture, au bilan final, au retour à la vie normale et à une seule réélection. Aucune autre fonctionnalité du Bloc 9 ni aucun Bloc 10 ajouté dans ce lot.

## Livré
- Clôture automatique par l’évolution municipale existante et rattrapage à la consultation/reconnexion ; date de clôture enregistrée à la date de fin prévue.
- Bilan figé : indicateurs, projets terminés/abandonnés, décisions rejetées, dépenses engagées, réputation/influence et état des décisions importantes à la date de fin.
- Les effets postérieurs continuent à faire évoluer la ville sans réécrire ce bilan. Toute modification ultérieure du bilan final est refusée.
- Pouvoirs municipaux expirés refusés ; activités du mandat encore prévues annulées pour libérer l’agenda ; activités normales restent accessibles.
- Une seule réélection reliée à l’élection précédente, dans le calendrier déjà utilisé, avec les mêmes durées de phases et conditions de candidature. Pas de candidature automatique du joueur ni de victoire garantie.
- Un scrutin déjà programmé après le mandat est réutilisé plutôt que doublonné. Verrou par ville, lien unique, chevauchement interdit et plafond de deux élections dans ce périmètre.

## Vérifications
17 vérifications du lot réussies sur ville et compte temporaires :
1. Clôture datée précisément à la fin.
2. Effets postérieurs exclus du bilan mais appliqués à la ville.
3. Comptage et dépenses figés.
4. Réputation/influence sans récompense postérieure.
5. Décisions importantes figées dans leur état à la fin.
6. Pouvoirs expirés refusés.
7. Bilan identique après cinq consultations simultanées.
8. Modification directe du bilan refusée.
9. Une seule réélection après consultations simultanées.
10. Même calendrier et mêmes durées de phases.
11. Scrutin concurrent refusé.
12. Repos normal réellement commencé après le mandat.
13. Bilan et vie normale persistants après trois recharges et déconnexion/reconnexion ; aucune erreur de page.
14. Second mandat clôturé sans génération d’un troisième scrutin.
15. Création explicite d’un troisième scrutin refusée.
16. Préparation privilégiée interdite au joueur.
17. Compte, ville et données temporaires supprimés.

9 tests automatiques ciblés existants réussis. Affichage du bilan et de la réélection vérifié dans les pages existantes. L’horloge commune n’a pas été modifiée : seules les dates des objets isolés du test ont été raccourcies. Les anciens comptes, villes et association temporaires résiduels ont également été nettoyés.

## Limites et arrêt
- La tâche horaire existante traite la clôture hors connexion : jusqu’à une heure réelle de délai d’exécution, avec date et bilan calculés à la fin prévue. Une consultation rattrape immédiatement une échéance dépassée. Aucun nouveau contrôle récurrent ajouté.
- Le refus des scrutins concurrents et de la troisième élection est testé. La branche de réutilisation d’un second scrutin préexistant n’a pas fait l’objet d’un scénario isolé distinct ; aucune ville normale ne possédait ce cas lors de l’inspection.
- Aucun rapport global de validation du Bloc 9 : les autres lots sont suspendus, conformément à la demande.