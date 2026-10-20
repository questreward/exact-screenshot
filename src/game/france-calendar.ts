// Affichage seulement : la base applique les jours fériés (pas de cours, travail payé double) avec la même règle.
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/** Dimanche de Pâques (algorithme de Meeus), en UTC. */
export function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}

export function holidays(y: number): { date: string; label: string }[] {
  const e = easter(y);
  return [
    { date: `${y}-01-01`, label: "Jour de l'an" }, { date: iso(addDays(e, 1)), label: "Lundi de Pâques" },
    { date: `${y}-05-01`, label: "Fête du Travail" }, { date: `${y}-05-08`, label: "Victoire 1945" },
    { date: iso(addDays(e, 39)), label: "Ascension" }, { date: iso(addDays(e, 50)), label: "Lundi de Pentecôte" },
    { date: `${y}-07-14`, label: "Fête nationale" }, { date: `${y}-08-15`, label: "Assomption" },
    { date: `${y}-11-01`, label: "Toussaint" }, { date: `${y}-11-11`, label: "Armistice 1918" }, { date: `${y}-12-25`, label: "Noël" },
  ].sort((a, b) => a.date.localeCompare(b.date));
}

/** Vacances scolaires simplifiées, identiques pour toute la France (affichage). */
export function schoolBreaks(y: number): { from: string; to: string; label: string }[] {
  return [
    { from: `${y - 1}-12-20`, to: `${y}-01-04`, label: "Vacances de Noël" },
    { from: `${y}-02-14`, to: `${y}-03-02`, label: "Vacances d'hiver" },
    { from: `${y}-04-11`, to: `${y}-04-27`, label: "Vacances de printemps" },
    { from: `${y}-07-04`, to: `${y}-08-31`, label: "Grandes vacances" },
    { from: `${y}-10-17`, to: `${y}-11-02`, label: "Vacances de la Toussaint" },
    { from: `${y}-12-19`, to: `${y + 1}-01-03`, label: "Vacances de Noël" },
  ];
}

export function dayInfo(now: Date) {
  const d = iso(now), y = now.getUTCFullYear();
  const holiday = holidays(y).find(h => h.date === d) ?? null;
  const school = schoolBreaks(y).find(b => d >= b.from && d <= b.to) ?? null;
  const next = [...holidays(y), ...holidays(y + 1)].find(h => h.date > d) ?? null;
  return { holiday, school, next };
}

/** Bulletin de paie : le net actuel du jeu est conservé, le brut est recalculé (cotisations salariales 22 %). */
export const CONTRIBUTIONS = [
  { label: "Sécurité sociale — vieillesse", rate: 0.069 },
  { label: "Retraite complémentaire", rate: 0.04 },
  { label: "CSG et CRDS", rate: 0.097 },
  { label: "Santé, chômage et autres", rate: 0.014 },
];
export function payslip(net: number) {
  const gross = Math.round(net / 0.78);
  const lines = CONTRIBUTIONS.map(c => ({ label: c.label, amount: Math.round(gross * c.rate) }));
  const diff = gross - net - lines.reduce((s, l) => s + l.amount, 0);
  if (lines[0]) lines[0].amount += diff; // l'arrondi ne change jamais le net
  return { gross, lines, net };
}
