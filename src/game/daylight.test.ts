import { describe, expect, it } from "vitest";
import { daylight } from "./daylight";

describe("daylight", () => {
  it("07:30 is morning light", () => expect(daylight(7).key).toBe("morning"));
  it("18:40 is sunset", () => expect(daylight(18).key).toBe("sunset"));
  it("22:15 is night driving", () => expect(daylight(22).key).toBe("night"));
  it("midday is day", () => expect(daylight(13).key).toBe("day"));
});
