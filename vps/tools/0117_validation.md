# 0117 — Livraison et vérification

## Fichiers
- `vps/migrations/0117_civil_protection_presidency.sql` : installation atomique, contrôles bloquants, refus de réinstallation, RLS sans accès direct des joueurs.
- Brouillon renommé `vps/migrations/0118_real_politicians.DRAFT.md`.
- `vps/tools/appoint_pc_interim.sql` : script administrateur transactionnel, paramètre psql `email`, non exécuté ; aucun courriel codé dans la migration.
- `vps/tools/prepare_0117.sh` : sauvegarde complète, restauration isolée sans cron, migration terminée par ROLLBACK ; jamais d’installation sur le jeu réel.
- `tests/tools/cp_presidency_fixture.sql`, `tests/cp_presidency.sql` : fixture jetable et tests transactionnels.
- `src/services/game.ts`, `src/components/game/CivilProtectionPresidency.tsx`, `src/routes/_authenticated/_game/secours.tsx` : requêtes, mutations et présentation française.

## Schéma exact ajouté
- `cp_settings(id,installed_at,indemnity,subsidy,candidacy_days,vote_days,mandate_years,operations_per_week,message_limit,operation_slots)`.
- `cp_elections(id,predecessor,opens_at,vote_at,closes_at,ends_at,settled,winner)`.
- `cp_candidates(election_id,character_id)`.
- `cp_ballots(election_id,voter,candidate)` : aucune lecture directe, ni propre bulletin ; état « a voté » seulement.
- `cp_office(id,interim)`.
- `cp_heads(city_id,character_id)` : responsable effectif seulement tant que volontaire en service et rattaché à cette antenne.
- `cp_operations(id,week,city_id,author,created_at,expires_at,slots)`.
- `cp_operation_shifts(operation_id,character_id,shift_id)`.
- `cp_messages(id,author,city_id,body,created_at)`.
- `cp_treasury(id,balance)`.
- `cp_ledger(entry_key,month,amount,character_id,created_at)`.
- `cp_months(month,president,paid)`.

Fonctions SECURITY DEFINER : `cp_volunteer(uuid)`, `cp_president()`, `cp_settle()` (internes), `cp_state()`, `cp_action(text,uuid,uuid,text,text,uuid)` (authenticated seulement).
Actions : candidate, vote, head, operation, message, join.
Aucune fonction existante remplacée ; `security_start_shift`, `security_settle`, `economy_cash`, `economy_post`, `economy_notify` réutilisées.

## Résultats observés
- PostgreSQL 17.9 local jetable, socket `/tmp/cp-pg`, port 5499 : fixture 0093 + 0094 + 0114 + 0117 installée avec ON_ERROR_STOP ; tests `cp_presidency.sql` réussis et ROLLBACK.
- Vérifiés : intérim, indemnité/subvention uniques, trésorerie non négative, candidature, nomination/rattachement, unicité hebdomadaire, création de service et agenda existants, message idempotent/longueur, vote immuable, secret, clôture, calendrier successeur unique, mandat annuel, fonds insuffisants sans dette, autorisations.
- Vitest : **72 fichiers, 319 tests réussis** (suite existante).
- Aucun tsgo disponible localement ; vérification de types laissée au contrôle automatique du projet, pas de succès revendiqué.

## Choix et limites à vérifier avant installation
- Premier scrutin : 7 jours de candidature puis 7 jours de vote ; suivants ancrés à l’expiration annuelle. Sans candidat admissible, présidence vacante ; égalité départagée par UUID.
- Subvention mensuelle par défaut 300 €, 10 places par opération, message 2000 caractères ; configuration exclusivement SQL administrateur.
- Seul le mois courant est financé ; aucun arriéré rétroactif. Le président collecte son indemnité à sa propre lecture ; une tentative insuffisante est définitivement ignorée pour ce mois.
- Opération = places supplémentaires rejoignables ; aucun service imposé à un bénévole, aucune issue fabriquée ; énergie, repos, agenda, mission et règlement existants conservés.
- Agrégats par rattachement historique au début du service ; services sans rattachement historique exclus des totaux par antenne. Aucune note privée consultée.
- À vérifier : restauration d’un vrai backup, intégration avec la vraie implémentation des notifications et de l’économie (fixture utilise des doubles), concurrence multi-session, affichage navigateur/mobile, performances à grande échelle.
- Ni outil VPS, ni nomination d’intérim, ni migration exécutés sur une base réelle. L’interface requiert l’installation préalable de 0117.
