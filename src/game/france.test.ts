import { describe, expect, it } from "vitest";
import { circoLabel, searchCommunes, type CommuneIndexRow } from "./france";

const idx: CommuneIndexRow[] = [["69123", "Lyon", "69001", "69"], ["01001", "L'Abergement-Clémenciat", "01400", "01"], ["38000", "Saint-Lyon", "38000", "38"]];

describe("carte de France", () => {
  it("trouve une commune par nom, sans accents, début de mot d'abord", () => {
    expect(searchCommunes(idx, "lyon").map(r => r[0])).toEqual(["69123", "38000"]);
    expect(searchCommunes(idx, "clemenciat")[0]![0]).toBe("01001");
  });
  it("trouve une commune par code postal", () => expect(searchCommunes(idx, "014")[0]![1]).toContain("Abergement"));
  it("nomme la circonscription", () => {
    expect(circoLabel("0101", "Ain")).toBe("1re circonscription · Ain");
    expect(circoLabel("7512", "Paris")).toBe("12e circonscription · Paris");
  });
});
