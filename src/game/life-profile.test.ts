import { describe, expect, it } from "vitest";
import { groupByAge, levelLabel, SKILL_LABELS, REPUTATION_LABELS } from "./life-profile";

describe("Ma vie dans CIVITAS", () => {
  it("affiche un niveau par palier de 20", () => {
    expect(levelLabel(0)).toBe("Débutant");
    expect(levelLabel(20)).toBe("Faible");
    expect(levelLabel(59)).toBe("Moyen");
    expect(levelLabel(60)).toBe("Bon");
    expect(levelLabel(120)).toBe("Excellent");
  });
  it("prévoit 12 compétences et 8 réputations", () => {
    expect(Object.keys(SKILL_LABELS)).toHaveLength(12);
    expect(Object.keys(REPUTATION_LABELS)).toHaveLength(8);
  });
  it("regroupe le journal par âge", () => {
    const g = groupByAge([{ age: 24 }, { age: 24 }, { age: 22 }]);
    expect(g.map(x => [x.age, x.items.length])).toEqual([[24, 2], [22, 1]]);
  });
});
