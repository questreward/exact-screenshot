# Aménager chez soi — première livraison

## Ce que tu pourras faire
- Depuis « Logement », ouvrir « Chez moi » pour aménager un bien acheté que tu possèdes. Les locations restent inchangées dans cette première livraison.
- Choisir une pièce et voir son aménagement en vue de dessus, avec des objets illustrés, lisibles sur téléphone.
- Placer, déplacer, tourner et ranger le mobilier compatible déjà présent dans ton inventaire. Sur téléphone : sélectionner un objet, puis toucher son emplacement ; le glisser-déposer n’est pas obligatoire.
- Retrouver les objets disponibles et rejoindre la Boutique pour acheter ceux qui manquent, par les achats actuels.
- Enregistrer les changements et retrouver le même aménagement après une reconnexion ou sur un autre appareil. Les modifications non enregistrées sont signalées avant de quitter.

## Pièces et représentation
- Réutiliser le nombre de pièces connu du bien ; à défaut, proposer un espace unique, sans inventer de chambres, jardin ou dimensions.
- Présenter une disposition de jeu, non un plan immobilier exact ou coté. Les pièces peuvent recevoir un nom choisi par le joueur.
- Les objets sont représentés par des illustrations génériques sans logos ; aucun changement des noms ou prix du catalogue existant.
- Aucun meuble offert ni équipement supposé déjà installé. Un objet non possédé ne peut pas être placé.

## Ce qui reste inchangé
- Aucun nouveau coût de placement, frais, avantage d’énergie, récompense ou hausse de valeur immobilière.
- Aucun changement des achats, crédits, loyers, contrats, déménagements, travaux ou budgets municipaux.
- Pas d’IA ni de service externe obligatoire : les images et les aménagements sont servis par ton VPS.
- Locations, espaces extérieurs, visites des autres joueurs et logements partagés aménageables feront l’objet d’une suite distincte.

## Sauvegarde et sécurité
- Chaque aménagement est privé et lié au joueur et au bien possédé, jamais uniquement au nom du logement.
- Un objet possédé ne peut être placé qu’une fois, même entre plusieurs logements. Le ranger ne le vend pas et ne l’efface pas de l’inventaire.
- Les objets revendus ou les biens qui ne sont plus possédés ne donnent plus accès à leur ancien placement ; aucune modification du paiement ou de la revente.
- Contrôler les emplacements, les collisions et la possession côté serveur. Une sauvegarde concurrente doit être signalée, sans écraser silencieusement un aménagement plus récent.

## Détails techniques
- Réutiliser `personal_assets`, `economy_catalog`, les lectures de logement et les achats sécurisés existants ; ajouter uniquement les métadonnées visuelles et la persistance manquantes.
- Préparer une migration additive contenant les configurations des objets plaçables, les aménagements privés et les fonctions sécurisées de lecture et sauvegarde. Aucun remplacement des fonctions financières existantes.
- Lectures via les options de requête de `src/services/game.ts` ; écran sous le cadre des pages de jeu existantes.
- Présenter séparément le SQL exact, les tables, colonnes, fonctions et données touchées. L’accord sur ce plan autorise la préparation, pas l’application de la migration.
- Installation en une seule transaction avec contrôles, puis commandes directes de mise à jour du VPS, sans téléchargement séparé.

## Vérifications avant livraison
- Bien non possédé, objet non possédé, placement doublé, coordonnées invalides et accès d’un autre joueur refusés.
- Placement, déplacement, rotation, rangement et sauvegarde relus après reconnexion ; conflit entre deux sessions signalé.
- Revente d’un objet et perte de possession du logement sans objet fantôme ni modification d’argent.
- Essais des achats et logements existants concernés ; affichage et manipulation sur téléphone et ordinateur.
- Distinguer les essais sur copie isolée des parcours réellement vérifiés sur ton VPS ; ne pas annoncer une installation ou une sauvegarde réelle non effectuée.