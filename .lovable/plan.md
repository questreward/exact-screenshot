# Bloc 15 — Politique nationale et institutions

## Statut et décisions
Proposition uniquement : **aucune application, aucun développement du jeu, aucun test**. Bloc 14 validé. Bloc 16 exclu. Votre accord fixe 50 sièges à l’Assemblée, 25 au Sénat, cinq circonscriptions, des lois dédiées et l’accord des deux chambres sur une même version. Le SQL proposé est `.lovable/proposed_0043_bloc15_national_politics.sql` ; il n’est ni une migration enregistrée ni un fichier appliqué.

Les paramètres non décidés restent sans valeur et le système est désactivé. Le fichier décrit une base sécurisée et les opérations nationales ; le lancement électoral, la simulation et les effets restent bloqués jusqu’à validation et configuration des règles ci-dessous. Il ne faut pas considérer ce fichier comme une autorisation de lancement.

## 1. Tables nouvelles — existant / ajout
- **Réglages et partis** : `national_settings` (50/25, activation fausse, règles sans valeurs implicites), `national_constituencies` (Paris, Lyon, Marseille, Lille, Bordeaux : un siège chacune), `national_party_profiles` (extension 1:1 des organisations existantes : programme national, popularité de simulation). Les membres, opinions, relations et statistiques restent ceux des Blocs 4/7 ; aucune duplication de progression.
- **Scrutins** : `national_elections`, `national_candidacies`, `national_ballots`, `national_results`. Les tables municipales `elections/candidacies/election_votes/election_results` ne peuvent servir sans mélange de calendriers et de droits ; elles restent intactes. Les bulletins nationaux sont privés et immuables. Résultats fictionnels et voix réelles sont enregistrés séparément.
- **Parlement** : `national_legislatures`, `national_groups`, `national_seats`. Les sièges et groupes municipaux ne sont pas réutilisés comme mandats nationaux. Ils alimentent seulement la simulation indirecte du Sénat, avec un instantané de la source. Les cinq sièges territoriaux représentent les gagnants ; les 45 autres sont fictifs, sans donner de sièges supplémentaires aux joueurs.
- **Exécutif** : `national_governments`, `national_offices`. Président, Premier ministre et ministres fictifs au départ ; nominations des joueurs uniquement par un serveur autorisé, contrôlant les mêmes statistiques existantes, sans autopromotion. Les fonctions de jeu sont séparées des permissions d’administration.
- **Lois** : `national_law_templates`, `national_laws`, `national_law_versions`, `national_sessions`, `national_parliamentary_votes`. Une version fige texte, coût et effets autorisés par un modèle serveur ; amendement = nouvelle version, jamais écrasement d’un vote. Les décisions municipales `public_decisions` restent isolées.
- **Budget et effets** : `national_treasury`, `national_budgets`, `national_ledger`, `national_city_effects`. Budget national indépendant ; registre unique (version, ville, indicateur), historique partagé des indicateurs avec préfixe `national:`. Aucun compte, salaire, loyer ou impôt personnel.
- **Traçabilité** : `national_requests` (clé de demande et réponse pour les répétitions), `national_publications` (clé de fait politique → événement public existant). Aucun nouveau fil d’actualité, moteur de transports ou réseau social.

## 2. Tables existantes éventuellement étendues
**Aucune colonne, contrainte, politique ou fonction existante modifiée.** Lectures : `cities`, `organizations`, `political_profiles`, `social_npcs`, `characters`, `memberships`, `political_stats`, `civic_stats`, `municipal_mandates`, `municipal_council_groups`, `locations`, `character_positions`, `news_sources`.
Exception additive explicitement proposée : un nouveau déclencheur sur `activities`, qui ne contrôle que le nouveau type `national` et retourne immédiatement pour les activités existantes. Il interdit une séance forgée ou des récompenses nationales non prévues. Aucun déclencheur existant n’est modifié ; son ajout devra faire partie de votre accord SQL.
Ajouts futurs seulement : nouvelle règle `national` dans `life_rules`, activités nationales dans `activities`, faits publics dans `events` et leurs articles dans `news`, nouvelles traces dans `indicator_history`. Seules les valeurs de `city_indicators` peuvent évoluer **après entrée en vigueur**, jamais lors de la préparation du SQL. Les fonctions existantes gèrent alors leur fonctionnement normal ; rien n’est remplacé.

## 3. Fonctions serveur nouvelles / modifiées
**Nouvelles uniquement**, préfixe `national_` : authentification du personnage sans appel à `civic_actor` (celui-ci modifie déjà la vie quotidienne) ; validation de configuration ; candidature/programme ; vote national ; dépouillement et attribution ; composition Sénat ; formation/nominations ; dépôt/amendement ; ouverture/clôture des votes ; réservation de séance ; vote parlementaire ; application des lois et financement ; publication ; état public filtré ; rattrapage des échéances.
Les fonctions internes et de configuration sont réservées à l’opérateur. Les joueurs n’appellent que les opérations utiles à leur rôle. Les dates proviennent de `game_now()` en lecture, jamais de l’heure du navigateur. Le traitement périodique futur appellera `national_refresh` séparément : aucune modification de la tâche horaire actuelle dans ce SQL.

## 4. Écrans à ajouter — développement ultérieur
- Politique nationale : situation, exécutif, chambres, lois et prochain scrutin.
- Élections nationales : calendrier indépendant, ma circonscription, candidature/programme, confirmation du vote, résultats.
- Assemblée / Sénat : 50/25 sièges, groupes et représentation ; aucun vote direct pour le Sénat.
- Loi : version, auteur politique public, texte, deux votes distincts, résultat, entrée en vigueur, effets et historique.
- Gouvernement / Budget : composition, postes, allocations fictives, disponible/engagé et registre public.
- Parti existant : volet national, sans afficher les membres privés ni leurs statistiques.
- Agenda : séances ajoutées à `activities`, même départ/fin que la Vie. Pas de séance virtuelle ou bâtiment national inventé : proposition de participation depuis un lieu administratif existant de la ville, à valider.
- Monde / Ma Ville : origine des effets nationaux. Actualités / Civi : réutilisation des événements publics. Carte : lieux existants seulement, aucun nouveau pays ni déplacement national.
Accès téléphone/menu et routes distinctes, grands boutons, français, métadonnées propres à chaque page. Aucun écran ajouté maintenant.

## 5. Permissions et confidentialité
Chaque table nouvelle : GRANT explicite, RLS, SELECT seulement pour les joueurs. Pas de droit direct INSERT/UPDATE/DELETE. Fonctions SECURITY DEFINER avec schéma fixé, droits d’exécution explicitement restreints, rôle/mandat/date/ville contrôlés côté serveur.
Bulletins, demandes et candidatures en attente : propriétaire seul. Identifiants de personnages/membres et statistiques privés exclus des projections publiques ; sièges affichés par nom fictif enregistré. Votes parlementaires individuels joueurs privés, totaux publics. Brouillons de lois privés à leur auteur ; les propositions publiées deviennent publiques. Aucune autorisation basée sur un nom ou un stockage navigateur.
Événements nationaux créés avec `character_id` et `template_id` nuls : ni fuite d’événement personnel ni seconde application via le registre du Bloc 14. Civi n’accorde aucune récompense.

## 6. Anti-doublon et concurrence
Verrou personnage puis verrou national ; dates/requêtes vérifiées après verrou. Bulletins uniques (scrutin, personnage), candidature unique (scrutin, personnage), résultat unique (scrutin, circonscription, candidat), siège unique (législature, chambre, numéro). Dépouillement unique, délégués du Sénat figés lors de sa composition.
Vote parlementaire unique (séance, siège), une séance par version/chambre ; édition interdite après ouverture. Réservation unique (séance, personnage) via la clé `activities.source_key`. Deux chambres doivent approuver **la version courante identique**. Demande répétée avec contenu différent refusée.
Financement unique par version ; effet unique (version, ville, indicateur), ligne d’indicateur verrouillée avant addition bornée ; publication unique par fait. Un échec annule toute l’opération, pas seulement une partie.

## 7. Effets sur les villes
Indicateurs réellement existants : logement (`housing`), emploi (`employment`), transports (`transport`), environnement (`environment`), sécurité (`safety`), services (`services`), commerce (`commerce`), culture (`culture`), satisfaction (`satisfaction`). Santé et éducation ne sont **pas** des indicateurs existants : aucun indicateur inventé. Un modèle éducatif peut viser `services` seulement après votre décision explicite.
Les effets sont des deltas déterministes de modèles contrôlés serveur, figés dans la version. Valeur finale = min(100, max(0, valeur actuelle + delta)). Le registre conserve avant/après et delta réellement appliqué ; aucune réapplication après recharge. Aucun modèle actif ou delta prérempli : montants, durée et lien avec les budgets restent à décider. Effets ponctuels seulement proposés ; aucun effacement automatique inventé.

## 8. Données existantes modifiées / comparaison avant-après
À cette étape : **aucune donnée modifiée**. Le SQL de préparation crée uniquement des objets nationaux et ajoute leurs cinq circonscriptions ; il n’active rien et n’insère aucun événement/activité/effet.
Avant une application ultérieure : comptages et empreintes de toutes les tables des Blocs 1–14, fonctions, politiques, droits et horloge. Après application : mêmes empreintes pour l’existant ; seules nouvelles tables/fonctions attendues. Les 65 événements gardent retard 0. Comparaison individuelle des élections et mandats municipaux, pas uniquement leur nombre.
Contrôle effectué en lecture seule durant cette préparation : 65 événements et 65 retards nuls avant/après, cinq élections municipales, zéro mandat municipal, zéro table nationale. Empreintes de l’horloge, des élections et des mandats identiques avant/après. Aucun test ni appel à une fonction qui règle le jeu.
Après un fonctionnement autorisé : distinguer mutations nationales attendues (nouveaux événements/articles/activités/traces et indicateurs) de toute autre modification. Préserver `baseline` des indicateurs. Aucune suppression/cascade vers l’existant. Ne pas promettre que toutes les données seront inchangées pendant le fonctionnement : les effets sur les villes sont précisément l’ajout demandé.

## 9. Régressions à préparer, sans les lancer
Blocs 1–3 : identité/personnage privé, Banque, énergie, emploi/salaire unique, études, Agenda, déplacements. Blocs 4–7 : relations, adhésions, opinions, citoyenneté, actualités/lectures/favoris privés. Blocs 8–9 : calendriers, votes, dépouillements et mandats municipaux identiques. Blocs 10–11 : patrimoine, loyer/retente unique, démarches. Blocs 12–14 : génération, récompenses, Civi sans gain, Messages, Monde, confidentialité, travaux +20 min/plafond 40, durée figée et véhicules inchangés.
Tests nationaux : cinq circonscriptions, 50/25 sièges, Sénat sans vote joueur, absence d’élus locaux, privé/public, refus d’accès, calendrier, double candidature/vote, concurrence, votes des deux chambres sur versions distinctes, amendment, absence, financement insuffisant, borne 0/100, effet/publication unique, reconnexion et rattrapage, nettoyage des seuls comptes temporaires autorisés. Aucun changement d’horloge ; si le calendrier empêche un essai isolé, signaler la limite.

## 10. Risques et paramètres à valider
- **Blocage réel** : 5 élections municipales et **0 mandat municipal actuellement** ; aucun collège d’élus locaux actif. Sénat non constitué tant que cette source manque ; aucune fausse élection municipale ni faux mandat pour contourner.
- Propositions à décider : scrutin territorial à un tour ; 45 sièges fictifs proportionnels à des poids de partis configurés (plus forts restes, égalité par identifiant stable) ; Sénat proportionnel aux sièges des conseils actifs (même méthode) ; votes fictionnels paramétrés distincts des bulletins réels ; majorité absolue proposée 26/50 et 13/25, absence = abstention ; réexamen par nouvelle version.
- À décider avant activation : dates/durée du premier scrutin et mandats ; âge et seuils civiques/politiques ; poids d’électorat fictif et de simulation des partis/votes ; fenêtre/durée/énergie des séances ; lieu de participation ; ministères/conditions de nomination ; unité, plafond et modèles budgétaires ; textes et effets autorisés ; règles de campagne/débats. Pas de campagne nationale financée inventée dans ce SQL : les programmes existent, mais les actions de campagne nouvelles restent à définir.
- Gouvernement : proposition de nomination depuis le groupe le plus représenté, pas de coalition ou confiance parlementaire inventée ; Président/PNJ nommés explicitement par l’opérateur, jamais promotion automatique joueur.
- Les échéances sont immuables pendant un scrutin ; passé traité chronologiquement, sans ouvrir de vote après fermeture. Pas de majorité suffisante = refus, pas d’adoption forcée. Budget insuffisant = attente d’application sans effet partiel.
- Les lois ne bloquent pas les lieux, ne modifient pas les transports, salaires, loyers, élections municipales ou argent personnel. Multijoueur complet, diplomatie, deuxième pays, finance avancée et Bloc 16 exclus.

**Suite :** relire le SQL proposé et décider des paramètres encore ouverts. Aucun appel de migration ni activation avant votre accord explicite sur le fichier exact et ses limites.
