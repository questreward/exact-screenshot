import { describe, expect, it } from "vitest";
import { expectedNpcClients, serviceAmount, dealerWholesale, dealerTradeOffer, worksRef, worksGain } from "./services";

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

import { agencyRentFee, agencyBuyFee, manageCut, refRent, rentBounds } from "./services";
describe("agence immobilière", () => {
  it("location : frais = 1 mois de loyer au tarif de l'agence", () => {
    expect(agencyRentFee(450, 1, 100)).toBe(450);
    expect(agencyRentFee(450, 1, 150)).toBe(675);
    expect(agencyRentFee(450, 1, 70)).toBe(315);
  });
  it("achat : frais = 4 % du prix", () => {
    expect(agencyBuyFee(150000, 4, 100)).toBe(6000);
  });
  it("gestion : 7 % du loyer, rien pour l'agence fictive", () => {
    expect(manageCut(450, 7, 100)).toBe(31);
    expect(manageCut(450, 7, null)).toBe(0);
  });
  it("loyer d'un bien de 100 000 € : référence 450 €, bornes 315–675 €", () => {
    expect(refRent(100000, 4.5)).toBe(450);
    expect(rentBounds(450, 70, 150)).toEqual([315, 675]);
  });
});

describe("concession", () => {
  it("une voiture à 10 000 € coûte 8 000 € en stock", () => { expect(dealerWholesale(10000)).toBe(8000); });
  it("une voiture valant 9 600 € est reprise 5 760 €", () => { expect(dealerTradeOffer(9600)).toBe(5760); });
});

describe("construction", () => {
  it("bien de 100 000 € : rénovation 3 000 € pour +5 000 € de valeur", () => {
    expect(worksRef(100000, 3)).toBe(3000); expect(worksGain(100000, 5)).toBe(5000);
  });
  it("bien de 100 000 € : agrandissement 15 000 € pour +12 000 € de valeur", () => {
    expect(worksRef(100000, 15)).toBe(15000); expect(worksGain(100000, 12)).toBe(12000);
  });
});
