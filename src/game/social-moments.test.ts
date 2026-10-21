import { describe, it, expect } from "vitest";
import { dailyEncounter, whenLabel, lastMemory } from "./social-moments";

const now = new Date("2026-10-21T13:00:00Z"); // mercredi
describe("social moments", () => {
  it("une seule rencontre par jour, stable dans la journée", () => {
    const n = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const m = dailyEncounter(n, "me", now);
    expect(dailyEncounter([...n].reverse(), "me", new Date("2026-10-21T22:00:00Z"))).toEqual(m);
    expect(dailyEncounter([], "me", now)).toBeNull();
  });
  it("dit le jour de l'échange", () => {
    expect(whenLabel("2026-10-21T08:00:00Z", now)).toBe("aujourd'hui");
    expect(whenLabel("2026-10-20T08:00:00Z", now)).toBe("hier");
    expect(whenLabel("2026-10-18T08:00:00Z", now)).toBe("dimanche");
  });
  it("garde le dernier échange", () => {
    const h = [{ npc_id: "x", occurred_at: "2026-10-19T00:00:00Z" }, { npc_id: "x", occurred_at: "2026-10-20T00:00:00Z" }, { npc_id: "y", occurred_at: "2026-10-21T00:00:00Z" }];
    expect(lastMemory(h, "x")?.occurred_at).toBe("2026-10-20T00:00:00Z");
  });
});
