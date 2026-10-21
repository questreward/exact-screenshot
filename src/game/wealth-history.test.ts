import { describe, it, expect } from "vitest";
import { wealthHistory } from "./wealth-history";

describe("historique du patrimoine", () => {
  it("remonte le temps avec les vraies opérations et achats", () => {
    const pts = wealthHistory({
      now: new Date("2026-10-21T12:00:00Z"), cash: 1500, saved: 0,
      txs: [{ amount: 2000, label: "Salaire", created_at: "2026-10-05T00:00:00Z" }, { amount: -500, label: "Achat vélo", created_at: "2026-10-06T00:00:00Z" }],
      assets: [{ purchase_price: 500, acquired_at: "2026-10-06T00:00:00Z" }],
    });
    expect(pts).toHaveLength(7);
    expect(pts[5]).toEqual({ label: "sept.", value: 0 });
    expect(pts[6]).toEqual({ label: "auj.", value: 2000 });
  });
});
