import { describe, expect, it } from "vitest";
import { level, quizCorrect, simulateApl, simulateTax, upcomingDeadlines, knowledgeFor } from "./engine";

describe("vie administrative", () => {
  it("levels: 4 niveaux selon la progression globale", () => {
    expect(level({})).toBe(1);
    expect(level({ "premier-logement": { best: 100, done: true, attempts: 1 } })).toBe(2);
    const all = { best: 100, done: true, attempts: 1 };
    expect(level({ "premier-logement": all, "decouvrir-caf": all, "premiere-declaration": all })).toBe(4);
  });
  it("quiz à choix multiples exige toutes les bonnes réponses", () => {
    const c = [{ label: "a", correct: true, why: "" }, { label: "b", correct: true, why: "" }, { label: "c", correct: false, why: "" }];
    expect(quizCorrect(c, [0, 1])).toBe(true);
    expect(quizCorrect(c, [0])).toBe(false);
  });
  it("APL simulée baisse quand les revenus augmentent", () => {
    const low = simulateApl({ rent: 500, monthlyIncome: 600, people: 1, student: false });
    const high = simulateApl({ rent: 500, monthlyIncome: 1450, people: 1, student: false });
    expect(low).toBe(240);
    expect(high).toBeLessThan(low);
  });
  it("impôt simulé : 17 400 € célibataire", () => {
    expect(simulateTax(17400, 1)).toBe(704);
    expect(simulateTax(10000, 1)).toBe(0);
  });
  it("connaissances débloquées progressivement", () => {
    expect(knowledgeFor(70, ["a", "b", "c"])).toEqual(["a", "b"]);
  });
  it("échéances triées dans le futur", () => {
    const d = upcomingDeadlines(new Date(2026, 4, 20));
    expect(d[0]?.label).toBe("Déclarer ses revenus");
    expect(d.every(x => x.days >= 0)).toBe(true);
  });
});
