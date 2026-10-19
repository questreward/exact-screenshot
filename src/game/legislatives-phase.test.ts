import { describe, expect, it } from "vitest";
import { legislativePhase } from "./legislatives-phase";
const e = { candidacies_at: "2026-01-01T00:00:00Z", candidacies_end_at: "2026-01-08T00:00:00Z", round1_at: "2026-01-09T00:00:00Z", round2_at: "2026-01-10T00:00:00Z", vote_end_at: "2026-01-11T00:00:00Z", counted: false };
describe("phases des législatives", () => {
  it("candidatures pendant 7 jours", () => expect(legislativePhase(e, new Date("2026-01-05T00:00:00Z"))).toBe("candidacies"));
  it("1er tour le premier jour de vote", () => expect(legislativePhase(e, new Date("2026-01-09T12:00:00Z"))).toBe("round1"));
  it("2e tour le lendemain", () => expect(legislativePhase(e, new Date("2026-01-10T12:00:00Z"))).toBe("round2"));
  it("terminé une fois dépouillé", () => expect(legislativePhase({ ...e, counted: true }, new Date("2026-01-10T12:00:00Z"))).toBe("done"));
});
