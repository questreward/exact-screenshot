# Bloc 8 — Rapport de régression ciblée

## Statut : Bloc 8 validé
Le dernier essai salarial demandé le 18 octobre 2026 a réussi. Les règles normales sont inchangées ; l’avance de l’horloge était invisible aux autres sessions et l’horloge originale a été restaurée avant la fin de l’essai. Bloc 9 non commencé.

## Dépouillement et conséquences — réussis
- Les 13 scénarios électoraux sont rejoués avec succès, plus une victoire du joueur.
- Totaux de voix cohérents, participation et abstention, classement et gagnant calculés côté serveur ; PNJ gagnant et joueur perdant vérifiés, puis joueur élu maire dans une seconde élection isolée.
- Mandat, décision institutionnelle, projet sur le lieu et actualité électorale vérifiés ; récompense politique unique après consultations répétées.
- Tentatives de modification des votes, résultats, gagnant et mandat sans effet ; bulletins des autres joueurs inaccessibles.

## Travail — vérifié
- Offre consultée ; candidature refusée puis candidature acceptée et emploi actif.
- Refus : aucun emploi, aucune activité professionnelle ni salaire ; solde initial de 1 500 € intact.
- Travail tenté hors horaires et refusé, sans dépense d'énergie ni salaire.
- Au contrôle, le monde est jeudi 2 septembre 2027 vers 00:19, à vitesse réelle. Une vacation de quatre heures doit commencer entre 08:00 et 14:00 pour finir avant 18:00.
- Dernier essai isolé réussi : vacation réelle de quatre heures du monde, 08:00–12:00, via les fonctions normales du jeu. Énergie 100 → 70, progression professionnelle +10. Aucun salaire à 11:59:59 ; à 12:00, activité terminée, salaire +80 €, solde 1 500 → 1 580 €.
- Téléphone → Banque : salaire et montant visibles, exactement une transaction salariale. Cinq recharges, déconnexion réelle vers /auth, reconnexion, cinq consultations concurrentes et une recharge supplémentaire : solde 1 580 € et même transaction unique conservés, aucune erreur de page.
- Horloge avancée seulement dans une transaction indivisible : les autres sessions ne voient jamais les valeurs de test ; tous les champs originaux sont restaurés avant validation. Aucune durée ni récompense n’a été modifiée. Compte temporaire et données supprimés, absence confirmée par un contrôle indépendant.
- Essai conservé dans `tests/final_work_payment.py` et `tests/final_work_payment.sql`, captures dans `/tmp/browser/final-work-payment/`.

## Atelier social — réussi
- Atelier créatif ouvert, inscription puis activité dans l'agenda, statut terminé visible.
- Réputation sociale : 1 avant l'atelier, 7 après, puis 13 après une deuxième activité ; influence 2 puis 4, sans argent supplémentaire.
- Cinq consultations concurrentes sans récompense doublée ; participation et relations persistantes après reconnexion.
- Invitation complémentaire : relation améliorée via le système existant, réputation +3 et influence +1 accordées une seule fois à la fin.
- Organisations, relations, banque et droits privés contrôlés ; 10 scénarios sociaux et un complément réussis.

## Parcours transversal — partiellement réussi
Un même personnage temporaire a parcouru : Vie → offre/refus/embauche → tentative de travail refusée la nuit → atelier social → agenda → politique/adhésion/réservation d'un débat → élections → Ma Ville → actualités → Banque → déconnexion/reconnexion.
L'atelier terminé, le travail prévu à 08:00 et le débat prévu à 20:00 coexistent dans l'agenda. Énergie, banque, transactions, relations et adhésions conservées ; notifications présentes ; aucune erreur de page observée.
La vacation a ensuite été vérifiée séparément selon la dernière consigne : uniquement le test salarial final, sans rejouer le parcours transversal ni ajouter de fonctionnalité.

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

**Aucun blocage sur le dernier test demandé : Bloc 8 validé. Bloc 9 non commencé.**