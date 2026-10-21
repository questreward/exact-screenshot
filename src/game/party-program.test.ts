import { describe, expect, it } from "vitest";
import { programByTheme } from "./party-program";
describe("party program", () => {
  it("puts hospitals under health", () => expect(programByTheme(["Rouvrir l'hôpital"]).themes[0]!.id).toBe("sante"));
  it("keeps unknown items in other", () => expect(programByTheme(["Fierté locale"]).other).toEqual(["Fierté locale"]));
});
