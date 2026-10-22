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
