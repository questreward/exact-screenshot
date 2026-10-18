# Bloc 15 — Politique nationale et institutions

## Statut et décisions
**Proposition non appliquée, aucun développement ni test.** Bloc 14 validé, Bloc 16 exclu. Décisions : Assemblée 5+45/Sénat 25, majorités 26/13, lois dédiées, deux chambres approuvant la même version. SQL : `.lovable/proposed_0043_bloc15_national_politics.sql`, hors migrations.

Système désactivé, activation explicitement refusée dans ce socle ; paramètres indéfinis laissés vides. Ce SQL est un socle proposé, non un lancement complet : campagnes/débats et notifications nationales générales restent à définir.

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
Fonctions nouvelles `national_` : authentification sans règlement de vie quotidienne, configuration/éligibilité, scrutin/dépouillement/sièges, Sénat, exécutif, lois/versions/séances/votes, budget/effets, publication, état et rattrapage. Le SQL donne chaque signature et contrôle.
Internes/configuration réservées à l’opérateur ; joueurs : `national_action` et `national_state`. Horaires via `game_now()` en lecture. Rattrapage séparé, aucune tâche horaire actuelle modifiée.

## 4. Écrans à ajouter — développement ultérieur
- Politique nationale : situation, exécutif, chambres, lois et prochain scrutin.
- Élections nationales : calendrier indépendant, ma circonscription, candidature/programme, confirmation du vote, résultats.
- Assemblée / Sénat : 50/25 sièges, groupes et représentation ; aucun vote direct pour le Sénat.
- Loi : version, auteur politique public, texte, deux votes distincts, résultat, entrée en vigueur, effets et historique.
- Gouvernement / Budget : composition, postes, allocations fictives, disponible/engagé et registre public.
- Parti existant : volet national, sans afficher les membres privés ni leurs statistiques.
- Agenda : séances ajoutées à `activities`, horaires figés ; démarrage national explicite pour éviter le recalcul du départ par la Vie. Coût d’énergie de séance uniquement. Vérification en lecture seule : Hôtel de ville et Maison des services publics accessibles dans chacune des cinq villes. Aucun bâtiment inventé ; lieu choisi à la réservation, recontrôlé au départ.
- Monde / Ma Ville : origine des effets nationaux. Actualités / Civi : réutilisation des événements publics. Carte : lieux existants seulement, aucun nouveau pays ni déplacement national.
Accès téléphone/menu, pages distinctes, français et grands boutons ; aucun écran ajouté maintenant.

## 5. Permissions et confidentialité
GRANT/RLS sur chaque nouvelle table ; joueurs SELECT seulement, aucun INSERT/UPDATE/DELETE. SECURITY DEFINER, schéma fixe, rôle/mandat/date/ville vérifiés serveur ; internes révoquées aux joueurs.
Bulletins/demandes/votes individuels privés ; totaux, candidatures explicitement publiées par l’opérateur et propositions publiées publics. Aucune phase de publication des candidatures inventée. Projections excluant identités de compte et statistiques privées ; brouillons visibles à l’auteur seul. Autorisation par personnage authentifié, jamais par nom.
Événements nationaux créés avec `character_id` et `template_id` nuls : ni fuite d’événement personnel ni seconde application via le registre du Bloc 14. Civi n’accorde aucune récompense.

## 6. Anti-doublon et concurrence
Verrou personnage puis national. Unicités : bulletin/candidature (scrutin,personnage), résultat (scrutin,ville,candidat), siège (législature,chambre,numéro). Dépouillement unique, source du Sénat figée.
Vote unique (séance,siège), séance unique (version,chambre), réservation par `activities.source_key`. Deux chambres approuvent la version courante identique ; demande répétée au contenu différent refusée.
Financement unique par version ; effet unique (version, ville, indicateur), ligne d’indicateur verrouillée avant addition bornée ; publication unique par fait. Un échec annule toute l’opération, pas seulement une partie.

## 7. Effets sur les villes
Neuf indicateurs existants : `housing/employment/transport/environment/safety/services/commerce/culture/satisfaction`. Santé/éducation absents : aucun indicateur inventé ; éventuel lien avec services à décider.
Deltas de modèles serveur figés par version ; valeur = min(100,max(0,actuelle+delta)), avant/après conservés. Effet ponctuel proposé, aucun modèle actif prérempli ; points/coûts/délais à décider.

## 8. Données existantes modifiées / comparaison avant-après
À cette étape : **aucune donnée modifiée**. Le SQL de préparation crée uniquement des objets nationaux et ajoute leurs cinq circonscriptions ; il n’active rien et n’insère aucun événement/activité/effet.
Avant/après application future : empreintes/comptages des tables, fonctions, politiques, droits, horloge et chaque scrutin/mandat municipal. Seul ajout attendu : objets nationaux et déclencheur déclaré ; 65 anciens événements à retard 0.
Lecture seule : 65 événements/retards nuls, cinq élections, aucun mandat/table nationale ; empreintes horloge/élections/mandats identiques avant/après. Aucun test lancé.
En fonctionnement futur : seuls ajouts nationaux et deltas autorisés des indicateurs, `baseline` inchangée, aucune suppression/cascade vers l’existant. Ces effets attendus seront distingués des régressions.

## 9. Tests à préparer seulement
- Blocs 1–14 : personnage/identité privés, Banque/salaire/loyer uniques, études, Agenda, relations, citoyenneté, politique, patrimoine/démarches, événements, Messages/Civi sans gains, Monde/Carte, confidentialité, transports +20 min/plafond 40, véhicules inchangés.
- Municipal : comparer intégralement calendriers, résultats, mandats, fonctions et permissions avant/après.
- National : 5 circonscriptions, 50/25 sièges, Sénat sans vote direct et absence de collège ; candidature/vote/concurrence ; rôles et écritures interdites ; mêmes/différentes versions des chambres ; refus/amendement ; budget insuffisant ; bornes 0/100 ; effet/article unique ; Agenda/présence ; recharge/reconnexion/rattrapage.
- Comptes temporaires isolés seulement après accord ; aucun changement d’horloge. Calendrier incompatible avec l’isolation = limite signalée, pas de contournement.

## 10. Risques et paramètres à valider
- **Blocage réel** : 5 élections municipales et **0 mandat municipal actuellement** ; aucun collège d’élus locaux actif. Sénat non constitué tant que cette source manque ; répartition et traitement des groupes indépendants/non configurés À DÉCIDER ; aucune fausse élection municipale ni faux mandat pour contourner.
- Majorités confirmées : 26/50 et 13/25. Méthodes territoriale et de répartition, égalités, poids fictifs et traitement des absences : À DÉCIDER, sans algorithme opérationnel dans le socle. Une séance par chambre/version ; réexamen = nouvelle version. Sénat anonyme simulé par groupes issus des conseils, pas nomination des maires comme sénateurs.
- À décider : dates/mandats, âges/seuils, poids fictifs, durée/énergie/lieu des séances, ministères/nominations, unité/plafond/budget et textes/effets. Campagnes/débats exclus jusqu’à cahier séparé. Les limites techniques de saisie ne constituent pas des valeurs d’équilibrage approuvées.
- Composition et formation du gouvernement À DÉCIDER ; PNJ choisis par l’opérateur, pas de promotion automatique. Formation/nomination bloquées dans le socle.
- Échéances figées ; rattrapage chronologique, aucun vote tardif. Majorité insuffisante = refus ; fonds insuffisants = attente, pas d’effets partiels.
- Les lois ne bloquent pas les lieux, ne modifient pas les transports, salaires, loyers, élections municipales ou argent personnel. Multijoueur complet, diplomatie, deuxième pays, finance avancée et Bloc 16 exclus.

**Relecture statique terminée, sans validation par exécution.** Corrections : majorités fixes, valeurs nulles rejetées, versions figées, application atomique, démarrage national explicite, garde complet des activités, lieux contrôlés dès ouverture. Installation future ajouterait le déclencheur sur `activities` mais aucune règle ni activité nationale. Sénat agrégé depuis les conseils réels : modèle de répartition encore à valider. Aucun appel de migration ni activation avant accord sur le fichier exact et ses limites.

## Relecture du cahier transmis le 18 octobre à 22:18 UTC
- Aucun appel de migration, aucune activation, aucun compte ni test. Vérification live SELECT uniquement : cinq villes, 65 événements à retard nul, cinq élections municipales, aucun mandat municipal ni table nationale.
- Corrigé dans la proposition : publicité explicite des candidatures ; poids du Sénat tirés du même instantané ; référence différée vers la version courante ; contrôle de version absente ; autorisation privée du démarrage national ; clôture uniquement des séances nationales expirées avant une action.
- Supprimé : âges minimaux 18, plafond budgétaire arbitraire, durée maximale 1440 et algorithmes/conditions d’accès imposés. Éligibilité, dépouillement/répartition, votes simulés et formation/nomination sont des fonctions bloquantes À DÉCIDER ; pas un lancement complet.
- Le déclencheur sur activities reste un ajout proposé touchant une table existante, pas une fonction existante remplacée. Les garanties sont statiques, non validées par exécution.
