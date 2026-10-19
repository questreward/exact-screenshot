import { describe, expect, it } from "vitest";
import { insurerShare } from "./insurance";

describe("assurance", () => {
  it("rembourse le coût moins la franchise", () => {
    expect(insurerShare(400, 50, 1000, true)).toBe(350);
  });
  it("respecte le plafond", () => {
    expect(insurerShare(900, 20, 500, true)).toBe(500);
  });
  it("ne rembourse rien sous la franchise ou sans contrat", () => {
    expect(insurerShare(15, 20, 500, true)).toBe(0);
    expect(insurerShare(400, 50, 1000, false)).toBe(0);
  });
});
