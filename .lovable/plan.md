# Bloc 15 — Politique nationale et institutions

## Statut et décisions
Proposition uniquement : **aucune application, aucun développement du jeu, aucun test**. Bloc 14 validé. Bloc 16 exclu. Votre accord fixe 50 sièges à l’Assemblée, 25 au Sénat, cinq circonscriptions, des lois dédiées et l’accord des deux chambres sur une même version. Le SQL proposé est `.lovable/proposed_0043_bloc15_national_politics.sql` ; il n’est ni une migration enregistrée ni un fichier appliqué.

Système désactivé, paramètres indéfinis laissés vides. Ce SQL est un socle proposé, non un lancement complet : campagnes/débats et notifications nationales générales restent à définir.

## 1. Tables nouvelles — existant / ajout
- Réglages/partis : `national_settings` (50/25, désactivé), `national_constituencies` (cinq villes), `national_party_profiles` (extension 1:1 des organisations : programme et poids fictif). Membres, opinions, relations et statistiques réutilisés sans progression parallèle.
- Scrutins : `national_elections`, `national_candidacies`, `national_ballots`, `national_results` ; calendrier propre, bulletins privés uniques, voix réelles/fictives distinguées. Tables municipales intactes : les étendre mélangerait leurs droits/calendriers.
- Parlement : `national_legislatures`, `national_groups`, `national_seats`. Cinq gagnants territoriaux +45 sièges fictifs ; Sénat simulé depuis un instantané des conseils locaux. Aucun mandat municipal transformé en mandat national.
- Exécutif : `national_governments`, `national_offices`. PNJ au départ, joueurs nommables sous conditions ; aucune autopromotion ni privilège d’administration conféré par un rôle du jeu.
- Lois : `national_law_templates`, `national_laws`, `national_law_versions`, `national_sessions`, `national_parliamentary_votes`. Versions dédiées, coûts/effets issus de modèles serveur, votes non réécrits ; `public_decisions` isolée.
- Budget/effets : `national_treasury`, `national_budgets`, `national_ledger`, `national_city_effects` ; aucun compte personnel, unicité (version, ville, indicateur), historique préfixé `national:`.
- Traçabilité : `national_requests` (demande/réponse répétable), `national_publications` (fait unique → événement existant). Pas de fil ou moteur d’événements parallèle.

## 2. Tables existantes éventuellement étendues
**Aucune colonne, contrainte, politique ou fonction existante modifiée.** Lectures : `cities`, `organizations`, `political_profiles`, `social_npcs`, `characters`, `memberships`, `political_stats`, `civic_stats`, `municipal_mandates`, `municipal_council_groups`, `locations`, `character_positions`, `news_sources`.
Exception additive proposée : nouveau déclencheur sur `activities`, uniquement pour le type `national` (séances forgées/gains interdits). Il retourne immédiatement pour les types existants ; ajout à approuver.
Écritures futures prévues : nouvelle règle `life_rules`, lignes `activities/events/news/indicator_history` et deltas `city_indicators` après application d’une loi. Aucune maintenant, aucune modification des lignes anciennes.

## 3. Fonctions serveur nouvelles / modifiées
**Nouvelles uniquement**, préfixe `national_` : authentification du personnage sans appel à `civic_actor` (celui-ci modifie déjà la vie quotidienne) ; validation de configuration ; candidature/programme ; vote national ; dépouillement et attribution ; composition Sénat ; formation/nominations ; dépôt/amendement ; ouverture/clôture des votes ; réservation de séance ; vote parlementaire ; application des lois et financement ; publication ; état public filtré ; rattrapage des échéances.
Internes/configuration réservées à l’opérateur ; joueurs : `national_action` et `national_state`. Horaires via `game_now()` en lecture. Rattrapage séparé, aucune tâche horaire actuelle modifiée.

## 4. Écrans à ajouter — développement ultérieur
- Politique nationale : situation, exécutif, chambres, lois et prochain scrutin.
- Élections nationales : calendrier indépendant, ma circonscription, candidature/programme, confirmation du vote, résultats.
- Assemblée / Sénat : 50/25 sièges, groupes et représentation ; aucun vote direct pour le Sénat.
- Loi : version, auteur politique public, texte, deux votes distincts, résultat, entrée en vigueur, effets et historique.
- Gouvernement / Budget : composition, postes, allocations fictives, disponible/engagé et registre public.
- Parti existant : volet national, sans afficher les membres privés ni leurs statistiques.
- Agenda : séances ajoutées à `activities`, même départ/fin que la Vie. Pas de séance virtuelle ou bâtiment national inventé : proposition de participation depuis un lieu administratif existant de la ville, à valider.
- Monde / Ma Ville : origine des effets nationaux. Actualités / Civi : réutilisation des événements publics. Carte : lieux existants seulement, aucun nouveau pays ni déplacement national.
Accès téléphone/menu, pages distinctes, français et grands boutons ; aucun écran ajouté maintenant.

## 5. Permissions et confidentialité
GRANT/RLS sur chaque nouvelle table ; joueurs SELECT seulement, aucun INSERT/UPDATE/DELETE. SECURITY DEFINER, schéma fixe, rôle/mandat/date/ville vérifiés serveur ; internes révoquées aux joueurs.
Bulletins/demandes/votes individuels privés ; totaux, programmes acceptés et propositions publiées publics. Projections excluant identités de compte et statistiques privées ; brouillons visibles à l’auteur seul. Autorisation par personnage authentifié, jamais par nom.
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
En fonctionnement futur : seuls ajouts nationaux et deltas autorisés des indicateurs, `baseline` inchangée, aucune suppression/cascade vers l’existant. Ces effets attendus seront distingués des régressions.

## 9. Régressions à préparer, sans les lancer
Blocs 1–3 : identité/personnage privé, Banque, énergie, emploi/salaire unique, études, Agenda, déplacements. Blocs 4–7 : relations, adhésions, opinions, citoyenneté, actualités/lectures/favoris privés. Blocs 8–9 : calendriers, votes, dépouillements et mandats municipaux identiques. Blocs 10–11 : patrimoine, loyer/retente unique, démarches. Blocs 12–14 : génération, récompenses, Civi sans gain, Messages, Monde, confidentialité, travaux +20 min/plafond 40, durée figée et véhicules inchangés.
Tests nationaux : cinq circonscriptions, 50/25 sièges, Sénat sans vote joueur, absence d’élus locaux, privé/public, refus d’accès, calendrier, double candidature/vote, concurrence, votes des deux chambres sur versions distinctes, amendment, absence, financement insuffisant, borne 0/100, effet/publication unique, reconnexion et rattrapage, nettoyage des seuls comptes temporaires autorisés. Aucun changement d’horloge ; si le calendrier empêche un essai isolé, signaler la limite.

## 10. Risques et paramètres à valider
- **Blocage réel** : 5 élections municipales et **0 mandat municipal actuellement** ; aucun collège d’élus locaux actif. Sénat non constitué tant que cette source manque ; aucune fausse élection municipale ni faux mandat pour contourner.
- Propositions à décider : scrutin territorial à un tour ; 45 sièges fictifs proportionnels à des poids de partis configurés (plus forts restes, égalité par identifiant stable) ; Sénat proportionnel aux sièges des conseils actifs (même méthode) ; votes fictionnels paramétrés distincts des bulletins réels ; majorité absolue proposée 26/50 et 13/25, absence = abstention ; réexamen par nouvelle version.
- À décider avant activation : dates/durée du premier scrutin et mandats ; âge et seuils civiques/politiques ; poids d’électorat fictif et de simulation des partis/votes ; fenêtre/durée/énergie des séances ; lieu de participation ; ministères/conditions de nomination ; unité, plafond et modèles budgétaires ; textes et effets autorisés ; règles de campagne/débats. Pas de campagne nationale financée inventée dans ce SQL : les programmes existent, mais les actions de campagne nouvelles restent à définir.
- Gouvernement proposé depuis le groupe le plus représenté, sans coalition/confiance inventée ; PNJ choisis par l’opérateur, pas de promotion automatique.
- Échéances figées ; rattrapage chronologique, aucun vote tardif. Majorité insuffisante = refus ; fonds insuffisants = attente, pas d’effets partiels.
- Les lois ne bloquent pas les lieux, ne modifient pas les transports, salaires, loyers, élections municipales ou argent personnel. Multijoueur complet, diplomatie, deuxième pays, finance avancée et Bloc 16 exclus.

**Suite :** relire le SQL proposé et décider des paramètres encore ouverts. Aucun appel de migration ni activation avant votre accord explicite sur le fichier exact et ses limites.
