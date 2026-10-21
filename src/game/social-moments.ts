// Rencontre du jour et petite mémoire : dérivées des habitants proches et des échanges déjà enregistrés. Rien n'est stocké.
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Au plus une rencontre par jour : même habitant toute la journée, choisi parmi ceux présents autour du joueur. */
export function dailyEncounter<T extends { id: string }>(nearby: T[], characterId: string, now: Date): T | null {
  if (nearby.length === 0) return null;
  const sorted = [...nearby].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[hash(`${characterId}:${now.toISOString().slice(0, 10)}`) % sorted.length]!;
}

/** Quand l'échange a eu lieu, en mots simples (heure du jeu, UTC). */
export function whenLabel(occurredAt: string, now: Date): string {
  const d = new Date(occurredAt);
  const day = (x: Date) => Math.floor(x.getTime() / 86400000);
  const diff = day(now) - day(d);
  if (diff <= 0) return "aujourd'hui";
  if (diff === 1) return "hier";
  if (diff < 7) return DAYS[d.getUTCDay()]!;
  return `il y a ${diff} jours`;
}

/** Dernier échange enregistré avec cet habitant. */
export function lastMemory<T extends { npc_id: string; occurred_at: string }>(history: T[], npcId: string): T | null {
  return history.filter(h => h.npc_id === npcId).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0] ?? null;
}
