// Indications d'affichage seulement : le serveur calcule les vrais remboursements.
/** Part payée par l'assureur : coût moins franchise, dans la limite du plafond. */
export function insurerShare(cost: number, deductible: number, cap: number, covered: boolean) {
  if (!covered) return 0;
  return Math.min(Math.max(cost - deductible, 0), cap);
}
