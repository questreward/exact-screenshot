# Bloc 7 — Politique & mouvements : rapport de validation

## Fonctionnalités
- 4 partis et 5 mouvements fictifs (symbole, description, ville d’origine, portée, slogan, réputation, influence, membres, date de création), sur le système générique d’organisations et d’adhésions. Associations citoyennes, mouvements et partis restent séparés (les associations sont dans « Organisations », la politique dans « Politique »).
- Idéologie sur 8 axes (services publics, économie de marché, écologie, libertés, sécurité, institutions, territoires, Europe), valeurs et priorités. Positions présentées comme repères internes au jeu.
- Comparateur neutre : axes, valeurs/priorités communes et distinctes, réputation, influence, membres, implantation, affinité.
- Opinions sur 9 sujets (non définie / faible / modérée / forte), modifiables, contradictions autorisées, jamais déduites du parcours. Affinité indicative en %, sans blocage.
- Profil politique : intérêt, engagement, réputation et influence politiques (0–100, séparées du social), organisations, historique.
- Adhésion avec rôle Membre, départ, un seul parti à la fois (mouvements cumulables), mouvement local réservé à sa ville. Hiérarchie Sympathisant → Dirigeant préparée, aucune promotion possible pour l’instant.
- 35 activités politiques (réunion, débat, conférence, tractage, rencontre citoyenne, réunion locale, événement public) dans l’agenda existant, avec récompenses versées une seule fois à la fin.
- 48 personnalités fictives (dirigeants, porte-parole, responsables locaux, élus municipaux fictifs, militants, journalistes) rencontrées via les relations existantes.
- 7 actualités politiques fictives liées à une organisation, une personnalité et une ville ; « Voir sur la carte » depuis sièges, permanences et activités ; app Politique du téléphone déverrouillée ; résumé sur le profil.

## Tests (tests/politics_persistence.py, comptes temporaires supprimés)
1 Découverte ✔ · 2 Parti ✔ · 3 Comparateur ✔ · 4 Opinions ✔ · 5 Adhésion ✔ · 6 Départ ✔ · 7 Activité ✔ · 8 Personnalité ✔ · 9 Actualité ✔ · 10 Carte ✔ · 11 Reconnexion ✔ · 12 Sécurité ✔
- 56 tests automatiques réussis (dont 6 sur l’affinité et le comparateur).
- Régressions réussies : vie quotidienne, vie sociale (1–10), citoyenneté (1–12). Aucun compte de test restant.

## Problèmes rencontrés et corrections
- Aperçu servant d’anciennes versions de fichiers : rafraîchi.
- Test des catégories d’actualités mis à jour pour la catégorie « Politique ».
- Marqueur du comparateur peu lisible sur mobile : contraste renforcé.

## Limites
- Actualités politiques fixes (7 articles) ; pas encore de génération horaire dédiée.
- Pas de promotions de rôle, pas d’élections, candidatures, campagnes, sondages ni institutions nationales (Bloc 8).
