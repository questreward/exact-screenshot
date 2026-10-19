# P3 — Organisations avancées

## Ce que vous pourrez faire
- **Fonder** une association, un mouvement ou un parti politique dans votre ville. Vous choisissez son nom, son symbole, sa description et son siège (un lieu de la ville). Frais de dépôt payés une seule fois : **200 crédits**.
- **Conditions** : avoir 18 ans pour fonder un parti, 16 ans pour le reste, et ne pas avoir fondé plus d'une organisation de chaque type.
- **Caisse de l'organisation**, totalement séparée de votre argent personnel. Elle a son propre historique, visible par les membres :
  - les cotisations, prélevées chaque semaine de jeu : 5 crédits par membre joueur actif (seulement s'il en a les moyens, sinon il ne doit rien), et 2 crédits par habitant fictif membre, versés par la simulation ;
  - les dons du fondateur et des membres, de leur argent personnel vers la caisse, sans pouvoir les reprendre ;
  - les événements : quand l'organisation organise une réunion ou une action, chaque participant rapporte un petit montant.
- **Dépenses de la caisse** : seulement pour organiser des événements (un coût fixe par événement). Aucun retrait vers un compte personnel.
- **Membres** :
  - les autres joueurs peuvent adhérer ou partir avec les boutons qui existent déjà ;
  - les habitants fictifs rejoignent peu à peu selon la réputation de l'organisation et ses événements, au plus 2 par semaine.
- **Faire grandir** : la réputation et l'influence de l'organisation montent avec les événements réussis et les membres. Trois niveaux : Naissante, Établie, Influente.
- **Parti créé par un joueur** : il peut présenter des candidats aux élections municipales de sa ville. Il n'entre pas aux élections nationales en cours, déjà figées. Il pourra y participer aux suivantes, dans une prochaine étape.
- **Rôles** : Fondateur, Responsable, Membre. Le fondateur nomme les responsables, et les responsables peuvent organiser des événements.

## Ce qui ne change pas
Les organisations, partis et mouvements fictifs existants, les élections déjà en cours, l'argent personnel en dehors des opérations choisies, les 81 événements et l'horloge.

## Étapes
1. Texte exact de l'installation présenté, puis votre accord.
2. Une ligne à lancer sur le serveur (tout ou rien).
3. Écrans : « Fonder une organisation », page de gestion (caisse, membres, rôles, événements), dons.
4. Tests, puis mise à jour du site.

## Détails techniques
- Migration `vps/migrations/0047_p3_advanced_orgs.sql`, uniquement des ajouts :
  - `org_settings` : frais, cotisations, coût des événements, plafonds, seuils de niveau ;
  - `organizations` reçoit les nouvelles colonnes `founder_character_id` et `player_created` ; `memberships.role` accepte `founder` et `manager` ;
  - `org_treasuries` (1 par organisation créée) et `org_ledger` (clé d'opération unique, montants signés). L'argent personnel passe seulement par `economy_cash`, avec une clé unique ;
  - RPC sécurisées avec verrou du personnage : `found_organization`, `donate_to_organization`, `set_member_role`, `create_org_event` (réutilise `organization_events` et l'agenda) ;
  - `settle_organizations(_org)` est appelé à la lecture : cotisations hebdomadaires et adhésions fictives, avec des clés uniques par semaine, rien de doublé à la reconnexion ;
  - partis joueurs : `political_profiles` et `political_branches` sont créés à la fondation. L'éligibilité municipale réutilise les contrôles existants. Aucun ajout à `national_party_profiles`.
- Front : `orgQueries` et mutations dans `src/services/game.ts`, plus une page de gestion sous `/organisations/$id`.
- Tests : frais payés une seule fois, don impossible au-delà du solde, aucun retrait personnel, cotisations non doublées, plafond de 2 adhésions fictives par semaine, municipales ouvertes aux partis joueurs, élections nationales intactes.
