import { describe, expect, it } from "vitest";
import { linkOf } from "./contact-groups";
const me = { workLocation: "boulot", homeDistrict: "nord" };
describe("liens entre personnes", () => {
  it("score 50 ou plus → ami, même au travail", () => { expect(linkOf({ score: 50, npcLocation: "boulot", npcDistrict: "x" }, me)).toBe("ami"); });
  it("même lieu de travail → collègue", () => { expect(linkOf({ score: 10, npcLocation: "boulot", npcDistrict: "x" }, me)).toBe("collegue"); });
  it("même quartier que mon logement → voisin", () => { expect(linkOf({ score: 10, npcLocation: "y", npcDistrict: "nord" }, me)).toBe("voisin"); });
  it("sinon → connaissance", () => { expect(linkOf({ score: 10, npcLocation: "y", npcDistrict: "sud" }, {})).toBe("connaissance"); });
});
