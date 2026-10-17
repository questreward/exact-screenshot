# Bloc 3 — Prêt pour validation

## Finalisation — 17 octobre 2026
**Statut : prêt pour validation par Alex. Bloc 4 non commencé.**

### Tests réussis
- Refus réel : jeune actif de 18 ans, candidature Développeur junior sans les compétences requises. Attente du délai réel d’une minute du monde, sans modifier son échéance. Statut refusé et message visible ; aucun emploi, aucune activité de travail, aucun salaire, solde toujours 1 500 €.
- Après le refus : consultation et candidature à Assistant administratif, puis emploi accepté. Le refus ne bloque pas les autres offres.
- Logement : Chambre à 10 €/jour pour l’étudiant, Studio à 20 €/jour pour l’actif ; type, logement actuel, quartier Croix-Rousse et ville Lyon affichés. Paiement par le bouton, transaction et statut « Payé aujourd’hui » persistants. Second paiement le même jour refusé.
- Salaire : montant déterminé par les règles enregistrées côté serveur (1 600 €/20 = 80 €). Aucun revenu immédiat au début du travail ; énergie 70, progression initialement nulle.
- Fin de travail pendant l’absence : le solde reste 1 500 € avant la consultation. Reconnexion directement dans Banque : 1 580 €, une transaction « Salaire — Assistant administratif » de +80 €, progression professionnelle +10.
- Idempotence : cinq consultations simultanées puis trois rechargements de Banque, toujours une seule transaction de salaire et 1 580 €. Aucun versement supplémentaire après la reconnexion finale.
- Persistance étudiant : Droit, cours +15 progression, compétences +15, énergie 100 après repos et repas, agenda, chambre, paiement, transport et transactions identiques après déconnexion/reconnexion. Solde final 480 € = 500 − 8 repas − 2 transport − 10 logement ; aucun salaire étudiant.
- Persistance actif : emploi et progression +10, énergie 70, agenda, studio, logement payé, transport, position, candidatures et transactions identiques après déconnexion/reconnexion. Solde final 1 558 € = 1 500 + 80 salaire − 2 transport − 20 logement.
- Interfaces téléphone 444 × 803 et ordinateur 1 280 × 1 800 : logement, refus, études/emploi, agenda et Banque consultés ; aucun débordement horizontal ni erreur de fonctionnement observée.
- 27 tests automatiques existants réussis. Régression complète conservée dans `tests/daily_life_persistence.py`, exécutée avec succès sur deux comptes temporaires, supprimés avec leurs données ; aucune partie existante ni horloge globale modifiée.

### Corrections effectuées
- Refus accompagné d’une information explicite : aucun emploi/salaire pour l’offre et possibilité de postuler ailleurs. Icône de refus au lieu d’une coche.
- Fiche logement précisée : type, logement actuel, quartier et ville, sans créer de marché immobilier.
- Versement du salaire expliqué sur la page Vie : après la fin, à la prochaine consultation, y compris après reconnexion, une seule fois et visible dans Banque.
- Aucun changement des règles de jeu ni des fonctions de versement : les contrôles existants passent les essais réels.

### Tests échoués
- Aucun échec fonctionnel restant dans les scénarios demandés.
- Deux incidents de préparation des essais corrigés : ancien fichier de session temporaire absent, puis sélection de l’ancienne candidature refusée au lieu de la nouvelle candidature en attente. Les parcours ont ensuite été rejoués entièrement avec succès.

### Limites et points à décider
- Les longues activités ont été accélérées uniquement sur les personnages d’essai ; ce n’est pas une journée entière attendue en temps réel. Le délai du refus a, lui, été réellement attendu.
- Versement à la consultation après échéance, pas de versement en tâche de fond pendant une absence totale. Comportement vérifié et désormais indiqué au joueur.
- Logement manuel, au plus un paiement par jour du monde, sans dette pour les jours non payés. Aucun changement de logement ou marché immobilier.
- Une candidature refusée ne peut pas être renvoyée vers la même offre actuellement ; postuler à une autre fonctionne. Ce comportement est conservé, conformément à la demande de ne pas ajouter de fonctionnalité.
- Aucun choix supplémentaire nécessaire pour cette finalisation. Les horaires/durées restent l’équilibrage provisoire existant.
- Le vrai lien de confirmation par e-mail et le nom réel de l’éditeur restent hors de cette vérification.

---
## Résultats de la livraison initiale

## Fonctionnalités construites
- Vie : six filières, inscription, université, cours, étude personnelle, progression et compétences.
- Travail : six métiers par ville, candidature différée, acceptation/refus selon parcours et compétences, emploi, vacations, salaire et expérience.
- Agenda aujourd’hui/semaine, détails, début et annulation des activités prévues.
- Énergie, repos au logement, repas, dépenses de logement, marche existante et transport public.
- Liens directs vers les lieux de la carte, téléphone Agenda/Vie, résumé de journée sur l’accueil.
- Solde et transactions existants réutilisés ; aucune seconde monnaie ni position.

## Tests réussis
- 27 tests automatiques : âge, parcours, énergie, repos plafonné à 100, fin différée, chevauchement, carte et navigation.
- Comptes temporaires : étudiant de 18 ans à Lyon, jeune actif de 18 ans à Lyon, début de carrière de 22 ans à Lyon.
- Étudiant : inscription Droit, cours démarré depuis l’agenda à l’université, −20 énergie, aucune progression immédiate, +15 points après échéance, retour au logement, repos plafonné à 100, repas −8 €.
- Actif : candidature, emploi administratif, −30 énergie, aucun salaire immédiat, +10 expérience et +80 € à la fin, transaction lue dans Banque.
- Carrière : développeur junior, emploi, −30 énergie, +10 expérience, +110 € à la fin, transaction lue dans Banque.
- Trois parcours : transport public −2 €, arrivée enregistrée ; logement −10/20/30 €, double paiement refusé ; relecture sans double salaire.
- Trois parcours : déconnexion, nouvelle connexion, énergie et solde inchangés, études/emploi/logement relus dans Vie, agenda relu.
- Tentative directe d’énergie à 999 : sauvegarde reste à 100. Création directe d’activité forgée refusée.
- Téléphone 390 px et ordinateur 1280 px : pages affichées, aucun débordement horizontal, aucune erreur de fonctionnement observée.
- Comptes temporaires et toutes leurs données supprimés après chaque essai ; partie existante non modifiée par les essais.

## Problèmes rencontrés et corrigés
- Le démarrage de cours exigeait d’arriver exactement à l’heure : fenêtre d’arrivée de 30 minutes, durée entière conservée.
- Identifiant ambigu empêchant le démarrage : corrigé et trois parcours rejoués avec succès.
- Données Banque/Accueil lues avant règlement des résultats : lectures ordonnées après règlement.
- L’essai transactionnel direct n’avait pas les droits de modifier l’horloge : retiré, remplacé par les vrais comptes et interfaces.
- Aucun échec restant dans les parcours ci-dessus.

## Limites et équilibrage provisoire
- Les longues attentes ont été accélérées en modifiant uniquement les échéances des personnages temporaires ; l’horloge globale n’a pas été changée. Les tests ne constituent pas une journée entière attendue en temps réel.
- Le monde conserve sa vitesse existante. Cours 2 h, travail 4 h, étude 1 h, repos 30 min, repas 20 min, transport 10 min du monde.
- Une vacation rémunérée par jour ; référence mensuelle divisée par 20. Versement au règlement d’une activité échue lors de la consultation, y compris après reconnexion, pas de tâche de fond pendant une absence totale.
- Cours à 09:00 et travail à 08:00 en semaine ; arrivée autorisée dans les 30 premières minutes. Après ce délai, annuler le créneau prévu pour choisir une nouvelle activité personnelle ; travail seulement si sa durée finit avant 18:00. Ces choix restent à équilibrer avec le joueur.
- Logement attribué selon parcours, paiement manuel sans dette automatique. Aucun marché immobilier.
- Le refus spécialisé était non vérifié lors de la livraison initiale ; il est désormais testé explicitement, avec une autre candidature réussie (voir finalisation ci-dessus).
- Le vrai clic de confirmation par e-mail n’est pas retesté dans ce bloc. Le nom réel de l’éditeur reste à fournir.
- Bloc 4, politique, multijoueur, messages et réseau social non développés.