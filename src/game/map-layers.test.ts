import { describe, expect, it } from "vitest";
import { placeLayer, showPlace } from "./map-layers";

describe("couches de la carte", () => {
  it("range la mairie en Politique et le magasin en Commerces", () => {
    expect(placeLayer("mairie").layer).toBe("politique");
    expect(placeLayer("magasin").layer).toBe("commerces");
  });
  it("cache un lieu dont la couche est désactivée", () => {
    expect(showPlace("magasin", new Set(["vie"]), false)).toBe(false);
  });
  it("montre toujours la position du joueur", () => {
    expect(showPlace("magasin", new Set(), true)).toBe(true);
  });
});
