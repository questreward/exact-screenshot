// Présentation uniquement : le prix réellement payé est calculé par le serveur (service_amount).

/** Prix d'un service selon le tarif de l'entreprise (en % du prix de référence), même arrondi que le serveur. */
export function serviceAmount(ref: number, percent: number): number {
  if (ref <= 0) return 0;
  return Math.max(1, Math.floor(ref * percent / 100));
}

/** Clients fictifs attendus par semaine (même formule que le serveur, à titre indicatif). */
export function expectedNpcClients(rating: number | null, percent: number, base: number, max: number): number {
  const r = rating ?? 3.5;
  return Math.min(max, Math.max(0, base + Math.floor((r - 3) * 2) + Math.trunc((100 - percent) / 15)));
}

export const SERVICE_LABEL: Record<string, string> = { garage: "Garage automobile", demenagement: "Déménagement", immobilier: "Agence immobilière" };
export const FICTIVE_LABEL = "Entreprise fictive gérée par CIVITAS";

// ---- Agence immobilière (indicatif ; le serveur reste seul juge) ----
/** Loyer de référence d'un bien mis en location (prix × ‰). */
export function refRent(price: number, permille: number): number {
  return Math.max(1, Math.round(price * permille / 1000));
}
/** Bornes du loyer qu'un propriétaire peut fixer (en % du loyer de référence). */
export function rentBounds(ref: number, minPct: number, maxPct: number): [number, number] {
  return [Math.ceil(ref * minPct / 100), Math.floor(ref * maxPct / 100)];
}
/** Frais d'agence pour une location : X mois de loyer au tarif de l'agence. */
export function agencyRentFee(monthly: number, months: number, percent: number): number {
  return serviceAmount(monthly * months, percent);
}
/** Frais d'agence pour un achat : % du prix (arrondi au-dessus), puis tarif de l'agence. */
export function agencyBuyFee(price: number, buyPercent: number, percent: number): number {
  return serviceAmount(Math.ceil(price * buyPercent / 100), percent);
}
/** Part de gestion de l'agence sur un loyer (aucune pour l'agence fictive). */
export function manageCut(rent: number, managePercent: number, percent: number | null): number {
  if (percent == null) return 0;
  return Math.min(rent, Math.floor(rent * managePercent / 100 * percent / 100));
}
