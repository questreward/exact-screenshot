import { describe, expect, it } from "vitest";
import { healthLabel, strikePressure, strikePrime, unionSupport } from "./society";

describe("santé", () => {
  it("donne un libellé selon le niveau", () => {
    expect(healthLabel(85)).toBe("Excellente");
    expect(healthLabel(45)).toBe("Fragile");
    expect(healthLabel(10)).toBe("Critique");
  });
});

describe("syndicats", () => {
  it("le soutien ajoute 10 par joueur et plafonne à 100", () => {
    expect(unionSupport(53, 2, 10)).toBe(73);
    expect(unionSupport(70, 5, 10)).toBe(100);
  });
  it("la pression vaut la moitié de la base plus 15 par jour de grève", () => {
    expect(strikePressure(50, 1, 15)).toBe(40);
    expect(strikePressure(50, 4, 15)).toBe(85);
  });
  it("la prime vaut deux fois les retenues, au moins 30", () => {
    expect(strikePrime(100, 2, 30)).toBe(200);
    expect(strikePrime(0, 2, 30)).toBe(30);
  });
});

import { crisisRecovery, projectScore, projectVerdict } from "./society";
describe("projets citoyens", () => {
  it("le score additionne habitants, mobilisation, 6 par joueur et dons plafonnés à 10", () => {
    expect(projectScore(39, 4, 2, 6, 50, 50)).toBe(56);
    expect(projectScore(30, 0, 0, 6, 5000, 50)).toBe(40);
  });
  it("70 accepte, 50 finance à moitié, 35 reporte, en dessous refuse", () => {
    const t = { approve: 70, partial: 50, postpone: 35 };
    expect(projectVerdict(70, t)).toBe("accepte");
    expect(projectVerdict(56, t)).toBe("partiel");
    expect(projectVerdict(40, t)).toBe("reporte");
    expect(projectVerdict(20, t)).toBe("refuse");
  });
});
describe("crises", () => {
  it("le plan d'urgence compense 70 % d'une baisse de 6, arrondi au supérieur", () => {
    expect(crisisRecovery(-6, 70)).toBe(5);
    expect(crisisRecovery(-6, 90)).toBe(6);
  });
});
