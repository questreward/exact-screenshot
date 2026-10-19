// Indication d'affichage : la base décide de tout (dates, tours, résultats).
export type Phase = "none" | "upcoming" | "candidacies" | "waiting" | "round1" | "round2" | "counting" | "done";
export function legislativePhase(e: { candidacies_at: string; candidacies_end_at: string; round1_at: string; round2_at: string; vote_end_at: string; counted: boolean } | null, now: Date): Phase {
  if (!e) return "none";
  if (e.counted) return "done";
  const t = now.getTime(), at = (s: string) => new Date(s).getTime();
  if (t < at(e.candidacies_at)) return "upcoming";
  if (t < at(e.candidacies_end_at)) return "candidacies";
  if (t < at(e.round1_at)) return "waiting";
  if (t < at(e.round2_at)) return "round1";
  if (t < at(e.vote_end_at)) return "round2";
  return "counting";
}
export const PHASE_LABEL: Record<Phase, string> = {
  none: "Aucune élection programmée", upcoming: "Élection programmée", candidacies: "Candidatures ouvertes", waiting: "Candidatures closes",
  round1: "1er tour : bureaux ouverts", round2: "2e tour : bureaux ouverts", counting: "Dépouillement en cours", done: "Résultats proclamés",
};
