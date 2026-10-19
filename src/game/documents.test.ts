import { describe, expect, it } from "vitest";
import { adminTimeline, expiresSoon, formProgress, missingRequired } from "./documents";
import type { FormField, VaultDoc } from "@/services/game";

const doc = (kind: string, at: string, extra: Partial<VaultDoc> = {}): VaultDoc =>
  ({ key: kind + at, category: "travail", kind, title: kind, at, status: "valide", expires_at: null, data: {}, ...extra });

const fields: FormField[] = [
  { key: "nom", label: "Nom", type: "text", prefill: "full_name" },
  { key: "foyer", label: "Foyer", type: "number", required: true },
  { key: "certifie", label: "Certifie", type: "checkbox", required: true },
];

describe("documents", () => {
  it("ne compte pas les champs pré-remplis dans la progression", () => {
    expect(formProgress(fields, { foyer: 2 })).toBe(50);
  });
  it("une case obligatoire non cochée reste manquante", () => {
    expect(missingRequired(fields, { foyer: 2, certifie: false })).toEqual(["Certifie"]);
  });
  it("signale un document qui expire dans les 30 jours", () => {
    const now = new Date("2030-01-01");
    expect(expiresSoon(doc("assurance", "2029-01-01", { expires_at: "2030-01-20" }), now)).toBe(true);
    expect(expiresSoon(doc("assurance", "2029-01-01", { expires_at: "2030-03-01" }), now)).toBe(false);
  });
  it("l'historique garde la première fois puis les changements d'emploi", () => {
    const t = adminTimeline([doc("contrat", "2028-01-01"), doc("carte", "2026-01-01"), doc("contrat", "2027-01-01")]);
    expect(t.map(x => x.title)).toEqual(["Première carte CIVITAS", "Premier contrat de travail", "Changement d'emploi"]);
  });
});
