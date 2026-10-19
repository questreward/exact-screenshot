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

export const INDICATOR_LABELS: Record<string, string> = {
  housing: "Logement", employment: "Emploi", transport: "Transports", environment: "Environnement", safety: "Sécurité",
  services: "Services publics", commerce: "Commerce", culture: "Culture", satisfaction: "Satisfaction",
};

/** Points de soutien affichés d'un projet citoyen (indicatif ; le serveur fait foi). */
export function projectScore(simBase: number, mobilization: number, supporters: number, weight: number, donations: number, step: number): number {
  return Math.min(100, simBase + mobilization + supporters * weight + Math.min(10, Math.floor(donations / step)));
}

/** Décision simulée du conseil selon le score. */
export function projectVerdict(score: number, t: { approve: number; partial: number; postpone: number }): "accepte" | "partiel" | "reporte" | "refuse" {
  if (score >= t.approve) return "accepte";
  if (score >= t.partial) return "partiel";
  if (score >= t.postpone) return "reporte";
  return "refuse";
}

/** Points d'indicateur regagnés par une réponse de crise (arrondi au supérieur). */
export function crisisRecovery(drop: number, pct: number): number {
  return Math.ceil((Math.abs(drop) * pct) / 100);
}

export function formatEuros(n: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(n)} €`;
}
