import { describe, expect, it } from "vitest";
import { answersNeeded, housingShare, interviewOutlook } from "./career";

describe("carrière (indications)", () => {
  it("calcule les points de réponses nécessaires pour le seuil de 50", () => {
    expect(answersNeeded(24, 50)).toBe(26);
    expect(answersNeeded(60, 50)).toBe(0);
  });
  it("classe la difficulté d'un entretien", () => {
    expect(interviewOutlook(40, 50)).toBe("facile");
    expect(interviewOutlook(24, 50)).toBe("jouable");
    expect(interviewOutlook(8, 50)).toBe("difficile");
  });
  it("donne la part du logement dans le salaire", () => {
    expect(housingShare(600, 1500)).toBe(40);
    expect(housingShare(600, 0)).toBeNull();
  });
});
