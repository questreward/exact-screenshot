import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { introFor } from "./page-intros";
describe("page intros", () => {
  it("every game page has a presentation", () => {
    const ids = readdirSync("src/routes/_authenticated/_game").filter(f => /^[a-z-]+\.tsx$/.test(f) && f !== "route.tsx" && f !== "section.tsx").map(f => f.replace(".tsx", ""));
    const missing = ids.filter(id => { const i = introFor("/" + id); return !i || !i.purpose; });
    expect(missing).toEqual([]);
  });
});
