# Bloc 8 — Candidatures, campagnes et municipales

## Fonctionnalités construites
- Une première élection municipale dans chacune des cinq villes, avec trois candidats fictifs par ville et un calendrier fondé sur le temps du monde.
- Candidature indépendante ou soutenue par une organisation, contrôle d'âge, d'engagement, de réputation et d'adhésion ; refus motivé.
- Programme enregistré : slogan, trois priorités distinctes et propositions avec coût, délai, impact et problème local associé.
- Équipe recrutée parmi les contacts rencontrés ; budget de campagne séparé de la banque ; dons limités.
- Douze actions et débat municipal intégrés aux activités, à l'énergie et à l'agenda existants.
- Campagnes des PNJ et sondages évolutifs, vote privé confirmé et définitif, dépouillement sécurisé, classement, participation et abstention.
- Victoire ou défaite possible ; mandat de maire, récompense politique unique, décision et projet visibles dans Ma Ville et les actualités.
- Élections accessibles depuis Politique (également depuis le téléphone), Ma Ville, les articles associés et la carte des lieux.

## Tests réussis
- **13 scénarios électoraux réels sur 13**, avec comptes temporaires, parcours dans l'interface et vérifications persistantes.
- **Complément réussi : victoire réelle du personnage**, mandat attribué, confirmation visible et récompense non doublée.
- **61 tests automatiques réussis sur 9 suites**.
- Régressions politiques : 12 scénarios réussis ; régressions citoyennes : 12 scénarios et contrôles complémentaires réussis.
- Présentation vérifiée sur ordinateur et téléphone à 390 × 844, sans débordement horizontal ni erreur de page pendant le scénario électoral.
- Dernier contrôle de compilation : OK. Élections et personnages temporaires nettoyés ; l'horloge commune n'a pas été modifiée.

## Essais non conclus
- Régression quotidienne : le parcours étudiant, logement, repas, transport et reconnexion réussit ; le parcours professionnel s'arrête car aucune activité en cours n'est trouvée après « Travailler ». Les horaires réels du monde restent appliqués. La régression professionnelle complète n'est donc pas validée dans cette exécution.
- Régression sociale : rencontre, discussion, adhésion et départ réussissent ; le scénario s'arrête sur un atelier absent de la journée affichée après déplacement de son échéance dans le passé. La vérification sociale complète reste non conclue, sans modification des règles ni de l'agenda pour contourner cet essai.

## Corrections effectuées
- Références ambiguës dans les contrôles d'engagement et le calcul du dépouillement corrigées.
- Récompenses personnelles de résultats réglées pour le personnage appelant afin d'éviter le verrouillage croisé entre joueurs.
- Soutien sur le terrain ouvert aux citoyens non candidats, tout en conservant les contrôles d'énergie, de lieu et de campagne.
- Tests d'affichage et modèles indicatifs ajustés sans convertir les contrôles de l'interface en autorisations.

## Limites et choix à valider
- Première version municipale **à un tour** ; pas de candidature nationale, Parlement, Gouvernement ni Bloc 9.
- Un calendrier initial par ville ; aucun renouvellement automatique de nouvelle élection après le mandat.
- L'évolution des campagnes fictives, sondages et résultats est rattrapée à l'ouverture des élections : aucun nouveau traitement permanent hors connexion n'a été ajouté.
- Les électeurs fictifs sont simulés ; les bulletins des joueurs sont réels et ajoutés séparément, sans exposer leurs choix.
- Les conséquences locales correspondent au premier projet du vainqueur : décision et métadonnées du lieu, pas de budget municipal ni de pouvoir administratif complet.
- Réglages initiaux proposés : candidat/électeur à partir de 18 ans, engagement citoyen minimum 10, réputation politique minimum 5, ancienneté minimum 0 jour ; budget indépendant 1 200 €, soutien d'organisation 600 €, plafond 3 000 €, trois actions quotidiennes et trois dons de 150 €, mandat de 120 jours du monde. Ce sont des choix de cette première version, soumis à validation.
- Une candidature refusée ne peut pas être redéposée dans la même élection ; programme verrouillé au lancement de campagne.

**Bloc 8 présenté pour validation, avec les deux régressions anciennes non conclues explicitement signalées. Bloc 9 non commencé.**