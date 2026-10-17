import { describe, expect, it } from "vitest";
import { academicLevel, canFinish, energyAfter, MAX_ENERGY, overlaps } from "./life";
describe("Vie quotidienne", () => {
  it("limite l’énergie maximale à 100", () => expect(MAX_ENERGY).toBe(100));
  it("le repos ne dépasse jamais 100", () => expect(energyAfter(92, 0, 25)).toBe(100));
  it("une activité consomme son énergie", () => expect(energyAfter(72, 20, 0)).toBe(52));
  it("le repos récupère de l’énergie", () => expect(energyAfter(40, 0, 25)).toBe(65));
  it("ne termine pas instantanément une activité", () => expect(canFinish("running", "2027-09-01T11:00:00Z", "2027-09-01T09:00:00Z")).toBe(false));
  it("termine une activité seulement après sa fin", () => expect(canFinish("running", "2027-09-01T11:00:00Z", "2027-09-01T11:00:00Z")).toBe(true));
  it("ne verse pas deux fois une activité terminée", () => expect(canFinish("completed", "2027-09-01T11:00:00Z", "2027-09-01T12:00:00Z")).toBe(false));
  it("refuse deux activités simultanées", () => expect(overlaps("2027-09-01T09:00:00Z","2027-09-01T11:00:00Z","2027-09-01T10:00:00Z","2027-09-01T12:00:00Z")).toBe(true));
  it("permet deux activités successives", () => expect(overlaps("2027-09-01T09:00:00Z","2027-09-01T11:00:00Z","2027-09-01T11:00:00Z","2027-09-01T12:00:00Z")).toBe(false));
  it("prépare les niveaux académiques", () => expect(academicLevel(135)).toBe(2));
});