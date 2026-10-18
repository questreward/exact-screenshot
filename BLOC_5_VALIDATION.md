# CIVITAS — Bloc 5 : prêt pour validation

18 octobre 2026. Blocs 1 à 4 préservés. Bloc 6 non commencé.

## Fonctionnalités construites
- Actualités déverrouillées dans le téléphone avec compteur non-lus ; accès depuis la navigation et aperçu de trois titres sur l’accueil.
- Fil local, régional et national : importance, pertinence selon ville/parcours/études/emploi/adhésions, puis fraîcheur. Aucun article général supprimé par la personnalisation.
- Recherche par titre, source, catégorie et ville, dix catégories disponibles, filtres de portée, non-lus, enregistrés et archives.
- Détail : résumé, contenu, auteur, date du monde, source fictive, réputation sur 100, illustration éventuelle, événement lié.
- Liens vers la carte et le bon lieu, l’organisation concernée, et l’agenda lorsqu’une participation existe.
- Lecture automatique à l’ouverture effective (pas au préchargement d’un lien), bouton de lecture explicite conservé, favoris enregistrables et supprimables.
- Lectures, favoris, préférences et notifications personnels conservés après reconnexion ; réglages de personnalisation et d’alertes importantes.
- Sources fictives : Civitas Matin, Le Journal de Lyon, La Tribune du Nord, France Direct, L’Observateur Civitas.
- Publication déterministe des événements vers les articles, avec identifiant unique et notifications ciblées. Un traitement horaire autonome alimente les cinq villes, les régions et le pays.

## Résultats : onze tests obligatoires réussis
1. Téléphone → Actualités : articles, catégories, sources, dates et localisation visibles.
2. Article : contenu, source, réputation, date, catégorie et événement lié consultables.
3. Local : comptes temporaires de Lyon et Lille ; pertinence locale distincte, accès national conservé. Aucun déplacement inter-ville ajouté.
4. Lu : ouverture puis état lu confirmé côté serveur et après reconnexion.
5. Favori : ajout dans l’interface puis état enregistré conservé après reconnexion.
6. Organisation : ouverture de la bonne organisation depuis un article lié.
7. Carte : ouverture directe du bon lieu sur la carte existante.
8. Notification : événement important lié à une organisation temporaire ; une seule alerte au membre concerné, aucune à l’autre compte. Cinq publications concurrentes sans doublon ; lien depuis l’accueil vers l’article.
9. Temps : date de l’article exactement égale à celle de l’événement et pas dans le futur du monde ; génération rejouée sans doublon.
10. Sécurité : changements directs de titre/date/source sans effet ; historique, favoris, paramètres et notifications invisibles à l’autre compte ; écritures au nom d’autrui et publication joueur refusées ; brouillons cachés ; préférence d’alerte respectée.
11. Persistance : déconnexion/reconnexion, lecture, favori, notifications et préférences retrouvés ; recherche et filtre Locales exercés ; aucun débordement à 444 × 803 et 1280 × 1800, aucune erreur navigateur.

43 tests automatiques réussis, dont 9 nouvelles vérifications des catégories, filtres, accès national, favoris, recherche, ancienneté et personnalisation ; trois vérifications de navigation.

## Régressions des blocs validés
- Vie quotidienne rejouée : étudiant et jeune actif, cours, repos, repas, refus d’emploi puis candidature accessible, salaire unique après reconnexion, transport, logement manuel et double paiement refusé.
- Vie sociale rejouée : dix scénarios réussis, plus invitation avec récompenses différées ; relations, adhésions, départ, participation, réputation, influence, banque et sécurité conservés.
- Un essai groupé a dépassé son délai ; les comptes sociaux temporaires concernés ont été nettoyés. Une coupure de connexion a ensuite interrompu la vérification supplémentaire d’invitation ; la reprise complète a réussi.
- Dernière vérification de compilation : réussie. Aucun échec fonctionnel restant dans les scénarios exécutés.

## Équilibrage initial et décisions
- Nouveau : moins de 24 heures du monde ; récent : moins de 72 heures ; ancien ensuite ; archivé après 7 jours. Les archives restent accessibles, notamment dans les favoris.
- Important : au moins 80 / 100 ; délai entre alertes d’actualités : 6 heures du monde ; une alerte maximum par article et par joueur.
- Une information locale par ville et par journée du monde, plus un bulletin national et un régional par région ; rattrapage borné aux trois journées les plus récentes.
- Traitement autonome une fois par heure réelle : 24 passages par jour, délai maximal d’environ une heure pour publier un événement arrivé à échéance. Ce traitement peut contribuer à l’usage Lovable Cloud même sans joueur connecté.
- Aucun gain d’argent, d’énergie, de réputation sociale ni d’influence à la lecture. La réputation des médias est un affichage séparé.
- Valeurs autoritaires configurées côté serveur ; types, catégories et filtres de présentation centralisés dans `src/game/news.ts`.

## Limites assumées
- Articles fictifs issus de modèles contrôlés ; pas d’IA, de médias réels ni d’Internet. Illustrations génériques fictives, pas des photos des lieux exacts de chaque ville.
- Les informations ne ferment pas les lieux, ne modifient pas les offres, les prix ou les transports : uniquement événement → actualité, conformément au périmètre.
- Notifications dans l’application existante, pas de notifications système du téléphone ni de courriels.
- Tous les historiques sont conservés ; le fil affiche les articles par lots de 20 mais charge actuellement le catalogue complet. Une pagination côté serveur sera nécessaire si le volume devient important.
- Publication autonome programmée et fonction de publication testée manuellement ; l’attente du premier passage horaire réel n’a pas été incluse dans les essais.
- Pas de commentaires, messagerie, réseau social, journalistes jouables, politique complète ni Bloc 6.
- Confirmation réelle par courriel et nom de l’éditeur : points antérieurs toujours non vérifiés/non fournis, sans lien avec le Bloc 5.

## Essais conservés
- `tests/news_persistence.py` : onze scénarios avec comptes temporaires, nettoyage final et captures sous `/tmp/browser/news`.
- `src/game/news.test.ts` et `src/test/app-routing.test.tsx` : règles de présentation et navigation.
- `tests/daily_life_persistence.py` et `tests/social_persistence.py` : régressions existantes.

Ces résultats ne remplacent pas la validation du joueur ni un audit exhaustif. Aucun Bloc 6 ne sera lancé automatiquement.