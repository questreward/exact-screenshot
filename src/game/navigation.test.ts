import { describe, it, expect } from "vitest";
import { SECTIONS, SECTION_GROUPS, HOME_SHORTCUTS } from "./navigation";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("menu groups", () => {
  it("each available menu destination has its own content route", () => {
    for (const section of SECTIONS.filter(s => s.available)) {
      expect(existsSync(resolve('src/routes/_authenticated/_game', `${section.id}.tsx`)), section.id).toBe(true);
    }
  });
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
