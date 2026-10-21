import { describe, it, expect } from "vitest";
import { wealthBreakdown } from "./wealth";

describe("patrimoine", () => {
  it("total = biens + épargne + argent − prêt restant", () => {
    const w = wealthBreakdown({ assets: [{ purchase_price: 100000, catalog: { category: "logement" } }, { purchase_price: 10000, catalog: { category: "transport" } }], assetValue: 99000, saved: 1000, cash: 500, debt: 2000 });
    expect(w.total).toBe(98500);
    expect(w.home + w.vehicles + w.goods).toBe(99000);
    expect(w.home).toBe(90000);
  });
});
