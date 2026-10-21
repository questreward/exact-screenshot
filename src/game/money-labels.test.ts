import { describe, it, expect } from "vitest";
import { opKind, opTitle } from "./money-labels";

describe("opérations lisibles", () => {
  it("reconnaît les rubriques", () => {
    expect(opKind("Achat canapé", -499)).toEqual({ emoji: "🛋️", place: "Boutique" });
    expect(opKind("Salaire octobre", 1850).place).toBe("Salaire");
    expect(opKind("Plein d'essence", -60).place).toBe("Carburant");
    expect(opKind("Truc inconnu", -5).place).toBe("Dépense");
  });
  it("nettoie la date technique", () => { expect(opTitle("Logement — 2027-09-02")).toBe("Logement"); });
});
