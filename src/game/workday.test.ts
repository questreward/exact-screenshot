import { describe, expect, it } from "vitest";
import { workProfile, workTimeline } from "./workday";

describe("workday", () => {
  it("firefighter checks the truck fuel", () => expect(workProfile("Sapeur-pompier professionnel").prep[0]!.label).toMatch(/carburant/));
  it("car dealer opens the showroom", () => expect(workProfile("Vendeur en concession").start).toBe("Ouvrir le showroom"));
  it("unknown job gets the common day", () => expect(workProfile("Boulanger").key).toBe("bureau"));
  it("an 8h–17h shift has its break at 12:30", () => {
    const t = workTimeline("2026-10-21T08:00:00Z", "2026-10-21T17:00:00Z");
    expect(t.find(x => x.label === "Pause")!.at.toISOString()).toBe("2026-10-21T12:30:00.000Z");
  });
});

import { workMood as wm, remaining as rem, workProfile as wp } from "./workday";
describe("other jobs", () => {
  it("teacher works at school", () => expect(wp("Professeur des écoles").key).toBe("ecole"));
  it("mason is on a site", () => expect(wp("Maçon").key).toBe("chantier"));
  it("same day same mood", () => expect(wm("2026-10-21", "commerce")).toEqual(wm("2026-10-21", "commerce")));
  it("remaining time label", () => expect(rem(0, new Date(252 * 60000).toISOString())).toBe("4 h 12 restantes"));
});
