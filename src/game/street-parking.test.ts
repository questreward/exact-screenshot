import { describe, expect, it } from "vitest";
import { streetParking } from "./street-parking";

describe("street parking presentation", () => {
  const car = { id: "bought", name: "Clio V", kind: "vehicle", acquired_at: "2026-10-22T12:00:00Z" };
  it("only shows the player's car at home after a recorded purchase", () => {
    expect(streetParking(0, [], true).find(p => p.id === "bought")).toBeUndefined();
    expect(streetParking(0, [car], true).find(p => p.id === "bought")?.model).toBe("/models/car-kit/hatchback-sports.glb");
    expect(streetParking(0, [car], false).find(p => p.id === "bought")).toBeUndefined();
    expect(streetParking(0, [{ ...car, kind: "item" }], true).find(p => p.id === "bought")).toBeUndefined();
  });
  it("removes a sold car and shows the last acquired car without duplicating it", () => {
    expect(streetParking(2, [car, { ...car, id: "new", name: "SUV", acquired_at: "2026-10-23" }], true).map(p => p.id)).toEqual(["new"]);
    expect(streetParking(2, [], true)).toEqual([]);
  });
  it("places service vehicles in front of the police station and fire station", () => {
    expect(streetParking(0, [], false).find(p => p.id === "secours")?.model).toBe("/models/car-kit/police.glb");
    expect(streetParking(1, [], false).find(p => p.id === "caserne")?.model).toBe("/models/car-kit/firetruck.glb");
  });
});