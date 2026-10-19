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
