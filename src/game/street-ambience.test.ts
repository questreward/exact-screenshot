import { describe, expect, it } from "vitest";
import { ambienceLevels } from "./street-ambience";
describe("ambiance sonore de la rue", () => {
  it("la pluie ne s'entend que si la météo enregistrée dit pluie", () => {
    expect(ambienceLevels("pluie", "journee").rain).toBeGreaterThan(0);
    expect(ambienceLevels("clair", "journee").rain).toBe(0);
  });
  it("pas d'oiseaux la nuit ni sous la pluie, circulation plus calme la nuit", () => {
    expect(ambienceLevels("clair", "nuit").birds).toBe(false);
    expect(ambienceLevels("pluie", "matin").birds).toBe(false);
    expect(ambienceLevels("clair", "nuit").traffic).toBeLessThan(ambienceLevels("clair", "journee").traffic);
  });
});
