import { describe, expect, it } from "vitest";
import { quartersForYear, quartersProgress } from "./retirement";

describe("retirement hints", () => {
  it("one quarter per 1 800 € gross, 4 max a year", () => {
    expect(quartersForYear(3700)).toBe(2);
    expect(quartersForYear(24000)).toBe(4);
  });
  it("172 quarters is a full career", () => expect(quartersProgress(172)).toBe(100));
});
