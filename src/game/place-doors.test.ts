import { describe, expect, it } from "vitest";
import { openState, placeDoor, searchPlaces } from "./place-doors";

const at = (iso: string) => new Date(iso);
describe("horaires des lieux", () => {
  it("magasin ouvert un mardi à 10 h", () => {
    expect(openState("Du lundi au samedi, 9 h – 19 h", at("2026-10-20T10:00:00Z"))).toEqual({ open: true });
  });
  it("fermé à 7 h, ouvre à 09:00", () => {
    expect(openState("Du lundi au samedi, 9 h – 19 h", at("2026-10-20T07:00:00Z"))).toEqual({ open: false, opensAt: "09:00" });
  });
  it("fermé le dimanche", () => {
    expect(openState("Du lundi au samedi, 9 h – 19 h", at("2026-10-25T10:00:00Z"))?.open).toBe(false);
  });
  it("texte inconnu : pas de badge", () => {
    expect(openState("Horaires variables", at("2026-10-20T10:00:00Z"))).toBeNull();
  });
});
describe("portes et recherche", () => {
  it("le logement ouvre Chez moi", () => { expect(placeDoor("logement")?.to).toBe("/chez-moi"); });
  it("recherche sans accents", () => {
    expect(searchPlaces([{ name: "Hôtel de ville", kindLabel: "Mairie", district: "Centre" }], "hotel")).toHaveLength(1);
  });
});
import { distanceKm } from "./place-doors";
describe("distance", () => {
  it("Paris → Lille ≈ 204 km", () => { const d = distanceKm([2.3522, 48.8566], [3.0573, 50.6292]); expect(d).toBeGreaterThan(200); expect(d).toBeLessThan(208); });
});
