# Autres services + plan « Monde mis en scène »

## Partie A — Les 4 nouvelles entreprises (à construire, 4 installations)

Une installation par entreprise, dans cet ordre, chacune testée avant de passer à la suivante. Toutes réutilisent ce qui existe : caisse de l'entreprise, paiements sécurisés, tarif 70–150 %, clients fictifs chaque semaine, entreprise fictive si aucun joueur n'en tient une dans la ville.

1. **Concessionnaire (0084)**
   - L'entreprise achète des voitures du catalogue en stock (prix de gros, pris dans sa caisse).
   - Elle fixe son prix de vente (70–150 % du prix catalogue).
   - Les joueurs achètent chez elle (comptant ou à crédit, comme aujourd'hui).
   - Reprise : un joueur revend sa voiture au concessionnaire, qui la remet en vente d'occasion.
   - Pas de concessionnaire joueur dans la ville : la boutique actuelle sert de concession fictive.

2. **Construction (0085)**
   - Le propriétaire d'un bien commande une **rénovation** (état et valeur en hausse) ou un **agrandissement** (valeur et loyer de référence en hausse).
   - Un devis est payé à la commande, puis les travaux durent quelques jours. Le résultat arrive à la fin des travaux, une seule fois.
   - Interdit pendant une location en cours (pour l'agrandissement) afin de ne pas changer un bail signé.

3. **Recrutement (0086)**
   - L'agence propose des candidats (joueurs qui cherchent un emploi et habitants fictifs) aux entreprises qui ont une offre ouverte.
   - À chaque embauche réussie par l'agence, l'entreprise lui verse une prime (caisse → caisse), une seule fois par embauche.

4. **Assurance joueur (0087)**
   - Un joueur crée une compagnie et fixe ses cotisations (70–150 % du tarif de référence) pour l'auto et l'habitation.
   - Les cotisations vont dans la caisse de l'assureur ; les sinistres sont payés par cette caisse.
   - Caisse insuffisante : l'assurance fictive paie le reste, le client n'est jamais pénalisé.
   - Un dépôt de garantie minimum est exigé pour ouvrir.

Règles chiffrées (prix de gros, primes, durée des travaux, dépôt d'assurance…) : je te les propose avant chaque installation, comme d'habitude.

## Partie B — Monde mis en scène (plan seulement, rien construit maintenant)

Le serveur décide toujours ce qui se passe ; les scènes ne font que le montrer.

- **Étape 1 — Importance des événements** : chaque événement reçoit un niveau de 1 à 5 (quotidien → historique). Ce niveau décide de la mise en scène : simple notification, article, sujet au JT, grande séquence.
- **Étape 2 — Scènes illustrées** : une scène composée (lieu, foule petite/moyenne/grande, météo, heure, banderoles) pour les manifestations, crises, élections et grands événements. Images légères stockées sur ton serveur, adaptées au téléphone.
- **Étape 3 — JT enrichi** : chaque sujet du JT utilise la scène de l'événement réel au lieu de deviner le thème depuis le titre ; interviews de joueurs et d'habitants pour les niveaux 4 et 5.
- **Étape 4 — Ville vivante** : la météo et les grands événements changent l'ambiance de la carte (passants, rues bloquées pendant une manifestation).
- **Étape 5 — Archives** : les événements historiques restent consultables et rejouables.

Étapes 1 à 3 en premier ; 4 et 5 ensuite. Aucune scène violente ou choquante.

## Détails techniques

- Nouveaux secteurs dans business_sectors : concession, construction, recrutement, assurance ; ajout aux listes de service_settle / service_set_price / service_state par bloc DO vérifié, comme 0082.
- Concession : tables dealer_stock et dealer_trade_ins ; achat via service_pay + création de personal_assets ; crédit via le moteur purchase_credits existant.
- Construction : table construction_jobs (devis, début, fin, appliqué une fois) ; effet sur personal_assets.condition et config de valeur / loyer de référence.
- Recrutement : table recruit_placements unique par embauche ; prime via business_move entre deux caisses.
- Assurance : tables insurer_profiles, insurer_contracts ; branchement dans insurance_settle (sinistre payé par business_move, reste par l'assureur fictif).
- Scènes : colonne importance sur events, table scene_assets (variantes), sélection côté serveur dans les sujets TV.
- Chaque fichier : une seule transaction, contrôles finaux, testé sur base jetable.
