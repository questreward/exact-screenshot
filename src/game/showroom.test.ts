import { describe, expect, it } from "vitest";
import { suggestCars, visitorsOf } from "./showroom";

describe("showroom", () => {
  it("same day gives the same 4 visitors", () => { expect(visitorsOf("2026-10-21")).toEqual(visitorsOf("2026-10-21")); expect(visitorsOf("2026-10-21")).toHaveLength(4); });
  it("suggests only in-stock cars within budget", () => {
    const s = [{ price: 10000, quantity: 1 }, { price: 9000, quantity: 0 }, { price: 40000, quantity: 2 }];
    expect(suggestCars(s, 15000)).toEqual([{ price: 10000, quantity: 1 }]);
  });
});
