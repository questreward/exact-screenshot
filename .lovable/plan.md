# Bloc 13 — Proposition d’un environnement d’essai séparé

**Proposition uniquement : rien appliqué, aucun compte créé, aucun test lancé. Bloc 14 interdit.**

## Mécanisme retenu

Pour vérifier réellement tout le parcours, utiliser une **copie jetable du projet avec son propre Lovable Cloud**, sans aucun compte ni donnée de joueur réel. Le jeu original, sa base et son horloge ne sont jamais ciblés.

Les fonctions du jeu restent identiques, y compris `game_now()`, `start_life_activity()`, `prepare_daily_life()` et `settle_daily_life()`. Seule l’ancre d’horloge de la copie d’essai est déplacée par un outil réservé à l’opérateur, pour le seul compte temporaire enregistré dans cette copie. Ce n’est pas une seconde horloge ajoutée au jeu réel.

**Pourquoi ne pas retenir une copie de `start_life_activity()` dans la base actuelle ?** Son appel à `prepare_daily_life()`, le règlement des salaires et les consultations automatiques de Banque/Vie utilisent aussi `game_now()`. Une seule fonction copiée ne suffit pas. Copier toute cette chaîne créerait une version différente du jeu : un succès ne prouverait pas le fonctionnement des fonctions réelles. Aucune de ces copies n’est proposée.

Cette solution est une alternative à votre préférence « heure propre au compte dans la base actuelle ». Elle nécessite votre accord explicite pour un environnement séparé. Elle ne sera pas présentée comme une simulation propre au compte dans la base de production.

## Prérequis et blocage actuel

La plateforme documente qu’un Remix copie la structure, sans les données. **Aucune copie n’a été créée et aucun environnement séparé n’a été vérifié.** L’opérateur doit disposer d’un projet distinct et vérifier son Cloud indépendant avant tout SQL ci-dessous. Une simple copie de code branchée sur la base actuelle est interdite.

Les réglages et lieux fictifs nécessaires doivent être présents dans cette copie : préparation à partir des données initiales du projet, sans export des comptes ni de leurs données. Si le Remix ne fournit pas les fonctions, les réglages ou les lieux nécessaires, arrêter et soumettre séparément leur préparation exacte. Aucun chargement supplémentaire n’est approuvé par ce plan.

## Éléments concernés

**Projet réel : aucun changement de code, table, fonction, permission, règle, donnée ou horloge.** Aucun appel aux élections.

**Copie jetable uniquement :**
- Fonctions de production utilisées sans remplacement : création de personnage, candidature, déplacement, démarrage, consultation et règlement de la vie quotidienne, Banque et Agenda.
- Données du seul compte temporaire : profil, personnage, candidatures, emploi, position, activités, progression, compte, opérations et transactions ; autres dépendances personnelles générées par ses lectures.
- `world_state` : ancre de la copie uniquement, jamais celle du projet réel.
- Une nouvelle table `public.bloc13_test_context` et deux nouvelles fonctions d’opérateur ci-dessous. Aucun accès pour les joueurs ; aucun écran ou bouton ajouté au jeu.

## SQL exact proposé — uniquement dans la copie jetable

**Ce SQL ne doit jamais être appliqué au projet actuel.** Le commentaire et les contrôles ne peuvent pas deviner la destination : l’indépendance du Cloud est un prérequis vérifié par l’opérateur, pas une garantie produite par ce SQL.

```sql
CREATE TABLE public.bloc13_test_context (
  id integer PRIMARY KEY CHECK (id = 1),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id uuid NOT NULL UNIQUE REFERENCES public.characters(id) ON DELETE CASCADE,
  original_clock jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bloc13_test_context TO service_role;
REVOKE ALL ON public.bloc13_test_context FROM PUBLIC, anon, authenticated;
ALTER TABLE public.bloc13_test_context ENABLE ROW LEVEL SECURITY;
-- Pas de politique joueur : la table est inaccessible aux joueurs.

CREATE FUNCTION public.bloc13_register_test(_user_id uuid, _character_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE original jsonb;
BEGIN
  -- Cette fonction est exécutable uniquement par l’opérateur.
  LOCK TABLE public.bloc13_test_context IN EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.bloc13_test_context) THEN
    RAISE EXCEPTION 'Un essai est déjà enregistré';
  END IF;
  IF (SELECT count(*) FROM public.profiles) <> 1
     OR (SELECT count(*) FROM public.characters) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.characters c JOIN public.profiles p ON p.id=c.user_id
       WHERE c.id=_character_id AND c.user_id=_user_id
     ) THEN
    RAISE EXCEPTION 'Copie dédiée au seul compte temporaire requise';
  END IF;
  SELECT to_jsonb(w) INTO original FROM public.world_state w WHERE id=1 FOR UPDATE;
  IF original IS NULL THEN RAISE EXCEPTION 'Horloge absente'; END IF;
  INSERT INTO public.bloc13_test_context
    (id,user_id,character_id,original_clock,expires_at)
  VALUES (1,_user_id,_character_id,original,clock_timestamp()+interval '2 hours');
END;
$$;
REVOKE ALL ON FUNCTION public.bloc13_register_test(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bloc13_register_test(uuid,uuid) TO service_role;

CREATE FUNCTION public.bloc13_test_clock(
  _user_id uuid, _character_id uuid, _at timestamptz,
  _restore boolean DEFAULT false
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ctx public.bloc13_test_context; original public.world_state;
BEGIN
  SELECT * INTO ctx FROM public.bloc13_test_context
    WHERE id=1 AND user_id=_user_id AND character_id=_character_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte temporaire non enregistré'; END IF;
  IF (SELECT count(*) FROM public.profiles) <> 1
     OR (SELECT count(*) FROM public.characters) <> 1
     OR NOT EXISTS (SELECT 1 FROM public.characters
                    WHERE id=_character_id AND user_id=_user_id) THEN
    RAISE EXCEPTION 'Environnement non isolé';
  END IF;
  PERFORM 1 FROM public.world_state WHERE id=1 FOR UPDATE;
  IF _restore THEN
    SELECT * INTO original FROM jsonb_populate_record(NULL::public.world_state,ctx.original_clock);
    UPDATE public.world_state SET
      world_date=original.world_date, world_time=original.world_time,
      clock_started_at=original.clock_started_at, time_speed=original.time_speed,
      season=original.season, updated_at=original.updated_at
    WHERE id=1;
    DELETE FROM public.bloc13_test_context WHERE id=1;
    RETURN;
  END IF;
  IF clock_timestamp() >= ctx.expires_at THEN RAISE EXCEPTION 'Essai expiré'; END IF;
  IF _at IS NULL THEN RAISE EXCEPTION 'Heure d’essai obligatoire'; END IF;
  UPDATE public.world_state SET
    world_date=(_at AT TIME ZONE 'UTC')::date,
    world_time=(_at AT TIME ZONE 'UTC')::time,
    clock_started_at=now(), time_speed=0
  WHERE id=1;
END;
$$;
REVOKE ALL ON FUNCTION public.bloc13_test_clock(uuid,uuid,timestamptz,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bloc13_test_clock(uuid,uuid,timestamptz,boolean) TO service_role;
```

Les appels d’opérateur transmettent exclusivement les identifiants du **nouveau** compte de la copie. Aucun identifiant réel n’est fourni. L’heure virtuelle est conservée dans l’ancre existante de cette copie. Les appels du jeu sont effectués avec la session ordinaire de l’essai, pas avec les droits de l’opérateur.

## Scénario exact après approbation et vérification de la copie

1. Vérifier les fonctions identiques au projet réel et l’absence de tout autre compte dans la copie ; comparer aussi les règles et les permissions du jeu.
2. Créer un seul compte temporaire ; créer son personnage actif ; enregistrer ses identifiants via `bloc13_register_test`. Relever ses données initiales.
3. Positionner l’ancre **de la copie** un jour ouvré avant 08:00. Candidater au poste `Technicien numérique` : compétence Informatique requise 3, personnage insuffisamment qualifié. Avancer l’ancre de la copie jusqu’à la réponse prévue. Vérifier refus, aucun emploi, aucune vacation et aucun salaire.
4. Candidater à `Assistant administratif`. Avancer jusqu’au délai normal de réponse. Vérifier embauche unique, solde inchangé et vacation prévue dans l’Agenda.
5. Rejoindre le lieu de travail. À 07:59:59 dans la copie, tenter le démarrage : refus, aucune activité commencée ni dépense d’énergie. À 08:00, démarrer **la même vacation prévue** via le vrai Agenda. Vérifier statut en cours, énergie −30 et aucun salaire.
6. Vérifier la durée réelle configurée : quatre heures. À 11:59:59 virtuelles, consulter : aucun salaire. À 12:00 virtuelles, consulter : vacation terminée, progression +10 et salaire prévu par le poste et les réglages (80 € pour ce poste si les réglages actuels sont identiques).
7. Banque : une seule transaction et opération salariale ; Agenda : la même vacation terminée. Les assertions portent sur l’identifiant de la vacation et sa clé salariale, pas seulement le libellé.
8. Déconnexion/reconnexion par le formulaire ; trois recharges ; cinq consultations simultanées : même salaire, transaction, solde, emploi, candidatures et progression. Essayer un nouveau travail le même jour : refus, aucun second salaire.
9. Comparer toutes les données pertinentes avant/après reconnexion. Capturer Banque et Agenda et les résultats financiers. Vérifier absence d’erreur de page.

## Nettoyage et protection

Le lanceur doit utiliser une sortie `finally` : restaurer d’abord **toute la ligne d’horloge de la copie** via `_restore=true`, comparer à `original_clock`, puis supprimer le seul compte temporaire et toutes ses dépendances. Vérifier zéro référence à ses identifiants dans toutes les tables concernées et absence du compte d’authentification. Si une étape de nettoyage échoue, signaler le reste précisément, sans déclarer le nettoyage terminé. Aucun nettoyage d’anciens comptes du projet réel.

Après conservation des preuves, l’environnement jetable peut être retiré séparément avec votre accord. La table et les fonctions de test ne sont jamais installées dans le projet réel.

**Preuve de non-impact proposée :** Cloud distinct vérifié avant exécution ; lanceur sans identifiants d’écriture du projet réel ; aucun appel de jeu vers le projet réel ; empreinte complète de sa ligne `world_state` avant/après par lecture seule. Des actions indépendantes de vrais joueurs peuvent changer leurs données pendant l’essai : leur égalité globale ne peut pas être promise. L’isolation prouve que l’essai ne les écrit pas ; toute différence constatée est rapportée sans la restaurer ni la supprimer.

## Limites et décision

- SQL ci-dessus **non appliqué et non testé**. Aucun résultat de parcours annoncé.
- Aucune garantie de disponibilité de l’environnement séparé : sa création et son contrôle sont nécessaires avant les essais.
- Ce test vérifie les vraies fonctions et l’interface dans une copie aux règles identiques, **pas** l’écoulement de quatre heures réelles dans le projet actuel.
- Une fonction copiée dans la base actuelle ne serait qu’un test partiel ; elle n’est pas proposée pour déclarer le parcours complet réussi.
- Bloc 13 reste en attente. Bloc 14 interdit.

**Approbation demandée : utiliser cette copie jetable et y installer uniquement le mécanisme ci-dessus, sans aucune modification du projet réel.**
