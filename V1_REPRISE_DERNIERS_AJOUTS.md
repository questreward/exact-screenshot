# CIVITAS — reprise du dernier lot avant clôture

Alex demande le 20 octobre à 18:27 de terminer les ajouts manquants avant clôture. Le gel précédent ne vaut plus abandon de ce lot. Aucun SQL appliqué ni site VPS mis à jour ici.

## Ajouts préparés dans le jeu
- Depuis une mission enregistrée de secours/pompiers/Protection civile/SAMU, ouvrir un intérieur de véhicule d’intervention et revenir aux choix. Radio, rétroviseurs et poste de conduite ; aucun trajet, vitesse ou opération médicale inventés. La patrouille ouvre un intérieur de voiture.
- Les reportages du JT alternent des passages tirés de l’édition enregistrée, avec illustration locale, journaliste à l’image, clips locaux disponibles, sous-titres et voix française locale si l’appareil en possède une. Le texte n’est pas généré par Ollama ; aucun service externe ni nouvelle mémoire IA. Sur téléphone, les passages se lisent sous l’image pour éviter le chevauchement.
- Antennes et notes Protection civile : 0114 corrigée après refus des droits hérités ; restauration VPS réussie, nouvel essai SQL requis avant installation.

## Catalogue : préalable à la proposition exacte
Le rapport VPS compte 62 produits. 0115 prépare 9 938 ajouts littéraux et une recherche/pagination SQL, avec achats et anciens IDs conservés. Voir `V1_INSTALLATIONS_0114_0115.md` pour les effets exacts et le nouvel essai groupé. Aucun ajout appliqué sur VPS ici.

Contrôle **lecture seule**, à joindre au prochain retour VPS :

```bash
cd /data/civitas-live/app &&
git pull --ff-only &&
docker exec -i civitas-db psql -X -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/tools/check_catalog_v1.sql &&
bash vps/tools/prepare_v1_freeze.sh
```

Ce contrôle compte les produits et rubriques réellement présents et les magasins compatibles, sans lire les données privées des joueurs. Il évite d’affirmer un total à partir des seuls fichiers initiaux. Le SQL exact d’extension à 10 000 sera présenté séparément : aucune insertion de produit, modification de prix ou fonction d’achat n’est autorisée par ce contrôle.

## Proposition à valider pour le catalogue
Des marques fictives et des fiches réellement distinctes : usage, matière, capacité, dimensions ou équipement ; pas de numéros ou couleurs ajoutés uniquement pour gonfler le nombre. Objets durables achetés par le système existant et distribués aux magasins de leurs rubriques. Les produits déjà installés restent inchangés.

Fourchettes proposées, fictives : accessoires et petits objets 5–100 €, vêtements/sport 10–500 €, mobilier 25–3 000 €, électronique/électroménager 20–3 000 €. Les voitures/logements existants restent dans le total mais ne sont ni remplacés ni artificiellement multipliés. Aucun effet d’énergie, diplôme, soin, mission ou argent nouveau attaché à ces produits. Accord sur ces tarifs puis SQL exact et essai isolé requis.

## Clôture encore bloquée
Installation 0114, catalogue complet, vérification réelle du JT/intérieurs sur VPS et parcours téléphone restent à effectuer. Génération vidéo par modèle non livrée ni promise : reportages illustrés animés avec voix locale seulement. Ne pas déclarer la V1 clôturée avant restauration des données du jeu et essais réels ; pg_cron reste exclu du contrôle isolé et sa restauration complète n’est pas certifiée.