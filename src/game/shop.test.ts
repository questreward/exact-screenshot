import { describe, expect, it } from "vitest";
import { estimatedValue, filterProducts, notaryFees } from "./shop";

const items = [
  { id: "a", name: "iPhone 15", brand: "Apple", section: "tech", price: 969, sales: 2 },
  { id: "b", name: "Air Force 1", brand: "Nike", section: "mode", price: 119, sales: 5 },
  { id: "c", name: "MacBook Air", brand: "Apple", section: "tech", price: 1299, sales: 0 },
];
const none = { search: "", section: "", brand: "", maxPrice: null };

describe("boutique", () => {
  it("filtre par recherche, rubrique, marque et budget", () => {
    expect(filterProducts(items, { ...none, search: "apple" }, "nom").map(p => p.id)).toEqual(["a", "c"]);
    expect(filterProducts(items, { ...none, section: "mode" }, "nom").map(p => p.id)).toEqual(["b"]);
    expect(filterProducts(items, { ...none, maxPrice: 1000 }, "prix-desc").map(p => p.id)).toEqual(["a", "b"]);
  });
  it("trie par popularité", () => {
    expect(filterProducts(items, none, "populaire").map(p => p.id)).toEqual(["b", "a", "c"]);
  });
  it("perd 20 % de valeur par an pour une décote de 20", () => {
    expect(estimatedValue(969, 20, 1)).toBe(775);
    expect(estimatedValue(969, 20, 0)).toBe(969);
  });
  it("ajoute 7,5 % de frais de notaire", () => {
    expect(notaryFees(262000)).toBe(19650);
  });
});
