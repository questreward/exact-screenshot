import { describe, expect, it } from "vitest";
import { estimatedRevenue, weeklyCosts } from "./business";

const commerce = { base_revenue: 250, per_worker: 120, per_shift: 60, weekly_rent: 150, npc_wage: 90 };

describe("entreprise", () => {
  it("estime le chiffre d'affaires selon l'équipe et les services", () => {
    expect(estimatedRevenue(commerce, 2, 3)).toBe(670);
  });
  it("applique le facteur de la ville", () => {
    expect(estimatedRevenue(commerce, 1, 0, 0.8)).toBe(296);
  });
  it("additionne loyer, employés fictifs et salaires", () => {
    expect(weeklyCosts(commerce, 2, 100, 200)).toBe(630);
  });
});
