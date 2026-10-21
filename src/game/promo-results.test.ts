import { describe, expect, it } from "vitest";
import { promoResults } from "./promo-results";

describe("promoResults", () => {
  it("compare la promo aux 3 jours précédents", () => {
    const promo = { percent: 20, starts_at: "2026-10-10T00:00:00Z", ends_at: "2026-10-13T00:00:00Z" };
    const orders = [
      { amount: 100, created_at: "2026-10-08T10:00:00Z" },
      { amount: 80, created_at: "2026-10-11T10:00:00Z" },
      { amount: 80, created_at: "2026-10-12T10:00:00Z" },
    ];
    const r = promoResults([promo], orders, [{ stars: 4, created_at: "2026-10-11T12:00:00Z" }])[0]!;
    expect(r.during).toEqual({ clients: 2, revenue: 160, stars: 4 });
    expect(r.before.clients).toBe(1);
    expect(r.clientsChange).toBe(100);
  });
});
