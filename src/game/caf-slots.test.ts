import { describe, expect, it } from "vitest";
import { cafSlots } from "./caf-slots";

describe("cafSlots", () => {
  const days = cafSlots(new Date("2026-10-21T15:25:00Z")); // mercredi 17h25 Paris
  it("pas de créneau le week-end", () => expect(days.map((d) => d.day)).not.toContain("2026-10-24"));
  it("6 créneaux par jour ouvré complet", () => expect(days.find((d) => d.day === "2026-10-22")!.slots).toHaveLength(6));
  it("premier créneau jeudi 9h Paris", () => expect(days[0]!.slots[0]!.toISOString()).toBe("2026-10-22T07:00:00.000Z"));
});
