import { describe, expect, it } from "vitest";
import { searchServices } from "./public-services";

describe("searchServices", () => {
  it("logement → aides au logement", () => expect(searchServices("logement").map((h) => h.to)).toContain("/caisse-des-aides"));
  it("emploi → espace emploi", () => expect(searchServices("emploi")[0].to).toBe("/espace-emploi"));
  it("impôts → déclaration", () => expect(searchServices("impôts")[0].label).toMatch(/déclaration/));
  it("naissance → état civil", () => expect(searchServices("naissance")[0].to).toBe("/ma-ville"));
});
