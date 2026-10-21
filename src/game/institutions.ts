// Présentation seulement : la base (0121) contrôle droits, plafonds et « une décision par jour ».
export type InstitutionState = {
  mayor: boolean; president: boolean; mayor_max: number; president_max: number; law_gain: number;
  used: ("mairie" | "elysee")[];
  decrees: { kind: "mairie" | "elysee"; title: string; gauge: string; delta: number; district_id: string | null; created_at: string }[];
};
export const GAUGES = [
  { id: "cadre", label: "Cadre de vie" }, { id: "tranquillite", label: "Tranquillité" }, { id: "animation", label: "Animation" },
] as const;
export function decreeError(kind: "mairie" | "elysee", title: string, delta: number, max: number): string | null {
  const t = title.trim();
  if (t.length < 5 || t.length > 80) return "Le titre doit faire entre 5 et 80 caractères.";
  if (delta === 0 || Math.abs(delta) > max) return `L'effet doit être entre 1 et ${max} points.`;
  return kind === "mairie" || kind === "elysee" ? null : "Institution inconnue.";
}
