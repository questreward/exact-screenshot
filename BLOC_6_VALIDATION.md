# CIVITAS — Bloc 6 : citoyenneté et institutions

18 octobre 2026. Prêt pour validation du joueur. Bloc 7 non commencé.

## Fonctionnalités construites
- Ma Ville accessible depuis le téléphone, la navigation, le profil et l’accueil.
- Sept institutions fictives par ville : mairie, services municipaux, université publique, transport, culture, service social et accueil administratif. Lieux existants réutilisés ; adresses, horaires et responsables fictifs.
- Cinq problèmes initiaux et cinq consultations avec titres adaptés aux villes ; services, décisions initiales et forums citoyens.
- Problèmes publics avec quartier, lieu, institution, gravité et historique. Signalements privés, rattachement à un problème existant et description personnelle non exposée publiquement.
- Anti-abus : description de 20 à 500 caractères, trois signalements par journée du monde, délai de 60 minutes, un signalement par personnage/problème, lieu accessible dans sa ville.
- Évolution Signalé → Identifié → En étude → En cours → Résolu, par étapes de 24 heures du monde. Décision d’intervention puis rénovation, notifications du déclarant et actualités liées.
- Une participation immuable par consultation et personnage ; aucune participation après expiration ou dans une autre ville. Résultats à la clôture et projet retenu visible sur la carte. En cas d’égalité, ordre des options ; aucune décision sans participation.
- Décisions datées : une décision future reste prévue, puis ses conséquences sont appliquées après échéance, une seule fois. Métadonnées municipales des lieux, sans bloquer les déplacements ni réécrire les lieux existants.
- Événements citoyens via les associations citoyennes existantes ; adhésion requise, réservation dans l’agenda existant, démarrage au lieu, durée complète, réputation/influence/relations et engagement à la fin uniquement.
- Engagement privé plafonné à 100, registre unique de récompenses, statistiques sur le profil ; aucune nouvelle monnaie ni pouvoir politique.

## Douze scénarios obligatoires : réussis
1. Téléphone → Ma Ville → mairie : informations, sept institutions, services et contenus locaux. Lyon/Lille distincts.
2. Problème : lieu, quartier, catégorie, statut, institution et historique.
3. Signalement via formulaire réel : enregistré, rattaché au problème, visible dans Mes signalements ; répétition immédiate refusée.
4. Évolution : simulation limitée au problème temporaire, statut En cours, notifications, intervention et actualité.
5. Consultation via interface : choix enregistré, seconde participation et accès depuis l’autre ville refusés.
6. Expiration : consultation fermée et résultats visibles, voix conservée.
7. Décision : enregistrée une fois, actualité lisible et projet effectivement visible sur la carte.
8. Mairie → carte : bon lieu sélectionné.
9. Forum citoyen ajouté à l’agenda existant depuis Ma Ville.
10. Engagement : +2 signalement, +5 consultation, +8 après événement ; 15 après règlement, aucun gain anticipé/doublon après lectures concurrentes. Réputation sociale créditée, banque toujours à 500 €.
11. Déconnexion/reconnexion : signalement, choix, événement, décision, notifications et engagement retrouvés. Présentation 444 × 803 et 1280 × 1800, sans débordement horizontal ni erreur navigateur.
12. Écritures forcées sur décision, choix, problème et engagement sans effet ; récompense et évolution administratives refusées au joueur ; données privées invisibles à l’autre compte.

Compléments réussis : plafond à 100, récompense idempotente et décision future sans conséquence anticipée puis application après échéance.

## Tests et régressions
- 50 tests automatiques réussis dans sept suites, dont six tests de consultation et une nouvelle vérification de navigation.
- Onze scénarios d’actualités rejoués avec succès : filtres, sources, lecture, favoris, notifications, carte, organisation, sécurité et reconnexion.
- Dix scénarios sociaux et invitation finale réussis : relations, adhésions, historique, récompenses et sécurité.
- Régression quotidienne réussie : cours, énergie, repos, repas, candidature refusée puis emploi, salaire unique, logement, transport, banque et reconnexion.
- Dernier contrôle de compilation : réussi. Aucun échec restant dans les scénarios exécutés.
- Comptes et annonces temporaires nettoyés. Essais conservés dans `tests/civic_persistence.py`, captures sous `/tmp/browser/civic`.

## Problèmes et corrections
- Référence de navigation indisponible avant création de la page et type d’onglet trop large : corrigés ; page vérifiée en situation réelle.
- Le lieu culturel dédié n’existait pas : service culturel relié à la Maison des services publics, sans créer de lieu doublon.
- Gains affichés d’un événement réservé : utilisent maintenant les valeurs figées de son activité, plutôt que les paramètres actuels.
- Décisions futures : ajout d’une protection de date et règlement à échéance.
- Assertion de reconnexion renforcée pour vérifier concrètement la décision liée ; nettoyage limité aux identifiants des fixtures. Une annonce du premier essai a été retirée et le nettoyage final vérifié.

## Limites assumées
- Évolution réglée à la consultation de Ma Ville ou lors d’une action citoyenne ; après une absence, les échéances passées sont rattrapées. Aucun nouveau traitement permanent n’a été ajouté. Notifications et actualités ne sont donc pas produites exactement à échéance sans visite citoyenne.
- Consultations et contenus initiaux finis, pas de génération indéfinie de consultations. Événements associatifs récurrents quotidiens via le système existant.
- Conséquences initiales : projet/état municipal du lieu et résolution des problèmes. Pas de fermeture d’activités, modifications de prix, budget, fiscalité ou construction d’un nouveau lieu complet.
- Gains et durées configurables ; les modèles de conséquences sont contrôlés côté serveur, pas éditables par les joueurs. Les services restent volontairement simples.
- Paramétrage initial : consultation trois jours, événements 18:00 / 60 minutes / 8 énergie, +2 réputation / +1 influence / +10 relation ; +3 engagement pour une activité associative citoyenne non dédiée. Les essais n’accélèrent jamais l’horloge partagée.
- Pas d’élections, partis, campagnes, institutions nationales fonctionnelles, justice complète ni Bloc 7.

Les essais ne constituent pas un audit exhaustif ni la validation finale du joueur.