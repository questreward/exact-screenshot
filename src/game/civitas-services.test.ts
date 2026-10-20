import { describe, expect, it } from "vitest";
import { CIVITAS_SERVICE_GROUPS, searchServices } from "./civitas-services";

const routes = Object.keys(import.meta.glob("/src/routes/_authenticated/_game/*.tsx")).map(f => "/" + f.split("/").pop()!.replace(/\.tsx$/, ""));
const ids = (q: string) => searchServices(q).flatMap(g => g.services.map(s => s.id));

describe("CIVITAS Services", () => {
  it("chaque carte mène à une page existante", () => {
    for (const g of CIVITAS_SERVICE_GROUPS) for (const s of g.services) expect(routes).toContain(s.path);
  });
  it("recherche sans tenir compte des accents", () => {
    expect(ids("démenager")).toContain("services");
    expect(ids("impots")).toContain("demarches");
  });
  it("louer trouve logement et agence", () => {
    expect(ids("louer")).toEqual(expect.arrayContaining(["logement", "agence"]));
  });
  it("une recherche vide affiche tout, une absurde rien", () => {
    expect(searchServices("")).toHaveLength(6);
    expect(searchServices("zzzz")).toHaveLength(0);
  });
});
