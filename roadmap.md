# Bloc 2 — Monde et carte (validé par l’utilisateur)
- [x] Données extensibles : cinq villes, 20 quartiers, 60 lieux, 10 espaces
- [x] Position privée persistante et déplacements locaux sécurisés implémentés
- [x] Carte de ville et France, zoom et fiches des lieux
- [x] Horloge du monde et ambiance jour/nuit, météo simulée
- [x] Accès depuis position actuelle et Téléphone
- [x] 17 tests réussis ; présentation ordinateur/téléphone vérifiée avec données réelles et session simulée
- [x] Bloc 2 validé par l’utilisateur

# Bloc 3 — Vie quotidienne
- [x] Activités persistantes, temps serveur, énergie et résultats sécurisés
- [x] Études : filières, inscription, cours, progression et compétences
- [x] Travail : offres, candidatures différées, emploi, salaires et progression
- [x] Repos, alimentation, logement et transport public simples
- [x] Pages Vie et Agenda, téléphone, tableau de bord et liens vers les lieux
- [x] 27 tests automatiques ; trois parcours réellement joués avec comptes temporaires, transport, logement et reconnexion
- [x] Tentatives d’écriture directe sans effet ; activités forgées refusées ; aucun salaire/paiement doublé
- [x] Limites consignées dans BLOC_3_VALIDATION.md ; Bloc 4 non commencé

# Finalisation du Bloc 3
- [x] Tester explicitement un refus d’emploi puis une nouvelle candidature
- [x] Vérifier logement : type, coût, localisation et paiement manuel
- [x] Vérifier salaire à la consultation/reconnexion sans doublon
- [x] Rejouer persistance étudiant et actif ; rapport et prêt pour validation
- Bloc 3 officiellement validé par l’utilisateur.

# Bloc 4 — Vie sociale et organisations
- [x] Population fictive, rencontres contextualisées et relations persistantes
- [x] Organisations locales, adhésions et départ sécurisé
- [x] Activités sociales intégrées à l’agenda existant, réputation et influence
- [x] Contacts, organisations, profil, accueil, notifications et carte
- [x] Dix tests obligatoires, régressions des blocs validés et rapport final
- [x] Bloc 4 officiellement validé par l’utilisateur

# Bloc 5 — Information et actualités
- [x] Sources fictives et articles liés aux événements existants, publication contrôlée selon l’horloge du monde
- [x] Fil personnalisé ouvert, recherche, filtres et détail avec liens carte/organisation/agenda
- [x] Lectures, favoris, préférences et notifications pertinentes privés et persistants
- [x] Téléphone déverrouillé et aperçu compact sur l’accueil
- [x] Onze tests obligatoires, 43 tests automatiques, régressions des Blocs 1 à 4 et rapport de validation
- [x] Bloc 5 validé par le cahier des charges du Bloc 6

# Bloc 6 — Citoyenneté et institutions
- [x] Institutions, services et contenus fictifs distincts pour les cinq villes
- [x] Problèmes publics, signalements privés, évolution selon l’horloge du monde
- [x] Consultations uniques, résultats, décisions et conséquences sécurisées
- [x] Événements citoyens dans l’agenda existant, engagement plafonné à 100
- [x] Ma Ville, profil, accueil, téléphone et liens carte/actualités/organisations
- [x] Douze tests obligatoires, scénario Lyon, reconnexion et régressions ; 50 tests automatiques réussis
- [x] Bloc 6 validé par le cahier des charges du Bloc 7
- Ne pas commencer le Bloc 7 ; présenter le rapport puis attendre les instructions.
# Bloc 7 — Politique et mouvements
- [x] Partis (4) et mouvements (5) fictifs sur organisations/adhésions existantes, idéologie à 8 axes, valeurs, priorités, implantation
- [x] Opinions libres (non définie → forte), affinité indicative, comparateur neutre
- [x] Profil politique : intérêt, engagement, réputation et influence politiques contrôlés côté serveur
- [x] Adhésion (rôle Membre), départ, activités politiques dans l’agenda existant, personnalités via les relations existantes
- [x] Actualités politiques, carte, téléphone, profil
- [x] Douze tests réels réussis, 56 tests automatiques, régressions Blocs 3/4/6 ; rapport BLOC_7_VALIDATION.md
- [x] Bloc 7 validé par le cahier des charges du Bloc 8

# Bloc 8 — Candidatures, campagnes et élections
- [x] Élections municipales locales, calendrier serveur, PNJ candidats actifs
- [x] Candidature contrôlée, programme, équipe et budget distinct
- [x] Actions et débats dans l’agenda existant, sondages évolutifs
- [x] Vote privé unique, dépouillement, mandat et conséquences locales
- [x] Pages Élections, campagne et liens Politique/téléphone/Ma Ville/carte/actualités
- [x] Treize scénarios réels et victoire du joueur ; 61 tests automatiques ; téléphone et rapport BLOC_8_VALIDATION.md
- [x] Régressions politique et citoyenneté réussies
- [x] Régression professionnelle finalisée : vacation complète et salaire/transaction uniques après recharges et reconnexion ; horloge restaurée sans avance visible aux autres joueurs
- [x] Régression sociale complète : 10 scénarios et invitation réussis après correction de la date du test
- [x] Bloc 8 validé selon la consigne de validation conditionnée à la réussite du dernier test salarial
- Ne pas commencer le Bloc 9 ; attendre la validation de l’utilisateur.

# Validation ciblée du Bloc 8
- [x] Revérifier dépouillement, conséquences et protection votes/résultats/gagnant/mandat
- [x] Test final immédiat : compte isolé, avance d’horloge non visible aux autres parties, vacation complète, salaire et transaction uniques dans Banque après recharges et reconnexion
- [x] Reprendre Atelier social, agenda, récompenses, relations et reconnexion
- [x] Parcours transversal partiel, comptes nettoyés et rapport BLOC_8_REGRESSION_CIBLEE.md
- [x] Rapport final du Bloc 8 conclu ; compte temporaire nettoyé et absence vérifiée ; aucun Bloc 9

# Bloc 9 — Mandat, gouvernance et monde réactif
- [x] Lot fin de mandat : clôture, bilan figé, retour normal, réélection unique sans concurrence ni troisième scrutin ; 17 vérifications isolées, nettoyage et rapport BLOC_9_LOT_FIN_MANDAT.md
- Bloc 9 officiellement terminé et validé par l’utilisateur ; aucune modification ni vérification supplémentaire, sauf correction critique empêchant le jeu de fonctionner. Les cases historiques ci-dessous ne sont pas des tâches à reprendre.
- [ ] Mandat réel, conseil cohérent avec les élections, trois priorités et bilan factuel
- [ ] Indicateurs 0–100, problèmes, dossiers et extension des décisions/consultations existantes
- [ ] Budget municipal distinct, négociation et votes sécurisés, financement unique
- [ ] Projets, progression, effets différés et réactions déterministes hors connexion
- [ ] Page Mandat, Ma Ville, téléphone, carte, agenda, actualités et notifications
- [ ] Seize scénarios obligatoires, parcours complet, sécurité et régression transversale
- [ ] Rapport final, nettoyage des essais et attente des instructions ; aucun Bloc 10

# Bloc 10 — Économie, patrimoine et projets de vie
- [x] Correction ciblée des loyers : SQL exact préparé ; autorisation explicite reçue
- [x] SQL autorisé appliqué ; huit tests réussis sur un compte temporaire isolé, dont quatre demandes concurrentes avant le premier paiement
- [x] Données des 89 tables publiques identiques avant/après nettoyage complet ; rapport ciblé rendu, Bloc 10 non validé
- [x] Autorisation officielle reçue ; préserver les Blocs 1 à 9, ne pas commencer le Bloc 11
- [x] Cahier des charges complet (50 sections, 16 tests obligatoires) reçu
- [ ] Étendre les systèmes personnels existants sans doublons, avec opérations financières sécurisées et échéances persistantes
- [ ] Tester les parcours réels, les doubles paiements et la reconnexion ; fournir le rapport sans validation prématurée

- [x] Bloc 10 : repostuler au même poste après départ (migrations 0034–0035), 10 tests réussis ; Bloc 10 en attente de validation par le client, Bloc 11 interdit.

## Bloc 11 — Démarches & fiscalité
- [ ] SQL proposé (attente accord)
- [ ] Migration + fermeture faille paiement direct
- [ ] Écran Mes démarches, documents, Agenda
- [ ] Tests déclaration / aide / retard / changement / sécurité / reconnexion / hors connexion / transversal / régression

- [x] Correctif période (0037) + tests même seconde ; Bloc 11 en attente de validation client
- [x] Correctif 0038 (changements par type) appliqué et testé ; Bloc 11 prêt techniquement, validation client en attente
- [x] Bloc 12 : SQL étape 2 approuvé
- [x] Bloc 12 : migration 0039 appliquée
- [x] Bloc 12 : écran Événements, Carte, Agenda, tests, régressions ; validation client en attente

# Bloc 13 — Communication et état du monde
- [x] Plan approuvé
- [x] SQL 0040 appliqué (version validée), Messages/Civi/Monde développés
- [x] Tests Bloc 13 : 22 vérifications ; défaut publication Civi signalé
- [x] Correctif publication Civi (0041) appliqué ; tests Bloc 13 26/26
- [x] Parcours économique 30/30
- [x] Actualités : 8/8 vérifications ciblées avec événement réel lié
- [ ] Vie quotidienne actif : non concluant, départ de vacation hors horaires ; attendre une plage réelle autorisée sans changer l’horloge
- [ ] Élections : non concluant, aucun créneau réellement isolé dans les cinq villes ; environnement isolé requis
- [x] Compte temporaire restant supprimé avec accord et absence vérifiée
- [ ] Validation Bloc 13 par l'utilisateur
- Bloc 14 interdit

## Vérifications ciblées demandées — 18 octobre
- [x] Proposition exacte préparée : copie jetable indépendante, fonctions du jeu inchangées, SQL de contrôle réservé à l’opérateur uniquement dans la copie ; aucune application
- [ ] Étape 1 uniquement autorisée : créer/vérifier un Remix avec Cloud indépendant ; bloquée par l’absence d’action de création de Remix dans cette session, création par l’utilisateur requise ; aucun SQL ni compte temporaire autorisé avant vérification
- [ ] Dernière vérification autorisée : nouveau compte actif, plage de travail réelle, refus/embauche/vacation/salaire/Banque/Agenda/reconnexion/persistance, suppression intégrale vérifiée ; bloquée à 17:42 UTC : jeudi 2 septembre 2027 vers 05:30 dans le monde, vitesse 1 ; début possible à partir du 18 octobre 20:12:05 UTC (22:12 Paris). Aucun compte créé, aucun scénario lancé hors horaires ; sans horloge, fonction, migration ou élection modifiée
- [x] Identifier, supprimer et vérifier uniquement le compte temporaire restant autorisé
- [x] Nouveau compte isolé : 8/8 loyers + deuxième demande immédiate et cinq demandes après paiement, tous réussis
- [x] Actualités 8/8 ; Vie quotidienne étudiant réussie, loyer unique confirmé ; limites actif/Élections ci-dessus
- [x] Rapport détaillé ; aucun fichier du jeu ni règle modifié, horloge inchangée, données des nouveaux essais supprimées

## Bloc 14 – Monde vivant, déplacements et Carte
- [x] Plan étape 2 approuvé
- [x] SQL 0042 appliqué après accord
- [x] Interface et tests Bloc 14 (35/35) ; validation finale par l’utilisateur en attente
- [x] Bloc 14 officiellement validé par l’utilisateur ; ne pas reprendre les anciennes réserves comme tâches ouvertes.

## Bloc 15 — Politique nationale et institutions
- [x] Accord lu : 50 sièges Assemblée, 25 Sénat simulé, 5 circonscriptions ; systèmes municipaux et horloge protégés.
- [x] Analyse en lecture seule et plan technique ; SQL proposé 0043 écrit sans application, aucun test lancé.
- [x] Nouvel accord : paramètres 5+45/25 et 26/13 verrouillés, relecture statique et corrections du SQL proposé, liens indirects explicités et fichier intégral présenté ; aucun SQL appliqué, activation, compte ni test.
- [x] Cahier comparé et proposition corrigée : confidentialité, instantané, versions, séances ; paramètres non décidés bloqués ; rapport et SQL révisé présentés sans exécution ni test.
- [x] Relecture statique et correction du SQL proposé selon l’accord du 19 octobre ; version v3 complète préparée, sans exécution, compte, test ni écran. Activation/dépouillement/Sénat/votes simulés/contenus non décidés restent bloqués.
- [x] Accord explicite reçu le 19 octobre à 07:40 UTC pour appliquer exclusivement la v3 après empreintes ; aucun compte, test ou activation.
- [x] Écart 65 → 79 expliqué par génération normale ; 79 conservés comme référence actuelle, aucun nettoyage.
- [x] Forme compatible v3 proposée : structure inchangée, initialisation atomique séparée, contrôles en lecture seule ; comparaison et inventaire exact présentés, perte de transaction globale explicitée.
- [x] Découpage refusé le 19 octobre à 08:04 UTC ; contrats des outils vérifiés sans exécution : migration transactionnelle mais initialisation littérale interdite, outil de données sans modifications de structure ; aucune transaction partagée exposée.
- [x] Gel confirmé le 19 octobre à 08:08 UTC ; demande technique préparée pour transmission au support, sans modification de la v3, SQL alternatif ni écriture en base.
- [ ] Application v3 bloquée : exécuteur officiellement pris en charge réunissant structure, initialisation et assertions dans une transaction unique nécessaire, puis nouvel accord explicite. Aucun rollback compensatoire ni installation partielle autorisé.
- [ ] Vérifications après application bloquées par l’absence d’application ; paramètres Sénat/votes simulés/textes/deltas à préciser avant activation.
- Bloc 16 interdit.

## P1 — Déplacements entre villes et espaces intérieurs
- [x] Roadmap approuvée et préparation documentaire réalisée.
- [x] Sept décisions initiales et six décisions complémentaires validées ; cahier des charges final v2 livré le 19 octobre 2026.
- SQL, développement, migration, comptes et tests non autorisés à cette étape ; application future conditionnée à un exécuteur atomique fiable et aux accords requis, dans l’ordre des migrations.

## P2 — Personnages fictifs vivants
- [x] Décisions : tous les PNJ bougent, peuvent aborder le joueur, voyagent parfois
- [x] Migration 0046 appliquée sur le VPS (COMMIT, contrôles OK) et site mis à jour
- [x] Vérifié en jeu par l'utilisateur ; P2 validé

## P3 — Organisations avancées
- [x] Décisions validées et plan approuvé
- [x] Migration 0047 écrite et écrans (fonder, caisse, dons, rôles, événements)
- [x] Migration 0047 appliquée sur le VPS (COMMIT) et site mis à jour

## P4 — Manifestations et JT
- [x] Décisions validées et plan approuvé
- [x] Migration 0048 écrite (manifestations, pression, JT local/national, interviews) et écrans (Ma Ville, page JT)
- [x] Migration 0048 appliquée sur le VPS (COMMIT, contrôles OK) et site mis à jour
- [x] Validé en jeu par l'utilisateur
- Plus tard : vrai JT télévisé (présentateur, chaînes fictives, mise en scène)

## P5 — Économie avancée (P5a banque → P5b assurances → P5c entreprises → P5d impôts entreprises)
- [x] Exclusion levée, décisions et plan approuvés
- [x] P5a : migration 0049 écrite (prêt, découvert, note, impayés, saisie) et écrans (Patrimoine, Banque)
- [x] P5a : migration 0049 appliquée sur le VPS (COMMIT, contrôles OK) et site mis à jour
- [x] P5b : migration 0050 écrite (assurances, imprévus) et écrans
- [x] P5b : appliqué sur le VPS
- [x] P5c : migration 0051 écrite (entreprises, caisse séparée, équipe fictive + joueurs, salaire dirigeant) et écran
- [x] P5c : appliqué sur le VPS
- [x] P5d : migration 0052 écrite (impôt bénéfice + taxe locale vers budget de la ville, salaire imposable) et écran
- [x] P5d : appliqué sur le VPS — P5 terminé

## P6 — Profils visibles et réseau
- [x] Migration 0053 écrite (profil public + présentation, annuaire de ville, joueurs sur place, contacts, abonnements, messages privés) et écrans (Réseau, téléphone « Joueurs »)
- [x] Appliqué sur le VPS

## P7 — Multijoueur complet
- [x] Migration 0054 écrite (blocage + signalement, virements entre contacts, activités à plusieurs, poids des votes joueurs) et écrans ; actualisation automatique toutes les 5–15 s
- [ ] Application sur le VPS (attend la commande de l'utilisateur)

# Grande extension — Priorité 1 (2 vagues)
- [x] Vague 1 : conséquences différées (0066), projets citoyens (0067), crises (0068) — préparés et testés, en attente d'installation
- [ ] Vague 2 : réputations multiples, compétences, journal de vie
- [x] Priorité 2 vague A : sondages, débats publics, CV citoyen (installée)
- [x] Priorité 2 vague B : coalitions, vie interne des partis, vérification des faits (0074 installée)
- [x] Priorité 3 vague A : évolution professionnelle + entretiens d'embauche (0075 préparée, à installer)
- [x] Priorité 3 vague B : marché immobilier (fusionné dans 0077) ; médias des joueurs avec Entreprises de services
- [ ] Priorité 4 (après accord)

# Boutique, voitures, immobilier (document reçu)
- [x] Phase 1 vague 1 : boutique, catalogue, achats, historique, patrimoine (0076 préparée)
- [x] Phase 1 vague 2 : voitures, locations, achat immobilier (0077 préparée)
- [x] Phase 2 : crédits auto/immo, assurance auto, entretien, revente, seconde main (0078 préparée)
- [x] Phase 3 (0079 installée) : magasins des villes, commerces et boutiques de joueurs, marché avec offres
- [x] Fin de phase 3 (0080 préparée) : promotions de la semaine, liste d'envies, objectif d'achat

# Documents administratifs
- [x] Vague 1 : profil, carte, photo, signature (installée)
- [x] Bouton PDF de la carte
- [x] Vague 2 : orientation politique + profil public (installée)
- [x] Vague 3 : coffre-fort documents, formulaires, documents automatiques (installée)
- [x] Photo de profil autorisée sur Civi, messages et listes d'élections (selon visibilité)

# Relations internationales (document reçu)
- [ ] Phase 1 : carte du monde, fiches pays, relations, diplomatie, traités, commerce, sanctions, embargos, énergie, conséquences économiques
- [ ] Phases suivantes (après accord)

# Entreprises de services et agences (document reçu)
- [x] Phase 1 vague A (0081 préparée) : garages + déménageurs, entreprise fictive de secours, factures, avis joueurs + habitants fictifs
- [ ] Phase 1 suite : agence immobilière, autres services, médias des joueurs (découpage à choisir)
- [x] Corriger les pages du menu qui ouvrent /section/... en 404

# Documents reçus (lus : plan en 4 vagues proposé, arbitrages à faire)
- [ ] Système de mise en scène réaliste (document reçu)
- [ ] Refonte complète de l'accueil (document reçu)
- [ ] Écosystème complet d'interfaces (document reçu)

- [x] Menu par rubriques + accueil personnel (affichage seulement)
- [ ] CIVITAS Services (annuaire + parcours)
- [ ] Monde mis en scène

- [x] Agence immobilière (0082) prête, à installer sur le VPS
- [x] Médias des joueurs (0083) : journal + chaîne, abonnés, caisse, signalements, influence plafonnée — installé
- [x] Concessionnaire (0084) installé
- [x] Construction (0085) : installation confirmée par le compte rendu VPS (COMMIT, image construite, site relancé)
- [x] Recrutement (0086) : page + SQL proposés, tests sur copie isolée avec embauches existantes ; primes, consentement, blocages et double clic contrôlés
- [x] Recrutement (0086) : règles chiffrées validées par Alex le 20 octobre 2026.
- [x] Recrutement (0086) : installation VPS confirmée par le résultat transmis par Alex le 20 octobre 2026 (contrôles et COMMIT sans erreur).
- [ ] Recrutement (0086) : vérifier le parcours réel sur le site VPS ; publication de la page à confirmer.
- [x] Assurance joueur (0087) : règles validées le 20 octobre 2026 — ouverture 5 000 €, cotisations 70–150 %, caisse puis secours fictif sans pénalité ; garanties existantes seulement, franchises et plafonds inchangés.
- [x] Assurance joueur (0087) : fichier SQL exact et écran préparés ; migration passée sur base temporaire, 30 assertions SQL et 193 tests frontend réussis. Fixture conservée dans tests/tools/player_insurance_fixture.sql ; moteur banque et règlement entreprise simulés dans la fixture, pas de régression VPS complète prétendue.
- [x] Audit des anciens contrats 0087 : tests/player_insurance_legacy.sql compare deux bases neuves avant/après migration, avec cinq contrats préexistants (habitation, santé, accident, pack, auto). 14 assertions après migration et résultats de règlement strictement identiques ; 30 essais assurance joueur relancés avec succès. Aucun accès VPS, aucune modification du SQL 0087.
- [x] Avant installation 0087 : signatures des corps complets assurance vérifiées avant tout ajout ; service_set_price laissé inchangé, tarifs assurance uniquement via insurer_set_price. 31 tests assurance + 14 tests anciens contrats passent ; divergence volontaire refusée et aucun ajout persistant. Version renforcée livrée séparément (v2), pas installée sur VPS.
- [ ] Limite d’audit : banque et règlement entreprise simulés ; comportement hérité de 0050 évaluant les sinistres passés avec le statut courant conservé, pas corrigé dans 0087. Validation sur copie complète du VPS non effectuée.
- [x] Assurance joueur (0087) : installation VPS confirmée le 20 octobre 2026 par le compte rendu complet jusqu’à COMMIT, après sauvegarde et accord.
- [x] Assurance joueur (0087) : mise à jour du site déclarée installée par Alex ; ne pas relancer la migration.
- [ ] Assurance joueur (0087) : vérifier le parcours réel sur le site VPS ; installation confirmée ne vaut pas essai en jeu.
- [x] Reprise demandée après 0087 : première livraison Monde mis en scène préparée (0088), quatre illustrations locales, cinq niveaux de présentation conservant le seuil 65, projection des événements publics liés aux articles du JT ; anciens JT et interviews inchangés.
- [x] Essais 0088 : 20 tests frontend ciblés ; SQL sur base jetable (15 contrôles : niveaux, ancien JT, accès privé, limite, interviews non attribuées), double installation refusée ; affichage téléphone contrôlé avec sujet simulé, sans débordement.
- [x] 0088 : SQL exact présenté et validé ; installation VPS confirmée le 20 octobre 2026 par le résultat jusqu’à COMMIT sans erreur ; ne pas relancer.
- [ ] 0088 : mettre à jour le site VPS pour afficher les nouvelles illustrations.
- [ ] 0088 : essai connecté réel sur VPS après installation. Aperçu connecté bloqué par tv_state absent de Lovable Cloud ; images vérifiées seulement avec projection simulée, pas de parcours réel prétendu.
- [ ] Monde mis en scène : étapes 1–3 (plan validé)

## Checklist de reprise — pause du 20 octobre 2026
- [ ] Vérifier en jeu la page Construction après l’installation confirmée ; ne pas relancer 0085.
- [x] Valider les montants proposés du recrutement : ouverture 1 500 €, prime employeur 200 € au tarif 70–150 %, client fictif 150 €, candidat gratuit.
- [x] Présenter le SQL exact 0086 et la commande d’installation après accord.
- [x] Confirmer l’installation 0086 : résultat VPS transmis, COMMIT sans erreur.
- [ ] Tester le parcours réel : candidat volontaire → proposition → embauche → prime → relecture ; page sur le site VPS à confirmer.
- [x] Préparer l’assurance joueur 0087 : règles validées, SQL exact livré et essais isolés réussis ; installation soumise à accord distinct.
- [ ] Après les quatre entreprises : commencer les étapes 1–3 du Monde mis en scène selon le plan validé.
- [ ] Nouveau document immobilier : préparer un découpage pour logements variés, catalogue visuel (photos, plans, pièces), visites et maisons personnalisables avec objets ; réutiliser logement, agence et boutique existants. Aucun développement autorisé cette nuit.
- [ ] Nouveau document écosystème : comparer les portails proposés aux fonctions existantes et préparer CIVITAS Services comme entrée commune (administration, logement, emploi, études, mobilité, finances, assurances, santé, entreprises, citoyenneté, documents) ; proposer les manques sans doubler les systèmes.
- [ ] Demander la suite des deux documents si nécessaire : immobilier reçu jusqu’à « [Louer] », écosystème jusqu’à « Mes documents » ; les blocs de code finaux ne sont pas fermés.
- Aucun travail ni installation ne continue pendant la pause ; relations internationales et voyages restent des propositions à arbitrer, pas des développements automatiquement autorisés.

## Atelier gameplay ambitieux — idées à discuter à la reprise
- [ ] Choisir avec Alex les idées prioritaires ci-dessous : propositions seulement, pas de règles validées ni de développement autorisé. Comparer à l’existant pour enrichir sans créer de doublons ; préserver les blocs validés.
- [ ] **Histoires de vie à embranchements** : des rencontres et occasions liées au métier, aux relations et à la ville ; plusieurs choix crédibles, conséquences différées, aucun chemin présenté comme le seul bon.
- [ ] **Quartiers qui se transforment visiblement** : montrer dans les lieux et leurs scènes les effets des projets, de l’activité économique et des décisions déjà simulés ; faire ressentir concrètement les choix collectifs.
- [ ] **Grands projets coopératifs** : habitants, entreprises, associations et élus contribuent à un même objectif local, avec rôles complémentaires, étapes et résultat visible ; garder toutes les caisses séparées.
- [ ] **Habitants fictifs avec mémoire** : approfondir les relations existantes par des promesses, services rendus, désaccords et retrouvailles qui influencent les futures rencontres, sans IA décisionnaire.
- [ ] **Carrières vraiment jouables** : ajouter des missions propres aux métiers, des spécialisations, du mentorat et des dilemmes professionnels plutôt que seulement attendre un salaire ; réutiliser carrière et agenda.
- [ ] **Une ville avec des rendez-vous marquants** : festivals, compétitions, inaugurations et rendez-vous de quartier reliés aux événements et médias existants ; les activités restent facultatives.
- [ ] **Des crises à plusieurs points de vue** : un même événement vécu par un citoyen, un soignant, un entrepreneur, un journaliste ou un élu, chacun disposant d’actions différentes ; étendre les crises existantes, pas les remplacer.
- [ ] **Enquêtes journalistiques jouables** : rechercher des indices fictifs, interroger des habitants et confronter des sources avant de publier ; prolonger médias et vérification des faits, sans exposer les données privées des joueurs.
- [ ] **Moins de menus, davantage d’actions dans les lieux** : rencontrer, acheter, postuler ou entreprendre une démarche directement depuis une scène ; conserver les accès rapides et de grandes zones tactiles.
- [ ] **Retour au jeu plus vivant et serein** : un résumé des changements pertinents, des histoires à retrouver et des objectifs personnels facultatifs ; aucune nouvelle punition liée à l’absence ni série de connexions obligatoire.
- [ ] Après sélection : proposer pour chaque idée le parcours joueur, ses liens avec l’existant, les risques et un découpage progressif ; toute modification de règle ou installation reste soumise à accord.

## IA locale indépendante — pistes à examiner demain
- [ ] Retrouver les anciennes propositions IA dans les échanges et les documents, comparer aux fonctions déjà présentes, et compléter cet inventaire sans prétendre que toutes ont déjà été retrouvées.
- [ ] Vérifier chaque piste avec l’IA locale du VPS (Ollama) : qualité en français, mémoire disponible, temps de réponse et plusieurs joueurs à la fois. Aucun appel à AI Gateway ni secours externe automatique ; contenu de secours non généré si l’IA est indisponible.
- [ ] **Analyse des projets de loi et décisions** : vérifier l’analyse locale déjà prévue puis envisager des explications des avantages, coûts et points de vue à partir des effets officiels du jeu ; aucune décision ni conséquence calculée par l’IA.
- [ ] **Dialogues avec les habitants fictifs** : conversations contextualisées, souvenirs autorisés, interviews et réactions à la ville ; l’IA raconte, les règles du jeu contrôlent les relations et les actions.
- [ ] **Histoires et missions personnalisées** : variantes narratives liées à la carrière, aux relations et aux événements ; choix, conditions et récompenses validés par les systèmes existants.
- [ ] **Entretiens et mentorat professionnel** : entraînements, questions adaptées au métier et conseils ; embauche et progression restent régies par le jeu.
- [ ] **Médias et JT enrichis** : articles, interviews fictives et résumés issus des événements réellement enregistrés ; distinguer faits du jeu et narration, sans inventer d’accusations sur les joueurs.
- [ ] **Aide à l’écriture** : brouillons de discours, programmes, pétitions, articles et interventions de débat ; le joueur relit et choisit de publier, sans publication automatique ni vote généré.
- [ ] **CIVITAS Services pédagogique** : expliquer les démarches simulées, guider vers les services existants et aider à comprendre un document fictif ; jamais présenter cela comme un conseil administratif, médical ou juridique réel.
- [ ] **Journal de vie et retour après absence** : résumer les faits accessibles au seul joueur et raconter ses étapes importantes sans inventer d’actions ni révéler de données privées.
- [ ] **Enquêtes, crises et vie de quartier** : dialogues et récits fondés sur des indices et états officiels ; l’IA ne tranche ni culpabilité, ni sanction, ni réussite.
- [ ] **Logements et visites** : descriptions personnalisées des pièces, objets et aménagements réellement présents ; photos, plans et images demandent une étude distincte, le modèle texte ne les produit pas à lui seul.
- [ ] **Voix locales facultatives** : étudier séparément narration du JT et voix des habitants avec des outils locaux ; vérifier les ressources du VPS avant toute promesse.
- [ ] Préparer les priorités et le découpage après examen : IA non décisionnaire, données minimales, aucune dépendance externe obligatoire, jeu utilisable sans IA ; règles et SQL exact soumis à accord avant installation.
