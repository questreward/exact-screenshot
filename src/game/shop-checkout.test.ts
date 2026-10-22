import { describe, expect, it, vi } from "vitest";
import { payShopItems } from "./shop-checkout";

describe("caisse des achats existants", () => {
  it("conserve les articles non confirmés après un échec partiel", async () => {
    const items = [{ id: "lit" }, { id: "telephone" }, { id: "table" }];
    const buy = vi.fn(async (id: string) => { if (id === "telephone") throw new Error("Solde insuffisant"); return { reference: "CIV-LIT" }; });
    const result = await payShopItems(items, new Map(), buy, () => "key");
    expect(result.paid.map(p => p.item.id)).toEqual(["lit"]);
    expect(result.failure).toEqual({ item: { id: "telephone" }, message: "Solde insuffisant" });
    expect(items.filter(i => !result.paid.some(p => p.item.id === i.id)).map(i => i.id)).toEqual(["telephone", "table"]);
    expect(buy).toHaveBeenCalledTimes(2);
  });
  it("reprend la même clé après une réponse réseau incertaine sans recréer un achat", async () => {
    const keys = new Map<string, string>();
    const create = vi.fn(() => "same-operation");
    const buy = vi.fn().mockRejectedValueOnce(new Error("Erreur réseau")).mockResolvedValueOnce({ reference: "CIV-RECORDED" });
    await payShopItems([{ id: "telephone" }], keys, buy, create);
    const retry = await payShopItems([{ id: "telephone" }], keys, buy, create);
    expect(buy.mock.calls).toEqual([["telephone", "same-operation"], ["telephone", "same-operation"]]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(retry.paid[0]?.reference).toBe("CIV-RECORDED");
  });
});