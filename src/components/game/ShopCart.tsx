import { ExperienceState } from "./ExperienceState";
import { ProductPhoto, PurchaseUnboxing } from "@/components/game/ProductPhoto";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Trash2, LoaderCircle, Check, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { shopBuy, shopQuery, type ShopProduct } from "@/services/game";
import { payShopItems } from "@/game/shop-checkout";
import { ShopReceipt, type ShopOrder } from "./ShopReceipt";
import { CheckoutScanner } from './CheckoutScanner';

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
type Line = { p: ShopProduct; price: number; ref?: string; error?: string };
type Phase = "cart" | "scan" | "ready" | "pay" | "ticket";

// Where a bought item lives afterwards (existing pages only).
export function afterPurchase(section: string): { to: string; label: string } {
  if (section === "maison" || section === "electromenager") return { to: "/chez-moi", label: "Voir chez moi" };
  return { to: "/patrimoine", label: "Voir mes biens" };
}

export function ShopCart({ items, balance, price, bump, onRemove, onDone }: {
  items: ShopProduct[]; balance: number; price: (p: ShopProduct) => number; bump: number; onRemove: (id: string) => void; onDone: (paidIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("cart");
  const [lines, setLines] = useState<Line[]>([]);
  const [fast, setFast] = useState(false);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [receiptError, setReceiptError] = useState(false);
  const locked = useRef(false);
  const qc = useQueryClient();
  const { data: savedRequests } = useQuery({ queryKey: ["shop-cart-requests"], queryFn: async (): Promise<Record<string, string>> => ({}), initialData: {} as Record<string, string>, staleTime: Infinity, gcTime: Infinity });
  const requests = useRef(new Map<string, string>(Object.entries(savedRequests)));
  const total = items.reduce((n, p) => n + price(p), 0);
  const scan = () => {
    if (locked.current || !items.length) return;
    locked.current = true;
    const draft = items.map((p) => ({ p, price: price(p) }));
    setLines(draft); setPhase(fast ? "ready" : "scan");
    locked.current = false;
  };
  const checkout = async () => {
    if (locked.current || phase !== "ready") return;
    locked.current = true;
    setPhase("pay");
    try {
      const result = await payShopItems(lines.map(l => l.p), requests.current, (id, key) => {
        qc.setQueryData<Record<string, string>>(["shop-cart-requests"], previous => ({ ...previous, [id]: key }));
        return shopBuy(id, key);
      }, () => crypto.randomUUID());
      const done: Line[] = result.paid.map(r => ({ p: r.item, price: price(r.item), ref: r.reference }));
      if (result.failure) done.push({ p: result.failure.item, price: price(result.failure.item), error: result.failure.message });
      for (const r of result.paid) requests.current.delete(r.item.id);
      qc.setQueryData(["shop-cart-requests"], Object.fromEntries(requests.current));
      setLines(done); setOrders([]); setReceiptError(false);
      onDone(result.paid.map(r => r.item.id));
      if (result.paid.length) {
        try {
          const state = await qc.fetchQuery({ ...shopQuery, staleTime: 0 });
          const refs = new Set(result.paid.map(r => r.reference));
          const recorded = state.orders.filter(o => refs.has(o.reference));
          setOrders(recorded); setReceiptError(recorded.length !== refs.size);
        } catch { setReceiptError(true); }
      }
    } finally {
      setPhase("ticket"); locked.current = false;
    }
  };
  const close = (o: boolean) => { if (locked.current) return; setOpen(o); if (!o) { setPhase("cart"); setLines([]); } };
  const paid = lines.filter((l) => l.ref);
  const next = [...new Map(paid.map((l) => { const a = afterPurchase(l.p.section); return [a.to, a]; })).values()];

  if (!items.length && !open) return null;
  return <>
    <Button key={bump} type="button" onClick={() => setOpen(true)} aria-label={`Panier : ${items.length} article(s)`}
      className="fixed bottom-20 right-4 z-40 flex min-h-14 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-elegant animate-rise active:scale-95 lg:bottom-6">
      <ShoppingBag className="h-5 w-5" /> {items.length} · {eur(total)}
    </Button>
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle className="font-display text-xl">{phase === "ticket" ? "Résultat du passage en caisse" : phase === "cart" ? "🛒 Mon panier" : "Passage en caisse"}</SheetTitle></SheetHeader>

        {phase === "cart" && <div className="mt-3 space-y-3 animate-page">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Ton panier est vide.</p>}
          <ul className="space-y-2">{items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
              <ProductPhoto name={p.name} details={p.details} className="h-16 w-16 shrink-0 rounded-lg" /><div className="min-w-0 flex-1"><p className="break-words font-semibold">{p.brand} {p.name}</p><p className="text-xs text-muted-foreground">1 exemplaire · possession unique</p></div>
              <b className="shrink-0 tabular-nums">{eur(price(p))}</b>
              <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Retirer ${p.name}`} onClick={() => onRemove(p.id)}><Trash2 className="h-5 w-5" /></Button>
            </li>))}</ul>
          <div className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
            <p className="flex justify-between"><span>Total estimé</span><b className="font-display text-xl">{eur(total)}</b></p>
            <p className="flex justify-between text-sm opacity-80"><span>Paiement</span><span>Compte courant</span></p>
            <p className="flex justify-between text-sm opacity-80"><span>Solde estimé après</span><span>{eur(balance - total)}</span></p>
          </div>
          {total > balance && <p className="text-sm text-destructive">Votre solde affiché semble insuffisant. Vous pouvez modifier le panier ; le paiement sera vérifié.</p>}
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={fast} onChange={(e) => setFast(e.target.checked)} /><FastForward className="h-4 w-4" />Caisse rapide (sans animation)</label>
          <Button className="min-h-14 w-full text-base" disabled={!items.length} onClick={() => void scan()}>Passer en caisse</Button>
          <p className="text-xs text-muted-foreground">Chaque article est payé séparément. Voitures et logements se paient à part (comptant ou à crédit).</p>
        </div>}

        {phase === 'scan' && <CheckoutScanner items={lines.map(line => line.p)} price={p => lines.find(line => line.p.id === p.id)?.price ?? price(p)} onComplete={() => setPhase('ready')} onBack={() => setPhase('cart')} />}

        {phase === "pay" && <div className="mt-6 space-y-3 text-center animate-page">
          <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="font-display text-lg font-bold">Vérification du paiement…</p>
          <ul className="mx-auto max-w-xs space-y-1 text-sm">{lines.map((l, i) => <li key={l.p.id} className="flex justify-between animate-rise" style={{ animationDelay: `${i * 150}ms` }}><span className="truncate">{l.p.name}</span><span>{eur(l.price)}</span></li>)}</ul>
        </div>}

        {phase === "ready" && <div className="mt-5 space-y-4"><Check className="mx-auto h-10 w-10 text-success" /><h2 className="text-center font-display text-xl font-bold">Articles reconnus</h2><ul className="divide-y divide-border">{lines.map(l => <li key={l.p.id} className="flex justify-between gap-3 py-3"><span className="min-w-0 break-words">1 × {l.p.name}</span><b className="shrink-0">{eur(l.price)}</b></li>)}</ul><p className="flex justify-between font-semibold"><span>Total estimé</span><span>{eur(lines.reduce((sum, l) => sum + l.price, 0))}</span></p><p className="text-sm text-muted-foreground">Paiement depuis votre compte courant. Les prix et vos possessions sont vérifiés au paiement.</p><Button className="min-h-14 w-full" onClick={() => void checkout()}>Confirmer et payer</Button><Button variant="outline" className="min-h-12 w-full" onClick={() => setPhase("cart")}>Retour au panier</Button></div>}

        {phase === "ticket" && <div className="mt-3 space-y-3 animate-page">
          <PurchaseUnboxing products={paid.map(l => l.p)} />
          {orders.length > 0 && <ShopReceipt orders={orders} />}
          {receiptError && <ExperienceState kind="info" title="Achats confirmés, ticket momentanément indisponible" description="Retrouvez les reçus dans l’historique après actualisation, sans payer à nouveau." />}
          {lines.find((l) => l.error) && <ExperienceState kind="error" title="Paiement non confirmé pour un article" description={`${lines.find(l => l.error)?.error} Les articles non confirmés restent dans le panier. Réessayez pour vérifier le même paiement, sans le doubler.`} />}
          {paid.length > 0 && <ExperienceState kind="success" title={`${paid.length} achat${paid.length > 1 ? "s" : ""} confirmé${paid.length > 1 ? "s" : ""}`} description="Ces articles sont maintenant dans vos possessions. Les références ci-dessus sont enregistrées." />}
          <div className="grid gap-2">{next.map((a) => <Link key={a.to} to={a.to as "/chez-moi"} className="flex min-h-12 items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground active:scale-95">{a.label}</Link>)}
            <Button variant="outline" className="min-h-12" onClick={() => close(false)}>Continuer mes courses</Button></div>
        </div>}
      </SheetContent>
    </Sheet>
  </>;
}
