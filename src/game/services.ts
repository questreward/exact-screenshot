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

export const SERVICE_LABEL: Record<string, string> = { garage: "Garage automobile", demenagement: "Déménagement" };
export const FICTIVE_LABEL = "Entreprise fictive gérée par CIVITAS";
