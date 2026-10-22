import { describe, expect, it } from "vitest";
import { INTERIORS, exitSpot, nearestSpot, roomWalkable } from "./interior3d";
import { DOORS } from "./street3d";

describe("intérieurs 3D", () => {
  it("chaque point d'interaction est atteignable et la sortie ramène à la rue", () => {
    for (const r of Object.values(INTERIORS)) {
      for (const s of [...r.spots, exitSpot(r)]) expect(roomWalkable(r, s.x, s.z), `${r.id}/${s.id}`).toBe(true);
      expect(exitSpot(r).to).toBe("/ville-3d");
      expect(roomWalkable(r, 0, r.d - 1.6)).toBe(true);
    }
  });
  it("on ne traverse pas les rayons et rien n'est proposé loin d'un point", () => {
    const r = INTERIORS["superette"]!;
    expect(roomWalkable(r, -5, -1)).toBe(false);
    expect(nearestSpot(r, -8, -6)).toBeNull();
    expect(nearestSpot(r, 6, 2.7)?.id).toBe("caisse");
  });
  it("les portes de la rue mènent à un intérieur ou à une page existante", () => {
    expect(DOORS.filter((d) => INTERIORS[d.id]).length).toBeGreaterThanOrEqual(11);
  });
});

import { homeInterior } from "./interior3d";
describe("logement 3D", () => {
  const furniture = [{ asset_id: "s", name: "Canapé", visual: "sofa", width: 3, height: 1 }, { asset_id: "b", name: "Lit", visual: "bed", width: 2, height: 3 }];
  const home = { name: "Studio", rooms: 2, room_names: ["Salon", "Chambre"], placements: [{ asset_id: "s", room: 0, x: 1, y: 0, rotation: 0 }, { asset_id: "b", room: 1, x: 0, y: 2, rotation: 90 }] };
  it("place chaque meuble sur sa case, sa pièce et son orientation enregistrées", () => {
    const r = homeInterior(home, furniture, 8);
    const sofa = r.fixtures.find((f) => f.label === "Canapé")!, bed = r.fixtures.find((f) => f.label === "Lit")!;
    expect(sofa.x).toBeCloseTo(-8.5 + 1 + 1.5); expect(sofa.z).toBeCloseTo(-4 + 0.5);
    expect(bed.x).toBeCloseTo(-8.5 + 9 + 1.5); expect(bed.w).toBeCloseTo(2.9); expect(bed.d).toBeCloseTo(1.9);
  });
  it("ignore les meubles rangés et garde la sortie accessible", () => {
    const r = homeInterior({ ...home, placements: [] }, furniture, 8);
    expect(r.fixtures.filter((f) => f.kind === "item")).toHaveLength(0);
    expect(roomWalkable(r, exitSpot(r).x, exitSpot(r).z)).toBe(true);
  });
});
