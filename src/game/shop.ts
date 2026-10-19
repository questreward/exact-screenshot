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
