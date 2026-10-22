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
  it('annonce lundi, pas demain, après la fermeture du vendredi', () => {
    expect(openState('Du lundi au vendredi, 9 h – 17 h', at('2026-10-23T18:00:00Z'))).toEqual({ open: false, opensAt: 'lundi 09:00' });
  });
  it('respecte la pause entre deux plages le même jour', () => {
    expect(openState('Tous les jours, 9 h – 12 h et 14 h – 18 h', at('2026-10-22T13:00:00Z'))).toEqual({ open: false, opensAt: '14:00' });
  });
  it('conserve une ouverture de nuit commencée vendredi après minuit samedi', () => {
    expect(openState('Du lundi au vendredi, 22 h – 6 h', at('2026-10-24T02:00:00Z'))).toEqual({ open: true });
    expect(openState('Du lundi au vendredi, 22 h – 6 h', at('2026-10-24T22:00:00Z'))).toEqual({ open: false, opensAt: 'lundi 22:00' });
  });
  it('refuse un horaire invalide ou différentes plages ambiguës par jour', () => {
    expect(openState('9 h – 29 h', at('2026-10-22T12:00:00Z'))).toBeNull();
    expect(openState('Lundi 9 h – 12 h, mardi 14 h – 18 h', at('2026-10-22T12:00:00Z'))).toBeNull();
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
