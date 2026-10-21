import { describe, expect, it } from "vitest";
import { electionCalendar, electionBanner } from "./campaign-journey";
const e = { starts_at: "2026-10-01", candidacy_ends_at: "2026-10-05", campaign_starts_at: "2026-10-06", debate_at: "2026-10-10", vote_starts_at: "2026-10-12T08:00:00Z", vote_ends_at: "2026-10-12T20:00:00Z", count_at: "2026-10-13" };
describe("campaign journey", () => {
  it("between debate and vote, current step is Débat", () => { const c = electionCalendar(e, "2026-10-11"); expect(c.steps[c.current]!.label).toBe("Débat"); });
  it("banner says tomorrow the day before the vote", () =>
    expect(electionBanner({ world_now: "2026-10-11T12:00:00Z", elections: [{ ...e, id: "x", name: "Municipales", voted: false, mandate: null, candidates: [] } as never] })?.kind).toBe("demain"));
});
