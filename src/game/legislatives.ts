// Données de présentation (législatives 2024). Le dépouillement des futures élections se fera en base.
export type LegParty = { label: string; color: string; bloc: string };
export type LegSeat = { n: string; d: string; l: string; dn: string; i: number; r1: [string, number][]; r2: [string, number][] };
export type LegData = { parties: Record<string, LegParty>; seats: Record<string, LegSeat> };
export const ASSEMBLY_SEATS = 577;
export const ASSEMBLY_MAJORITY = Math.floor(ASSEMBLY_SEATS / 2) + 1;

export function seatsByParty(data: LegData): { code: string; seats: number }[] {
  const c: Record<string, number> = {};
  for (const s of Object.values(data.seats)) c[s.n] = (c[s.n] ?? 0) + 1;
  return Object.entries(c).map(([code, seats]) => ({ code, seats })).sort((a, b) => b.seats - a.seats);
}
export function seatsByBloc(data: LegData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of Object.values(data.seats)) { const b = data.parties[s.n]?.bloc ?? "autre"; out[b] = (out[b] ?? 0) + 1; }
  return out;
}
