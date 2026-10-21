import { describe, expect, it } from "vitest";
import { homeGlance } from "./home-view";

const home = (placements: { room: number }[], rooms = 2) => ({ id: "h", name: "x", rooms, version: 1, room_names: [], placements: placements.map((p, i) => ({ asset_id: String(i), x: 0, y: 0, rotation: 0, ...p })) });

describe("homeGlance", () => {
  it("empty home", () => expect(homeGlance(home([]), []).status).toMatch(/vide/));
  it("counts rooms without furniture", () => expect(homeGlance(home([{ room: 0 }]), []).emptyRooms).toBe(1));
  it("stored = owned furniture not placed anywhere", () => expect(homeGlance(home([]), [{ asset_id: "a", name: "", visual: "", width: 1, height: 1, placed_home: null }]).stored).toBe(1));
});
