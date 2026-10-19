// Indications d'interface seulement : la base calcule les vrais montants (media_settle_owner / media_subscribe).
export const INDICATOR_LABELS: Record<string, string> = {
  housing: "Logement", employment: "Emploi", transport: "Transports", environment: "Environnement",
  safety: "Sécurité", services: "Services publics", commerce: "Commerce", culture: "Culture", satisfaction: "Satisfaction",
};
export const indicatorLabel = (id: string) => INDICATOR_LABELS[id] ?? id;

export const TONES = [
  { id: "neutre", label: "Neutre" },
  { id: "positif", label: "Positif" },
  { id: "critique", label: "Critique" },
] as const;
export type Tone = (typeof TONES)[number]["id"];

/** Lecteurs fictifs d'une semaine : contenus × par contenu + abonnés joueurs × par abonné, plafonné. */
export function weeklyReaders(items: number, players: number, s: { npc_per_item: number; npc_per_player?: number; npc_cap?: number }) {
  return Math.min(s.npc_cap ?? 300, Math.max(0, items) * s.npc_per_item + Math.max(0, players) * (s.npc_per_player ?? 2));
}
/** Revenu des lecteurs fictifs, en euros entiers (arrondi vers le bas). */
export const readersRevenue = (readers: number, cents: number) => Math.floor((readers * cents) / 100);
