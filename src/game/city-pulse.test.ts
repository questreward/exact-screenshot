import { describe, expect, it } from "vitest";
import { cityPulse } from "./city-pulse";

describe("ville en direct", () => {
  const t = new Date("2026-10-21T14:20:00Z");
  it("donne trois scènes différentes", () => {
    const s = cityPulse("Paris", t);
    expect(s).toHaveLength(3);
    expect(new Set(s.map((x) => x.kind)).size).toBe(3);
  });
  it("est identique pour tous les joueurs à la même heure", () => {
    expect(cityPulse("Lyon", t)).toEqual(cityPulse("Lyon", new Date("2026-10-21T14:20:00Z")));
  });
  it("change à l'heure suivante", () => {
    const a = cityPulse("Paris", t).map((x) => x.id);
    const b = cityPulse("Paris", new Date("2026-10-21T15:20:00Z")).map((x) => x.id);
    expect(a).not.toEqual(b);
  });
});
