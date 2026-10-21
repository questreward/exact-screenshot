import { describe, expect, it } from "vitest";
import { eventsAroundMe, socialPlans } from "./social-hub";
const ev = (id: string, o: Partial<{ city_id: string | null; scope: string; personal: boolean; phase: string; importance: number }> = {}) => ({ id, city_id: "lille", scope: "local", personal: false, phase: "a_venir", importance: 1, starts_at: "2026-10-21T10:00:00Z", ...o });
describe("vie sociale", () => {
  it("jamais d'événement personnel d'un autre", () => { expect(eventsAroundMe([ev("a", { personal: true })], "lille")).toEqual([]); });
  it("les événements en cours passent en premier", () => { expect(eventsAroundMe([ev("a"), ev("b", { phase: "en_cours" })], "lille")[0]!.id).toBe("b"); });
  it("une autre ville locale n'apparaît pas, le national oui", () => { expect(eventsAroundMe([ev("a", { city_id: "paris" }), ev("n", { city_id: null, scope: "national" })], "lille").map(e => e.id)).toEqual(["n"]); });
  it("les rendez-vous terminés disparaissent", () => { expect(socialPlans([{ id: "x", type: "social", status: "planned", start_time: "2026-10-20T08:00:00Z", end_time: "2026-10-20T09:00:00Z" }], new Date("2026-10-20T10:00:00Z"))).toEqual([]); });
});
