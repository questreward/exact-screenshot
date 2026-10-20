import { describe, expect, it } from "vitest";
import { garagePrice, wearLevel } from "./vehicle-wear";

describe("vehicle wear hints", () => {
  it("player garage at 80 % of a 600 € repair costs 480 €", () => expect(garagePrice(600, 80)).toBe(480));
  it("breakdown risk below 40 %", () => { expect(wearLevel(39)).toBe("risque"); expect(wearLevel(40)).toBe("use"); });
  it("immobilised at 0 %", () => expect(wearLevel(0)).toBe("immobilise"));
});
