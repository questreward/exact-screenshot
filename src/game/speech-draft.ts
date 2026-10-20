// Presentation/validation helpers for the advisory presidential speech draft (no game effect).
export const GOALS_MIN = 20;
export const GOALS_MAX = 1500;

export function validateGoals(raw: unknown): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (t.length < GOALS_MIN) throw new Error(`Décrivez vos objectifs en au moins ${GOALS_MIN} caractères.`);
  if (t.length > GOALS_MAX) throw new Error(`Vos objectifs ne doivent pas dépasser ${GOALS_MAX} caractères.`);
  return t;
}

/** Keeps only plain text and enforces the speech limit set by the game. */
export function cleanSpeech(raw: unknown, limit: number): string {
  const t = typeof raw === "string" ? raw.replace(/\r/g, "").replace(/[*#_`]/g, "").trim() : "";
  return t.slice(0, Math.max(0, limit)).trim();
}
