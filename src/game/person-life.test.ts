import { describe, expect, it } from "vitest";
import { personMood, personNow } from "./person-life";
const at = (iso: string) => new Date(iso);
describe("vie des habitants", () => {
  it("à 3 h, un boulanger dort", () => { expect(personNow("Boulanger", at("2026-10-20T03:00:00Z")).text).toBe("dort"); });
  it("à 3 h, un pompier est de garde", () => { expect(personNow("Pompier", at("2026-10-20T03:00:00Z")).text).toContain("garde"); });
  it("à 13 h, tout le monde déjeune", () => { expect(personNow("Comptable", at("2026-10-20T13:00:00Z")).emoji).toBe("🍽️"); });
  it("un mardi à 10 h, il travaille", () => { expect(personNow("Comptable", at("2026-10-20T10:00:00Z")).text).toContain("travaille"); });
  it("l'humeur est stable dans la journée", () => { expect(personMood("a", at("2026-10-20T08:00:00Z"))).toEqual(personMood("a", at("2026-10-20T20:00:00Z"))); });
});
