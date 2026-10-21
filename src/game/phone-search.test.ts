import { describe, expect, it } from "vitest";
import { phoneSearch } from "./phone-search";
const tos = (q: string) => phoneSearch(q).map(h => h.to);
describe("recherche du téléphone", () => {
  it("« permis » → permis, documents, voiture", () => { expect(tos("permis")).toEqual(expect.arrayContaining(["/permis", "/mes-documents", "/conduite"])); });
  it("« maison » → logement", () => { expect(tos("maison")).toContain("/chez-moi"); });
  it("« salaire » → banque et travail", () => { expect(tos("salaire")).toEqual(expect.arrayContaining(["/banque", "/carriere"])); });
  it("« voiture » sans accent ni majuscule", () => { expect(tos("VOITURE")[0]).toBe("/conduite"); });
  it("une lettre ne suffit pas", () => { expect(phoneSearch("p")).toEqual([]); });
});
