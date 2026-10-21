import { describe, expect, it } from "vitest";
import { emergencyTrip } from "./emergency-trip";

describe("emergencyTrip", () => {
  it("firefighters leave the station in a fire truck", () => expect(emergencyTrip("pompier_pro", "feu-incendie")).toMatchObject({ base: "Caserne", emoji: "🚒", dest: "logement" }));
  it("SAMU leaves the hospital by ambulance", () => expect(emergencyTrip("samu_infirmier", "samu-accident")).toMatchObject({ base: "Hôpital", emoji: "🚑" }));
  it("police complaint desk has no trip", () => expect(emergencyTrip("police", "pol-plainte").dest).toBeNull());
});
