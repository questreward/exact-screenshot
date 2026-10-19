import { describe, expect, it } from "vitest";
import { coalitionMajority } from "./factcheck";

describe("coalitions", () => {
  it("35 % + 28 % des sièges forment une majorité", () => {
    expect(coalitionMajority(14, 11, 40)).toEqual({ seats: 25, majority: true });
  });
  it("la moitié pile n'est pas une majorité absolue", () => {
    expect(coalitionMajority(10, 10, 40).majority).toBe(false);
  });
});
