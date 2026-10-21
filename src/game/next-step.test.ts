import { describe, it, expect } from "vitest";
import { nextStep, notificationTarget } from "./next-step";

const now = new Date("2026-10-21T08:00:00Z");
const base = { now, activities: [], notifications: [], hasHousing: true, studying: false, working: false, age: 20 };

describe("prochaine étape", () => {
  it("an activity in progress comes first", () => {
    const s = nextStep({ ...base, activities: [{ title: "Garde", start_time: "2026-10-21T07:00:00Z", end_time: "2026-10-21T15:00:00Z", status: "active" }] });
    expect(s.to).toBe("/agenda");
    expect(s.title).toContain("Garde");
  });
  it("an upcoming activity shows minutes", () => {
    const s = nextStep({ ...base, activities: [{ title: "Cours", start_time: "2026-10-21T08:35:00Z", end_time: "2026-10-21T10:00:00Z", status: "scheduled" }] });
    expect(s.title).toBe("Cours dans 35 min");
  });
  it("without housing, points to Logement", () => {
    expect(nextStep({ ...base, hasHousing: false }).to).toBe("/logement");
  });
  it("salary notification opens the bank", () => {
    expect(notificationTarget({ title: "Salaire reçu", body: "", news_id: null })).toBe("/banque");
  });
});
