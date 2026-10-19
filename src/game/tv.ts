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
