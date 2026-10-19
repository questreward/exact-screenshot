// Carte de France réelle : données statiques servies depuis /geo (aucun service externe).

/** Code INSEE des communes jouables → identifiant de ville du jeu. */
export const PLAYABLE_INSEE: Record<string, string> = {
  "75056": "paris", "69123": "lyon", "13055": "marseille", "59350": "lille", "33063": "bordeaux",
};
export const PLAYABLE_CENTER: Record<string, [number, number]> = {
  paris: [2.347, 48.8589], lyon: [4.8351, 45.758], marseille: [5.3806, 43.2803], lille: [3.0469, 50.6311], bordeaux: [-0.5874, 44.8572],
};

/** [code INSEE, nom, code postal, population, longitude, latitude, code circonscription] */
export type CommuneRow = [string, string, string, number, number, number, string];
/** [code INSEE, nom, code postal, code département] */
export type CommuneIndexRow = [string, string, string, string];

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[-'’]/g, " ").replace(/\s+/g, " ").trim();
}

/** Recherche par nom (début de mot prioritaire) ou code postal. */
export function searchCommunes(index: CommuneIndexRow[], query: string, limit = 20): CommuneIndexRow[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  if (/^\d+$/.test(q)) return index.filter(r => r[2].startsWith(q)).slice(0, limit);
  const starts: CommuneIndexRow[] = [], contains: CommuneIndexRow[] = [];
  for (const r of index) {
    const n = normalize(r[1]);
    if (n.startsWith(q)) starts.push(r); else if (n.includes(q)) contains.push(r);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

/** « 0104 » → « 4e circonscription de l'Ain » (nom du département fourni). */
export function circoLabel(code: string, depName: string): string {
  const n = Number(code.slice(-2));
  return `${n === 1 ? "1re" : `${n}e`} circonscription · ${depName}`;
}

export function formatPopulation(n: number): string {
  return n.toLocaleString("fr-FR") + " hab.";
}
