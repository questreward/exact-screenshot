# Bloc 8 — Rapport de régression ciblée

## Statut : validation encore conditionnelle
Le Bloc 8 n'est **pas déclaré VALIDÉ** : la vacation de travail et le salaire ne peuvent pas être rejoués pendant la nuit du monde sans contourner les horaires validés. Aucun système de jeu ni horaire commun n'a été modifié. Bloc 9 non commencé.

## Dépouillement et conséquences — réussis
- Les 13 scénarios électoraux sont rejoués avec succès, plus une victoire du joueur.
- Totaux de voix cohérents, participation et abstention, classement et gagnant calculés côté serveur ; PNJ gagnant et joueur perdant vérifiés, puis joueur élu maire dans une seconde élection isolée.
- Mandat, décision institutionnelle, projet sur le lieu et actualité électorale vérifiés ; récompense politique unique après consultations répétées.
- Tentatives de modification des votes, résultats, gagnant et mandat sans effet ; bulletins des autres joueurs inaccessibles.

## Travail — partiellement vérifié
- Offre consultée ; candidature refusée puis candidature acceptée et emploi actif.
- Refus : aucun emploi, aucune activité professionnelle ni salaire ; solde initial de 1 500 € intact.
- Travail tenté hors horaires et refusé, sans dépense d'énergie ni salaire.
- Au contrôle, le monde est jeudi 2 septembre 2027 vers 00:19, à vitesse réelle. Une vacation de quatre heures doit commencer entre 08:00 et 14:00 pour finir avant 18:00.
- **Non vérifiés dans cette exécution :** travail effectif, −30 énergie, fin de vacation, salaire de 80 € dans Banque et absence de double salaire après recharge/reconnexion. Le scénario conservé sait les vérifier lorsqu'il est lancé dans les horaires autorisés.
- Prochaine fenêtre : 08:00 du monde, soit environ 20:12 UTC / 22:12 Paris le 18 octobre, si l'horloge reste inchangée. Aucun essai ne tourne en arrière-plan après ce rapport.

## Atelier social — réussi
- Atelier créatif ouvert, inscription puis activité dans l'agenda, statut terminé visible.
- Réputation sociale : 1 avant l'atelier, 7 après, puis 13 après une deuxième activité ; influence 2 puis 4, sans argent supplémentaire.
- Cinq consultations concurrentes sans récompense doublée ; participation et relations persistantes après reconnexion.
- Invitation complémentaire : relation améliorée via le système existant, réputation +3 et influence +1 accordées une seule fois à la fin.
- Organisations, relations, banque et droits privés contrôlés ; 10 scénarios sociaux et un complément réussis.

## Parcours transversal — partiellement réussi
Un même personnage temporaire a parcouru : Vie → offre/refus/embauche → tentative de travail refusée la nuit → atelier social → agenda → politique/adhésion/réservation d'un débat → élections → Ma Ville → actualités → Banque → déconnexion/reconnexion.
L'atelier terminé, le travail prévu à 08:00 et le débat prévu à 20:00 coexistent dans l'agenda. Énergie, banque, transactions, relations et adhésions conservées ; notifications présentes ; aucune erreur de page observée.
Ce parcours ne remplace pas la vérification d'une vacation réellement effectuée.

## Nombre de tests
- 14 scénarios électoraux réussis : 13 obligatoires + victoire du joueur.
- 11 scénarios sociaux réussis : 10 scénarios + invitation.
- 21 tests automatiques ciblés réussis : Vie 10, Social 6, Élections 5 ; les 61 tests n'ont pas été rejoués intégralement.
- Soit **46 tests/scénarios réussis**, plus un parcours transversal partiel et des contrôles Travail partiels, exclus de ce total.
- 0 compte temporaire et 0 élection temporaire restant après nettoyage.

## Corrections effectuées
- Correction du test Atelier : la fin accélérée reste sur la journée affichée au lieu de déplacer l'activité à la veille autour de minuit.
- Correction du test transversal : restauration du créneau professionnel temporairement déplacé après un refus nocturne, pour ne pas créer artificiellement un chevauchement avec l'atelier.
- Ajout des tentatives explicites de modification du gagnant et du mandat aux vérifications électorales.
- Aucun changement des règles, salaires, récompenses, horaires, interface ou systèmes validés.

**Seul blocage restant : rejouer Travail et le parcours transversal complet dans les horaires autorisés.**