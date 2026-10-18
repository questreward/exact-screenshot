# Bloc 14 — Étape 2 : plan détaillé (aucune application)

Périmètre strict : 1) travaux qui rallongent réellement le transport public, 2) effets nationaux différents selon la ville, 3) marqueurs d'événements sur la Carte. Parlement, Sénat, véhicules personnels, multijoueur et Bloc 15 sont exclus.

## 1. Ce qui existe déjà (réutilisé, non remplacé)
- Événements : table `events` (ville, lieu, début, fin, portée, propriétaire pour le personnel), modèles `world_event_templates`, génération et état du Bloc 12.
- Travaux : modèle « Travaux de voirie » (gares, 10 h), aujourd'hui sans effet réel.
- National : modèle « Grande campagne nationale de solidarité », sans effet.
- Trajets : `start_life_activity('transport', lieu cible)` crée une activité avec heure de fin ; l'Agenda lit cette heure de fin.
- Indicateurs de ville : `city_indicators` et `indicator_history` (Ma Ville).
- Carte : marqueurs de lieux dans le quartier ; fiche lieu avec la section Événements du Bloc 12.
- Protections : écritures uniquement côté serveur, événements personnels privés, registres anti-doublon.

## 2. Écrans et interface (à ajouter)
- **Bouton Transport public** (fiche gare/station) : quand une perturbation concerne le trajet, le bouton affiche « 30 min + 20 min de travaux = 50 min » et le nom des travaux, avant confirmation. Sans perturbation : affichage inchangé.
- **Agenda / Vie quotidienne** : le trajet en cours affiche sa durée réelle et la mention « Rallongé par : Travaux de voirie ».
- **Fiche événement national** (page Événements et Monde) : nouvelle ligne « Effet dans votre ville : aucun / faible / moyen / fort » avec l'explication.
- **Carte du quartier** : un petit badge « événement » sur le marqueur d'un lieu qui a au moins un événement actif public. Un seul badge par lieu, avec le nombre si plusieurs.
- **Clic sur le badge** : 1 événement → ouvre sa fiche existante (boutons du Bloc 12 conservés) ; plusieurs → ouvre la liste des événements du lieu, puis la fiche choisie.
- Aucune autre page modifiée. Grands boutons tactiles, textes en français.

## 3. Tables et colonnes (à ajouter, aucune suppression)
- `world_event_templates` : + `travel_delay_minutes` (entier, défaut 0). Valeur proposée : 20 pour « Travaux de voirie », 0 pour tous les autres.
- `events` : + `travel_delay_minutes` (entier, défaut 0), recopié du modèle à la publication ; les 65 événements existants gardent 0, donc aucun effet rétroactif.
- `world_settings` (réglages existants des événements, `world_event_settings`) : + `travel_delay_cap_minutes` (défaut 40).
- `activities` : + `travel_delay_minutes` (entier, défaut 0) et + `travel_event_ids` (liste d'identifiants, vide par défaut) — trace des travaux appliqués, figée au départ.
- **Nouvelle table** `world_event_city_effects` : événement, ville, niveau (`none`, `low`, `medium`, `strong`), valeur appliquée, date. **Unique (événement, ville).**
- `world_event_templates` : + `city_effect_indicator` (texte, facultatif) et + `city_effect_values` (niveau → points). Pour la campagne nationale : indicateur `satisfaction`, valeurs aucun 0 / faible 1 / moyen 2 / fort 3.

## 4. Fonctions serveur
- **Modifiée** `start_life_activity` (branche transport public uniquement) : calcule le retard une seule fois au départ, l'ajoute à l'heure de fin, enregistre retard et travaux appliqués. Les autres activités restent identiques.
- **Nouvelle** `transport_delay_preview(lieu cible)` (lecture seule) : renvoie la durée de base, le retard et les travaux concernés, pour l'affichage avant confirmation.
- **Modifiée** `publish_world_event` : recopie `travel_delay_minutes` ; pour un événement national, crée ses effets par ville.
- **Nouvelle** `world_event_city_effects_apply(événement)` (interne) : une ligne par ville, puis ajout des points à l'indicateur de la ville avec trace dans `indicator_history`.
- **Modifiée** `world_events_state` : ajoute l'effet de la ville du joueur et la liste des lieux ayant un événement public actif (pour les badges).
- Non modifiées : trajets en véhicule personnel (fonction du patrimoine), génération aléatoire, participations et récompenses du Bloc 12, `game_now`, `move_character`.

## 5. Règles de calcul
- **Travaux concernés** : événement actif (début ≤ heure du monde < fin), statut non annulé, retard > 0, même ville que le trajet, lieu = lieu de départ ou lieu d'arrivée (ou sans lieu précis = toute la ville).
- **Retard** = somme des retards des travaux concernés, plafonnée à 40 min (réglage). Exemple : deux travaux de 20 min → 40 min ; trois → 40 min.
- **Durée finale** = durée de base du transport (réglage existant) + retard, figée au départ. Des travaux qui commencent ou se terminent pendant le trajet ne changent rien.
- **Effet national par ville** : niveau calculé à partir de l'indicateur `satisfaction` existant de la ville au moment de la publication : ≥ 70 → aucun ; 50–69 → faible ; 30–49 → moyen ; < 30 → fort (les villes en difficulté profitent davantage de la solidarité). Même entrée → même résultat.
- Les événements nationaux sans réglage d'effet affichent « aucun effet » et n'écrivent rien. Événements personnels : jamais d'effet de ville.

## 6. Permissions
- Nouvelles colonnes et table en lecture seule pour les joueurs ; écriture uniquement par les fonctions sécurisées du serveur.
- `world_event_city_effects` : lecture pour les joueurs connectés (donnée publique, sans aucune information personnelle) ; aucune insertion, modification ni suppression par les joueurs.
- `transport_delay_preview` : appel réservé aux joueurs connectés, ne renvoie que des événements publics de leur ville.
- Badges de Carte : uniquement les événements locaux, régionaux et nationaux ; les événements personnels sont exclus côté serveur.

## 7. Anti-doublon
- Trajet : verrou existant sur le personnage et refus d'une seconde activité en cours → double clic et clics simultanés ne créent qu'un trajet et n'appliquent le retard qu'une fois. Le retard est enregistré dans le trajet ; rechargement et reconnexion relisent la valeur sans recalcul.
- Effet national : unicité (événement, ville) ; l'indicateur n'est modifié que si la ligne vient d'être créée.
- Carte : un badge par lieu (regroupement côté serveur et à l'affichage) ; consultations répétées en lecture seule.
- Même événement sur plusieurs écrans : affichage seulement, aucune écriture.

## 8. Cas limites
- Travaux expirés ou annulés → aucun retard, badge absent.
- Travaux dans une autre ville ou sur des lieux non concernés → trajet inchangé.
- Trajet annulé → aucun effet supplémentaire ; un nouveau départ recalcule selon les travaux du moment.
- Ville sans indicateur `satisfaction` → niveau « aucun ».
- Ville ajoutée après l'événement → pas d'effet rétroactif.
- Indicateur borné à 0–100 comme aujourd'hui.
- Plusieurs événements au même lieu, dont un personnel → le badge ne compte que les publics.

## 9. Tests prévus
Comptes temporaires isolés, créés seulement après validation du SQL, puis supprimés et vérifiés. État initial relevé avant (tables, événements, indicateurs, fonctions, permissions) et comparé après.

**Transport** : trajet normal = durée de base ; trajet concerné = +20 min ; retard appliqué une seule fois ; rechargement pendant le trajet ; reconnexion ; travaux expirés = aucun retard ; trajet non concerné ; deux travaux = 40 min, trois = 40 min (plafond) ; deux clics simultanés = un trajet ; Agenda affiche la bonne heure de fin ; véhicule personnel inchangé ; aperçu avant confirmation = durée réelle.

**National** : même événement, deux villes, niveaux différents ; aucun doublon après deux publications ; une seule trace par ville dans l'historique ; rechargement et reconnexion ; événement expiré = aucun nouvel effet ; événement personnel = aucun effet ni visibilité ; joueur incapable d'écrire dans le registre.

**Carte** : événement actif → badge ; expiré → absent ; clic → bonne fiche avec boutons du Bloc 12 ; trois événements au même lieu → un badge, liste de trois ; événement personnel absent ; rechargement ; reconnexion ; second compte ne voit pas l'événement privé du premier.

**Automatiques** : nouveaux tests pour le calcul du retard et du plafond, le niveau selon l'indicateur et le regroupement des badges ; relance de toute la suite existante.

## 10. Régressions concernées (Blocs 1–13)
Relancées sans modifier les anciens tests : Carte et déplacements (Bloc 2), vie quotidienne et Agenda (Bloc 3), Ma Ville et indicateurs (Blocs 6 et 9), événements du monde (Bloc 12), Monde (Bloc 13), parcours économique (déplacement en véhicule, Bloc 10). Empreinte de l'horloge commune et 39 événements d'origine vérifiés inchangés.

## 11. Valeurs à approuver
- Retard des Travaux de voirie : **20 min**.
- Plafond cumulé : **40 min**.
- Effet national : indicateur `satisfaction`, seuils 70 / 50 / 30, points 0 / 1 / 2 / 3.

Après votre accord sur ce plan, le SQL exact sera présenté séparément, sans application.
