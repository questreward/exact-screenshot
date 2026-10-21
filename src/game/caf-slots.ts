/** Créneaux CAF proposés : jours ouvrés, 9h–11h et 14h–16h (heure de Paris), 7 jours. Le serveur revérifie. */
export const CAF_HOURS = [9, 10, 11, 14, 15, 16];
export const CAF_MOTIVES = [
  { id: "logement", label: "Aide au logement" }, { id: "famille", label: "Prestations familiales" },
  { id: "rsa", label: "RSA" }, { id: "dossier", label: "Suivi de mon dossier" }, { id: "autre", label: "Autre question" },
] as const;

function parisParts(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return p as Record<string, string>;
}

export function cafSlots(now: Date): { day: string; slots: Date[] }[] {
  const out: { day: string; slots: Date[] }[] = [];
  for (let h = 1; h <= 24 * 7; h++) {
    const d = new Date(Math.floor(now.getTime() / 3600000) * 3600000 + h * 3600000);
    const p = parisParts(d);
    if (p.weekday === "Sat" || p.weekday === "Sun" || !CAF_HOURS.includes(Number(p.hour))) continue;
    const day = `${p.year}-${p.month}-${p.day}`;
    const last = out[out.length - 1];
    if (last?.day === day) last.slots.push(d); else out.push({ day, slots: [d] });
  }
  return out;
}
