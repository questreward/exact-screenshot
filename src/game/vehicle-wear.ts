// Presentation-only hints; the server computes and charges the real repair price.
export function garagePrice(ref: number, percent: number) {
  return Math.round(ref * percent / 100);
}
export function wearLevel(pct: number, breakdownBelow = 40): "bon" | "use" | "risque" | "immobilise" {
  if (pct <= 0) return "immobilise";
  if (pct < breakdownBelow) return "risque";
  if (pct < 70) return "use";
  return "bon";
}
