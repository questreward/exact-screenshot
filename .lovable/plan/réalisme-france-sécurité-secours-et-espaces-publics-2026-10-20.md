# Réalisme France — sécurité, secours et espaces publics

## Bloc A — Métiers de la sécurité et des secours
Cinq filières : Police nationale, Gendarmerie, Sapeurs-pompiers (volontaire ou professionnel), SAMU (ambulancier, infirmier), Protection civile (bénévole).

**Entrée réaliste**
- Conditions vérifiées par le jeu : âge, nationalité fictive du personnage, diplôme déjà obtenu dans le jeu (Bac, DEAS, etc.), casier propre (lié au module Justice).
- Concours : inscription à une session datée, épreuve écrite (questions à choix sur des situations), épreuve sportive (selon l'énergie et la forme du personnage), entretien.
- École (plusieurs semaines de jeu, payée comme un élève), puis affectation dans une caserne / un commissariat / une brigade d'une ville.
- Protection civile et pompier volontaire : pas de concours, formation courte (PSE1), compatibles avec un autre travail.

**Service lié à la ville**
- Pendant un créneau de service dans l'agenda, des interventions arrivent : elles viennent des vrais faits du jeu (crises du quartier, signalements graves, événements publics, manifestations).
- Chaque intervention propose 2 à 3 choix sans bonne réponse évidente ; le résultat dépend des compétences, de l'énergie et d'un tirage fixe.
- Conséquences : réussite, blessure (arrêt maladie via le module Santé), plainte ou enquête interne, félicitations, avancement.
- Effets sur la ville passés uniquement par les mécanismes existants (effets différés, journal), jamais d'écriture directe.
- Grades réels : gardien de la paix → brigadier → brigadier-chef → major ; sapeur → caporal → sergent → adjudant ; etc. Salaires indicatifs réalistes en tableau de réglages.

## Bloc B — Espaces publics très ressemblants
Trois portails fictifs reprenant le parcours réel, avec nom et logo du jeu et mention FICTIF (jamais les logos officiels) :
- **Allocations (type CAF)** : Mon compte, Mes droits, Déclaration trimestrielle de ressources, Mes paiements, Messages, Attestations à télécharger, simulateur d'aide au logement.
- **Emploi (type France Travail)** : inscription, actualisation mensuelle (avec rappel et radiation pédagogique si oubli, réversible), offres liées aux vrais emplois du jeu, conseiller, ARE simplifiée.
- **Santé (type ameli)** : remboursements, attestation de droits, carte vitale fictive, arrêts de travail (reliés aux blessures du Bloc A).
Ils réutilisent les démarches, documents et montants déjà en place (Vie administrative, Démarches et fiscalité).

## Autres idées de réalisme (à choisir ensuite)
1. Calendrier français : jours fériés, vacances scolaires, rentrée, déclaration d'impôts en mai.
2. Bulletin de paie détaillé (brut, cotisations, net, prélèvement à la source).
3. Permis de conduire réaliste (code, heures, examen) obligatoire pour conduire.
4. Mutuelle et médecin traitant.
5. Prix de l'immobilier et loyers différents selon la ville (Paris plus cher).
6. Grèves et transports perturbés reliés aux syndicats.
7. Service civique et Journée défense et citoyenneté à 16–18 ans.

## Ordre proposé
1. Bloc B (portails) — surtout de l'interface, s'appuie sur l'existant.
2. Bloc A en 2 vagues : (a) concours, école, affectation, grades ; (b) interventions liées à la ville.
Pour chaque vague : règles chiffrées présentées pour validation, puis SQL exact avant installation sur le VPS.

## Détails techniques
- Bloc A : nouvelles tables de réglages (filières, grades, concours, sessions), candidatures/épreuves/affectations, journal d'interventions à clé unique ; services réutilisent le moteur agenda/énergie et les emplois existants ; migration VPS atomique.
- Bloc B : routes sous `_game/` (ex. `/allocations`, `/emploi-public`, `/sante-assurance`), lecture des états existants (admin_state, etc.), nouvelles RPC seulement pour l'actualisation mensuelle.
