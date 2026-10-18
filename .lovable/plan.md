# Bloc 11 — Correctif : deux démarches dans la même seconde (SQL proposé, NON appliqué)

## Ce que les tests ont révélé
42 vérifications du Bloc 11 réussies jusqu'ici. Puis un vrai défaut :
lorsqu'un joueur signale **deux changements de situation dans la même seconde du monde** (ex. « études → vie active » juste après un autre signalement), le second échoue avec une erreur technique au lieu d'être enregistré.

Cause : chaque démarche reçoit une étiquette de période basée sur l'heure du monde à la seconde près, et deux démarches du même type ne peuvent pas partager la même étiquette. Le même risque existe pour « Commencer » une aide juste après un refus, et pour un renouvellement.

La déclaration de revenus n'est pas concernée : elle doit rester **unique par année** (règle voulue).

## Correction proposée
Ajouter automatiquement un court identifiant unique à l'étiquette de période des démarches autres que la déclaration de revenus, au moment de leur création.

- **Table concernée** : `administrative_procedures`, colonne `period`, uniquement pour les **nouvelles** démarches (aide au logement, aide étudiante, changement de situation, renouvellement).
- **Données existantes** : aucune modifiée ni supprimée.
- **Règles inchangées** : une seule déclaration par année ; une seule demande d'aide active à la fois (règle séparée, toujours en place) ; un seul renouvellement par aide ; anti-doublon par identifiant de demande.
- **Fonctions existantes** : non modifiées. Ajout d'une petite fonction et d'un déclencheur.
- **Risque** : très faible ; l'étiquette de période n'est pas affichée au joueur.

## SQL exact
```sql
CREATE FUNCTION public.admin_unique_period()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN
  IF NEW.type_id <> 'tax_declaration' THEN
    NEW.period := NEW.period || ':' || left(replace(NEW.id::text, '-', ''), 8);
  END IF;
  RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public.admin_unique_period() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER admin_unique_period
BEFORE INSERT ON public.administrative_procedures
FOR EACH ROW EXECUTE FUNCTION public.admin_unique_period();
```

## Après accord
Relancer toutes les vérifications du Bloc 11 (y compris deux changements dans la même seconde), puis la régression des Blocs 1 à 10 (30 + 23 + 10 vérifications, réembauche, loyers, tests automatiques).
