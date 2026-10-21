import { describe, expect, it } from "vitest";
import { starterGuide } from "./starter-guide";
const base = { firstName: "Léa", age: 17, hasVehicle: false };
describe("guide de démarrage", () => {
  it("6 questions, pas une de plus", () => { expect(starterGuide(base)).toHaveLength(6); });
  it("sans logement → chercher un logement", () => { expect(starterGuide(base)[1]!.to).toBe("/logement"); });
  it("16-17 ans sans travail → études, pas les offres d'emploi", () => { expect(starterGuide(base)[2]!.to).toBe("/etudes"); });
  it("18 ans sans travail → offres d'emploi", () => { expect(starterGuide({ ...base, age: 18 })[2]!.to).toBe("/espace-emploi"); });
});
