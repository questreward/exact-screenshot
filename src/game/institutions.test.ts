import { describe, expect, it } from "vitest";
import { decreeError } from "./institutions";

describe("décisions des institutions", () => {
  it("le maire peut aller jusqu'à 8 points", () => { expect(decreeError("mairie", "Nouveaux bancs", 8, 8)).toBeNull(); expect(decreeError("mairie", "Nouveaux bancs", 9, 8)).not.toBeNull(); });
  it("le président est limité à 5 points", () => { expect(decreeError("elysee", "Plan propreté", -5, 5)).toBeNull(); expect(decreeError("elysee", "Plan propreté", 6, 5)).not.toBeNull(); });
  it("un effet nul est refusé", () => { expect(decreeError("mairie", "Nouveaux bancs", 0, 8)).not.toBeNull(); });
});
