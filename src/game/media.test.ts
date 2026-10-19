import { describe, expect, it } from "vitest";
import { readersRevenue, weeklyReaders } from "./media";

describe("médias des joueurs", () => {
  it("3 contenus et 2 abonnés joueurs donnent 22 lecteurs fictifs", () => {
    expect(weeklyReaders(3, 2, { npc_per_item: 6, npc_per_player: 2, npc_cap: 300 })).toBe(22);
  });
  it("les lecteurs fictifs sont plafonnés à 300", () => {
    expect(weeklyReaders(100, 0, { npc_per_item: 6, npc_cap: 300 })).toBe(300);
  });
  it("22 lecteurs à 50 centimes rapportent 11 €", () => {
    expect(readersRevenue(22, 50)).toBe(11);
  });
});
