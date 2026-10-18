# Loyers : conserver les échecs et permettre un nouveau paiement

## Statut
**Proposition uniquement : ce SQL n’a pas été appliqué.** Aucun test modifiant les données n’a été lancé. Votre approbation de ce plan autorisera cette correction non destructive et les tests décrits ci-dessous.

## Résultat attendu
- Un échec faute d’argent reste dans l’historique, sans débit ni transaction bancaire.
- Un nouveau paiement manuel peut réussir le même jour : opération distincte, transaction bancaire et débit uniques.
- Plusieurs clics, une recharge, une reconnexion ou une tentative ultérieure ne peuvent pas payer deux fois le même loyer.
- Aucun ancien enregistrement n’est supprimé ou réécrit.

## Effets précis
À l’application du SQL :
- Ajout de `public.pay_housing_attempt()`, qui renvoie le résultat réel du paiement.
- Remplacement du corps de `public.pay_housing()` par un appel à cette nouvelle fonction. Son nom, ses paramètres et son retour `void` restent inchangés pour préserver les appels existants.
- Autorisation d’appeler la nouvelle fonction réservée aux utilisateurs authentifiés. Les droits existants de l’ancienne fonction restent inchangés.
- **Aucune table, colonne, contrainte ou donnée existante modifiée ; aucun effacement, renommage ou changement de type.**

Lors d’un futur paiement, pour le personnage connecté seulement :
- Lecture et verrouillage du personnage, de son logement et de son compte afin de traiter les clics simultanés l’un après l’autre.
- En cas de solde insuffisant : ajout de l’échec du jour dans `economy_operations` s’il n’existe pas déjà. Les échecs existants restent intacts.
- En cas de succès : ajout d’une opération réussie et d’une transaction via `economy_cash()`, débit du coût configuré dans `housing_types`, puis mise à jour de `character_housing.last_paid_date` uniquement après paiement effectif.
- Si l’opération `rent:DATE` est déjà un échec, la réussite reçoit la clé distincte `rent:DATE:retry`. Les deux enregistrements sont conservés.
- Un loyer déjà payé est reconnu par les opérations réussies, les transactions correspondantes et la dernière date payée. Une ancienne date marquée payée à tort par le défaut identifié ne bloque pas le paiement si un échec existe et qu’aucune preuve de paiement réussi n’existe.

La correction ne touche ni les salaires, ni les élections, ni le mandat, ni le budget municipal. Elle réutilise le compte et le logement existants : leurs données changeront uniquement lors d’un vrai paiement demandé par le joueur. Elle n’appelle pas la préparation générale de la vie quotidienne, pour éviter des règlements ou changements d’agenda sans rapport avec ce paiement. Les autres fonctions restent inchangées.

## SQL exact proposé

```sql
CREATE FUNCTION public.pay_housing_attempt()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  cid uuid;
  h public.character_housing;
  acc public.accounts;
  cost integer;
  d date := (public.game_now() AT TIME ZONE 'UTC')::date;
  base_key text := 'rent:' || d;
  retry_key text := 'rent:' || d || ':retry';
  payment_key text;
  previous_failure boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non connecté';
  END IF;

  SELECT id INTO cid
  FROM public.characters
  WHERE user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Personnage introuvable';
  END IF;

  SELECT * INTO h
  FROM public.character_housing
  WHERE character_id = cid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Logement introuvable';
  END IF;

  SELECT * INTO acc
  FROM public.accounts
  WHERE character_id = cid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compte introuvable';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.economy_operations
    WHERE character_id = cid
      AND operation_key = base_key
      AND status = 'failed'
  ) INTO previous_failure;

  IF EXISTS (
    SELECT 1 FROM public.economy_operations
    WHERE character_id = cid
      AND operation_key IN (base_key, retry_key)
      AND status = 'done'
  ) OR EXISTS (
    SELECT 1 FROM public.transactions
    WHERE account_id = acc.id
      AND operation_key IN (base_key, retry_key)
  ) OR (h.last_paid_date = d AND NOT previous_failure) THEN
    RETURN jsonb_build_object('status', 'already_paid', 'rent_date', d);
  END IF;

  SELECT daily_cost INTO cost
  FROM public.housing_types
  WHERE id = h.type_id;
  IF cost IS NULL OR cost < 0 THEN
    RAISE EXCEPTION 'Coût du logement invalide';
  END IF;

  IF acc.balance < cost THEN
    INSERT INTO public.economy_operations
      (character_id, operation_key, kind, amount, status, payload)
    VALUES
      (cid, base_key, 'logement', -cost, 'failed',
       jsonb_build_object('rent_date', d, 'reason', 'insufficient_funds'))
    ON CONFLICT (character_id, operation_key) DO NOTHING;

    RETURN jsonb_build_object(
      'status', 'insufficient_funds', 'rent_date', d, 'amount', cost
    );
  END IF;

  payment_key := CASE WHEN previous_failure THEN retry_key ELSE base_key END;

  IF NOT public.economy_cash(
    cid, payment_key, -cost, 'Logement — ' || d, 'logement',
    jsonb_build_object(
      'rent_date', d,
      'previous_failure_key', CASE WHEN previous_failure THEN base_key ELSE NULL END
    )
  ) THEN
    RAISE EXCEPTION 'Paiement non enregistré';
  END IF;

  UPDATE public.character_housing
  SET last_paid_date = d
  WHERE character_id = cid;

  RETURN jsonb_build_object(
    'status', 'paid', 'rent_date', d,
    'amount', cost, 'operation_key', payment_key
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.pay_housing_attempt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_housing_attempt() TO authenticated;

CREATE OR REPLACE FUNCTION public.pay_housing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM public.pay_housing_attempt();
END;
$function$;
```

## Changements de l’écran après accord
Le bouton de paiement utilisera le résultat de `pay_housing_attempt()` pour distinguer « paiement enregistré », « solde insuffisant » et « déjà payé ». Il ne pourra plus annoncer un succès quand aucun débit n’a eu lieu. L’historique existant continuera d’afficher l’échec et la réussite séparément.

## Tests après accord
Tests sur un compte temporaire isolé, sans toucher aux personnages existants ni à l’horloge commune :
1. Solde de 1 € pour un loyer de 30 € : échec conservé, solde inchangé, aucune transaction bancaire.
2. Réapprovisionnement du compte de test à 200 €, puis paiement le même jour : solde de 170 €, une réussite distincte et une transaction de −30 €.
3. Plusieurs demandes simultanées : une seule réussite, une seule transaction et un seul débit.
4. Recharge de la page : les mêmes opérations et le même solde restent visibles, sans nouveau débit.
5. Déconnexion puis reconnexion : mêmes données, aucun second paiement.
6. Nouvelle tentative après paiement : résultat « déjà payé », données inchangées.
7. Comparaison de l’enregistrement d’échec avant/après : toutes ses valeurs restent identiques.
8. Échec automatique existant, puis paiement manuel : réussite possible et échec conservé ; cas de l’ancienne date marquée payée à tort également couvert.

Les tests seront ajoutés au projet et réellement exécutés après application autorisée. Les vérifications de recharge et reconnexion passeront aussi par l’écran du jeu. Le Bloc 9 ne sera ni modifié ni retesté. Aucun Bloc 11 ne sera commencé. Le Bloc 10 reste non validé jusqu’à la fin des tests.