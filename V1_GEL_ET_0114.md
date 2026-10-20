# CIVITAS — gel des ajouts V1 et dossier Protection civile

## Décision
À la demande d’Alex du 20 octobre 2026, arrêter les nouveaux ajouts V1 après ce dossier. Le gel des ajouts n’est pas une certification : essais réels sur téléphone et contrôle de restauration VPS restent à recevoir.

## SQL exact à examiner avant installation
Fichier : `vps/migrations/0114_volunteer_dossier.sql`, fourni également en pièce jointe. Non appliqué ici.

- `volunteer_branches` : `city_id` texte, `label` ; une antenne fictive par ville déjà présente, avec nom CIVITAS. Nécessaire pour choisir l’antenne.
- `volunteer_attachments` : `id`, `ordinal` (ordre fiable même à date identique), `character_id`, `city_id`, `request_id`, `attached_at` ; historique privé conservé lors d’un départ. Nécessaire pour mémoriser le rattachement.
- `volunteer_notes` : `shift_id`, `character_id`, `note`, `created_at` ; une note personnelle privée de 1 à 2 000 caractères par service Protection civile clôturé. La note enregistrée est conservée ; répéter le même envoi ne duplique rien.
- Trois fonctions nouvelles : `volunteer_dossier_state()`, `volunteer_attach(text,uuid)`, `volunteer_save_note(uuid,text)` ; vérifient le personnage, verrouillent les écritures et refusent les services d’autrui ou non clôturés.
- Droits de lecture : antennes pour joueurs connectés ; notes/historique uniquement pour leur propriétaire. Aucune écriture directe des joueurs.
- Données créées : références d’antennes uniquement ; aucun rattachement ni note inventés.
- Aucun salaire, récompense, âge, formation, déplacement, mission ou fonction existante modifiés. Aucun service externe ajouté.

## Premier code : sauvegarde, restauration isolée et essai à blanc
À lancer sur le VPS, sans installation réelle de 0114 :

```bash
cd /data/civitas-live/app &&
git pull --ff-only &&
bash vps/tools/prepare_v1_freeze.sh
```

Le script garde une sauvegarde privée dans `/data/civitas-live/backups`, restaure dans une nouvelle base temporaire, teste 0114 avec `ROLLBACK`, puis supprime uniquement cette copie. Il ne redémarre pas le jeu. Prévoir de l’espace pour la sauvegarde et la copie ; en cas d’erreur, ne pas poursuivre.

Correction après le rapport de 18:25 : pg_cron refuse une restauration dans une autre base que celle configurée. Le contrôle exclut donc l’extension pg_cron et son schéma cron uniquement de la copie d’essai, via la liste des objets de l’archive. La sauvegarde reste complète, la configuration du serveur et le jeu restent inchangés. La restauration des données du jeu ne certifie pas la restauration ni l’exécution des tâches pg_cron. Aucun nettoyage manuel de la copie du premier échec n’est effectué ici.

Rapport complet 18:37 : restauration isolée réussie, essai 0114 annulé sur « Écriture directe interdite ». Le SQL corrigé retire explicitement les droits hérités de PUBLIC/anon/authenticated sur les trois nouvelles tables et la séquence, puis accorde seulement SELECT aux joueurs. Les privilèges par défaut du serveur et les anciens objets restent inchangés. Le contrôle vérifie désormais toutes les écritures directes sur les trois tables. Relancer le même essai ; ne pas installer avant réussite.

Envoyer la sortie jusqu’à « essai à blanc réussi » et confirmer le SQL joint avant l’installation réelle. Aucune migration 0093–0113 n’est relancée.

## Éléments vérifiés ici
- Migration testée sur base temporaire minimale : refus d’accès aux notes d’autrui, refus des services non clôturés ou policiers, répétition sans doublon, historique conservé, ordre fiable à date identique, aucune nouvelle écriture d’argent.
- Six tests de présentation/règles secours réussis.
- Ces essais ne remplacent pas les parcours du vrai VPS. Aucun parcours connecté VPS n’a été vérifié ici.

## Avant de déclarer la V1 vérifiée
Sur une copie isolée avec un personnage réel : recrutement, choix d’antenne, service, fin de service, note puis relecture après reconnexion ; création, travail, achat, logement, transport, documents, messages, JT et partie sans IA. Vérifier sur téléphone et vérifier l’impossibilité de lire le dossier d’un autre joueur.

## Engagements conservés, non prétendus terminés
Catalogue de 10 000 produits, reportages JT complets avec narration locale, intérieurs camion et enrichissements supplémentaires restent non livrés ; scènes/intérieurs et voix/sous-titres JT déjà ajoutés ne valent pas réalisation de tout ce lot. Aucun engagement supprimé. Leur reprise après le gel demande un choix explicite ; aucune nouvelle règle ou installation implicite.
