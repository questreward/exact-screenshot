import { describe, expect, it } from "vitest";
import { CHANNELS, popularityBarometer, weatherFor } from "./tv";

describe("JT", () => {
  it("propose 3 chaînes", () => expect(CHANNELS).toHaveLength(3));
  it("donne la même météo à tout le monde le même jour", () => {
    expect(weatherFor("lyon", "Lyon", "2026-10-19")).toEqual(weatherFor("lyon", "Lyon", "2026-10-19"));
    const w = weatherFor("lyon", "Lyon", "2026-10-19");
    expect(w.min).toBeLessThan(w.max);
  });
  it("classe les partis et totalise environ 100 %", () => {
    const rows = popularityBarometer([
      { id: "a", name: "A", symbol: "", influence: 10, reputation: 10, member_count: 0 },
      { id: "b", name: "B", symbol: "", influence: 50, reputation: 30, member_count: 5 },
    ]);
    expect(rows[0]!.id).toBe("b");
    expect(Math.round(rows.reduce((s, r) => s + r.score, 0))).toBe(100);
  });
});

import { anchorFor, reporterFor, topicFor, JOURNALISTS } from "./tv";
describe("casting JT", () => {
  it("20 journalistes différents", () => { expect(new Set(JOURNALISTS.map(j => j.id)).size).toBe(20); });
  it("reconnaît le thème d'un sujet", () => {
    expect(topicFor("Grève des transports : cortège en centre-ville")).toBe("manif");
    expect(topicFor("Le Parlement adopte la loi")).toBe("politique");
    expect(topicFor("Rien de spécial")).toBe("general");
  });
  it("présentateur stable pour un jour et une chaîne", () => {
    expect(anchorFor("info", "2026-10-19").id).toBe(anchorFor("info", "2026-10-19").id);
    expect(anchorFor("info", "2026-10-19").channels).toContain("info");
  });
  it("spécialiste envoyé sur son thème", () => { expect(reporterFor("local", "manif", "x").id).toBe("j06"); });
});
