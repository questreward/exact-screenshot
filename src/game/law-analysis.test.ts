import { describe, expect, it } from "vitest";
import { normalizeAnalysis, validateLawText } from "./law-analysis";

describe("analyse de projet de loi", () => {
  it("refuse un texte de moins de 80 caractères", () => {
    expect(() => validateLawText("trop court")).toThrow();
  });
  it("refuse un texte de plus de 6000 caractères", () => {
    expect(() => validateLawText("a".repeat(6001))).toThrow();
  });
  it("ignore les villes inconnues et les indicateurs inventés", () => {
    const r = normalizeAnalysis({ cities: [
      { city: "Atlantis", summary: "x", effects: [] },
      { city: "Lyon", summary: "ok", effects: [{ indicator: "Logement", trend: "hausse" }, { indicator: "Magie", trend: "hausse" }] },
    ] }, ["Lyon"]);
    expect(r.cities.map((c) => c.city)).toEqual(["Lyon"]);
    expect(r.cities[0]!.effects).toEqual([{ indicator: "Logement", trend: "hausse" }]);
  });
});
