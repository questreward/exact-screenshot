import { describe, expect, it } from "vitest";
import { absenceSummary } from "./absence";
describe("absence summary", () => {
  it("counts only what happened while away", () => {
    const s = absenceSummary("2026-10-20T10:00:00Z", "2026-10-20T18:00:00Z", {
      txs: [{ id: "a", amount: 1200, label: "Salaire", created_at: "2026-10-20T12:00:00Z" }, { id: "b", amount: -50, label: "Courses", created_at: "2026-10-20T09:00:00Z" }],
      notifs: [], news: [] });
    expect([s.hours, s.income, s.expenses, s.ops]).toEqual([8, 1200, 0, 1]);
  });
  it("nothing recorded means empty", () => expect(absenceSummary("2026-10-20T10:00:00Z", "2026-10-20T18:00:00Z", { txs: [], notifs: [], news: [] }).empty).toBe(true));
});
