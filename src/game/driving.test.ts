import { describe, expect, it } from "vitest";
import { isFlashed, limitAt, tripProgress } from "./driving";

const segs = [
  { from: 0, to: 8, limit: 50, label: "Sortie de ville" },
  { from: 8, to: 22, limit: 90, label: "Départementale" },
  { from: 22, to: 78, limit: 130, label: "Autoroute" },
];

describe("conduite", () => {
  it("limitation selon le tronçon", () => {
    expect(limitAt(segs, 3).limit).toBe(50);
    expect(limitAt(segs, 50).limit).toBe(130);
  });
  it("tolérance de 5 km/h", () => {
    expect(isFlashed(55, 50)).toBe(false);
    expect(isFlashed(56, 50)).toBe(true);
  });
  it("progression du trajet", () => {
    expect(tripProgress("2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z", Date.parse("2026-01-01T11:00:00Z"))).toBe(50);
  });
});
