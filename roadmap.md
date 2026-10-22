# CIVITAS — Liste V2 (à reprendre demain)

## V4 — Objets et interfaces (Prompt 7)
- [x] Examiner téléphone, chargements sélectifs, banque, outils professionnels et erreurs sans reconstruire l’application.
- [ ] Donner un écran de téléphone immédiatement pendant les chargements, rendre le retour cohérent et les erreurs réessayables.
- [ ] Corriger les commandes bancaires étroites et les erreurs du distributeur sans modifier les opérations.
- [ ] Tester navigation, reprise et erreurs ; vérifier le rendu accessible et identifier les essais connectés bloqués.

## V4 — Monde vivant (Prompt 6)
- [ ] Remplacer les scènes d’incidents fictives de l’accueil par les événements enregistrés.
- [ ] Partager identité, statut et conséquences des événements entre accueil, carte, téléphone et météo sans nouveau moteur.
- [ ] Tester dédoublonnage, visibilité locale, expiration et accès aux lieux/articles existants.
- [ ] Essai connecté sur VPS et extensions du moteur : évaluer les contrats disponibles ; SQL soumis à accord préalable.

## V4 — Métiers (Prompt 5)
- [x] Relier briefing, objectif courant, actions et bilan aux missions existantes ; salaires et progression préservés, décors par métier et comptes rendus des services enregistrés.
- [x] Retirer les fausses arrivées, tâches réussies, clients décoratifs et performances des présentations de service ; consignes non présentées comme actions enregistrées.
- [x] Décisions protégées contre double appui, dossier conservé après erreur, actualisation avant nouvelle décision, clé de début de garde réutilisée ; téléphone lit le dossier déjà consulté et carte ouvre le vrai lieu de travail.
- [x] 507 tests réussis, compilation OK ; reprise de garde après minuit, état non confirmé et décisions testés. Accès protégé à 390×844 et 1280×1800 sans erreur ni débordement.
- [ ] Essai complet avec personnage sur VPS : aucun compte correspondant dans l’aperçu, pages redirigées vers la connexion.

Limites du contrat existant (évolution ultérieure, non simulée) : missions quotidiennes sans destination précise ni inventaire professionnel persistant ; pas de tournée issue des commandes, d’itinéraire de cortège enregistré ou de nouvelle génération météo. Les systèmes métiers/commerce/politique/IA existants sont conservés sans nouveau moteur ni nouvelles récompenses. Le Prompt 5 complet n’est pas déclaré terminé.

## V4 — Commerces (Prompt 4)
- [x] Conserver les commerces et catalogues existants : entrée liée à la carte, rayons tactiles, comparaison de deux produits et photos du concessionnaire ; aucun faux horaire ni faux client.
- [x] Fiabiliser panier conservé pendant la navigation, scan puis confirmation explicite, reprise avec la même clé et maintien des articles non payés.
- [x] Afficher les tickets depuis les commandes enregistrées, accessibles dans l’historique, et les destinations de possessions existantes.
- [x] 502 tests réussis : succès, échec partiel, reprise et double appui couverts ; compilation OK. Ouverture protégée contrôlée à 390×844 et 1280×1800 sans erreur ni débordement.
- [ ] Essai du parcours complet avec personnage et achats sur VPS : accès aux commerces redirigé vers la connexion dans l’aperçu, compte personnel non disponible.

## V4 — Smartphone (Prompt 3)
- [x] Réorganiser le téléphone : heure du jeu, applications, retour et accès aux systèmes existants.
- [x] Charger les données nécessaires à l’application ouverte, préserver le cache et les conversations enregistrées.
- [x] Améliorer Messages, notifications, Banque et suivi du travail sans inventer d’événements.
- [x] Vérifier les 499 tests : tous réussis, compilation OK ; accès protégé contrôlé sur ordinateur et mobile sans erreur ni débordement.
- [ ] Vérifier le téléphone avec le personnage sur mobile et VPS : aucun compte correspondant à l’utilisateur dans l’aperçu, ouverture redirigée vers la connexion.

## V4 — Socle visuel et UX (Prompt 2)
- [x] Harmoniser contrôles, typographie, états et animations légères.
- [x] Clarifier accueil, contexte, navigation, téléphone, carte et notifications sans nouvelles requêtes.
- [x] Harmoniser le socle produits/panier, logement/garage, travail/missions, politique et espaces administratifs/financiers, sans reconstruire leurs systèmes.
- [x] Vérifier les 492 tests et les pages publiques à 390×844 / 768×1024 / 1280×1800 : aucun débordement ni erreur navigateur ; compilation OK.
- [ ] Contrôle visuel connecté et opérations principales : accès aux pages de jeu redirigé vers la connexion, aucun compte personnel correspondant disponible pour une session automatique.
- [ ] Vérification avec personnage sur VPS : compte personnel absent de l’aperçu ; paiements et opérations réelles non exécutés ici.

Règle V2 : améliorer toutes les fonctionnalités existantes (aucune nouveauté sauf nécessité). Le jeu doit ressembler à un jeu, pas à un logiciel.

## Déjà fait
- [x] Intérieurs réalistes et interactifs : pompiers, police, gendarmerie, SAMU, Protection civile, avec sons
- [x] Scène de manifestation réaliste (banderole, foule, mégaphone)
- [x] Images prêtes (pas encore affichées) : 5 villes (Paris, Lyon, Marseille, Bordeaux, Lille) + 5 tuiles d'accueil

## À faire
- [x] 1. Écran principal façon jeu : grande image de la ville (jour/nuit), personnage, jauges, grosses tuiles illustrées
- [x] 2. Personnages : humeur, bulles, tenue de service selon le métier
- [x] 3. Travail : décor et journée jouée pour chaque métier ; relier le matériel du véhicule aux choix d'intervention
- [x] 4. Véhicules perso, bus, train, car : intérieurs réalistes, trajet animé
- [x] 5. Espaces CAF / France Travail / ameli / Banque / Poste / Impôts / Préfecture : guichet ou ordinateur, courriers animés
- [x] 6. Ville, logements, Mairie / Assemblée / Élysée, JT façon chaîne d'info, accueil du site pour la promo  (accueil promo fait)
- [x] 7. Boutique d'objets de style (0122 prête, attend installation par Alex) : Stripe du compte d'Alex, accord parental par email Amen, le parent paie. Objets portés sur l'avatar (accueil, carte, profil). Passage clé live : à faire par Alex.
- [x] Discussion avec un habitant : réponse IA locale adaptée au métier et à la situation
- [x] Vraie carte des villes et de la France (à installer sur le VPS avec setup-map.sh)
- [x] A. Guichets/ordinateurs CAF, France Travail, ameli, Banque, Poste, Impôts, Préfecture + arrivée des courriers
- [x] B. Intérieurs voiture/bus/train/car + trajet animé sur la vraie carte
- [x] C. Décor par métier + journée jouable avec choix + matériel du camion en intervention
- [x] D. Intervention : le joueur décrit son action, l'IA locale décrit la réaction (récit seulement, aucun effet sur le jeu)
- [x] E. Magasins sur la carte (0120 installée) : fiche, intérieur avec rayons, accès Boutique
- [x] F. Décisions Mairie/Assemblée/Élysée (0121 prête, attend installation par Alex)
- [x] G. Planificateur IA : le joueur décrit son envie, l'IA locale propose activités + itinéraire parmi les vrais lieux
- [x] H. Tenues et cadres portés visibles sur le profil public des autres joueurs (0123 prête, attend installation)
- [ ] I. Faire découvrir le jeu (réseaux sociaux) — après G et H
- [x] J. Page publique « Découvrir » + lien d'invitation à partager
- [x] K. Grand prompt récapitulatif pour ChatGPT (fichier dans Files)

## V3 Chantier 3 — compléments
- [x] L. Jauge d'essence liée aux trajets voiture + stations-service pour faire le plein
- [x] M. Scène de contrôle technique : vérifier le véhicule, régler les défauts
- [x] N. Trajets jouables pompiers / police / SAMU avec véhicules et destinations de mission
- [x] O. Stations-service comme lieux sur la carte de la ville, avec action « faire le plein »

## V3 Chantier 4 — Métiers
- [x] 1. Journée commune : prise de service, préparation, fin de service + salaire reçu
- [x] 2. Secours : pompier, police, gendarmerie, SAMU, Protection civile
- [x] 3. Concessionnaire : showroom, clients pendant la journée
- [x] 4. Autres métiers : lieu, outils, collègues, pauses, téléphone

## V3 Chantier 5 — Logement
- [x] 1-4. Vue de Chez moi, placement au doigt, visites/déménagement, vie à la maison
- [x] P. Inviter des amis à visiter son logement (serveur)
- [x] Q. Clients du showroom qui achètent vraiment (stock + ventes)
- [x] K. Récapitulatif avant achat à crédit (maison/voiture)
- [x] L. Marque du lieu de travail sur la carte
- [x] M. Historique du patrimoine sur 6 mois (courbe)
- [x] N. Meetings de campagne au lieu choisi sur la carte + invitation des habitants
- [x] O. Annonces de campagne publiées dans les actualités politiques
- [x] P. Vérifier sur téléphone : app Politique, pages de partis, calendrier électoral, bandeau d'accueil

- [x] Badge promo dans la liste des entreprises (clients)
- [x] Réputation par domaine dans le profil

## En attente de décision (V3 gelée)
- [x] Bloc 16 — centre « Mes services publics » + recherche de démarches (V3 rouverte)
- [x] Tableau de bord des promotions (clients, ventes, avis)
- [x] Espace CAF à onglets (paiements, droits, documents, messages, rendez-vous) + suivi des demandes
- [x] Bloc final V3 : tests complets + contrôle sécurité, V3 fermée, idées dans V4-BACKLOG.md
- [x] Rendez-vous CAF (créneau, confirmation, à venir)
- [x] Bloc 17 : abonnement VIP 2,99 €/mois (badge, objets exclusifs, thèmes, 24 favoris, accord parental, résiliation)
- [x] Horloge : 0134 préparée ; date/heure françaises à l’installation, ×5 exact, voyages VIP ×8 ; tests isolés réussis. Activation sur VPS attend installation par Alex.
- [ ] Achat : réparation privée VPS préparée et testée ; attend exécution par Alex puis vérification jusqu’à l’ouverture du paiement (aucun achat réel testé).
- [x] Banque, Retraite, Patrimoine : guichets, commentaires adaptés et documents fictifs réalistes.
- [x] Frise pour relevés bancaires/date cible ; montants rapides 10 €, 50 €, 100 € pour virements, épargne et découvert. Tests réussis.
- [x] Signalement mairie : « Choisir un lieu » rétabli ; transmission de l’identifiant testée.
- [ ] Contrôle visuel des trois espaces avec personnage et signalement réel : connexion dans l’aperçu nécessaire, accès actuel redirigé vers auth.
- [x] Vitesse commune ×4 et trajets VIP ÷8 : indicateur réel ajouté, 0135 préparée ; tests SQL isolés réussis, heure existante préservée.
- [x] Conseillère financière IA locale : trois espaces intégrés, instantané privé sans règlement automatique (0136), validation testée.
- [x] Banque immersive : cinq agences à adresses vérifiées et distributeurs fictifs, retraits/dépôts conservant compte + espèces (0137), confidentialité et rejeu testés dans une base isolée.
- [ ] Installation VPS 0135 → 0136 → 0137 : attend exécution par Alex, après les prérequis 0133/0134 déjà fournis.
- [ ] Vérification avec personnage : connexion dans l’aperçu nécessaire ; aucune identité correspondante disponible pour la vérification automatique.
- [ ] Réponse IA réelle : Ollama absent de l’aperçu ; attend installation puis essai sur le VPS.
- [x] Historique bancaire : filtres de dates et types, reçus enregistrés consultables après dépôt/retrait ; 14 tests réussis, aucune nouvelle installation SQL.
- [ ] Vérification des reçus avec personnage : aucun compte correspondant dans l’aperçu ; essai dépôt/retrait sur VPS après mise à jour.

## Lancement
- [x] Connexion iPhone : plusieurs appuis sur « Se connecter » nécessaires + lenteur des pages
- [ ] Bot Discord (plan approuvé) : accueil, actualités, commandes, annonces
- [x] Magasin : 69 photos de familles couvrant le catalogue généré et les articles historiques, animations, aperçu en pièce témoin et déballage après achat confirmé ; 15 tests réussis. Photos distinctes par variante et aperçu dans le logement réel non réalisés.
- [x] Boutique argent réel : aperçu animé des cosmétiques sur le personnage, y compris tenue/cadre VIP.
- [x] Page de présentation VIP améliorée, règles et parcours de paiement conservés.
- [ ] Contrôle connecté des achats et du VIP : l’aperçu redirige vers la connexion, aucun compte personnel disponible ; essai avec personnage requis sur VPS.
