// Présentation uniquement : prix, achats et valeurs réelles sont décidés côté serveur.
export type ShopItem = { id: string; name: string; brand: string; section: string; price: number; sales: number };
export type ShopSort = "prix-asc" | "prix-desc" | "nom" | "populaire";
export type ShopFilter = { search: string; section: string; brand: string; maxPrice: number | null };

export const SECTIONS: Record<string, string> = { tech: "Technologie", maison: "Maison", electromenager: "Électroménager", mode: "Mode", loisirs: "Loisirs", auto: "Voitures", immobilier: "Immobilier" };

/** Frais de notaire indicatifs (7,5 % dans l'ancien), ajoutés au prix d'un bien immobilier. */
export function notaryFees(price: number): number {
  return Math.ceil(price * 0.075);
}

export function filterProducts<T extends ShopItem>(items: T[], f: ShopFilter, sort: ShopSort): T[] {
  const q = f.search.trim().toLowerCase();
  const out = items.filter(p =>
    (!q || `${p.brand} ${p.name}`.toLowerCase().includes(q)) &&
    (!f.section || p.section === f.section) &&
    (!f.brand || p.brand === f.brand) &&
    (f.maxPrice === null || p.price <= f.maxPrice));
  const cmp: Record<ShopSort, (a: T, b: T) => number> = {
    "prix-asc": (a, b) => a.price - b.price,
    "prix-desc": (a, b) => b.price - a.price,
    nom: (a, b) => a.name.localeCompare(b.name, "fr"),
    populaire: (a, b) => b.sales - a.sales || a.price - b.price,
  };
  return [...out].sort(cmp[sort]);
}

/** Valeur estimée après décote annuelle (même formule que le serveur, à titre indicatif). */
export function estimatedValue(price: number, depPercent: number, years: number): number {
  return Math.floor(price * Math.pow(1 - depPercent / 100, Math.max(0, years)));
}

/** Mensualité indicative d'un crédit amortissable (même formule que le serveur). */
export function creditMonthly(principal: number, ratePercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const m = ratePercent / 1200;
  if (m === 0) return Math.ceil(principal / months);
  return Math.ceil(principal * m / (1 - Math.pow(1 + m, -months)));
}

/** Coût total des intérêts d'un crédit, à titre indicatif. */
export function creditCost(principal: number, ratePercent: number, months: number): number {
  return Math.max(0, creditMonthly(principal, ratePercent, months) * months - principal);
}

/** Prix en magasin après la remise de l'enseigne (même arrondi que le serveur). */
export function storePrice(price: number, discountPercent: number): number {
  return price - Math.floor(price * discountPercent / 100);
}

/** Ce que le vendeur reçoit au marché après les frais. */
export function marketNet(price: number, feePercent: number): number {
  return price - Math.floor(price * feePercent / 100);
}

/** Avancement d'un objectif d'achat (0 à 100) et somme qui manque, d'après le solde. */
export function goalProgress(balance: number, price: number): { percent: number; missing: number } {
  if (price <= 0) return { percent: 100, missing: 0 };
  const have = Math.max(0, balance);
  return { percent: Math.min(100, Math.floor(have * 100 / price)), missing: Math.max(0, price - have) };
}

/** Récapitulatif d'un achat à crédit : coût total et budget restant après la signature (même formule que le serveur). */
export function creditRecap(i: { price: number; down: number; fees: number; rate: number; months: number; balance: number; income: number; burden: number }) {
  const principal = Math.max(0, i.price - i.down);
  const monthly = creditMonthly(principal, i.rate, i.months);
  const interest = Math.max(0, monthly * i.months - principal);
  return { principal, monthly, interest, totalCost: i.down + i.fees + monthly * i.months, balanceAfter: i.balance - i.down - i.fees, monthlyLeft: i.income - i.burden - monthly };
}
