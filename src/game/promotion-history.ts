import type { PromotionEntry } from "@/services/game";

/** Grade et raison affichés pour une ligne d'historique (présentation seulement). */
export function promotionView(e: PromotionEntry): { grade: string; reason: string } {
  const after = (e.label.split(" : ")[1] ?? e.label).trim();
  if (e.kind === "entree") return { grade: "En formation", reason: `Entrée au service : ${after}` };
  if (e.kind === "depart") return { grade: "Ancien membre", reason: `Départ du service : ${after}` };
  if (e.key.startsWith("grade-admin:")) return { grade: after, reason: "Nomination par l'administration" };
  return { grade: after, reason: "Nombre de missions réussies atteint" };
}
