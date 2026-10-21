import { describe, it, expect } from "vitest";
import { monthSummary, newSalary } from "./month-budget";

const txs = [
  { id: "1", amount: 1850, label: "Salaire", created_at: "2026-10-05T08:00:00Z" },
  { id: "2", amount: -600, label: "Loyer", created_at: "2026-10-02T08:00:00Z" },
  { id: "3", amount: -200, label: "Épargne vacances", created_at: "2026-10-06T08:00:00Z" },
  { id: "4", amount: -99, label: "Courses", created_at: "2026-09-30T08:00:00Z" },
];
describe("mon mois", () => {
  it("ne compte que le mois en cours", () => {
    expect(monthSummary(txs, new Date("2026-10-21T00:00:00Z"))).toMatchObject({ income: 1850, expenses: 600, saved: 200, left: 1050 });
  });
  it("montre le salaire une seule fois", () => {
    expect(newSalary(txs, null)?.id).toBe("1");
    expect(newSalary(txs, "1")).toBeNull();
  });
});
