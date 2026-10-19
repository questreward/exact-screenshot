import { describe, expect, it } from "vitest";
import { expectedNpcClients, serviceAmount } from "./services";

describe("entreprises de services", () => {
  it("un entretien à 200 € dans un garage à 80 % coûte 160 €", () => {
    expect(serviceAmount(200, 80)).toBe(160);
  });
  it("tarif à 150 % : 300 € de déménagement deviennent 450 €", () => {
    expect(serviceAmount(300, 150)).toBe(450);
  });
  it("rien à payer quand le prix de référence est nul", () => {
    expect(serviceAmount(0, 120)).toBe(0);
  });
  it("clients fictifs : plus nombreux avec une bonne note et des prix bas, plafonnés à 8", () => {
    expect(expectedNpcClients(null, 100, 3, 8)).toBe(4);
    expect(expectedNpcClients(5, 70, 3, 8)).toBe(8);
    expect(expectedNpcClients(1, 150, 3, 8)).toBe(0);
  });
});
