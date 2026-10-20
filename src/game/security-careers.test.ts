import { describe, expect, it } from "vitest";
import { nextRank, weeklyPay } from "./security-careers";

describe("carrières de sécurité", () => {
  it("traitement hebdomadaire d'un gardien de la paix à 1 950 € par mois", () => {
    expect(weeklyPay(1950)).toBe(450);
  });
  it("élève en école de police à 1 450 € par mois", () => {
    expect(weeklyPay(1450)).toBe(335);
  });
  it("brigadier après 10 missions réussies", () => {
    const titles = ["Élève", "Gardien", "Brigadier", "Brigadier-chef", "Major"];
    expect(nextRank(titles, [0, 0, 10, 25, 50], 1, 4)).toEqual({ title: "Brigadier", remaining: 6 });
    expect(nextRank(titles, [0, 0, 10, 25, 50], 4, 60)).toBeNull();
  });
});
