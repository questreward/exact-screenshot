# CIVITAS — Bloc 4 prêt pour validation

18 octobre 2026. Bloc 5 non commencé.

## Fonctionnalités construites
- 30 personnes fictives persistantes : six contextes dans chacune des cinq villes, profession, âge, traits, portrait et lieu.
- Contacts privés, historique des échanges, cinq niveaux de relation ; présentation, discussion, connaissance et invitation.
- 30 organisations fictives : six catégories par ville, siège, fiche dédiée, membres visibles, réputation et influence affichées.
- Adhésion locale au rôle Membre, départ, réadhésion avec conservation de l’identité et historique des entrées/sorties. Associations étudiantes réservées au parcours Étudiant.
- 30 rendez-vous collectifs quotidiens, réservation et participation dans l’agenda existant. Une invitation individuelle utilise le même agenda.
- Réputation et influence personnelles persistantes ; récompenses après activité terminée, jamais au clic de réservation.
- Contacts et Organisations débloqués sur le téléphone ; résumé social sur l’accueil, vie et organisations sur le personnage ; rencontres depuis les lieux et liens vers la bonne carte.
- Notifications pour rencontres, adhésion/départ, invitation, réservation, changement de relation et activité terminée.

## Dix tests obligatoires — tous réussis
1. Rencontre : contact réellement créé à son lieu, visible ; présentation à distance refusée.
2. Interaction : discussion +5 relation, score fixé côté serveur ; seconde discussion immédiate refusée.
3. Adhésion : rôle member/actif enregistré, organisation visible sur Personnage.
4. Départ : statut ancien membre, retiré des adhésions actives, historique conservé ; réadhésion possible.
5. Activité : réservation visible dans l’agenda, participation réservée puis en cours puis terminée ; départ pendant activité refusé ; récompense différée et unique après cinq lectures concurrentes.
6. Réputation : deux activités distinctes produisent 13 points (1 discussion + 6 + 6), pas de gain anticipé ; écriture directe sans effet.
7. Influence : deux activités produisent 4 points, conservés ; banque inchangée à 500 €.
8. Carte : Voir sur la carte ouvre l’identifiant exact du siège et affiche le bon lieu.
9. Persistance : déconnexion/reconnexion, mêmes relations, rôles, adhésions, statistiques et participations, relues depuis le personnage ; contrôles 390×844 et 1280×1800 sans débordement.
10. Sécurité : écritures de statistiques/score/rôle sans effet, insertion arbitraire refusée, aucune lecture privée d’un autre joueur, aucun démarrage d’activité étrangère, aucun règlement étranger, accès anonyme refusé ; démarrage social générique et trop tôt refusés.

Invitation également jouée : activité dans l’agenda, durée complète, +3 réputation et +1 influence attribués seulement à la fin.

## Régressions et vérification
- 33 tests automatiques réussis, dont les règles d’âge, énergie, carte, horloge et navigation existantes.
- Parcours étudiant et jeune actif rejoués avec comptes temporaires : cours, progression, repos plafonné à 100, repas, refus d’emploi puis autre candidature, travail et salaire unique, logement manuel et double paiement refusé, transport, sauvegarde après reconnexion.
- Aucune erreur de page observée ; compilation finale réussie.
- Tests conservés : `tests/social_persistence.py`, `tests/daily_life_persistence.py`, `src/game/social.test.ts`.
- Tous les comptes temporaires supprimés ; aucune sauvegarde existante ni horloge partagée modifiée. Seules les échéances des activités temporaires ont été accélérées.

## Équilibrage initial
- Relation : Inconnu 0, Connaissance 5, Relation amicale 25, Ami 50, Proche 80 ; plafond 100.
- Présentation +5 ; discussion +5, −2 énergie, délai 30 minutes ; connaissance +8 à partir de 15 points, −3 énergie, délai 60 minutes. Discussion/connaissance +1 réputation, sans influence.
- Invitation à partir de 10 points, délai 60 minutes entre échanges, un rendez-vous proposé par personne et journée ; 45 minutes, −5 énergie, +10 relation, +3 réputation, +1 influence.
- Organisation : rendez-vous quotidien à 18 h (heure du monde), durée 45 minutes, −10 énergie, +5 relation, +6 réputation, +2 influence, +1 participation.
- Un rendez-vous d’organisation réservé par journée ; départ annule les réservations futures. Une réservation annulée n’est pas recréée pour le même jour.
- La fenêtre d’arrivée de l’agenda reste 30 minutes ; durée complète nécessaire à partir du démarrage.
- Valeurs autoritaires dans les règles enregistrées en ligne, jamais dans les écrans ; `src/game/social.ts` centralise types, seuils et indications de présentation. Les récompenses ne sont pas achetables.

## Problèmes rencontrés et corrigés
- Options de ville des nouvelles pages corrigées avant vérification finale.
- Portraits réduits par la règle générale des icônes de bouton : taille corrigée et vérifiée visuellement.
- Le règlement quotidien vérifie maintenant explicitement l’identité du propriétaire, sans exception basée sur l’utilisateur technique de la base.
- Activité sociale générique interdite ; seules les participations réservées peuvent démarrer. Durée réservée conservée.
- Messages explicites pour réservation déjà effectuée et adhésion suspendue.
- Ajustements des essais : deux activités différentes, bouton de déconnexion ciblé, contrôle des valeurs après tentative d’écriture (une requête sans ligne modifiée peut réussir sans changer les données).

## Limites assumées
- Population fictive statique ; mêmes six identités de démonstration par ville, sans IA ni emploi du temps autonome.
- Réputation et influence des organisations affichées, mais leur évolution collective n’est pas développée. Les récompenses font évoluer les valeurs personnelles uniquement.
- Membres visibles : PNJ et joueur consultant uniquement ; le nombre total inclut les adhésions actives, sans exposer les autres joueurs. Pas de multijoueur complet.
- Une seule activité collective quotidienne par organisation ; pas de capacité limitée ni liste publique des participants réels.
- Pas de promotion de rôle, de statut suspendu pilotable, de création libre ou d’économie d’organisation. Ces fondations sont préparées, pas présentées comme jouables.
- Gains uniquement positifs ; aucune romance ni discussion libre.
- Règlement à la consultation/reconnexion selon l’horloge existante, pas de processus autonome ajouté.
- Le vrai lien de confirmation e-mail et l’identité légale de l’éditeur restent les limites antérieures, hors Bloc 4.
- Aucun échec fonctionnel restant dans les scénarios exécutés ; ceci ne remplace pas une validation utilisateur ni un audit exhaustif.

## Décision attendue
Validation du Bloc 4 par l’utilisateur. Aucun Bloc 5, parti, élection, Parlement, messagerie complète ou réseau social complet commencé.
