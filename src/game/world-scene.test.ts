import { describe, expect, it } from "vitest";
import { sceneWeather, showEnergy } from "./world-scene";
describe("world scene", () => {
  it("shows rain only for recorded rain", () => { expect(sceneWeather("Averses")).toBe("pluie"); expect(sceneWeather("clair")).toBe("clair"); expect(sceneWeather(null)).toBe("clair"); });
  it("shows energy only below 30", () => { expect(showEnergy(29)).toBe(true); expect(showEnergy(30)).toBe(false); });
});
