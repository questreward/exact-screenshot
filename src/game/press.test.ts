import { describe, expect, it } from "vitest";
import { articleProblem } from "./press";
describe("presse", () => {
  it("refuse un titre trop court", () => expect(articleProblem("Hé", "x".repeat(60))).toMatch(/Titre/));
  it("refuse un article de moins de 50 caractères", () => expect(articleProblem("Un bon titre", "court")).toMatch(/Article/));
  it("accepte un article correct", () => expect(articleProblem("Un bon titre", "x".repeat(50))).toBeNull());
});
