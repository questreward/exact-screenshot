import { describe, expect, it } from "vitest";
import { weeklyTax } from "./business";

describe("impôts des entreprises", () => {
  it("prélève 20 % du bénéfice plus la taxe locale de 25", () => {
    expect(weeklyTax(400, 20, 25)).toBe(105);
  });
  it("ne prélève que la taxe locale en cas de perte", () => {
    expect(weeklyTax(-150, 20, 25)).toBe(25);
  });
});
