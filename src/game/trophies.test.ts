import { describe, expect, it } from "vitest";
import { computeTrophies, nextObjectives, rankTitle, type Facts } from "./trophies";

const zero: Facts = { activities: 0, studies: 0, jobs: 0, balance: 0, business: false, interactions: 0, memberships: 0, contacts: 0, followers: 0, newsRead: 0, reports: 0, consultations: 0, articles: 0, opinions: 0, politicalMember: false, reputation: 0, influence: 0, votes: 0, candidacies: 0, legislativeCandidate: false };

describe("trophées", () => {
  it("1 000 crédits débloque Bas de laine, 999 non", () => {
    expect(computeTrophies({ ...zero, balance: 999 }).find(t => t.id === "saver")!.done).toBe(false);
    expect(computeTrophies({ ...zero, balance: 1000 }).find(t => t.id === "saver")!.done).toBe(true);
  });
  it("la progression ne dépasse pas l'objectif", () => {
    expect(computeTrophies({ ...zero, articles: 40 }).find(t => t.id === "columnist")!.progress).toBe(10);
  });
  it("les objectifs proposés sont les plus avancés", () => {
    expect(nextObjectives(computeTrophies({ ...zero, activities: 20 }), 1)[0]!.id).toBe("busy");
  });
  it("titres selon le nombre de trophées", () => {
    expect(rankTitle(0)).toBe("Nouvel arrivant");
    expect(rankTitle(8)).toBe("Citoyen engagé");
    expect(rankTitle(20)).toBe("Figure nationale");
  });
});
