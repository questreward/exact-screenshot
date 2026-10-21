import { describe, it, expect } from "vitest";
import { creditRecap } from "./shop";

describe("récapitulatif crédit", () => {
  it("coût total = apport + frais + toutes les mensualités", () => {
    const r = creditRecap({ price: 12000, down: 2000, fees: 0, rate: 0, months: 10, balance: 5000, income: 2000, burden: 300 });
    expect(r.monthly).toBe(1000);
    expect(r.totalCost).toBe(12000);
    expect(r.balanceAfter).toBe(3000);
    expect(r.monthlyLeft).toBe(700);
  });
});
