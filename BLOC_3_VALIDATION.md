# Bloc 3 — Résultats

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
- Le refus spécialisé existe, mais le parcours de refus n’a pas été vérifié dans l’interface ; les candidatures acceptées des deux parcours professionnels l’ont été.
- Le vrai clic de confirmation par e-mail n’est pas retesté dans ce bloc. Le nom réel de l’éditeur reste à fournir.
- Bloc 4, politique, multijoueur, messages et réseau social non développés.