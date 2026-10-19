// Libellés de la vérification des faits et de la vie des partis (le calcul est fait par le serveur).
export const VERDICTS: Record<string, { label: string; tone: string }> = {
  vrai: { label: "Vrai", tone: "bg-success text-success-foreground" },
  plutot_vrai: { label: "Plutôt vrai", tone: "bg-primary/20 text-foreground" },
  trompeur: { label: "Trompeur", tone: "bg-warning text-warning-foreground" },
  faux: { label: "Faux", tone: "bg-destructive text-destructive-foreground" },
  "invérifiable": { label: "Impossible à vérifier", tone: "bg-muted text-foreground" },
};
export const VOTE_KINDS: Record<string, string> = { president: "Élection du président", motion: "Motion", programme: "Changement de programme", alliance: "Vote sur une alliance", congres: "Congrès" };
export const COALITION_STATUS: Record<string, string> = { proposee: "Proposé", refusee: "Refusé", active: "En cours", rompue: "Rompu", respectee: "Respecté jusqu'au bout" };

/** Sièges cumulés et majorité absolue d'une coalition. */
export function coalitionMajority(seatsA: number, seatsB: number, totalSeats: number): { seats: number; majority: boolean } {
  const seats = seatsA + seatsB;
  return { seats, majority: totalSeats > 0 && seats > totalSeats / 2 };
}
