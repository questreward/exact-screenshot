import { describe, expect, it } from "vitest";
import { shiftVisitors, satisfaction } from "./client-dialogue";
describe("client dialogue", () => {
  it("gives 3 stable visitors per shift", () => {
    expect(shiftVisitors("2026-10-21", "concession")).toHaveLength(3);
    expect(shiftVisitors("2026-10-21", "concession")[0]!.name).toBe(shiftVisitors("2026-10-21", "concession")[0]!.name);
  });
  it("keeps satisfaction within 0-100", () => {
    for (const v of shiftVisitors("2026-01-01", "pompier", 10)) for (const c of v.scene.choices) { const s = satisfaction(v, c); expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(100); }
  });
});
