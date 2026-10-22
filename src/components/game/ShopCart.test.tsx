import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ShopProduct } from "@/services/game";

const state = vi.hoisted(() => ({ buy: vi.fn() }));
vi.mock("@/components/game/ProductPhoto", () => ({ ProductPhoto: () => null, PurchaseUnboxing: () => null }));
vi.mock("@/services/game", () => ({ shopBuy: state.buy, shopQuery: queryOptions({ queryKey: ["shop", "state"], queryFn: async () => ({ orders: [{ reference: "CIV-PAID", name: "Lit", brand: "CIVITAS", price: 37, at: "2026-10-22T12:00:00Z" }] }) }) }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
import { ShopCart } from "./ShopCart";

const item: ShopProduct = { id: "lit", name: "Lit", price: 10, kind: "item", brand: "CIVITAS", section: "maison", desc: "", dep: 0, owned: false, sales: 0, details: {} };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("confirmation en caisse", () => {
  it("ne paie qu'après confirmation et ignore le double appui", async () => {
    const done = vi.fn();
    let finish: ((result: { reference: string }) => void) | undefined;
    state.buy.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={qc}><ShopCart items={[item]} balance={100} price={p => p.price} bump={0} onRemove={vi.fn()} onDone={done} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Panier :/ }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Passer en caisse" }));
    const pay = await screen.findByRole("button", { name: "Confirmer et payer" });
    expect(state.buy).not.toHaveBeenCalled();
    fireEvent.click(pay); fireEvent.click(pay);
    expect(state.buy).toHaveBeenCalledTimes(1);
    finish?.({ reference: "CIV-PAID" });
    await waitFor(() => expect(done).toHaveBeenCalledWith(["lit"]));
    await waitFor(() => expect(qc.getQueryData<{ orders: { price: number }[] }>(["shop", "state"])?.orders[0]?.price).toBe(37));
    expect(qc.getQueryData<Record<string, string>>(["shop-cart-requests"])?.["lit"]).toBeUndefined();
  });
});