import { describe, it, expect } from "vitest";
import { SECTIONS, SECTION_GROUPS, HOME_SHORTCUTS } from "./navigation";

describe("menu groups", () => {
  it("every section appears in exactly one group", () => {
    const all = SECTION_GROUPS.flatMap((g) => g.ids);
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual(SECTIONS.map((s) => s.id).sort());
  });
  it("home keeps 4 to 6 shortcuts", () => {
    expect(HOME_SHORTCUTS.length).toBeGreaterThanOrEqual(4);
    expect(HOME_SHORTCUTS.length).toBeLessThanOrEqual(6);
  });
});
