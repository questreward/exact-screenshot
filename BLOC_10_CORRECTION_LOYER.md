# Correction ciblée des loyers — 18 octobre 2026

## Correction appliquée
Migration autorisée `0033_preserve_failed_rent_and_allow_manual_retry.sql` : ajout de `pay_housing_attempt()`, adaptation compatible de `pay_housing()`, aucun changement destructif de schéma et aucune réécriture des anciennes opérations. Une réussite après échec utilise `rent:DATE:retry`, conserve `rent:DATE` en échec et génère un seul débit et une transaction.

L’écran utilise le résultat réel du paiement et tient compte des opérations réussies plutôt que de se fier exclusivement à `last_paid_date`.

## Huit tests réellement exécutés
Suite conservée dans `tests/rent_retry.py`, compte temporaire isolé, horloge commune inchangée.

1. Échec faute d’argent : solde 1 €, loyer 30 €, aucun débit/transaction, échec conservé.
2. Nouvelle tentative le même jour : après réapprovisionnement de test à 200 €, solde 170 €, réussite distincte et transaction de −30 €.
3. Quatre demandes simultanées avant le paiement : exactement une réponse `paid`, trois `already_paid`, une seule réussite et un seul débit.
4. Trois recharges et lecture dans Téléphone → Banque : solde 170 €, une ligne de loyer.
5. Déconnexion et reconnexion via le vrai formulaire : état payé conservé, aucun second débit.
6. Nouvelle tentative après paiement : `already_paid`, données financières identiques.
7. Toutes les valeurs de l’échec initial identiques après paiement ; deux opérations distinctes conservées.
8. Échec automatique existant et ancienne date marquée payée à tort : bouton disponible avant paiement, paiement manuel réel puis état payé, historique conservé.

**Résultat : 8/8 réussis, 0 échec.** Captures vérifiées : échec, paiement, Banque et reconnexion. Aucune erreur de page. Dix tests unitaires rent/economy réussis ; dernier signal de compilation : `build OK`.

## Préservation des données
Empreintes de toutes les lignes des 89 tables publiques comparées avant migration, après migration et après nettoyage. Aucune différence à l’application de la migration. Après tests et nettoyage complet, empreinte globale identique : `6fc24e5cd107239a61d7826791f6947e`.

Le premier nettoyage a laissé des notifications et préférences appartenant uniquement au compte temporaire ; elles ont été supprimées explicitement, puis le nettoyage de la suite a été corrigé. Le second passage des huit tests a confirmé le retour intégral à l’empreinte initiale. Aucun ancien joueur ou enregistrement n’a été modifié ou supprimé. Aucune intervention sur l’horloge ou la gouvernance, aucun retest fonctionnel du Bloc 9.

## Limites
Ces résultats clôturent la correction ciblée des loyers, pas la validation globale du Bloc 10. Les autres scénarios de finalisation du Bloc 10 restent distincts de ces huit tests. Bloc 11 non commencé.