# Grande étape 3D — plan complet

Principe : la 3D montre et fait entrer dans les lieux ; tous les achats, ventes et déplacements restent faits par les opérations sécurisées existantes (aucune règle, aucun prix, aucune donnée joueur changés). Chaque étape est livrée seule, testée, et installable sur le VPS.

## Étape 1 — Socle d'intérieurs (fondation)
- Un seul « moteur de lieu » : une pièce 3D chargée à la demande, construite à partir d'une description (murs, sol, meubles, points d'intérêt).
- Système d'interaction générique : s'approcher d'un objet affiche un bouton (Regarder, Acheter, Payer, Sortir) ; aucune interaction codée à la main par lieu.
- Transition rue → porte → intérieur en fondu ; sortie ramène devant la porte.
- Réglage qualité (Auto / Légère / Belle) appliqué aussi aux intérieurs.

## Étape 2 — Supérette 3D (premier commerce complet)
- Rayons avec les familles de produits réelles du catalogue, PNJ caissier et clients.
- Toucher un produit = fiche + « Ajouter au panier » (panier existant).
- Caisse 3D reliée à la caisse actuelle (scan, confirmation, ticket enregistré).

## Étape 3 — Boutique de vêtements et magasin de meubles
- Portants / meubles exposés, aperçu sur le personnage ou dans le logement (aperçu illustratif seulement).
- Achat via la boutique existante ; l'objet acheté apparaît ensuite chez soi.

## Étape 4 — Concessionnaire
- Hall avec véhicules exposés, tourner autour, s'asseoir dedans (intérieur existant), essai sur la rue.
- Achat via l'opération sécurisée existante ; le véhicule possédé apparaît garé devant le logement.

## Étape 5 — Logement explorable
- Intérieur 3D du logement réel (plan enregistré), meubles achetés placés selon leur disposition enregistrée.
- Mode placement des meubles utilisant l'enregistrement de disposition existant.

## Étape 6 — Bâtiments publics et métiers
- Mairie, banque, poste, commissariat, caserne, hôpital, école : hall 3D + guichet qui ouvre les actions existantes.
- Véhicules de service garés à la caserne / au commissariat, utilisés pour les missions déjà enregistrées.

## Étape 7 — Ville vivante
- Plusieurs rues reliées, vitrines éclairées, restaurants/cafés/pharmacie, PNJ avec routines existantes, météo enregistrée (pluie/neige), sons d'ambiance.

## Ce qui reste hors de ce plan
- Reproduire la vraie carte de chaque ville en 3D (trop lourd pour les téléphones).
- Achats ou effets inventés par la 3D : jamais.

## Technique
- Modèles CC0 (Kenney : furniture-kit, food-kit, car-kit, city-kit) dans public/models, chargés à la demande par lieu.
- Description de lieux en données pures testées ; un composant R3F commun `Interior3D` + `useProximity`.
- Budget mobile : < 100 appels de dessin, ombres coupées en qualité Légère.
