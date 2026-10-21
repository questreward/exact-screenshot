// Presentation only: the shape of a work day around an existing work activity. Pay and results stay server-side.
export type WorkProfile = { key: string; place: string; team: string; vehicle: string | null; objective: string; prep: { id: string; label: string; emoji: string }[]; start: string };

const P = (key: string, place: string, team: string, vehicle: string | null, objective: string, start: string, prep: [string, string][]): WorkProfile =>
  ({ key, place, team, vehicle, objective, start, prep: prep.map(([emoji, label], i) => ({ id: `${key}-${i}`, emoji, label })) });

const PROFILES: { test: RegExp; p: WorkProfile }[] = [
  { test: /pompier|sapeur/i, p: P("pompier", "Caserne", "Équipe de garde", "Camion de pompiers", "Être prêt à partir en moins de 2 minutes.", "Prendre ma garde",
    [["⛽", "Vérifier le carburant du camion"], ["🔧", "Contrôler l'état du camion"], ["🧯", "Vérifier l'équipement (tenue, ARI, lances)"], ["📻", "Tester la radio"]]) },
  { test: /gendarm/i, p: P("gendarmerie", "Brigade de gendarmerie", "Patrouille de secteur", "Véhicule de gendarmerie", "Assurer la sécurité du secteur.", "Prendre mon service",
    [["🚓", "Vérifier le véhicule"], ["🦺", "Équipement et gilet"], ["🗺️", "Lire les consignes du secteur"]]) },
  { test: /polic|agent de surveillance/i, p: P("police", "Commissariat", "Brigade de jour", "Voiture de police", "Patrouiller et répondre aux appels.", "Prendre mon service",
    [["🚓", "Vérifier la voiture de patrouille"], ["🦺", "Équipement et radio"], ["📋", "Lire le planning de la brigade"]]) },
  { test: /samu|ambulanc|infirmier|urgence/i, p: P("samu", "Hôpital · service des urgences", "Équipe SMUR", "Ambulance", "Être disponible pour chaque appel du 15.", "Prendre ma garde",
    [["🚑", "Vérifier l'ambulance"], ["💊", "Contrôler le sac médical"], ["🩺", "Tester le défibrillateur"]]) },
  { test: /protection civile|secouriste/i, p: P("pc", "Local de la Protection civile", "Équipe de bénévoles", "Véhicule de secours", "Tenir le poste de secours.", "Prendre mon poste",
    [["🎒", "Préparer les sacs de secours"], ["🚐", "Vérifier le véhicule"], ["📋", "Lire le planning du poste"]]) },
  { test: /concession|vendeur auto|commercial auto|automobile/i, p: P("concession", "Showroom de la concession", "Équipe commerciale", null, "Accueillir les clients et conclure des ventes.", "Ouvrir le showroom",
    [["🚗", "Mettre les voitures en valeur"], ["🧹", "Préparer l'espace d'accueil"], ["📅", "Relire les rendez-vous clients"]]) },
];
const DEFAULT = P("bureau", "Lieu de travail", "Collègues", null, "Mener à bien ta journée.", "Commencer ma journée",
  [["🗂️", "Préparer mon poste de travail"], ["📅", "Regarder le planning du jour"], ["☕", "Saluer les collègues"]]);

export function workProfile(jobTitle: string | null | undefined): WorkProfile {
  return PROFILES.find(x => x.test.test(jobTitle ?? ""))?.p ?? DEFAULT;
}

/** Steps of the day placed on the real shift times. */
export function workTimeline(startIso: string, endIso: string) {
  const s = Date.parse(startIso), e = Date.parse(endIso), d = e - s;
  const at = (f: number) => new Date(s + d * f);
  return [
    { label: "Prise de service", at: at(0) },
    { label: "Préparation", at: at(0.03) },
    { label: "Activité", at: at(0.12) },
    { label: "Pause", at: at(0.5) },
    { label: "Reprise", at: at(0.58) },
    { label: "Fin de service", at: at(1) },
  ];
}
