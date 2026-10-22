import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { shopCatalogQuery, type ShopProduct } from "@/services/game";
import { SECTIONS } from "@/game/shop";
import { formatMoney } from "@/services/game";

// Same session cart as the shop page: the 3D shelf only adds items, payment
// still happens at the existing checkout with its secured per-item purchases.
const CART_KEY = ["shop-cart"];
export const isCreditable = (p: ShopProduct) => p.kind === "vehicle" || !!p.details.realestate;

export function ShelfProducts({ section, onClose }: { section: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ ...shopCatalogQuery({ search: "", section: section ?? "", brand: "", max: "", sort: "populaire", city: "", rooms: "", page: 0 }), enabled: !!section });
  const { data: cart } = useQuery({ queryKey: CART_KEY, queryFn: async (): Promise<ShopProduct[]> => [], initialData: [] as ShopProduct[], staleTime: Infinity, gcTime: Infinity });
  const add = (p: ShopProduct) => {
    if (cart.some((c) => c.id === p.id)) return;
    qc.setQueryData<ShopProduct[]>(CART_KEY, (prev) => [...(prev ?? []), p]);
    toast.success(`${p.name} · ajouté au panier`);
  };
  const products = q.data?.products ?? [];
  return (
    <Sheet open={!!section} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[75dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Rayon {section ? SECTIONS[section] ?? section : ""}</SheetTitle>
          <SheetDescription>{cart.length ? `${cart.length} article(s) dans votre panier.` : "Touchez un produit pour l'ajouter à votre panier."}</SheetDescription>
        </SheetHeader>
        {q.isLoading && <p className="py-6 text-center text-sm">Mise en rayon…</p>}
        {q.isError && <p role="alert" className="py-6 text-center text-sm">Le rayon n'a pas pu être chargé. <button className="underline" onClick={() => q.refetch()}>Réessayer</button></p>}
        {q.data === null && <p className="py-6 text-center text-sm">Disponible dans une prochaine étape.</p>}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {products.map((p) => {
            const inCart = cart.some((c) => c.id === p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase text-primary">{p.brand}</p>
                  <p className="break-words font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{formatMoney(p.price)}</p>
                </div>
                {isCreditable(p)
                  ? <Button asChild variant="outline" className="min-h-12"><Link to="/boutique" search={{ rayon: p.section }}>Voir</Link></Button>
                  : <Button className="min-h-12" variant={inCart ? "outline" : "default"} disabled={inCart} onClick={() => add(p)} aria-label={`Ajouter ${p.name} au panier`}>
                      {inCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}</Button>}
              </li>
            );
          })}
        </ul>
        {cart.length > 0 && <Button asChild className="mt-4 min-h-12 w-full"><Link to="/boutique" search={{}}>Aller payer à la caisse</Link></Button>}
      </SheetContent>
    </Sheet>
  );
}
