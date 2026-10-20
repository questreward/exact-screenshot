// Presentation-only hints; the server computes quarters and the real pension.
export function quartersForYear(grossAnnual: number, quarterGross = 1800) {
  return Math.min(4, Math.floor(grossAnnual / quarterGross));
}
export function quartersProgress(quarters: number, full = 172) {
  return Math.min(100, Math.round(quarters * 100 / full));
}
