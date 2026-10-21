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
  { test: /conseiller bancaire|guichetier|assurance/i, p: P("banque", "Agence", "Collègues de l'agence", null, "Recevoir les clients et traiter leurs dossiers.", "Ouvrir mon guichet",
    [["💻", "Allumer mon poste"], ["📅", "Relire les rendez-vous"], ["📂", "Préparer les dossiers en attente"]]) },
  { test: /mairie|impôts|préfecture|espace emploi|greffier/i, p: P("admin", "Bureau d'accueil", "Collègues du service", null, "Accueillir le public et traiter les demandes.", "Ouvrir l'accueil",
    [["💻", "Ouvrir le logiciel du service"], ["🎫", "Lancer les tickets d'attente"], ["📂", "Trier le courrier du jour"]]) },
  { test: /facteur/i, p: P("facteur", "Plateforme de La Poste", "Équipe de distribution", "Vélo ou voiture jaune", "Distribuer toute la tournée.", "Commencer ma tournée",
    [["📬", "Trier le courrier de ma tournée"], ["📦", "Charger les colis"], ["🚲", "Vérifier mon véhicule"]]) },
  { test: /aide-soignant|médecin|pharmacien|assistant social/i, p: P("soin", "Cabinet ou service de soins", "Équipe soignante", null, "Prendre soin de chaque patient.", "Prendre mon poste",
    [["🧼", "Se laver les mains et s'équiper"], ["📋", "Lire les transmissions"], ["📅", "Regarder les patients du jour"]]) },
  { test: /professeur|surveillant/i, p: P("ecole", "Établissement scolaire", "Équipe pédagogique", null, "Faire avancer chaque élève.", "Arriver à l'école",
    [["📚", "Préparer le cours du jour"], ["🖨️", "Imprimer les documents"], ["☕", "Passer en salle des profs"]]) },
  { test: /caissier|boulanger|serveur|cuisinier|coiffeur/i, p: P("commerce", "Commerce", "Collègues du magasin", null, "Bien servir chaque client.", "Ouvrir la boutique",
    [["🧹", "Préparer l'espace client"], ["📦", "Mettre en place les produits"], ["💶", "Préparer la caisse"]]) },
  { test: /maçon|électricien/i, p: P("chantier", "Chantier", "Équipe du chantier", "Camionnette", "Avancer le chantier en sécurité.", "Arriver sur le chantier",
    [["⛑️", "Mettre casque et chaussures de sécurité"], ["🧰", "Vérifier les outils"], ["📐", "Lire le plan du jour"]]) },
  { test: /chauffeur de bus|conducteur de train/i, p: P("conduite", "Dépôt", "Régulation et collègues conducteurs", "Bus ou train", "Assurer chaque départ à l'heure.", "Prendre mon service",
    [["🔑", "Récupérer mon véhicule"], ["🔍", "Faire le tour de contrôle"], ["🗺️", "Lire la feuille de service"]]) },
  { test: /avocat/i, p: P("avocat", "Cabinet d'avocats", "Associés et secrétariat", null, "Défendre au mieux tes clients.", "Arriver au cabinet",
    [["📂", "Relire les dossiers du jour"], ["📅", "Vérifier les audiences"], ["✉️", "Lire les courriers"]]) },
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

const MOODS: Record<string, string[]> = {
  commerce: ["Journée calme, quelques habitués.", "Grosse affluence à midi.", "Livraison de marchandise le matin.", "Un client difficile à rassurer."],
  ecole: ["Classe attentive aujourd'hui.", "Sortie scolaire à préparer.", "Réunion avec des parents en fin de journée.", "Contrôle à surveiller."],
  soin: ["Service calme.", "Beaucoup de patients ce matin.", "Un nouveau collègue à accompagner.", "Une urgence en milieu de journée."],
  chantier: ["Le béton arrive à 10 h.", "Météo difficile, prudence.", "Contrôle du chef de chantier.", "Journée de finitions."],
};
const MOOD_DEFAULT = ["Journée calme.", "Journée chargée.", "Réunion d'équipe le matin.", "Un dossier urgent à traiter."];
const COLLEAGUES = ["« Tu prends un café ? »", "« Tu peux m'aider deux minutes ? »", "« Bonne journée à toi ! »", "« On mange ensemble à midi ? »", "« Pense au point de 15 h. »"];

/** Daily flavour, deterministic per day and job: same day = same story, different days differ. */
export function workMood(day: string, key: string) {
  let h = 0; for (const c of day + key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const list = MOODS[key] ?? MOOD_DEFAULT;
  return { mood: list[h % list.length]!, colleague: COLLEAGUES[(h >> 3) % COLLEAGUES.length]! };
}

/** "4 h 12 restantes" style label, never negative. */
export function remaining(nowMs: number, endIso: string) {
  const m = Math.max(0, Math.round((Date.parse(endIso) - nowMs) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} restantes` : `${m} min restantes`;
}
