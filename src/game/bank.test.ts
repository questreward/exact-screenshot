import { describe, expect, it } from "vitest";
import { loanCap, monthlyPayment } from "./bank";

const s = { max_loan: 20000, income_multiplier: 6, minor_max_loan: 1000 };

describe("banque", () => {
  it("calcule la mensualité à 4 % par an", () => {
    expect(monthlyPayment(1200, 12, 4)).toBe(103);
    expect(monthlyPayment(1200, 12, 0)).toBe(100);
  });
  it("plafonne le prêt à 6 fois le revenu et 20 000", () => {
    expect(loanCap(1500, 25, s)).toBe(9000);
    expect(loanCap(4000, 25, s)).toBe(20000);
  });
  it("limite les moins de 18 ans à 1 000", () => {
    expect(loanCap(1500, 17, s)).toBe(1000);
  });
  it("refuse sans revenu", () => {
    expect(loanCap(0, 25, s)).toBe(0);
  });
});
