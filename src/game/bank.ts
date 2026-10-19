// Indications d'affichage seulement : le serveur recalcule et vérifie tout.
/** Mensualité d'un prêt à taux fixe (arrondie au crédit supérieur). */
export function monthlyPayment(amount: number, months: number, annualRate: number) {
  const m = annualRate / 100 / 12;
  if (m === 0) return Math.ceil(amount / months);
  return Math.ceil((amount * m) / (1 - Math.pow(1 + m, -months)));
}

/** Plafond d'emprunt : 6 × revenu mensuel, 20 000 max, 1 000 max avant 18 ans. */
export function loanCap(income: number, age: number, s: { max_loan: number; income_multiplier: number; minor_max_loan: number }) {
  const cap = Math.min(s.max_loan, income * s.income_multiplier);
  return age < 18 ? Math.min(cap, s.minor_max_loan) : cap;
}

export function scoreLabel(score: number, min: number) {
  if (score < min) return "Insuffisante";
  if (score < 60) return "Fragile";
  if (score < 85) return "Correcte";
  return "Excellente";
}
