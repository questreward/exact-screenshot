// Aides d'affichage (indicatives). Les règles qui comptent sont appliquées par le serveur.

export function healthLabel(health: number): string {
  if (health >= 80) return "Excellente";
  if (health >= 60) return "Bonne";
  if (health >= 40) return "Fragile";
  if (health >= 20) return "Mauvaise";
  return "Critique";
}

export function moraleLabel(morale: number): string {
  if (morale >= 75) return "Au top";
  if (morale >= 50) return "Correct";
  if (morale >= 25) return "En baisse";
  return "Au plus bas";
}

/** Soutien affiché d'une revendication : base simulée + 10 par joueur, plafonné à 100. */
export function unionSupport(simBase: number, players: number, perPlayer: number): number {
  return Math.min(100, simBase + players * perPlayer);
}

/** Pression d'une grève : moitié de la base simulée + points par jour de grève, plafonnée à 100. */
export function strikePressure(simBase: number, strikeDays: number, perDay: number): number {
  return Math.min(100, Math.floor(simBase / 2) + strikeDays * perDay);
}

/** Prime d'une grève gagnée : retenues × multiplicateur, avec un minimum. */
export function strikePrime(withheld: number, multiplier: number, minimum: number): number {
  return Math.max(minimum, withheld * multiplier);
}

export const JUSTICE_CATEGORIES = {
  diffamation: "Diffamation",
  harcelement: "Harcèlement",
  escroquerie: "Escroquerie",
  non_paiement: "Non-paiement",
  autre: "Autre",
} as const;
