// Portes des lieux : chaque type de lieu existant ouvre une expérience déjà présente dans le jeu.
export type PlaceDoor = { to: string; label: string };

const DOORS: Record<string, PlaceDoor> = {
  logement: { to: "/chez-moi", label: "Entrer chez moi" },
  magasin: { to: "/boutique", label: "Entrer dans le magasin" },
  commerce: { to: "/boutique", label: "Entrer dans le commerce" },
  mairie: { to: "/ma-ville", label: "Entrer à la mairie" },
  banque: { to: "/banque", label: "Entrer à la banque" },
  universite: { to: "/etudes", label: "Entrer à l’université" },
  entreprise: { to: "/carriere", label: "Aller travailler" },
  administration: { to: "/demarches", label: "Entrer au guichet" },
  gare: { to: "/transports", label: "Entrer dans la gare" },
  station: { to: "/transports", label: "Entrer dans la station" },
  station_service: { to: "/conduite", label: "Voir ma voiture" },
  place: { to: "/evenements", label: "Voir ce qui se passe" },
};
export const placeDoor = (kind: string): PlaceDoor | null => DOORS[kind] ?? null;

const DAYS: Record<string, number> = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };

export type OpenState = { open: boolean; opensAt?: string };

/** Lit les horaires écrits ("Du lundi au samedi, 9 h – 19 h", "Tous les jours, 6 h – 22 h").
 *  Renvoie null si le texte n'est pas compris : aucun badge n'est alors affiché. */
export function openState(hours: string | null | undefined, now: Date): OpenState | null {
  if (!hours || !Number.isFinite(now.getTime())) return null;
  const t = hours.toLowerCase().replace(/\u00a0/g, ' ');
  if (/24 ?h ?(\/|sur) ?24/.test(t) || /^(accès libre|toujours ouvert)\.?$/.test(t.trim())) return { open: true };
  const matches = [...t.matchAll(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s*[–—-]\s*(\d{1,2})\s*(?:h|:)\s*(\d{2})?/g)];
  if (!matches.length) return null;
  const slots = matches.map(m => ({ from: Number(m[1]) * 60 + Number(m[2] ?? 0), to: Number(m[3]) * 60 + Number(m[4] ?? 0) }));
  if (matches.some(m => Number(m[1]) > 23 || Number(m[3]) > 24 || Number(m[2] ?? 0) > 59 || Number(m[4] ?? 0) > 59 || (Number(m[3]) === 24 && Number(m[4] ?? 0) !== 0)) || slots.some(s => s.from === s.to)) return null;
  const range = t.match(/du (\w+) au (\w+)/);
  const a = range?.[1] ? DAYS[range[1]] : undefined;
  const b = range?.[2] ? DAYS[range[2]] : undefined;
  if (range && (a === undefined || b === undefined)) return null;
  const namedDays = Object.entries(DAYS).filter(([name]) => t.includes(name)).map(([, day]) => day);
  // Different schedules on different days need a structured server contract, not a guessed badge.
  if (!range && namedDays.length > 1 && matches.length > 1) return null;
  const accepts = (day: number) => a !== undefined && b !== undefined ? (a <= b ? day >= a && day <= b : day >= a || day <= b) : !namedDays.length || namedDays.includes(day);
  const day = now.getUTCDay(), mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (slots.some(s => s.from < s.to ? accepts(day) && mins >= s.from && mins < s.to : (accepts(day) && mins >= s.from) || (accepts((day + 6) % 7) && mins < s.to))) return { open: true };
  for (let offset = 0; offset < 8; offset++) {
    if (!accepts((day + offset) % 7)) continue;
    const next = slots.filter(s => offset > 0 || s.from > mins).sort((x, y) => x.from - y.from)[0];
    if (!next) continue;
    const fmt = `${String(Math.floor(next.from / 60)).padStart(2, '0')}:${String(next.from % 60).padStart(2, '0')}`;
    const label = offset === 0 ? fmt : offset === 1 ? `demain ${fmt}` : `${Object.keys(DAYS).find(name => DAYS[name] === (day + offset) % 7)} ${fmt}`;
    return { open: false, opensAt: label };
  }
  return null;
}

/** Recherche simple dans les lieux existants (nom, type, quartier), sans accents. */
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function searchPlaces<T extends { name: string; kindLabel: string; district: string }>(list: T[], query: string, max = 8): T[] {
  const q = norm(query.trim());
  if (q.length < 2) return [];
  return list.filter(p => norm(`${p.name} ${p.kindLabel} ${p.district}`).includes(q)).slice(0, max);
}

/** Distance à vol d'oiseau entre deux points réels de la carte, en km (affichage seul). */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
