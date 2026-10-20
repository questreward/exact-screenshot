# CIVITAS — clôture de V1

## Bilan actualisé — 20 octobre 2026, après 18:56 UTC
Ce bilan remplace les états historiques « préparé » ou « non installé » ci-dessous. Alex demandait si la V1 était terminée ; il n’a pas confirmé sa clôture.

- Installation 0114/0115 confirmée par le rapport VPS : 5 antennes, notes privées et 10 000 produits distincts. Ne pas réexécuter ces migrations.
- Sauvegarde complète et restauration isolée du jeu confirmées par le rapport préalable ; cron exclu de la copie uniquement.
- Site public réel vérifié : HTTP 200, accueil et connexion à 390/1280 px sans débordement ni erreur JavaScript. Boutique redirige normalement vers la connexion en l’absence de session ; cela ne vérifie pas son catalogue connecté.
- 32 tests locaux ciblés boutique, dossiers bénévoles, conversations et JT relancés avec succès ; aucun essai réel VPS supplémentaire prétendu.
- Mise à jour finale non confirmée : aucun accès VPS utilisable dans cette session. La procédure historique reconstruit uniquement civitas-web sur civitas-net avec .env et le port local 3000 ; elle ne réapplique aucune migration et ne redémarre pas Ollama.
- Critères encore ouverts : parcours téléphone avec vrai personnage, antenne/note relues après retour, recherche/pagination/achat boutique, régressions financières et confidentialité sur copie indépendante, première partie et fonctionnement sans IA locale. Une session du jeu et une application de test reliée à une copie indépendante restent nécessaires.

**Conclusion : tous les critères de clôture ne sont pas confirmés.**

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

Le rapport transmis par Alex le 20 octobre confirme les huit objets et onze fonctions présents, les RLS/permissions attendues, les politiques propriétaires et déclencheurs actifs, ainsi que les trois conteneurs démarrés. Les réglages Ollama sont présents ; aucune inférence IA ni aucun parcours complet n’est prouvé par ce rapport. Les essais locaux utilisent des données contrôlées et ne sont pas présentés comme un essai de production.

21 essais ciblés réussis, dont nouvelle tentative sans double message, reprise/remise à zéro et transmission du choix de mission suivie du résultat serveur simulé. Compilation automatique sans erreur. La vérification visuelle par navigateur n’a pas abouti : la page temporaire de contrôle n’était pas servie. Les fichiers temporaires ont été retirés ; l’affichage dans une vraie mission et Ollama restent non vérifiés.

## Dernière passe téléphone — 20 octobre
- Commandes et champs tactiles agrandis ; textes longs peuvent revenir à la ligne, saisie native à 16 px pour limiter le zoom automatique.
- Fenêtres et menu limités à la hauteur disponible, défilement interne et fermeture de 44 px ; réserve basse tenant compte de la zone système du téléphone.
- Recherche dans le menu, insensible aux accents, et accès directs aux pages déjà présentes : Agenda, Élections, En route, Chez moi et trois espaces aides/emploi/santé.
- Carte sans largeur minimum imposée, en conservant déplacement/zoom ; onglets Concession sur deux colonnes sur téléphone ; en-tête allocataire et anniversaire adaptés aux noms longs.
- 24 essais ciblés passent. Accueil, Découvrir et connexion contrôlés au navigateur à 320/390/430 px sans débordement. Vrais composants navigation/scène/dossier contrôlés avec une mission simulée à 320/390/430/1280 px sans débordement ni erreur JavaScript ; fermeture du dossier vérifiée. La navigation entre pages dans ce montage isolé n’a pas été validée (conflit entre routeurs de contrôle et application) ; aucune preuve de parcours connecté.
- Audit : les destinations Banque, Poste, Monde, etc. existent bien ; l’alerte initiale issue de la lecture partielle du fichier généré était infondée. Un essai vérifie désormais chaque destination disponible contre le fichier de page.
- Connexion de contrôle de l’aperçu indisponible pour le compte Lovable d’Alex ; les parcours VPS réels restent nécessaires. Tous les fichiers d’écran temporaire ont été retirés.
- Suite complète relancée après corrections : 310 essais réussis dans 68 fichiers, compilation automatique sans erreur ; ce sont des contrôles locaux, pas les essais financiers de la copie VPS.

## Conditions nécessaires pour fermer V1
1. Aucune action essentielle inaccessible sur téléphone ; parcours métier, déplacement, achat, document, message et retour au jeu vérifiés avec un vrai personnage.
2. Régressions sur copie indépendante : absence de double paiement/récompense, confidentialité de deux comptes, échéances et reconnexion.
3. Sauvegarde récente ET restauration réussie dans une copie, sans modifier le monde de production.
4. Nouveau joueur capable de créer son personnage, trouver son activité et comprendre les refus/indisponibilités ; pas d’écrans vides ou d’annonce mensongère.
5. Erreurs compréhensibles, performances téléphone raisonnables, jeu utilisable lorsque l’IA locale est indisponible.

## Livraison finale regroupée — commencée après accord du plan
- Intérieur voiture et cabine car/train intégrés à En route, avec vitesse/panneaux existants ; aucun nouveau trajet ou effet financier.
- Suppression du faux passage de contrôleur et de l’affirmation « billet en règle » : aucun contrôle réel du billet n’était enregistré.
- Vue intérieure des pièces dans Chez moi : uniquement objets placés par le joueur, y compris brouillon non enregistré clairement signalé par l’éditeur existant ; pas de nouvelles possessions.
- Dossier bénévole Protection civile et comptes rendus consultables dans Secours : engagement, formation/fonction et services enregistrés. Résultats non clôturés masqués ; aucune qualification réelle, antenne inventée ou nouvelle récompense.
- Recrutement et réponses utilisent les contrôles tactiles partagés ; aucune condition métier changée.
- Contrôle unifié en lecture seule : `bash vps/tools/check_final_v1.sh`. Réunit audit structurel et mémoire/CPU/disque/modèles/GPU/outils vidéo ; ne lit ni secrets ni personnages et n’installe rien.
- 24 essais ciblés réussis dont trois règles de projection des rapports. Vues et ouverture/fermeture de comptes rendus contrôlées à 320, 390 et 1280 px avec données simulées : aucun débordement ni erreur JavaScript. Ces contrôles ne prouvent pas un parcours connecté sur VPS.
- Reste Protection civile étendue (antennes, affectations, suivi), vidéo réellement générée, intérieurs camion liés aux missions, catalogue 10 000, documents complémentaires et essais réels : **pas livrés ni installés**. Ressources VPS à mesurer ; prix/effets nouveaux et SQL exact à valider. La livraison finale n’est donc pas déclarée terminée.

Protection civile, JT vidéo, intérieurs et 10 000 produits sont de nouvelles extensions explicitement demandées, pas des conditions universelles de stabilité. Les construire en lots avant clôture si retenus ; ne pas confondre leur installation avec leur validation. Ollama qwen2.5:3b génère du texte, pas des vidéos : une narration locale et une mise en scène animée sont distinctes d’un modèle de génération vidéo, dont les ressources restent à mesurer sur le VPS.

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