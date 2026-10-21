// Presentation only: vocabulary and rhythm of a security/rescue shift. Outcomes stay with the secured shift.
export type SecurityDay = {
  base: string; team: string; vehicle: string; emoji: string;
  prep: [string, string][];          // [emoji, label]
  rhythm: string[];                  // day steps spread on the real shift
  alert: string;                     // how a mission arrives
  act: string[];                     // on-site steps before the decision
  back: [string, string][];          // return-to-base steps
  depart?: [string, string][];       // leaving the base, before arriving on site
  report?: boolean;                  // police-like services write a report draft
};

const FIRE: SecurityDay = {
  base: "Caserne", team: "Équipe de garde", vehicle: "Camion de pompiers", emoji: "🚒",
  prep: [["📋", "Consulter le planning de garde"], ["👥", "Retrouver mon équipe"], ["⛽", "Vérifier le camion (carburant, état)"], ["🧯", "Vérifier le matériel"], ["🧥", "Préparer ma tenue"]],
  rhythm: ["Arrivée à la caserne", "Vérifications", "Garde", "Repas en caserne", "Manœuvre", "Relève"],
  alert: "🚨 ALERTE — départ immédiat",
  act: ["Évaluer", "Protéger", "Intervenir", "Évacuer", "Contrôler"],
  depart: [["🧥", "S'équiper en 1 minute"], ["🚒", "Monter dans le camion"], ["🚨", "Gyrophares et sirène"], ["🗺️", "Suivre l'itinéraire"]],
  back: [["🚒", "Garer le camion"], ["🗣️", "Débrief avec l'équipe"], ["🧰", "Réapprovisionner le matériel"], ["📋", "Retour au planning"]],
};
const DAYS: Record<string, SecurityDay> = {
  pompier_pro: FIRE, pompier_vol: FIRE,
  police: { base: "Commissariat", team: "Brigade", vehicle: "Voiture de police", emoji: "🚓",
    prep: [["🗣️", "Briefing de la brigade"], ["🦺", "Prendre mon équipement"], ["🚓", "Vérifier la voiture"], ["📻", "Tester la radio"]],
    rhythm: ["Briefing", "Patrouille", "Contrôles", "Pause", "Patrouille", "Rapports et fin"],
    alert: "📻 Appel radio — intervention demandée",
    act: ["Arriver et observer", "Sécuriser", "Dialoguer", "Agir"],
    depart: [["🚓", "Monter dans la voiture"], ["📻", "Confirmer à la radio"], ["🚨", "Gyrophare"], ["🗺️", "Rejoindre l'adresse"]],
    back: [["🚓", "Retour au commissariat"], ["🗺️", "Reprendre la patrouille"]], report: true },
  gendarmerie: { base: "Brigade de gendarmerie", team: "Patrouille de secteur", vehicle: "Véhicule de gendarmerie", emoji: "🚓",
    prep: [["🗣️", "Briefing de la brigade"], ["🦺", "Équipement et gilet"], ["🚙", "Vérifier le véhicule"], ["🗺️", "Lire les consignes du secteur"]],
    rhythm: ["Briefing", "Patrouille du secteur", "Contrôle routier", "Pause", "Surveillance", "Compte rendu"],
    alert: "📻 Appel du centre opérationnel",
    act: ["Se rendre sur zone", "Observer", "Sécuriser", "Agir"],
    depart: [["🚙", "Monter dans le véhicule"], ["📻", "Confirmer au centre"], ["🗺️", "Rejoindre la zone"]],
    back: [["🚙", "Retour à la brigade"], ["🗺️", "Reprendre la patrouille"]], report: true },
  samu_ambulancier: { base: "Hôpital · urgences", team: "Équipage SMUR", vehicle: "Ambulance", emoji: "🚑",
    prep: [["🚑", "Vérifier l'ambulance"], ["💊", "Contrôler le sac médical"], ["🩺", "Tester le défibrillateur"], ["📋", "Relève de l'équipe précédente"]],
    rhythm: ["Relève", "Vérifications", "Garde", "Pause", "Garde", "Transmission"],
    alert: "📞 Appel du 15 — départ SMUR",
    act: ["Bilan de la victime", "Gestes de soins", "Stabiliser", "Transporter"],
    depart: [["🚑", "Monter dans l'ambulance"], ["🚨", "Gyrophares"], ["🗺️", "Suivre l'itinéraire"]],
    back: [["🏥", "Arrivée aux urgences"], ["🗣️", "Transmission à l'équipe"], ["🧴", "Nettoyer et recharger l'ambulance"]] },
  protection_civile: { base: "Local de la Protection civile", team: "Équipe de bénévoles", vehicle: "Véhicule de secours", emoji: "🚐",
    prep: [["🎒", "Préparer les sacs de secours"], ["🚐", "Vérifier le véhicule"], ["📋", "Lire le planning du poste"]],
    rhythm: ["Accueil des bénévoles", "Installation du poste", "Poste de secours", "Pause", "Poste de secours", "Rangement"],
    alert: "📻 Demande d'aide sur le poste",
    act: ["Observer", "Porter secours", "Rassurer", "Orienter"],
    back: [["🚐", "Retour au local"], ["🗣️", "Débrief"], ["🎒", "Refaire les sacs"]] },
};
DAYS["samu_infirmier"] = DAYS["samu_ambulancier"]!;

export function securityDay(service: string): SecurityDay {
  return DAYS[service] ?? FIRE;
}
