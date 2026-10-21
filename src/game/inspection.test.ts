import { describe, expect, it } from "vitest";
import { inspectionChecks } from "./inspection";

describe("inspectionChecks", () => {
  it("a car at 100 % has no defect", () => expect(inspectionChecks(100).every(c => c.status === "ok")).toBe(true));
  it("a car at 30 % has brakes to repair", () => expect(inspectionChecks(30).find(c => c.id === "freins")?.status).toBe("major"));
  it("a car at 65 % only has tyres and lights flagged minor", () => expect(inspectionChecks(65).filter(c => c.status !== "ok").map(c => c.id)).toEqual(["pneus", "phares"]));
});
