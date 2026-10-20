# CIVITAS — Protection civile et catalogue : SQL exact avant installation

## État constaté
Le rapport VPS reçu à 18:37 confirme 62 produits, une sauvegarde complète et une restauration isolée des données du jeu (sans pg_cron). L’essai 0114 a échoué et n’a rien installé : des droits par défaut accordaient des écritures directes. Aucun accès à ce VPS n’est disponible ici ; aucune installation ni vérification connectée du jeu ne peut être annoncée.

## 0114 corrigé
SQL exact : `vps/migrations/0114_volunteer_dossier.sql`.

Trois tables nouvelles : antennes `volunteer_branches(city_id,label)`, historique privé `volunteer_attachments(id,ordinal,character_id,city_id,request_id,attached_at)` et notes privées `volunteer_notes(shift_id,character_id,note,created_at)`. Trois fonctions nouvelles : `volunteer_dossier_state`, `volunteer_attach`, `volunteer_save_note`. Une antenne fictive par ville ; notes de 1–2 000 caractères sur les services personnels clôturés, sans modification ultérieure. Lectures privées et écritures par fonctions sécurisées seulement. Retrait explicite des droits hérités sur ces nouveaux objets, sans changer les droits par défaut globaux. Aucun paiement, salaire, mission ou récompense modifié.

## 0115 catalogue
SQL exact, contenant chaque ligne littérale : `vps/migrations/0115_catalogue_10000.sql` (environ 4,7 Mo).

- INSERT de **9 938 articles** dans `economy_catalog` avec ID, nom, kind, category, price, energy_cost, location_kind, config et sort_order. Marques fictives ; capacité, taille, construction et équipement distincts. Rubriques existantes et magasins existants conservés ; pas de faux nouveaux magasins.
- Prix de base validés : petits objets 5–100 €, vêtements/sport 10–500 €, mobilier 25–3 000 €, électronique/électroménager 20–3 000 €. Promotions existantes inchangées.
- Les 62 produits existants sont comparés intégralement avant/après et restent identiques. Les voitures/logements comptent dans ces 62, sans ajout artificiel.
- Nouvelle lecture sécurisée `shop_catalog_page` : recherche, marque, rubrique, budget, tri et pages de 24, maximum 48. Comptage global SQL, pas de limite de 1 000 fiches appliquée au total.
- Deux index ajoutés : section/ordre du catalogue et produit des commandes.
- `shop_state` : seule la sélection des produits change, pour garder les anciens produits, envies et promotions sans envoyer les 10 000 fiches au téléphone. Le corps installé est contrôlé avant modification ; version différente = arrêt et annulation de toute la migration. Argent, historique, crédit et achats restent inchangés.
- Aucun nouvel effet de jeu associé aux produits. Achats, possession unique, revente et paiements restent les fonctions existantes.
- BEGIN/COMMIT et contrôles bloquants : départ de 62, ajout de 9 938, arrivée à 10 000, prix conformes, anciens produits inchangés. Une réexécution est refusée, jamais compensée par suppression.

## Essai préalable groupé, sans installation
Examiner les deux fichiers SQL exacts avant de lancer :

```bash
cd /data/civitas-live/app &&
git pull --ff-only &&
bash vps/tools/prepare_v1_installations.sh
```

Crée une nouvelle sauvegarde privée, restaure dans une copie temporaire en excluant cron de cette copie seulement, teste 0114 puis 0115 avec ROLLBACK et supprime uniquement la copie. Aucun redémarrage du jeu. Envoyer la sortie jusqu’à « Les deux essais ont réussi ». L’installation réelle sera donnée après ce résultat et l’accord sur le SQL exact ; ne pas installer malgré une erreur.

## Contrôles locaux réalisés
- 0114 sur base jetable avec droits par défaut volontairement larges : migration réussie et essais de confidentialité, notes, historique et absence de paiement réussis.
- 0115 sur base jetable : INSERT 9 938, total 10 000, anciens produits inchangés, premières/dernières pages, filtres, absence de chevauchement, accès anonyme refusé, envies conservées, état compact.
- Six tests des nombres, caractéristiques et fourchettes de prix ; essais boutique/comptes rendus existants réussis.

Ces contrôles ne valent pas installation ni parcours sur le VPS.

## Vérification en jeu après installation et mise à jour du site
Avec un personnage volontaire : choisir une antenne, enregistrer, quitter/revenir, vérifier le rattachement ; terminer un service réel enregistré, conserver une note, revenir et relire sans duplication. Avec un autre compte, vérifier que notes et rattachements ne sont pas exposés. Boutique : total 10 000, page suivante, recherche d’une famille, filtre rubrique/budget, achat existant et relecture du bien après reconnexion. Aucun service, incident ou paiement ne doit être créé pour faire semblant de tester.