// Indications d'interface seulement : la base vérifie tout (longueurs, photo, mots interdits, 3 par jour).
export const PRESS_LIMITS = { titleMin: 5, titleMax: 120, bodyMin: 50, bodyMax: 3000, photoMax: 270000, dailyMax: 3 };
export function articleProblem(title: string, body: string): string | null {
  const t = title.trim().length, b = body.trim().length;
  if (t < PRESS_LIMITS.titleMin || t > PRESS_LIMITS.titleMax) return `Titre : ${PRESS_LIMITS.titleMin} à ${PRESS_LIMITS.titleMax} caractères.`;
  if (b < PRESS_LIMITS.bodyMin || b > PRESS_LIMITS.bodyMax) return `Article : ${PRESS_LIMITS.bodyMin} à ${PRESS_LIMITS.bodyMax} caractères.`;
  return null;
}
