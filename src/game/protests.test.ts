import { describe, expect, it } from "vitest";
import { availableHours, canCallProtest } from "./protests";

describe("manifestations", () => {
  it("réserve l'appel à manifester aux 18 ans et plus", () => {
    expect(canCallProtest(17, 18)).toBe(false);
    expect(canCallProtest(18, 18)).toBe(true);
  });
  it("propose seulement 8 h à 20 h, au moins 2 h plus tard", () => {
    expect(availableHours("2027-03-10T15:30:00Z", 0)).toEqual([18, 19, 20]);
    expect(availableHours("2027-03-10T15:30:00Z", 1)).toHaveLength(13);
    expect(availableHours("2027-03-10T19:00:00Z", 0)).toEqual([]);
  });
});
