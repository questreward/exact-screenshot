# P2 — Des personnages fictifs vivants

## Ce que vous verrez
- Les 78 habitants fictifs des 5 villes ont une journée qui suit l'heure du jeu : maison la nuit, travail ou études en journée, café ou parc à midi, sortie le soir. Le week-end, leur programme change.
- Sur la fiche de chaque lieu de la carte, une partie « Personnes présentes » montre qui est là maintenant. Un bouton permet d'aller lui parler, avec les rencontres qui existent déjà.
- Parfois, quand vous êtes dans le même lieu qu'un habitant que vous connaissez, il vous écrit un petit message dans le Téléphone (« Tiens, tu es aussi au café ? »). Il n'y a aucune récompense, et au plus un message par habitant et par jour.
- Environ une fois tous les dix jours, un habitant part en train un jour dans une autre ville. Ce jour-là, il est à la gare, puis dans l'autre ville. Il rentre chez lui le soir.
- Les élus et responsables fictifs passent aussi à la mairie ou au siège de leur parti.

## Ce qui ne change pas
Argent, salaires, élections, lois, événements (81), horloge, et toutes les règles déjà validées. Les habitants fictifs ne votent pas davantage et ne gagnent rien.

## Comment ça marche, simplement
L'emploi du temps est calculé à partir de l'heure du jeu, comme une grille fixe, sans tâche lancée en continu sur le serveur. Votre serveur reste léger, et chacun voit les mêmes habitants au même endroit.

## Étapes
1. Je vous présente le texte exact de l'installation pour la base, puis j'attends votre accord.
2. Vous lancez une seule ligne sur le serveur : tout s'installe, ou rien.
3. J'ajoute « Personnes présentes » sur la carte et les messages spontanés dans le Téléphone.
4. Tests automatiques, puis mise à jour du site avec votre ligne habituelle.

## Détails techniques
- Migration `vps/migrations/0046_p2_npc_life.sql`, uniquement des ajouts, dans une seule transaction :
  - table de réglages `npc_life_settings` (heures des créneaux, fréquence des voyages, plafond des messages), avec lecture seule pour les joueurs ;
  - table `npc_routines` (un profil de journée par habitant : domicile, lieu de travail ou d'études, lieux de loisir), remplie à partir de `social_npcs`, des quartiers et des types de lieux ;
  - fonction `npc_location_at(npc, at)`, stable et déterministe : créneau horaire + petit tirage fixe qui dépend de l'habitant et du jour → lieu ; voyage si le tirage du jour tombe sur un voyage (destination parmi `intercity_routes`) ;
  - RPC `location_presence(_location_id)` (SECURITY DEFINER) : habitants présents maintenant selon `game_now()` ;
  - les messages spontanés réutilisent `comm_push`, avec une clé unique par habitant, par joueur et par jour. Ils partent uniquement à la lecture de la présence, si le joueur est physiquement dans le lieu et connaît déjà l'habitant (`social_relations`).
- Le front ajoute `locationPresenceQuery` dans `src/services/game.ts` et une liste dans `WorldMap.tsx`.
- Les tests vérifient que l'emploi du temps est le même pour une heure donnée, qu'il y a au plus 1 message par jour et aucun gain d'argent ou de statistiques, et que les 81 événements sont intacts.
