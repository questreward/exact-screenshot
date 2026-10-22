import { describe, expect, it } from "vitest";
import { currentWork, recordedObjectives } from "./work-experience";

describe("travail enregistré", () => {
  it("reprend la garde démarrée la veille après minuit", () => {
    const shift = { type: "work", status: "running", start_time: "2026-10-21T21:00:00Z", end_time: "2026-10-22T05:00:00Z" };
    expect(currentWork([shift], "2026-10-22").running).toEqual(shift);
  });
  it("ne transforme pas une fin prévue en service terminé", () => {
    const shift = { type: "work", status: "running", start_time: "2026-10-21T21:00:00Z", end_time: "2026-10-22T05:00:00Z" };
    expect(currentWork([shift], "2026-10-22").finished).toBeUndefined();
  });
  it("affiche les décisions enregistrées sans terminer les objectifs futurs", () => {
    const m = { day: "2026-10-22", title: "Intervention", job: "pompier_pro", city_id: null, status: "active" as const, step_index: 1, step_count: 3, step: null, reputation_delta: null, energy_cost: null };
    expect(recordedObjectives(m).map(o => o.state)).toEqual(["recorded", "current", "pending"]);
    expect(recordedObjectives({ ...m, status: "expired" }).map(o => o.state)).toEqual(["recorded", "pending", "pending"]);
  });
});