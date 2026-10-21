// Presentation only: inspection points derived from the recorded wear percentage.
export type Check = { id: string; label: string; emoji: string; status: "ok" | "minor" | "major" };
const POINTS = [
  { id: "freins", label: "Freins", emoji: "🛑", at: 60 },
  { id: "pneus", label: "Pneus", emoji: "🛞", at: 70 },
  { id: "phares", label: "Phares", emoji: "💡", at: 80 },
  { id: "pollution", label: "Pollution", emoji: "💨", at: 50 },
  { id: "moteur", label: "Moteur", emoji: "⚙️", at: 40 },
];
export function inspectionChecks(pct: number): Check[] {
  return POINTS.map(p => ({ id: p.id, label: p.label, emoji: p.emoji, status: pct >= p.at ? "ok" : pct >= p.at - 20 ? "minor" : "major" }));
}
