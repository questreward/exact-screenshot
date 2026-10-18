# Bloc 10 — Repostuler à un ancien poste (SQL proposé, NON appliqué)

## Cause
La table des candidatures interdit, par une règle d'unicité, plus d'une candidature par joueur et par poste, à vie. Après un départ, la nouvelle candidature au même poste est donc refusée par la base.

## Ce qui est modifié
- **Table `job_applications`** (candidatures), colonnes `character_id` et `job_id` :
  - ajout d'une nouvelle règle : au plus **une candidature en attente** par joueur et par poste ;
  - retrait de l'ancienne règle « une seule candidature à vie ». Ce retrait ne supprime **aucune ligne** et ne modifie aucune colonne.
- **Fonction `apply_job`** (postuler) : verrouille le personnage, refuse proprement une candidature en double déjà en attente, puis revérifie les conditions habituelles (parcours, âge, ville, pas d'emploi actif). Le reste est identique.
- **Aucune autre table** : `employments`, `career_history`, `transactions`, `accounts`, `activities` ne sont pas touchées. Aucune donnée existante modifiée.

## Historique préservé
- Les anciennes candidatures (acceptées/refusées) restent ; une nouvelle candidature crée une **nouvelle ligne**.
- Le départ continue d'être inscrit dans l'historique professionnel (inchangé).

## Un seul emploi actif garanti
- La table des emplois a pour clé le personnage : **une seule ligne d'emploi par joueur**, imposée par la base.
- `apply_job` refuse si un emploi existe ; à l'acceptation, le jeu revérifie qu'il n'y a pas d'emploi (déjà en place).
- Salaires : chaque vacation a sa propre clé de paiement unique ; une ancienne paie ne peut jamais être recréditée, et un salaire n'existe qu'après une vacation du nouvel emploi.

## SQL exact
```sql
CREATE UNIQUE INDEX IF NOT EXISTS job_applications_one_pending_per_job
  ON public.job_applications (character_id, job_id) WHERE status = 'pending';

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_character_id_job_id_key;

CREATE OR REPLACE FUNCTION public.apply_job(_job_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE cid uuid; c public.characters; j public.jobs; BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF c.path_id NOT IN ('young_worker','early_career') AND COALESCE(c.progression->>'career_active','false') <> 'true' THEN
    RAISE EXCEPTION 'Réservé aux parcours professionnels'; END IF;
  IF EXISTS (SELECT 1 FROM public.employments WHERE character_id = cid) THEN
    RAISE EXCEPTION 'Vous avez déjà un emploi'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = _job_id AND city_id = c.city_id AND location_id IS NOT NULL;
  IF NOT FOUND OR c.age < j.min_age THEN RAISE EXCEPTION 'Offre inaccessible'; END IF;
  IF EXISTS (SELECT 1 FROM public.job_applications WHERE character_id = cid AND job_id = j.id AND status = 'pending') THEN
    RAISE EXCEPTION 'Candidature déjà en cours pour cette offre'; END IF;
  INSERT INTO public.job_applications (character_id, job_id, applied_at, response_at)
  VALUES (cid, j.id, public.game_now(), public.game_now() + (SELECT response_minutes FROM public.life_settings WHERE id = 1) * interval '1 minute');
END $function$;
```

## Petit ajustement d'affichage (après accord)
La page Vie affichera l'état de la **candidature la plus récente** pour chaque offre (sinon un ancien refus resterait affiché).

## Tests après accord (compte temporaire isolé)
Embauche, salaire, départ, historique, candidature au même poste, nouvelle embauche, nouveau salaire, reconnexion, double candidature simultanée, tentative de deux emplois actifs ; puis relance des 30 vérifications, 23 cas limites et 75 tests automatiques.
