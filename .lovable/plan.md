# Correctif Bloc 11 — signalements de changement comparés par type (NON APPLIQUÉ)

## Analyse
1. **Fonction responsable** : `public.admin_action`, branche `report_change` (créée en 0036).
2. **Cause de « Aucun changement réel »** : la fonction lit le **dernier instantané de situation, tous types confondus** (`administrative_events`, kind `situation`, le plus récent). Un signalement d'emploi enregistre la situation complète (emploi ET logement). Un signalement de logement juste après se compare donc à un instantané qui contient déjà le nouveau logement → refusé.
3. **Tables et colonnes concernées (lecture seule pour la comparaison)** :
   - `administrative_procedures` : `type_id = 'situation_change'`, `result->>'change'` (job / housing / status / city), `situation` (instantané au moment du signalement), `started_at`, `created_at`.
   - `administrative_events` : `event_key = 'situation-baseline'`, `details` (situation de départ).
   - Inchangé : l'invalidation des justificatifs (`administrative_documents.status = 'perime'`), la remise « à compléter » des aides, la notification.
4. **Distinction des types** : la comparaison se fait avec le **dernier signalement du même type** (`result->>'change' = change`). S'il n'y en a pas encore, avec la **situation de départ** du personnage. Emploi ↔ emploi, logement ↔ logement, statut ↔ statut, ville ↔ ville.
5. **Unicité** : aucune contrainte modifiée.
   - `(character_id, type_id, period)` : la période d'un signalement contient l'horodatage, le type, puis un suffixe unique (correctif 0037) → deux types différents dans la même seconde ne se heurtent pas.
   - Les doubles clics restent bloqués : la fonction verrouille déjà la ligne du personnage (`FOR UPDATE`) ; le second clic voit le premier signalement du même type, identique → refusé.
   - `one_active_aid`, `renewed_from`, déclaration fiscale unique : non touchés.

## Ce que le SQL modifie
- **Uniquement** la fonction `admin_action` (`CREATE OR REPLACE`). Le texte est la définition actuellement en base, recopiée à l'identique, à l'exception de **la ligne de lecture du dernier instantané**, remplacée par :
```sql
    -- Compare chaque type de changement à son propre dernier signalement
    SELECT situation INTO last_snap FROM public.administrative_procedures
      WHERE character_id = cid AND type_id = 'situation_change' AND result->>'change' = change
      ORDER BY started_at DESC, created_at DESC, id DESC LIMIT 1;
    -- À défaut, situation de départ enregistrée
    IF last_snap IS NULL THEN
      SELECT details INTO last_snap FROM public.administrative_events
        WHERE character_id = cid AND kind = 'situation' AND event_key = 'situation-baseline' LIMIT 1;
    END IF;
```
- Aucune table, colonne, contrainte, index ou droit modifié ; aucune ligne supprimée ou réécrite. Déclarations, aides, Banque, loyers et Blocs 1–10 inchangés.
- Données actuelles : 0 démarche, 0 instantané en base → rien d'existant concerné.

## SQL exact complet
Fichier joint au projet : `.lovable/proposed_0038_admin_change_per_type.sql` (définition complète de la fonction, 14 Ko). Il sera appliqué tel quel après votre accord.

## Après accord
Les 13 tests demandés sur compte temporaire, puis : 48 Bloc 11, 30 économiques, 23 cas limites, 10 réembauche, 8 loyers, 83 automatiques. Bloc 12 non commencé.
