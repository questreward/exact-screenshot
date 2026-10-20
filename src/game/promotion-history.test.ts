import { describe, expect, it } from "vitest";
import { promotionView } from "./promotion-history";
const at = "2026-10-20T10:00:00Z";
describe("promotionView", () => {
  it("promotion par missions", () => expect(promotionView({ key: "grade:x:2", kind: "grade", label: "Promotion : Chef d'équipe", created_at: at })).toEqual({ grade: "Chef d'équipe", reason: "Nombre de missions réussies atteint" }));
  it("nomination administrative", () => expect(promotionView({ key: "grade-admin:x:3", kind: "grade", label: "Promotion : Chef de poste", created_at: at }).reason).toBe("Nomination par l'administration"));
  it("entrée en formation", () => expect(promotionView({ key: "entree:r", kind: "entree", label: "Entrée en formation : Protection civile (bénévole)", created_at: at }).grade).toBe("En formation"));
});
