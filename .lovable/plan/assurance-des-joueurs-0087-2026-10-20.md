# Assurance des joueurs — 0087

## Règles validées
- Ouvrir une compagnie d’assurance coûte 5 000 €, selon le fonctionnement existant de création d’entreprise.
- Les cotisations sont ajustables de 70 à 150 % des prix actuels.
- Proposer habitation, santé, accident et pack complet. L’assurance auto reste hors de cette étape.
- Conserver franchises, plafonds, délai d’attente et règles de paiement actuels.
- La caisse de la compagnie paie la part assurée du sinistre. Si elle ne suffit pas, l’assureur fictif complète : aucune charge supplémentaire pour l’assuré.

## Parcours prévu
- Côté assuré : choisir un assureur joueur ou conserver l’assureur fictif ; consulter ses contrats et la prise en charge de ses sinistres.
- Côté entrepreneur : ouvrir sa compagnie, régler ses tarifs et consulter cotisations reçues, indemnisations et caisse.
- Les anciens contrats restent chez l’assureur fictif, sans changement automatique.
- La fermeture d’une compagnie ne supprime pas la protection déjà acquise : prévoir un relais fictif et empêcher les nouvelles souscriptions.
- Le propriétaire voit des informations commerciales et comptables, jamais les détails médicaux ou privés des assurés.

## Réalisation technique
- Préparer une nouvelle migration VPS 0087 atomique : secteur assurance, réglages, rattachement des nouveaux contrats à leur assureur et journal des cotisations et prises en charge.
- Réutiliser les caisses d’entreprise et les fonctions d’assurance existantes. Ne pas modifier les anciennes migrations ni effacer leurs données.
- Préserver les extensions de services 0081–0086 ; conserver les anciens appels de souscription pour les contrats fictifs.
- Les cotisations payées alimentent la caisse du prestataire une seule fois ; les sinistres débitent cette caisse sans solde négatif et enregistrent séparément le complément fictif.
- Verrouiller les opérations et utiliser des clés uniques ; la prise en charge réduit la dépense comme aujourd’hui, sans nouveau virement sur le compte personnel.
- Ajouter les écrans aux accès existants, avec textes français et commandes adaptées au téléphone.

## Contrôles
- Tester ouverture à 5 000 €, tarifs aux bornes 70 et 150 %, cotisations uniques, déficit partiel et total, double lecture d’un sinistre, confidentialité et fermeture.
- Vérifier que les anciens contrats, les autres entreprises et les embauches directes restent inchangés.
- Tester le parcours sur une copie isolée ; la vérification sur le VPS restera distincte après installation.

## Avant installation
Présenter le SQL exact, les tables, colonnes, fonctions et données touchées, ainsi que la raison de chaque changement. Aucune application sur le VPS sans accord d’Alex ; fournir ensuite le fichier et la commande d’installation.

La vérification en jeu du recrutement reste à confirmer ; cette préparation ne le considère pas comme déjà vérifié.