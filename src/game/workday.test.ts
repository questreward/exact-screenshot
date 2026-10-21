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
