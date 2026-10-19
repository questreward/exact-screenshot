import { describe, expect, it } from "vitest";
import { CHANNELS, popularityBarometer, weatherFor } from "./tv";

describe("JT", () => {
  it("propose 3 chaînes", () => expect(CHANNELS).toHaveLength(3));
  it("donne la même météo à tout le monde le même jour", () => {
    expect(weatherFor("lyon", "Lyon", "2026-10-19")).toEqual(weatherFor("lyon", "Lyon", "2026-10-19"));
    const w = weatherFor("lyon", "Lyon", "2026-10-19");
    expect(w.min).toBeLessThan(w.max);
  });
  it("classe les partis et totalise environ 100 %", () => {
    const rows = popularityBarometer([
      { id: "a", name: "A", symbol: "", influence: 10, reputation: 10, member_count: 0 },
      { id: "b", name: "B", symbol: "", influence: 50, reputation: 30, member_count: 5 },
    ]);
    expect(rows[0]!.id).toBe("b");
    expect(Math.round(rows.reduce((s, r) => s + r.score, 0))).toBe(100);
  });
});
