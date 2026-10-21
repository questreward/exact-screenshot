import { describe, it, expect } from "vitest";
import { moneyAlerts } from "./money-alerts";

const now = new Date("2026-10-21T12:00:00Z");
describe("alertes d'argent", () => {
  it("solde faible sous 100 €", () => {
    expect(moneyAlerts({ balance: 99, now }).map(a => a.id)).toEqual(["low"]);
    expect(moneyAlerts({ balance: 100, now })).toEqual([]);
  });
  it("échéance proche ou en retard", () => {
    expect(moneyAlerts({ balance: 500, now, nextDue: { due_at: "2026-10-22T10:00:00Z", amount: 120, late: false } })[0]!.id).toBe("due");
    expect(moneyAlerts({ balance: 500, now, nextDue: { due_at: "2026-10-30T10:00:00Z", amount: 120, late: false } })).toEqual([]);
    expect(moneyAlerts({ balance: 500, now, nextDue: { due_at: "2026-10-20T10:00:00Z", amount: 120, late: true } })[0]!.id).toBe("late");
  });
});
