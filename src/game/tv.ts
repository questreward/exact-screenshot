// Présentation du JT : chaînes, météo et baromètre. Purement visuel, ne touche à aucune règle du jeu.

export type ChannelId = "national" | "local" | "info";
export const CHANNELS: { id: ChannelId; name: string; tagline: string; anchor: string }[] = [
  { id: "national", name: "CIVITAS 1", tagline: "Le journal de 20 h", anchor: "Claire Delmas" },
  { id: "local", name: "Civi Local", tagline: "Au plus près de votre ville", anchor: "Marc Aubry" },
  { id: "info", name: "Civi Info 24", tagline: "L'info sans interruption", anchor: "Léo Fontaine" },
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const SKIES = ["Ensoleillé", "Éclaircies", "Nuageux", "Averses", "Pluie", "Brumeux"] as const;
export type Weather = { city: string; sky: (typeof SKIES)[number]; min: number; max: number };

/** Météo décorative, identique pour tous les joueurs un jour donné. */
export function weatherFor(cityId: string, cityName: string, date: string): Weather {
  const h = hash(`${cityId}|${date}`);
  const month = Number(date.slice(5, 7)) || 6;
  const season = Math.round(9 * Math.cos(((month - 7) / 6) * Math.PI)); // ≈ +9 l'été, -9 l'hiver
  const max = 15 + season + (h % 7) - 3;
  return { city: cityName, sky: SKIES[(h >>> 4) % SKIES.length]!, min: max - 6 - ((h >>> 8) % 4), max };
}

export type PollRow = { id: string; name: string; symbol: string; score: number };

/** Baromètre de notoriété : part de chaque parti selon influence, réputation et adhérents réels. */
export function popularityBarometer(orgs: { id: string; name: string; symbol: string; influence: number; reputation: number; member_count: number }[]): PollRow[] {
  const weights = orgs.map(o => ({ o, w: Math.max(0, o.influence) + Math.max(0, o.reputation) + 2 * Math.max(0, o.member_count) + 1 }));
  const total = weights.reduce((s, x) => s + x.w, 0);
  if (!total) return [];
  return weights.map(({ o, w }) => ({ id: o.id, name: o.name, symbol: o.symbol, score: Math.round((w / total) * 1000) / 10 }))
    .sort((a, b) => b.score - a.score);
}

/** Texte lu par la voix du présentateur. */
export function speechFor(kind: "news" | "interview", title: string, body: string): string {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  return kind === "interview" ? `Place à nos invités. ${clean(title)}. ${clean(body)}` : `${clean(title)}. ${clean(body)}`;
}

// ---- Casting : 20 journalistes et banque de reportages (purement visuel) ----
export type Topic = "politique" | "ville" | "manif" | "vote" | "economie" | "transport" | "logement" | "societe" | "sante" | "culture" | "meteo" | "ecole" | "general";
export type Journalist = { id: string; name: string; role: "anchor" | "reporter" | "meteo"; channels: ChannelId[]; topics: Topic[] };

export const JOURNALISTS: Journalist[] = [
  { id: "anchor-national", name: "Claire Delmas", role: "anchor", channels: ["national"], topics: [] },
  { id: "anchor-local", name: "Marc Aubry", role: "anchor", channels: ["local"], topics: [] },
  { id: "anchor-info", name: "Léo Fontaine", role: "anchor", channels: ["info"], topics: [] },
  { id: "j01", name: "Hélène Marchal", role: "anchor", channels: ["national"], topics: [] },
  { id: "j02", name: "Samuel Kouassi", role: "anchor", channels: ["national", "info"], topics: [] },
  { id: "j07", name: "Mei Lin Durand", role: "anchor", channels: ["info"], topics: [] },
  { id: "j15", name: "Inès Carvalho", role: "anchor", channels: ["info", "local"], topics: [] },
  { id: "j03", name: "Camille Roussel", role: "reporter", channels: ["local", "national"], topics: ["ville", "vote"] },
  { id: "j04", name: "Julien Ferrand", role: "reporter", channels: ["national", "info"], topics: ["politique"] },
  { id: "j05", name: "Sophie Lambert", role: "meteo", channels: ["national", "local", "info"], topics: ["meteo"] },
  { id: "j06", name: "Karim Benali", role: "reporter", channels: ["info", "national", "local"], topics: ["manif"] },
  { id: "j08", name: "Philippe Garnier", role: "reporter", channels: ["national", "info"], topics: ["economie"] },
  { id: "j09", name: "Laura Weber", role: "reporter", channels: ["local", "info"], topics: ["transport"] },
  { id: "j10", name: "Thomas Rey", role: "reporter", channels: ["national", "info", "local"], topics: ["general"] },
  { id: "j11", name: "Nathalie Perrin", role: "reporter", channels: ["local"], topics: ["economie", "ville"] },
  { id: "j12", name: "Bernard Lefèvre", role: "reporter", channels: ["national"], topics: ["vote", "politique"] },
  { id: "j13", name: "Aïssata Diallo", role: "reporter", channels: ["local", "info"], topics: ["ecole", "societe"] },
  { id: "j14", name: "Antoine Morel", role: "reporter", channels: ["local", "national"], topics: ["logement"] },
  { id: "j16", name: "Hugo Martins", role: "reporter", channels: ["info", "local"], topics: ["sante"] },
  { id: "j17", name: "Françoise Vidal", role: "reporter", channels: ["national", "local"], topics: ["culture"] },
];

/** Vidéos de reportage disponibles (fichiers dans public/tv). */
export const TOPIC_VIDEO: Partial<Record<Topic, string>> = {
  politique: "parlement", ville: "mairie", manif: "manif", vote: "vote", economie: "economie",
  transport: "transport", logement: "logement", societe: "societe", meteo: "meteo", general: "ville-nuit",
};

const TOPIC_WORDS: [Topic, RegExp][] = [
  ["manif", /manif|grève|greve|cortège|mobilis|protest/i],
  ["vote", /élection|election|vote|scrutin|candidat|campagne|sondage/i],
  ["politique", /loi|parlement|député|depute|sénat|senat|gouvernement|ministre|parti|mouvement|réforme/i],
  ["logement", /logement|loyer|habitat|immobili|construction/i],
  ["transport", /transport|train|gare|bus|tram|trafic|route/i],
  ["economie", /économ|econom|entreprise|emploi|chômage|chomage|budget|impôt|impot|commerce|prix|banque/i],
  ["sante", /santé|sante|hôpital|hopital|médec|medec|soin/i],
  ["ecole", /école|ecole|lycée|lycee|étudiant|etudiant|université|universite/i],
  ["culture", /culture|théâtre|theatre|festival|concert|musée|musee/i],
  ["meteo", /météo|meteo|orage|canicule|tempête|tempete|pluie|neige/i],
  ["ville", /mairie|maire|conseil municipal|ville|quartier|consultation|signalement/i],
  ["societe", /association|bénévol|benevol|solidarit|citoyen/i],
];

export function topicFor(text: string): Topic {
  for (const [t, re] of TOPIC_WORDS) if (re.test(text)) return t;
  return "general";
}

/** Présentateur du jour : change chaque jour, toujours le même pour tous les joueurs. */
export function anchorFor(channel: ChannelId, date: string): Journalist {
  const list = JOURNALISTS.filter(j => j.role === "anchor" && j.channels.includes(channel));
  return list[hash(`${channel}|${date}`) % list.length]!;
}

/** Reporter envoyé sur un sujet : spécialiste du thème si possible, sinon un reporter de la chaîne. */
export function reporterFor(channel: ChannelId, topic: Topic, seed: string): Journalist {
  const spec = JOURNALISTS.filter(j => j.role !== "anchor" && j.topics.includes(topic));
  const pool = spec.length ? spec : JOURNALISTS.filter(j => j.role === "reporter" && j.channels.includes(channel));
  return pool[hash(seed) % pool.length]!;
}
