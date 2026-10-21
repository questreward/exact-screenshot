import { describe, expect, it } from "vitest";
import { homeGlance } from "./home-view";

const home = (placements: { room: number }[], rooms = 2) => ({ id: "h", name: "x", rooms, version: 1, room_names: [], placements: placements.map((p, i) => ({ asset_id: String(i), x: 0, y: 0, rotation: 0, ...p })) });

describe("homeGlance", () => {
  it("empty home", () => expect(homeGlance(home([]), []).status).toMatch(/vide/));
  it("counts rooms without furniture", () => expect(homeGlance(home([{ room: 0 }]), []).emptyRooms).toBe(1));
  it("stored = owned furniture not placed anywhere", () => expect(homeGlance(home([]), [{ asset_id: "a", name: "", visual: "", width: 1, height: 1, placed_home: null }]).stored).toBe(1));
});

import { firstFreeSpot } from "./home-view";
describe("firstFreeSpot", () => {
  const f = (id: string) => ({ asset_id: id, name: "", visual: "", width: 2, height: 2, placed_home: null });
  it("skips occupied cells", () => expect(firstFreeSpot("b", 0, [{ asset_id: "a", room: 0, x: 0, y: 0, rotation: 0 }], [f("a"), f("b")], 1, 4)).toMatchObject({ x: 2, y: 0 }));
  it("null when full", () => expect(firstFreeSpot("b", 0, [{ asset_id: "a", room: 0, x: 0, y: 0, rotation: 0 }], [f("a"), f("b")], 1, 2)).toBeNull());
});
