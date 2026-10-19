# Législatives réelles : 577 circonscriptions, deux tours, base 2024

## Ce que le joueur verra
- Une vraie Assemblée de **577 députés**, chacun lié à une circonscription de la carte de France.
- Au départ, l'Assemblée reprend les **résultats réels des législatives 2024** : chaque circonscription a le parti qui l'a gagnée. Les élus sont des **personnages inventés** avec l'étiquette du vrai parti. On n'utilise jamais le nom de vrais députés, pour des raisons légales et de vie privée.
- Sur la carte « France », chaque circonscription se colore selon le parti du député. Toucher une circonscription ouvre une fiche : député sortant, résultats 2024, candidats, vote.
- **Élections** : 7 jours de candidatures, 1er tour, puis 2e tour 3 jours plus tard.
  - Au 1er tour, un candidat est élu tout de suite avec plus de 50 % des voix et au moins 25 % des inscrits.
  - Sinon, les candidats qui ont au moins 12,5 % des inscrits passent au 2e tour (toujours au moins les 2 premiers).
- **Un joueur peut se présenter n'importe où.** Il fait campagne avec le système de campagne qui existe déjà. Les joueurs votent dans la circonscription où ils habitent.
- **Électeurs simulés** : les voix partent des scores 2024 de chaque parti dans la circonscription. Elles bougent ensuite avec la campagne, les manifestations, la popularité nationale et les lois votées. Le vote des joueurs compte en plus, comme pour les municipales.
- Les 577 élus forment les groupes à l'Assemblée. Majorité : **289 sièges**. Les lois, les votes et le gouvernement fonctionnent ensuite avec ces 577 sièges.

## Étapes (chacune installée en un seul bloc, ou rien ne change)
1. **Données** : récupérer les résultats officiels 2024 (data.gouv.fr) pour les 577 circonscriptions, avec les scores par parti aux deux tours. Ajouter les 18 circonscriptions qui manquent sur la carte (outre-mer et Français de l'étranger) dans une liste.
2. **Base, partie 1** : partis réels (nouvelles organisations « parti national »), 577 circonscriptions, résultats 2024, et l'Assemblée de départ avec 577 députés inventés.
3. **Base, partie 2** : passer l'Assemblée de 50 à 577 sièges et la majorité de 26 à 289. Calendrier à deux tours, dépouillement, puis formation des groupes. L'Assemblée actuelle de 50 sièges est archivée, pas effacée.
4. **Écrans** : carte colorée par parti, fiche de circonscription, candidature partout, vote aux deux tours, hémicycle de 577 sièges, résultats le soir de l'élection.
5. **Tests** : dépouillement et seuils des deux tours, majorité à 289, vote unique par joueur et par tour, scénario complet sur une copie de la base de ton serveur.

## Points d'attention
- L'étape 3 modifie le Parlement déjà installé (Bloc 15). Ce sera le plus gros changement de base depuis le début. Je te montrerai le texte exact, j'attendrai ton accord, et je testerai d'abord sur une copie de ta base.
- Le Sénat (25 sièges) ne change pas.
- Les 100 vraies lois et les lois en cours sont conservées. Les votes en cours seront recomptés avec la nouvelle Assemblée.

## Détails techniques
- New tables: `national_parties_real` (nuance code → organization), `legislative_constituencies` (577, code dept-num, map id, city link nullable), `legislative_baseline_2024` (constituency, nuance, round, votes, registered), `legislative_rounds`, `legislative_candidacies`, `legislative_ballots` (unique election+round+character), `legislative_results`.
- Bloc 15 change in step 3: drop/replace the CHECKs `assembly_seats=50`, `assembly_majority=26` and `seat_no<=50`. `national_seats.city_id` becomes optional; a new `constituency_code` is added. `national_count_election` is extended for two rounds. Senate composition stays the same.
- Simulated vote: 2024 share per nuance × (1 + campaign/pressure/popularity modifiers), deterministic via hashtext on election+constituency; players weighted at 2 % of registered voters, as for municipal elections.
- Map: `circonscriptions.json` is joined to `legislative_constituencies` through the circonscription code; colors come from the nuance table.
- Data tool: `vps/tools/build_legislatives_2024.py` generates `vps/migrations/0057_*.sql` and `0058_*.sql`.
