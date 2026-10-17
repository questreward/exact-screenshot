import { describe, expect, it } from "vitest";
import { allowedPaths, isPathAllowedForAge, isValidAge } from "./rules";

describe("règles d'âge", () => {
  it("accepte 16 à 30 ans seulement", () => {
    expect(isValidAge(15)).toBe(false);
    expect(isValidAge(16)).toBe(true);
    expect(isValidAge(30)).toBe(true);
    expect(isValidAge(31)).toBe(false);
  });
  it("16–17 ans : Étudiant uniquement", () => {
    expect(allowedPaths(17)).toEqual(["student"]);
    expect(isPathAllowedForAge("young_worker", 16)).toBe(false);
  });
  it("18–30 ans : tous les parcours", () => {
    expect(allowedPaths(18)).toEqual(["student", "young_worker", "early_career"]);
  });
});
