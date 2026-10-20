# Génère le bloc INSERT des scénarios de missions (0111). Contenu réaliste, procédures françaises.
import json, hashlib

def W(seed, n):
    # poids 0..2 répartis de façon déterministe : aucune position toujours gagnante
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    w = [2, 1, 0][:n]
    r = h % 6
    perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]
    return [w[i] for i in perms[r][:n]]

# job -> (scénarios, étapes[(texte, [choix])])
J = {}
def job(key, scen, steps): J[key] = (scen, steps)

job("Conseiller bancaire", ["Crédit immobilier d'un jeune couple","Découvert qui se répète","Succession d'un client décédé","Client âgé démarché par un escroc"], [
 ("Rendez-vous : le client expose sa situation", ["Demander les 3 derniers relevés et bulletins de paie","Écouter d'abord, sans rien demander","Simuler tout de suite une offre"]),
 ("Analyse : taux d'endettement et reste à vivre", ["Appliquer strictement la limite de 35 %","Tenir compte d'une hausse de salaire promise","Proposer un apport familial ou un prêt aidé"]),
 ("Décision et devoir de conseil", ["Envoyer le dossier au comité de crédit","Refuser par écrit en expliquant les raisons","Orienter vers un point conseil budget"])])
job("Guichetier", ["Retrait d'espèces inhabituel","Remise de chèques suspects","Procuration contestée","File d'attente qui s'énerve"], [
 ("Accueil au guichet", ["Contrôler la pièce d'identité","Vérifier la signature dans le dossier","Appeler le directeur d'agence"]),
 ("Contrôle anti-blanchiment", ["Questionner sur l'origine des fonds","Bloquer l'opération le temps de vérifier","Exécuter : le client est connu"]),
 ("Traçabilité", ["Faire une déclaration interne au référent","Noter simplement dans le dossier","Ne rien noter, rien d'anormal"])])
job("Conseiller en assurance", ["Dégât des eaux chez un locataire","Sinistre déclaré après 5 jours ouvrés","Franchise contestée","Client qui déménage sans prévenir"], [
 ("Déclaration du sinistre", ["Remplir le constat amiable dégât des eaux","Demander photos et factures","Programmer un expert"]),
 ("Lecture du contrat", ["Appliquer l'exclusion prévue","Accepter un geste commercial","Demander l'avis du service juridique"]),
 ("Réponse à l'assuré", ["Courrier motivé avec voies de recours","Appel téléphonique d'explication","Proposer un avenant au contrat"])])
job("Agent de mairie", ["Acte de naissance incomplet","Inscription scolaire hors délai","Demande de terrasse de café","Accueil de sinistrés après une tempête"], [
 ("Accueil de l'usager", ["Vérifier que la mairie est compétente","Prendre le dossier tel quel","Orienter vers le bon service"]),
 ("Instruction", ["Lister les pièces manquantes par écrit","Appeler l'usager pour compléter","Transmettre à l'élu référent"]),
 ("Clôture", ["Remettre un récépissé de dépôt","Envoyer la réponse par courrier","Proposer un rendez-vous de suivi"])])
job("Agent des impôts", ["Frais réels contestés","Erreur sur la déclaration","Réclamation contre un avis","Demande de délai de paiement"], [
 ("Réception au guichet ou en ligne", ["Vérifier le numéro fiscal et l'avis","Demander une pièce d'identité","Répondre par la messagerie sécurisée"]),
 ("Examen du dossier (secret fiscal)", ["Exiger les justificatifs","Appliquer le droit à l'erreur","Saisir le service de contrôle"]),
 ("Décision", ["Dégrèvement total","Dégrèvement partiel motivé","Rejet avec voies de recours"])])
job("Guichet de préfecture", ["Dossier de titre incomplet","Usager sans rendez-vous","Photo d'identité non conforme","Départ à l'étranger urgent"], [
 ("Recevabilité", ["Contrôler les pièces originales","Vérifier la convocation","Orienter vers un point numérique"]),
 ("Prise d'empreintes et vérifications", ["Recommencer la prise d'empreintes","Signaler une incohérence au chef de bureau","Valider en l'état"]),
 ("Suite du dossier", ["Remettre le récépissé de dépôt","Demander un rendez-vous en urgence","Expliquer les délais à l'usager"])])
job("Facteur", ["Lettre recommandée, destinataire absent","Adresse mal écrite","Boîte aux lettres inaccessible","Colis abîmé"], [
 ("Tri et préparation de la tournée", ["Ranger les objets suivis à part","Scanner chaque objet suivi","Partir vite, retard au centre"]),
 ("Distribution", ["Chercher le voisin ou le gardien","Laisser un avis de passage","Revenir en fin de tournée"]),
 ("Retour au centre", ["Mettre l'objet en instance au bureau","Faire une réclamation qualité","Prévenir l'expéditeur"])])
job("Conseiller Espace Emploi", ["Chômeur longue durée","Jeune sans diplôme","Reconversion après un accident","Radiation contestée"], [
 ("Entretien diagnostic", ["Faire le point sur les compétences","Revoir le CV ensemble","Parler d'abord des freins (logement, transport)"]),
 ("Plan d'action", ["Proposer une immersion en entreprise","Proposer une formation financée","Proposer une offre d'emploi tout de suite"]),
 ("Suivi", ["Fixer le prochain rendez-vous","Signer le projet personnalisé","Orienter vers un partenaire social"])])
job("Aide-soignant", ["Patient qui refuse la toilette","Chute la nuit dans un EHPAD","Repas d'un patient qui avale mal","Famille inquiète"], [
 ("Arrivée auprès du patient", ["Se présenter et demander son accord","Vérifier le plan de soins","Appeler l'infirmier"]),
 ("Soin", ["Adapter le soin au rythme du patient","Faire le soin à deux","Reporter et noter le refus"]),
 ("Transmissions", ["Noter dans le dossier de soins","Transmettre à voix haute à l'équipe","Prévenir la famille"])])
job("Infirmier", ["Erreur de dosage repérée","Patient douloureux","Pansement d'une plaie infectée","Sortie d'hôpital"], [
 ("Vérification de la prescription", ["Contrôler la prescription du médecin","Appeler le médecin de garde","Vérifier l'identité du patient (bracelet)"]),
 ("Soin", ["Réaliser le soin en asepsie stricte","Évaluer la douleur sur 10","Demander un avis à un collègue"]),
 ("Traçabilité", ["Tracer dans le dossier patient","Déclarer un événement indésirable","Faire une transmission orale"])])
job("Pharmacien", ["Ordonnance douteuse","Interaction entre deux médicaments","Rupture de stock","Patient qui veut un antibiotique sans ordonnance"], [
 ("Analyse de l'ordonnance", ["Vérifier les interactions","Appeler le prescripteur","Consulter le dossier pharmaceutique"]),
 ("Délivrance", ["Délivrer avec conseils","Proposer un générique ou un équivalent","Refuser et expliquer"]),
 ("Suivi", ["Noter l'intervention pharmaceutique","Orienter vers le médecin traitant","Commander chez un autre grossiste"])])
job("Médecin", ["Fièvre chez un enfant","Douleur dans la poitrine","Demande d'arrêt de travail","Patient qui refuse un traitement"], [
 ("Interrogatoire", ["Poser des questions ciblées","Écouter sans interrompre","Consulter les antécédents"]),
 ("Examen et décision", ["Faire un électrocardiogramme ou un examen complet","Envoyer aux urgences (15)","Traiter et revoir sous 48 h"]),
 ("Fin de consultation", ["Rédiger une ordonnance claire","Expliquer les signes d'alerte","Programmer un examen complémentaire"])])
job("Assistant social", ["Expulsion locative proche","Violences conjugales","Personne âgée isolée","Jeune à la rue"], [
 ("Premier entretien", ["Évaluer l'urgence","Rassurer et écouter","Rassembler les papiers"]),
 ("Orientation", ["Monter un dossier d'aide (FSL, CAF)","Appeler le 115 ou un foyer","Saisir le juge ou faire un signalement"]),
 ("Suivi", ["Fixer un rendez-vous","Faire une visite à domicile","Faire le point avec les partenaires"])])
job("Professeur des écoles", ["Élève qui ne suit plus","Bagarre dans la cour","Parent en colère","Sortie scolaire"], [
 ("Constat", ["Observer et noter","Parler à l'élève seul","Prévenir le directeur"]),
 ("Action", ["Mettre en place une aide personnalisée","Réunir l'équipe éducative","Convoquer les parents"]),
 ("Suivi", ["Écrire dans le cahier de liaison","Faire un bilan dans 2 semaines","Demander l'aide du RASED"])])
job("Professeur de lycée", ["Copie suspectée de triche","Classe agitée","Élève harcelé","Conseil de classe"], [
 ("Constat", ["Recueillir les faits","Parler à l'élève après le cours","Prévenir le CPE"]),
 ("Réponse", ["Appliquer le règlement intérieur","Proposer une médiation","Saisir le chef d'établissement"]),
 ("Suivi", ["Informer la famille","Noter dans le logiciel de vie scolaire","Faire un suivi avec le professeur principal"])])
job("Surveillant", ["Retards répétés","Élève qui fume devant le lycée","Dispute à la cantine","Alarme incendie"], [
 ("Intervention", ["Séparer et calmer","Demander le carnet de correspondance","Appeler le CPE"]),
 ("Traitement", ["Faire un rapport d'incident","Discuter avec les élèves","Appliquer la punition prévue"]),
 ("Suivi", ["Prévenir les familles","Faire le point avec le CPE","Noter dans le registre"])])
job("Caissier", ["Billet suspect","Client qui conteste un prix","Vol à l'étalage repéré","Panne de terminal carte"], [
 ("Constat", ["Vérifier calmement","Appeler le chef de caisse","Demander au client d'attendre"]),
 ("Action", ["Appliquer la procédure du magasin","Faire un geste commercial","Prévenir la sécurité"]),
 ("Clôture", ["Noter l'incident","Recompter le fond de caisse","Remercier le client"])])
job("Boulanger", ["Four en panne à 4 h","Grosse commande d'une mairie","Allergie au gluten d'un client","Contrôle d'hygiène"], [
 ("Préparation", ["Vérifier stocks et matières premières","Lancer les pâtes en avance","Appeler le dépanneur"]),
 ("Production", ["Respecter les temps de pousse","Adapter la recette","Réduire la production"]),
 ("Vente et hygiène", ["Étiqueter les allergènes","Noter les températures (HACCP)","Prévenir les clients du retard"])])
job("Serveur", ["Client mécontent de son plat","Grosse tablée sans réservation","Client allergique","Addition contestée"], [
 ("Accueil", ["Installer et présenter la carte","Vérifier les réservations","Demander les allergies"]),
 ("Service", ["Prévenir la cuisine","Proposer une alternative","Appeler le responsable"]),
 ("Fin du service", ["Offrir un café","Refaire l'addition","Noter la remarque pour l'équipe"])])
job("Cuisinier", ["Rupture d'un produit","Coup de feu du samedi","Plat renvoyé","Contrôle sanitaire"], [
 ("Mise en place", ["Vérifier les dates (DLC)","Préparer en avance","Revoir les quantités"]),
 ("Service", ["Envoyer en priorité les tables en attente","Remplacer par un plat du jour","Ralentir pour la qualité"]),
 ("Fermeture", ["Nettoyer et désinfecter","Noter les températures","Faire l'inventaire"])])
job("Coiffeur", ["Couleur ratée","Client pressé","Allergie au produit","Rendez-vous oublié"], [
 ("Diagnostic", ["Faire un test de tolérance","Demander ce que veut le client","Montrer des photos"]),
 ("Réalisation", ["Prendre le temps nécessaire","Faire une coupe simple","Demander à un collègue"]),
 ("Fin", ["Offrir une retouche","Conseiller des soins","Noter dans la fiche client"])])
job("Maçon", ["Mur fissuré","Pluie sur le chantier","Livraison de béton en retard","Chantier municipal"], [
 ("Préparation", ["Vérifier les plans","Contrôler les protections (EPI)","Baliser le chantier"]),
 ("Travaux", ["Respecter le temps de séchage","Renforcer avec des armatures","Appeler le chef de chantier"]),
 ("Réception", ["Faire constater par le client","Prendre des photos","Nettoyer le chantier"])])
job("Électricien", ["Tableau électrique ancien","Court-circuit dans une école","Installation de bornes","Panne de l'éclairage public"], [
 ("Sécurité", ["Couper et consigner l'installation","Vérifier l'absence de tension","Porter les équipements de protection"]),
 ("Intervention", ["Remplacer par du matériel aux normes","Réparer provisoirement","Faire un devis complet"]),
 ("Fin", ["Tester avant de remettre le courant","Remettre une attestation","Expliquer les risques au client"])])
job("Chauffeur de bus", ["Passager agressif","Bouchon sur la ligne","Passager malade","Fraude à bord"], [
 ("Prise de service", ["Faire le tour du bus","Vérifier les rétroviseurs","Consulter les consignes du jour"]),
 ("Sur la ligne", ["Garder son calme et parler","Appeler le poste central","Arrêter le bus en sécurité"]),
 ("Fin de service", ["Faire un rapport","Signaler au contrôle","Ranger le bus au dépôt"])])
job("Conducteur de train", ["Signal fermé","Animal sur la voie","Passager qui tire le signal d'alarme","Retard important"], [
 ("Avant le départ", ["Faire les essais de freins","Lire le bulletin de travaux","Vérifier la radio sol-train"]),
 ("En marche", ["Respecter la vitesse limite","Freiner d'urgence","Appeler le régulateur"]),
 ("Arrivée", ["Informer les voyageurs","Remplir le rapport","Passer le relais au collègue"])])
job("Greffier", ["Audience surchargée","Pièce manquante au dossier","Justiciable perdu","Délai de recours"], [
 ("Préparation de l'audience", ["Vérifier les convocations","Classer les pièces","Prévenir le juge"]),
 ("Pendant l'audience", ["Noter fidèlement les débats","Demander une suspension","Vérifier les identités"]),
 ("Après", ["Mettre en forme le jugement","Notifier aux parties","Informer des délais d'appel"])])
job("Avocat", ["Garde à vue d'un client","Divorce difficile","Licenciement contesté","Litige de voisinage"], [
 ("Premier entretien", ["Écouter et recueillir les faits","Demander les documents","Expliquer les honoraires"]),
 ("Stratégie", ["Négocier un accord","Aller au tribunal","Proposer une médiation"]),
 ("Suivi", ["Rédiger les conclusions","Informer le client","Respecter les délais de procédure"])])

# Services de secours : vraies procédures en étapes
SEC = {
 "pompier_pro": [
  ("Feu d'appartement au 3e étage", [
   ("Appel au 18 reçu au CTA-CODIS", ["Faire préciser étage, fumée et victimes","Engager tout de suite un FPT et une échelle (EPA)","Demander des renforts dès l'appel"]),
   ("Arrivée : reconnaissance", ["Faire le tour du bâtiment","Interroger les témoins","Monter directement par l'escalier"]),
   ("Engagement du binôme sous ARI", ["Contrôler les bouteilles et la balise","Établir une lance avant d'entrer","Chercher les victimes d'abord"]),
   ("Attaque du feu", ["Attaque massive à la lance","Fermer les portes pour limiter le feu","Ventiler (ouvrir) avant d'attaquer"]),
   ("Déblai et surveillance", ["Contrôler les points chauds à la caméra thermique","Couper gaz et électricité","Reloger les habitants avec la mairie"]),
   ("Rapport d'intervention", ["Remplir le rapport","Prévenir la police pour une enquête","Faire un retour d'expérience à l'équipe"])]),
  ("Accident de la route avec personne coincée", [
   ("Départ VSR et VSAV", ["Baliser la zone en arrivant","Faire un bilan des victimes","Couper le moteur et caler la voiture"]),
   ("Désincarcération", ["Découper le toit","Ouvrir une porte à l'écarteur","Attendre le médecin du SMUR"]),
   ("Secours à la victime", ["Poser un collier cervical","Surveiller la conscience","Transmettre le bilan au 15"])]),
  ("Feu de végétation près des maisons", [
   ("Alerte", ["Évaluer le vent","Demander des moyens aériens","Prévenir la mairie"]),
   ("Lutte", ["Protéger les maisons d'abord","Attaquer la tête du feu","Faire une ligne d'arrêt"]),
   ("Fin", ["Noyer les lisières","Rester en surveillance la nuit","Faire le bilan des dégâts"])])],
 "police": [
  ("Vol à l'arraché en flagrant délit", [
   ("Appel au 17", ["Demander signalement et direction de fuite","Envoyer la patrouille la plus proche","Prévenir les autres équipages"]),
   ("Interpellation", ["Annoncer « Police ! » et ordonner de s'arrêter","Barrer la route avec le véhicule","Attendre un renfort"]),
   ("Sécurisation", ["Palpation de sécurité","Menottage si danger ou fuite","Récupérer l'objet volé"]),
   ("Notification des droits", ["Lire les droits immédiatement (avocat, médecin, proche)","Prévenir l'OPJ pour la garde à vue","Demander un interprète si besoin"]),
   ("Procédure", ["Rédiger le procès-verbal d'interpellation","Entendre la victime (dépôt de plainte)","Récupérer les images de vidéosurveillance"]),
   ("Avis au procureur", ["Aviser le magistrat de permanence","Préparer le dossier pour un jugement","Proposer une mesure alternative"])]),
  ("Différend familial avec violences", [
   ("Arrivée sur place", ["Séparer les personnes","Vérifier la présence d'enfants","Écouter chacun à part"]),
   ("Constatations", ["Noter les blessures et appeler les secours","Saisir une arme éventuelle","Recueillir des témoignages"]),
   ("Suite", ["Placer l'auteur en garde à vue","Orienter la victime (aide aux victimes)","Aviser le procureur"])]),
  ("Contrôle routier, conducteur sous l'emprise", [
   ("Contrôle", ["Demander papiers et dépistage d'alcool","Vérifier le fichier des véhicules","Faire couper le moteur"]),
   ("Dépistage positif", ["Faire souffler à l'éthylomètre","Immobiliser le véhicule","Retenir le permis"]),
   ("Procédure", ["Rédiger le PV","Convoquer au tribunal","Prévenir un proche pour le véhicule"])])],
}
SEC["pompier_vol"] = SEC["pompier_pro"]
SEC["gendarmerie"] = [(t.replace("17","17 (CORG)"), s) for t, s in SEC["police"]]
SEC["samu_ambulancier"] = [
  ("Malaise dans la rue", [
   ("Régulation : appel au 15", ["Faire préciser conscience et respiration","Engager une ambulance tout de suite","Guider les témoins au téléphone (massage)"]),
   ("Bilan sur place", ["Bilan vital : conscience, respiration, pouls","Mettre en position latérale de sécurité","Prendre tension et glycémie"]),
   ("Transmission au médecin régulateur", ["Passer un bilan complet","Demander un SMUR","Proposer un transport à l'hôpital"]),
   ("Transport", ["Surveiller pendant le trajet","Prévenir l'hôpital de l'arrivée","Rassurer la famille"])]),
  ("Arrêt cardiaque dans un magasin", [
   ("Arrivée", ["Massage cardiaque immédiat","Poser le défibrillateur","Libérer l'espace autour"]),
   ("Réanimation", ["Alterner les masseurs toutes les 2 minutes","Demander le SMUR","Insuffler de l'oxygène"]),
   ("Suite", ["Transmettre au SMUR","Accompagner la famille","Remplir la fiche bilan"])])]
SEC["samu_infirmier"] = SEC["samu_ambulancier"]
SEC["protection_civile"] = [
  ("Poste de secours pendant un concert", [
   ("Installation", ["Monter le poste et faire un brief","Se répartir dans la foule","Faire le lien radio avec le 15"]),
   ("Personne blessée", ["Faire un bilan","Appliquer les premiers secours","Demander une évacuation"]),
   ("Fin", ["Rédiger les fiches","Démonter le poste","Faire le retour d'expérience"])]),
  ("Hébergement après une inondation", [
   ("Ouverture du centre", ["Recenser les sinistrés","Installer lits et couvertures","Prévenir la mairie"]),
   ("Accompagnement", ["Distribuer repas et boissons","Écouter et rassurer","Repérer les personnes fragiles"]),
   ("Fin", ["Faire le point avec la préfecture","Organiser le relogement","Rédiger le bilan"])])]

rows = []
for key, (scen, steps) in J.items():
    for i, title in enumerate(scen):
        st = [{"text": t, "choices": [{"label": c, "weight": w} for c, w in zip(ch, W(f"{key}{i}{t}", len(ch)))]} for t, ch in steps]
        rows.append((f"{key}:{i}", key, title, st))
for key, scens in SEC.items():
    for i, (title, steps) in enumerate(scens):
        st = [{"text": t, "choices": [{"label": c, "weight": w} for c, w in zip(ch, W(f"{key}{i}{t}", len(ch)))]} for t, ch in steps]
        rows.append((f"{key}:{i}", key, title, st))

def q(s): return "$data$" + s + "$data$"
out = [
       "INSERT INTO public.job_mission_scripts(id,job_key,title,steps) VALUES"]
out.append(",\n".join(f"({q(a)},{q(b)},{q(c)},{q(json.dumps(d, ensure_ascii=False))}::jsonb)" for a, b, c, d in rows))
out.append("ON CONFLICT(id) DO UPDATE SET job_key=excluded.job_key,title=excluded.title,steps=excluded.steps;")
print("\n".join(out))
