# Réseaux sociaux + préparation de la V2

Le jeu a déjà un petit réseau, « Civi ». On y publie à partir de messages tout prêts et on peut réagir. On le transforme en vrai réseau social, et on prépare la communication réelle de CIVITAS. Rien n'est installé sur le serveur sans ton accord : pour chaque étape, je te présente les règles, puis un essai sans risque, puis l'installation.

## 1. Civi devient un vrai réseau (dans le jeu)
- **Publier librement** : un texte de 280 caractères maximum, et une photo du jeu en option. Plus de messages imposés. Il y a une limite de publications par jour, pour éviter le spam.
- **Fil d'actualité** avec trois onglets : Pour toi, Abonnements et Ma ville. Tu peux suivre ou ne plus suivre quelqu'un, aimer, commenter, répondre et republier.
- **Profil Civi** : nombre d'abonnés, publications, et un badge pour les élus et les médias.
- **Comptes animés par le jeu** : élus, partis, médias fictifs et habitants publient automatiquement. Ils réagissent aux vrais événements de la ville (élections, lois, manifestations, crises), sans jamais inventer de faits.
- **Buzz et influence** : une publication très appréciée donne un peu de réputation et d'influence. Le gain est plafonné chaque semaine et ne rapporte jamais d'argent.
- **Modération** : signaler une publication, bloquer quelqu'un. Une publication signalée plusieurs fois est masquée en attendant une vérification. Tu disposes d'un espace administrateur pour la rétablir ou la supprimer.
- **Pensé pour le téléphone** : grands boutons et un bouton « Publier » toujours visible.

## 2. Communication réelle de CIVITAS
- Un dossier prêt à l'emploi pour **TikTok, Instagram et X** : biographies, 30 idées de publications avec leurs textes, et un calendrier sur 4 semaines.
- Des visuels carrés et verticaux, aux couleurs ardoise et corail, avec le slogan « Votre vie. Votre pouvoir. ».
- Des liens vers ces réseaux en bas du site. Je mettrai les adresses quand tu auras créé les comptes.

## 3. Préparer la V2 (dans cet ordre)
1. **Essais de la V1** : un guide pas à pas sur téléphone (création, travail, secours, RSA, boutique, logement, documents, messages). On vérifie aussi la confidentialité, les paiements en double et le jeu sans IA. Les problèmes trouvés seront corrigés en priorité.
2. **Couple partout en France** : trouver un joueur dans toutes les villes, ou parmi ses contacts.
3. **Vrais politiques** : finir la liste des 577 députés, du gouvernement et des chefs de partis à partir de sources officielles, avec la mention « simulation » et aucune fausse citation.
4. **Nouvelles villes** : Toulouse, Nice, Nantes, Strasbourg et Rennes, avec leurs quartiers, leurs lieux, une mairie, des habitants et des métiers.

Un document « Feuille de route V2 » reprendra ces étapes et ce qui reste à faire.

## Questions à valider avant le SQL du réseau
- Combien de publications par jour ? Je propose 10.
- Combien de signalements pour masquer une publication ? Je propose 3.
- Quel gain d'influence maximum par semaine grâce au buzz ? Je propose +5.

## Détails techniques
- Migration 0118 (le brouillon des vrais politiques devient la 0119). Elle ajoute aux tables Civi existantes les éléments suivants :
  - les tables `civi_follows`, `civi_comments`, `civi_reports` et `civi_blocks` ;
  - une colonne de texte libre et une colonne de publication d'origine (pour les republications) sur `social_posts` ;
  - un registre unique pour le buzz.
- Toutes les écritures passent par des fonctions protégées qui verrouillent le personnage. Les blocages utilisent `guard_player_block`. Les fils sont lus par pages. La modération est vérifiée avec `has_role` côté serveur.
- Les publications des comptes du jeu sont créées à partir de `events` et `news`, avec des clés uniques par heure. L'IA locale ne sert qu'à la reformulation, jamais à prendre une décision.
- Chaque étape suit la même procédure : `prepare_0118.sh` (sauvegarde, restauration isolée, essai terminé par ROLLBACK), puis l'installation, puis la mise à jour du site.
- Pages concernées : `reseau.tsx` et une nouvelle page `civi.tsx`. Les requêtes passent par `src/services/game.ts`. Des tests sont prévus pour les limites, le plafond d'influence, le seuil de modération et les blocages.
