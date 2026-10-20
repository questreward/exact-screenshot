import { describe, expect, it } from "vitest";
import { filterHousing, housingFacts, housingIllustrationKind } from "./housing-visuals";
import type { ShopProduct } from "@/services/game";
const property = (id: string, details: ShopProduct["details"]): ShopProduct => ({ id, name: "Appartement", price: 100000, kind: "item", brand: "Immobilier", section: "immobilier", desc: "", dep: 0, owned: false, sales: 0, details });
describe("Logements visuels, présentation uniquement", () => {
  it("filtre selon la ville et les pièces réellement connues", () => {
    const paris = property("p", { realestate: true, city: "paris", rooms: 2 });
    const lyon = property("l", { realestate: true, city: "lyon", rooms: 3 });
    expect(filterHousing([paris, lyon], "paris", "2")).toEqual([paris]);
    expect(filterHousing([paris, lyon], "paris", "3")).toEqual([]);
  });
  it("n'invente aucune caractéristique absente", () => {
    expect(housingFacts(property("p", {}))).toEqual([]);
    expect(housingFacts(property("p", { surface: 42, rooms: 2, charges_monthly: 0 }))).toEqual([
      { label: "Surface", value: "42 m²" }, { label: "Pièces", value: "2" }, { label: "Charges mensuelles", value: "0 €" },
    ]);
  });
  it("ne traite pas les objets comme des logements filtrables", () => {
    expect(filterHousing([property("p", { city: "paris", rooms: 2 })], "paris", "2")).toEqual([]);
  });
  it("choisit des illustrations sans ajouter de caractéristiques", () => {
    const p = property("p", { rooms: 1 });
    expect(housingIllustrationKind(p)).toBe("studio");
    expect(housingIllustrationKind({ ...p, name: "Maison — Lyon" })).toBe("house");
    expect(p.details).toEqual({ rooms: 1 });
  });
});
