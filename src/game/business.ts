// Indications d'affichage seulement : le serveur calcule les vrais résultats.
export type SectorHint = { base_revenue: number; per_worker: number; per_shift: number; weekly_rent: number; npc_wage: number };

/** Chiffre d'affaires moyen estimé pour une semaine (sans la variation aléatoire de ±15 %). */
export function estimatedRevenue(sector: SectorHint, workers: number, shifts: number, cityFactor = 1) {
  return Math.round((sector.base_revenue + sector.per_worker * workers + sector.per_shift * shifts) * cityFactor);
}

/** Charges fixes de la semaine : loyer + employés fictifs + salaires. */
export function weeklyCosts(sector: SectorHint, npcs: number, playerSalaries: number, ownerSalary: number) {
  return sector.weekly_rent + sector.npc_wage * npcs + playerSalaries + ownerSalary;
}

/** Impôt de la semaine : pourcentage du bénéfice (rien en cas de perte) + taxe locale fixe. */
export function weeklyTax(profit: number, profitRate: number, localWeekly: number) {
  return Math.floor(Math.max(0, profit) * profitRate / 100) + localWeekly;
}
