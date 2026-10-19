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
- [ ] Priorité 2 vague B : coalitions, vie interne des partis, vérification des faits
- [ ] Priorités 3 et 4 (après accord)

# Documents administratifs
- [x] Vague 1 : profil, carte, photo, signature (installée)
- [x] Bouton PDF de la carte
- [x] Vague 2 : orientation politique + profil public (installée)
- [x] Vague 3 : coffre-fort documents, formulaires, documents automatiques (installée)
- [x] Photo de profil autorisée sur Civi, messages et listes d'élections (selon visibilité)
