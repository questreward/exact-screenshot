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
  if (!hours) return null;
  const t = hours.toLowerCase();
  if (/24 ?h ?(\/|sur) ?24/.test(t)) return { open: true };
  const m = t.match(/(\d{1,2}) ?h ?(\d{2})? ?[–-] ?(\d{1,2}) ?h ?(\d{2})?/);
  if (!m) return null;
  const from = Number(m[1]) * 60 + Number(m[2] ?? 0), to = Number(m[3]) * 60 + Number(m[4] ?? 0);
  let dayOk = true;
  const range = t.match(/du (\w+) au (\w+)/);
  const day = now.getUTCDay();
  if (range && range[1]! in DAYS && range[2]! in DAYS) {
    const a = DAYS[range[1]!]!, b = DAYS[range[2]!]!;
    dayOk = a <= b ? day >= a && day <= b : day >= a || day <= b;
  }
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const fmt = `${String(Math.floor(from / 60)).padStart(2, "0")}:${String(from % 60).padStart(2, "0")}`;
  if (dayOk && mins >= from && mins < to) return { open: true };
  return { open: false, opensAt: dayOk && mins < from ? fmt : `demain ${fmt}` };
}

/** Recherche simple dans les lieux existants (nom, type, quartier), sans accents. */
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function searchPlaces<T extends { name: string; kindLabel: string; district: string }>(list: T[], query: string, max = 8): T[] {
  const q = norm(query.trim());
  if (q.length < 2) return [];
  return list.filter(p => norm(`${p.name} ${p.kindLabel} ${p.district}`).includes(q)).slice(0, max);
}
