# P5b — Assurances

## Le principe
Aujourd'hui, aucun événement du jeu ne fait perdre d'argent : sans pépins, l'assurance ne servirait à rien. P5b ajoute donc des **imprévus personnels** (les sinistres) et les **assurances** qui les couvrent.

## Les imprévus (pour tous les joueurs, assurés ou non)
Chaque semaine de jeu, le jeu tire au sort, de façon fixe et identique pour tous, si un imprévu vous arrive :

| Type | Exemple | Chance par semaine | Coût |
|---|---|---|---|
| Habitation | Dégât des eaux, serrure cassée | 8 % | 250 à 600 |
| Santé | Grippe, soins dentaires | 10 % | 80 à 300, et −20 d'énergie |
| Accident | Chute à vélo, accrochage en voiture | 6 % (10 % si vous avez un véhicule) | 150 à 900 |

- **Sans assurance** : vous payez tout (compte, puis découvert). Si ce n'est pas possible, la somme impayée reste une dette « imprévu » et fait baisser la note bancaire de 5 points.
- **Avec assurance** : vous ne payez que la **franchise** ; l'assureur paie le reste. Remboursement immédiat, sans démarche.
- Une notification explique chaque imprévu et ce qui a été payé.

## Les assurances

| Contrat | Prix par mois de jeu | Franchise | Plafond par imprévu |
|---|---|---|---|
| Habitation | 15 | 50 | 1 000 |
| Santé (mutuelle) | 20 | 20 | 500 |
| Accident | 12 | 50 | 1 500 |
| Pack complet (les trois) | 40 | identiques | identiques |

- Souscription immédiate. La couverture commence **3 jours de jeu après** la souscription, pour qu'on ne puisse pas s'assurer juste après un imprévu.
- Cotisation prélevée chaque mois de jeu, comme le prêt. Une cotisation impayée suspend le contrat jusqu'au paiement suivant.
- Résiliation possible à tout moment, sans remboursement du mois en cours.
- Dès 16 ans.

## Écrans
Dans **Patrimoine** et l'appli **Banque** :
- les contrats proposés, avec leur prix et ce qu'ils couvrent ;
- vos contrats en cours ;
- l'historique de vos imprévus : coût, part remboursée, part payée.

## Détails techniques
- Migration `vps/migrations/0050_p5b_insurance.sql`, ajouts uniquement, BEGIN/COMMIT, contrôles finaux.
- Tables : `insurance_settings`, `insurance_products` (valeurs ci-dessus), `insurance_contracts`, `insurance_premiums` (clé unique par mois), `incident_types`, `incidents` (clé unique personnage + semaine + type).
- Tirage déterministe : hashtext(personnage, semaine, type), sans tâche planifiée ; réglé à la lecture, comme le loyer et le prêt.
- Paiements via `bank_pay` et `economy_cash` (clés uniques). La part non payée est notée dans `incidents.unpaid` ; elle n'est pas ajoutée à `economy_cash`, qui ne change pas.
- Le remboursement de la dette « imprévu » se fait automatiquement, comme le découvert, quand le compte le permet.
- Aucune fonction existante modifiée.
- Écran : `InsuranceCard` dans Patrimoine et la Banque ; tests du calcul franchise/plafond.
