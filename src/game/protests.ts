// Indications d'affichage seulement : les vraies vérifications sont faites par le serveur.
export const PROTEST_STATUS: Record<string, string> = { planned: "À venir", success: "Réussie", failed: "Peu suivie" };

export function canCallProtest(age: number, minAge: number) {
  return age >= minAge;
}

/** Heures proposées (8 h à 20 h) pour un jour donné, en respectant le délai minimum. */
export function availableHours(nowIso: string, dayOffset: number, noticeHours = 2): number[] {
  const now = new Date(nowIso);
  const limit = now.getTime() + noticeHours * 3600_000;
  const hours: number[] = [];
  for (let h = 8; h <= 20; h++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, h));
    if (d.getTime() >= limit) hours.push(h);
  }
  return hours;
}

export function protestProgress(registered: number, threshold: number) {
  return Math.min(100, Math.round((registered / Math.max(1, threshold)) * 100));
}
