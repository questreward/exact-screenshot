import { describe, expect, it } from "vitest";
import { nearestDoor, slide, walkable } from "./street3d";

describe("3D street", () => {
  it("keeps the player out of buildings", () => {
    expect(walkable(-16.5, -9.5)).toBe(false);
    expect(walkable(0, 0)).toBe(true);
    expect(slide(-16.5, -5, -16.5, -8)).toEqual([-16.5, -5]);
  });
  it("only offers a door when the player stands in front of it", () => {
    expect(nearestDoor(-16.5, -5.5)?.to).toBe("/banque");
    expect(nearestDoor(0, 0)).toBeNull();
  });
});
