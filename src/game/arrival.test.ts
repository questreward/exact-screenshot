import { describe, expect, it } from "vitest";
import { arrivalFor } from "./arrival";

describe("arrivalFor", () => {
  it("home opens chez-moi", () => expect(arrivalFor("logement").to).toBe("/chez-moi"));
  it("work place opens career", () => expect(arrivalFor("entreprise").to).toBe("/carriere"));
  it("shop opens boutique", () => expect(arrivalFor("commerce").to).toBe("/boutique"));
  it("unknown falls back to map", () => expect(arrivalFor("xyz").to).toBe("/carte"));
});
