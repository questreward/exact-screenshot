# Bloc 10 — Vacations après une nouvelle embauche (SQL proposé, NON appliqué)

## Ce que les tests ont révélé
La correction autorisée fonctionne : le joueur peut repostuler au même poste et être réembauché (tests 1 à 6 et 9 réussis).

Mais au test 7, **le nouvel emploi n'a reçu aucune vacation** pour les jours déjà prévus. Cause : chaque vacation est enregistrée sous une étiquette « work:<date> » unique par joueur. Au départ, les vacations futures sont annulées mais gardent leur étiquette ; le jeu ne peut donc pas recréer les vacations de ces mêmes jours pour le nouvel emploi. Le problème existait déjà avant (il touche aussi tout changement d'emploi), il était seulement masqué.

Conséquence pour le joueur : après une réembauche, pas de travail ni de salaire pendant les jours où l'ancien emploi avait des vacations prévues.

## Correction proposée (minimale)
Une seule addition : quand un emploi se termine, les **vacations futures annulées** de cet ancien emploi reçoivent une étiquette d'archive (« work:<date>:ancien-emploi:<identifiant> »). Elles restent dans l'historique, avec leur statut annulé et toutes leurs informations ; seule l'étiquette change. Les jours redeviennent libres pour le nouvel emploi.

- **Table modifiée (données)** : `activities`, colonne `source_key` uniquement, et uniquement pour les vacations du joueur qui quitte : type travail, statut annulé, dans le futur. Aucune ligne supprimée.
- **Non concernés** : vacations passées ou terminées, paies (`transactions`), cours, activités sociales, politiques ou de mandat, autres joueurs. Les fonctions existantes ne sont pas réécrites.
- **Schéma** : ajout d'une fonction et d'un déclencheur ; aucune colonne ni table modifiée ou supprimée.
- **Anciennes paies** : clé de paiement liée à la vacation elle-même, jamais recréditée. Un salaire ne peut naître que d'une vacation du nouvel emploi, effectuée.
- **Un seul emploi actif** : inchangé (garanti par la base).

## SQL exact
```sql
CREATE OR REPLACE FUNCTION public.release_former_job_shifts()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ BEGIN
  UPDATE public.activities
     SET source_key = source_key || ':ancien-emploi:' || id
   WHERE character_id = OLD.character_id
     AND type = 'work' AND status = 'cancelled'
     AND source_key LIKE 'work:%' AND source_key NOT LIKE '%:ancien-emploi:%'
     AND start_time > public.game_now();
  RETURN OLD;
END $function$;

REVOKE ALL ON FUNCTION public.release_former_job_shifts() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER release_former_job_shifts
AFTER DELETE ON public.employments
FOR EACH ROW EXECUTE FUNCTION public.release_former_job_shifts();
```

## Après accord
Relance des 10 tests de réembauche, puis des 30 vérifications du parcours, des 23 cas limites et des 75 tests automatiques.
