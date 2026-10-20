// Affichage seulement : le calcul officiel est fait par la base (income_tax_compute).
export const DEFAULT_THRESHOLDS = [11497, 29315, 83823, 180294];
export const DEFAULT_RATES = [0, 11, 30, 41, 45];

export function estimateTax(income: number, thresholds = DEFAULT_THRESHOLDS, rates = DEFAULT_RATES) {
  if (income <= 0) return { abatement: 0, taxable: 0, tax: 0, rate: 0 };
  const abatement = Math.min(income, Math.min(14171, Math.max(495, Math.round(income * 0.1))));
  const taxable = income - abatement;
  let tax = 0, lo = 0;
  rates.forEach((r, i) => {
    const hi = thresholds[i] ?? Infinity;
    if (taxable > lo) tax += (Math.min(taxable, hi) - lo) * r / 100;
    lo = hi;
  });
  tax = Math.round(tax);
  return { abatement, taxable, tax, rate: Math.round((tax * 10000) / income) / 100 };
}

export const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;
export const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
