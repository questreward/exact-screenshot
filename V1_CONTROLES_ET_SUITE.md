# CIVITAS — clôture de V1

## Première livraison après 0113
- Conversations : reprise dans la page, fermeture, remise à zéro et nouvelle tentative du même message après erreur. Correction de la poursuite d’un échange après une réponse de plus de 300 caractères : le joueur reste limité à 300, la réponse à 600 comme auparavant.
- Missions : scènes de patrouille/incendie/secours ou de travail, véhicules et petits bonshommes ; dossier fictif consultable. Tout dérive de la mission enregistrée, sans nouvelle règle ni récompense.
- Aucune sauvegarde durable de conversation ni nouvelle migration. La mémoire durable est réservée à une proposition V2.

## Contrôle du serveur — lecture seule
Depuis `/data/civitas-live/app`, après synchronisation des fichiers, lancer :

```bash
bash vps/tools/check_v1.sh
```

Le script ne lance aucun RPC de jeu : certaines fonctions de lecture règlent des échéances et ne seraient donc pas une vérification sans effet. Il consulte uniquement les catalogues PostgreSQL dans une transaction READ ONLY terminée par ROLLBACK. Il affiche la présence des réglages Ollama, jamais leurs valeurs, ainsi que l’état des conteneurs locaux. Il ne contacte pas un service externe et ne lit aucune ligne de personnage.

Attendus : objets PRESENT, RLS activé, SELECT joueur autorisé et écritures directes interdites ; protections propriétaires pour voyages/cartes postales et missions ; déclencheurs actifs. Ces résultats ne suffisent pas à valider la logique complète du jeu.

Point à contrôler : 0113 crée ses trois politiques sous une seule condition. Une installation neuve crée les trois ; une installation partielle ancienne pourrait manquer une protection. Ne pas réinstaller automatiquement 0113 : demander un correctif exact si le contrôle révèle une absence.

## Vrais essais restant à faire sur une copie isolée
1. Restaurer une sauvegarde récente dans une base de test séparée et utiliser une application de test connectée uniquement à cette copie. Ne jamais avancer l’horloge commune de production.
2. Carte bloquée et plafond dépassé : achat refusé sans débit ; prélèvements autorisés selon les règles existantes.
3. Missions : commencer une vraie vacation, répondre à chaque étape, rejouer la dernière demande ; une seule conséquence, aucun argent supplémentaire ; expiration sans pénalité supplémentaire.
4. Taxe foncière : paiement vers la ville du bien, jamais deux reçus ; aucun transfert rétroactif de l’historique payé à l’État.
5. Voyages : documents requis, un seul débit par clé, refus agenda/travail/déplacement/vote pendant le séjour, un seul retour et souvenir. Accélérer le délai seulement dans la copie de test.
6. Deux comptes dans la copie : aucune lecture croisée des voyages, cartes postales, missions ni conversations privées.

Le VPS et Ollama n’ont pas été testés directement depuis cette session ; leur configuration et les parcours complets restent à vérifier à partir des résultats du contrôle. Les essais locaux utilisent des données contrôlées et ne sont pas présentés comme un essai de production.

21 essais ciblés réussis, dont nouvelle tentative sans double message, reprise/remise à zéro et transmission du choix de mission suivie du résultat serveur simulé. Compilation automatique sans erreur. La vérification visuelle par navigateur n’a pas abouti : la page temporaire de contrôle n’était pas servie. Les fichiers temporaires ont été retirés ; l’affichage dans une vraie mission et Ollama restent non vérifiés.

## Inventaire des documents
Déjà présents : carte fictive, contrat, paie, bail, quittance mensuelle, relevé bancaire, avis d’impôt, échéancier, assurance, consultation, mandat, candidature, décisions d’aide et formulaires. CAF/emploi/santé/banque/impôts/titres ont déjà leurs espaces : pas de doublon à créer.

Manques possibles pour V2, à valider :
- Attestation d’emploi distincte du contrat : mêmes données d’emploi/poste/employeur/début/statut, pas de nouveau salaire inventé.
- Justificatif de domicile distinct du bail : logement/adresse actuellement enregistrés. Pas d’attestation si aucune adresse exploitable.
- Rangement de l’avis de taxe foncière dans le coffre-fort : l’avis est déjà consultable/imprimable dans Impôts, l’ajout au coffre nécessite une projection explicite.
- Reçus détaillés par paiement : uniquement à partir d’un paiement réellement enregistré ; les quittances et relevés existants évitent déjà la plupart des doublons.

Le dossier de mission est la seule nouvelle présentation de document de ce lot ; il reprend titre, journée, étape et résultat existants, et n’est ni une pièce officielle ni un historique complet sauvegardé.

## Après les contrôles essentiels
- Clore V1, corriger les problèmes importants uniquement. Ne pas ajouter d’autre extension non essentielle.
- V2 : mémoire durable IA, documents supplémentaires et nouvelles fonctions restant à valider. Préparer une annonce dans les actualités sans date promise ; aucune annonce publiée à ce stade.
- Discord en priorité : accueil/règlement, annonces, aide, bugs, suggestions, discussions, rôles et modération. Demander l’accès ou l’invitation du serveur au démarrage de ce chantier.
- TikTok et Instagram : courtes séquences de gameplay pour découvrir CIVITAS ; YouTube ensuite pour tutoriels et présentations plus longues. Ne pas disperser le lancement sur tous les réseaux.

### Brouillon d’annonce — non publié
**CIVITAS : cap sur la V2**

Nous préparons la suite de CIVITAS. La priorité reste de stabiliser la V1 et de corriger les problèmes importants. Les prochaines grandes nouveautés seront regroupées dans une V2 ; leur contenu et leur calendrier seront annoncés une fois confirmés. Merci pour vos retours et vos idées !

### Discord — structure proposée, non créée
- Informations : accueil, règlement, annonces (écriture réservée à l’équipe).
- Joueurs : discussion, présentation des personnages, captures du jeu.
- Assistance : aide, signalements de bugs, suggestions V2.
- Équipe : modération et suivi privés ; rôles administrateur/modérateur/membre sans permissions inutiles.
- Aucun lien d’invitation fictif, bot installé ni message publié sans accès et validation.