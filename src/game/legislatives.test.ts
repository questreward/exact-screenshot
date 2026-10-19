import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ASSEMBLY_MAJORITY, seatsByParty, type LegData } from "./legislatives";
const data = JSON.parse(readFileSync("public/geo/legislatives-2024.json", "utf8")) as LegData;
describe("législatives 2024", () => {
  it("577 circonscriptions", () => expect(Object.keys(data.seats)).toHaveLength(577));
  it("majorité absolue à 289", () => expect(ASSEMBLY_MAJORITY).toBe(289));
  it("répartition officielle 2024", () => {
    const s = Object.fromEntries(seatsByParty(data).map(x => [x.code, x.seats]));
    expect(s["UG"]).toBe(178); expect(s["ENS"]).toBe(150); expect(s["RN"]).toBe(125); expect(s["LR"]).toBe(39);
  });
  it("aucun vrai nom : chaque élu a un nom inventé", () => expect(Object.values(data.seats).every(x => x.d.split(" ").length >= 2)).toBe(true));
});
