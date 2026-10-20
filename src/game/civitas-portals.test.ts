import { describe, expect, it } from "vitest";
import { PORTALS, portalById, searchPortals } from "./civitas-portals";

const routes = Object.keys(import.meta.glob("/src/routes/_authenticated/_game/*.tsx")).map(f => "/" + f.split("/").pop()!.replace(/\.tsx$/, ""));
const ids = (q: string) => searchPortals(q).map(p => p.id);

describe("portails de services", () => {
  it("cinq portails", () => expect(PORTALS).toHaveLength(5));
  it("chaque bouton mène à une page existante", () => { for (const p of PORTALS) for (const l of p.links) expect(routes).toContain(l.path); });
  it("caf trouve la Caisse des aides", () => expect(ids("caf")).toEqual(["aides"]));
  it("impôts avec accent trouve l'Espace impôts", () => expect(ids("impôts")).toContain("impots"));
  it("chômage trouve Emploi CIVITAS", () => expect(ids("chômage")).toContain("emploi"));
  it("portail inconnu", () => expect(portalById("x")).toBeUndefined());
});
