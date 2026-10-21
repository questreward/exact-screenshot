import { describe, expect, it } from "vitest";
import { districtCenter, realPlace, REAL_PLACES, SHOP_SECTION } from "./real-places";

const KINDS = ["mairie", "place", "banque", "administration", "gare", "station", "cafe", "commerce", "logement", "parc", "universite", "entreprise"];

describe("vraies positions", () => {
  it("chaque ville jouable a ses 12 lieux placés", () => {
    for (const c of ["paris", "lyon", "marseille", "bordeaux", "lille"]) for (const k of KINDS) expect(realPlace(c, k), `${c} ${k}`).not.toBeNull();
  });
  it("la gare de Lille est Lille-Flandres", () => {
    expect(REAL_PLACES["lille"]!["gare"]!.real).toBe("Gare Lille-Flandres");
  });
  it("tous les lieux sont en France métropolitaine", () => {
    for (const c of Object.values(REAL_PLACES)) for (const p of Object.values(c)) {
      expect(p.at[0]).toBeGreaterThan(-5.5); expect(p.at[0]).toBeLessThan(9.6);
      expect(p.at[1]).toBeGreaterThan(41); expect(p.at[1]).toBeLessThan(51.2);
    }
  });
  it("le centre d'un quartier est la moyenne de ses lieux", () => {
    expect(districtCenter("paris", ["gare", "station"])).toEqual([(2.3553 + 2.3470) / 2, (48.8809 + 48.8620) / 2]);
  });
});

describe("magasins sur la carte", () => {
  it("la boutique de vêtements de Lille est rue Neuve", () => { expect(realPlace("lille", "magasin", "Boutique de vêtements")?.real).toBe("Rue Neuve"); });
  it("chaque ville a ses 6 magasins placés", () => {
    for (const c of ["paris", "lyon", "marseille", "bordeaux", "lille"]) for (const n of Object.keys(SHOP_SECTION)) expect(realPlace(c, "magasin", n), `${c} ${n}`).not.toBeNull();
  });
});
