import { describe, expect, it } from "vitest";
import { cityKey, gaugeTone, HOME_TILES } from "./home-scene";

describe("écran principal", () => {
  it("choisit le décor de la ville du joueur", () => {
    expect(cityKey("Marseille")).toBe("marseille");
    expect(cityKey("Lille")).toBe("lille");
    expect(cityKey("Inconnue")).toBe("paris");
  });
  it("colore l'énergie basse en alerte", () => {
    expect(gaugeTone(10)).toBe("low");
    expect(gaugeTone(40)).toBe("mid");
    expect(gaugeTone(90)).toBe("high");
  });
  it("propose six grandes tuiles", () => {
    expect(HOME_TILES).toHaveLength(6);
  });
});
