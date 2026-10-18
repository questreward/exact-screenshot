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
- [ ] Bloc 12 : SQL étape 2 présenté pour accord (aucune application avant validation)
