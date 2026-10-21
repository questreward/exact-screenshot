import { describe, expect, it } from "vitest";
import { decorForJob, hasTruckKit } from "./job-decor";
import { cleanReaction, interventionPrompt, validateIntervention } from "./intervention";

describe("décor selon le métier", () => {
  it("un guichetier travaille au bureau", () => { expect(decorForJob("Guichetier")).toBe("bureau"); });
  it("un facteur est dans la rue", () => { expect(decorForJob("Facteur")).toBe("rue"); });
  it("un pompier a le matériel du camion", () => { expect(hasTruckKit("pompier_pro")).toBe("pompiers"); });
  it("un conseiller bancaire n'a pas de camion", () => { expect(hasTruckKit("Conseiller bancaire")).toBeNull(); });
});

describe("récit d'intervention", () => {
  it("refuse une action de plus de 300 caractères", () => {
    expect(() => validateIntervention({ action: "a".repeat(301), kit: [] })).toThrow(/trop longue/);
  });
  it("accepte 300 caractères et garde au plus 6 matériels", () => {
    const r = validateIntervention({ action: "a".repeat(300), kit: ["1", "2", "3", "4", "5", "6", "7"] });
    expect(r.kit).toHaveLength(6);
  });
  it("interdit au récit de décider du résultat", () => {
    expect(interventionPrompt({ job: "Pompier", title: "Feu", step: "Fumée", choices: [], kit: [], city: "Lyon" })).toMatch(/Ne décide JAMAIS du résultat/);
  });
  it("coupe un récit trop long", () => { expect(cleanReaction("x".repeat(900)).length).toBe(700); });
});
