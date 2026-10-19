// Présentation uniquement : le score réel est calculé côté serveur.
export const ANSWER_POINTS = 6; // points par niveau de qualité (0, 1 ou 2) d'une réponse
export const MAX_ANSWERS = 3 * 2 * ANSWER_POINTS; // 36

/** Points minimum à obtenir aux réponses pour atteindre le seuil, d'après le profil. */
export function answersNeeded(profileTotal: number, passScore: number): number {
  return Math.max(0, passScore - profileTotal);
}

/** Chance indicative : « facile », « jouable » ou « difficile ». */
export function interviewOutlook(profileTotal: number, passScore: number): "facile" | "jouable" | "difficile" {
  const need = answersNeeded(profileTotal, passScore);
  if (need <= MAX_ANSWERS / 2) return "facile";
  if (need <= MAX_ANSWERS) return "jouable";
  return "difficile";
}

/** Part du salaire consacrée au logement, en pourcentage arrondi. */
export function housingShare(housingMonthly: number, salary: number): number | null {
  if (salary <= 0) return null;
  return Math.round((housingMonthly / salary) * 100);
}

export const HISTORY_LABELS: Record<string, string> = {
  embauche: "Embauche", changement: "Changement d'entreprise", promotion: "Promotion", départ: "Départ",
  licenciement: "Licenciement", formation: "Formation", reconversion: "Reconversion",
};
