import { describe, expect, it } from "vitest";
import { estimateTax } from "./income-tax";

describe("impôt sur le revenu (barème français, 1 part)", () => {
  it("24 000 € de salaires : 1 111 € d'impôt", () => { expect(estimateTax(24000).tax).toBe(1111); });
  it("sous 12 000 € environ : pas d'impôt", () => { expect(estimateTax(12000).tax).toBe(0); });
  it("abattement de 10 %, au moins 495 €", () => {
    expect(estimateTax(30000).abatement).toBe(3000);
    expect(estimateTax(3000).abatement).toBe(495);
  });
  it("60 000 € : tranches à 11 % puis 30 %", () => { expect(estimateTax(60000).tax).toBe(Math.round(17818 * 0.11 + 24685 * 0.3)); });
});
