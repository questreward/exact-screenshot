import { describe, expect, it } from "vitest";
import { greetingLine, moodFromEnergy } from "./character-look";

describe("humeur", () => {
  it("dépend de l'énergie", () => {
    expect(moodFromEnergy(80)).toBe("joyeux");
    expect(moodFromEnergy(40)).toBe("neutre");
    expect(moodFromEnergy(10)).toBe("fatigue");
  });
  it("fatigue prime sur l'heure", () => {
    expect(greetingLine("fatigue", "matin")).toContain("épuisé");
  });
});
