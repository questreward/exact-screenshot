# P5 — Économie avancée (découpée en 4 sous-étapes)

Vous avez tout choisi, et en version complète. C'est le plus gros chantier depuis le début : on le livre en 4 morceaux. Chacun est installé, essayé et validé avant de passer au suivant.

```text
P5a Banque (prêt, découvert, impayés, saisie)
  -> P5b Assurances
  -> P5c Entreprises détaillées
  -> P5d Impôts des entreprises
```

La saisie d'une entreprise ne sera active qu'à partir de P5c, quand les entreprises existeront.

## P5a — Banque (première livraison)

**Prêt personnel**
- Montant de 500 à 20 000 crédits, plafonné à 6 fois le revenu mensuel (salaire ou bourse).
- Durée de 3 à 24 mois de jeu, taux fixe de 4 % par an (5 % pour les moins de 18 ans, montant limité à 1 000).
- Mensualité prélevée automatiquement chaque mois de jeu ; remboursement anticipé possible sans frais.
- Un seul prêt à la fois.

**Découvert**
- Autorisé jusqu'à 300 crédits (0 pour les moins de 18 ans).
- Frais de 1 crédit par jour de jeu passé à découvert.
- Le solde ne peut jamais descendre sous la limite.

**Note bancaire (0 à 100, départ 70)**
- +2 par mensualité payée à l'heure.
- −10 par mensualité impayée, −1 par semaine à découvert.
- En dessous de 40 : plus de nouveau prêt ni de découvert.

**Impayés**
- Mensualité impayée : frais de retard de 5 % ; nouvel essai le lendemain.
- 3 impayés de suite : saisie. La banque vend le bien le plus cher (patrimoine) à 70 % de sa valeur pour couvrir la dette. Sans bien : la dette reste due et le compte est bloqué pour les nouveaux achats.
- Une notification prévient avant chaque étape.

**Écrans** : dans **Patrimoine** et l'appli **Banque** du téléphone : demander un prêt (simulation de la mensualité avant de signer), suivre le prêt, voir la note bancaire et le découvert.

## Ensuite (présentées en détail le moment venu)
- **P5b Assurances** : habitation, santé, accident ; cotisation mensuelle, remboursement lors d'événements du monde.
- **P5c Entreprises** : création, secteur, local, salariés fictifs, prix, stocks, concurrents fictifs, clients simulés, compte d'entreprise séparé.
- **P5d Impôts des entreprises** : taxe sur les bénéfices et déclaration dans Mes démarches.

## Détails techniques
- Migration `vps/migrations/0049_p5a_bank.sql`, ajouts uniquement, BEGIN/COMMIT, contrôles finaux.
- Tables : `bank_settings`, `loans`, `loan_installments` (clé unique par échéance), `bank_scores`, `bank_seizures`.
- Tout l'argent passe par `economy_cash` (clés d'opération uniques).
- Le découvert ne modifie pas la règle « jamais négatif » des autres paiements : il est géré par une fonction dédiée qui autorise un solde négatif borné. Avant d'écrire, je vérifie comment `economy_cash` refuse aujourd'hui les soldes négatifs ; si ce changement touche une partie validée, je vous le présente à part avant de l'appliquer.
- Échéances et frais calculés à la lecture et à la reconnexion (comme le loyer), jamais par une tâche planifiée.
- Écrans : `BankLoans` dans Patrimoine et la Banque ; requêtes dans `src/services/game.ts` ; tests des calculs de mensualité et de plafond.
