// Affichage seulement : amendes et points sont décidés par la base (drive_report).
export type DriveSegment = { from: number; to: number; limit: number; label: string };
export type DriveRadar = { at: number; limit: number };

export const limitAt = (segments: DriveSegment[], pct: number) =>
  segments.find(s => pct >= s.from && pct < s.to) ?? segments[segments.length - 1]!;

export const isFlashed = (speed: number, limit: number, tolerance = 5) => speed > limit + tolerance;

// Progression du trajet (0–100) selon l'heure du jeu.
export const tripProgress = (start: string, end: string, now: number) => {
  const a = new Date(start).getTime(), b = new Date(end).getTime();
  return Math.max(0, Math.min(100, ((now - a) / Math.max(1, b - a)) * 100));
};
