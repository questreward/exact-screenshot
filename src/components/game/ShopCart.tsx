import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Trash2, LoaderCircle, Check, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { shopBuy, type ShopProduct } from "@/services/game";
import { cn } from "@/lib/utils";

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
type Line = { p: ShopProduct; price: number; ref?: string; error?: string };
type Phase = "cart" | "scan" | "pay" | "ticket";

// Where a bought item lives afterwards (existing pages only).
export function afterPurchase(section: string): { to: string; label: string } {
  if (section === "maison" || section === "electromenager") return { to: "/chez-moi", label: "Voir chez moi" };
  return { to: "/patrimoine", label: "Voir mes biens" };
}

export function ShopCart({ items, balance, price, bump, onRemove, onDone }: {
  items: ShopProduct[]; balance: number; price: (p: ShopProduct) => number; bump: number; onRemove: (id: string) => void; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("cart");
  const [lines, setLines] = useState<Line[]>([]);
  const [fast, setFast] = useState(false);
  const total = items.reduce((n, p) => n + price(p), 0);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, fast ? 0 : ms));

  const checkout = async () => {
    const draft = items.map((p) => ({ p, price: price(p) }));
    setLines(draft); setPhase("scan");
    await wait(900);
    setPhase("pay");
    const done: Line[] = [];
    for (const l of draft) {
      try { const r = await shopBuy(l.p.id, crypto.randomUUID()); done.push({ ...l, ref: r.reference }); }
      catch (e) { done.push({ ...l, error: (e as Error).message }); break; }
    }
    await wait(500);
    setLines(done); setPhase("ticket"); onDone();
  };
  const close = (o: boolean) => { setOpen(o); if (!o && phase === "ticket") { setPhase("cart"); setLines([]); } };
  const paid = lines.filter((l) => l.ref);
  const paidTotal = paid.reduce((n, l) => n + l.price, 0);
  const next = [...new Map(paid.map((l) => { const a = afterPurchase(l.p.section); return [a.to, a]; })).values()];

  if (!items.length && !open) return null;
  return <>
    <button key={bump} type="button" onClick={() => setOpen(true)} aria-label={`Panier : ${items.length} article(s)`}
      className="fixed bottom-20 right-4 z-40 flex min-h-14 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-elegant animate-rise active:scale-95 lg:bottom-6">
      <ShoppingBag className="h-5 w-5" /> {items.length} · {eur(total)}
    </button>
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle className="font-display text-xl">{phase === "ticket" ? "🛍️ Achat effectué" : phase === "cart" ? "🛒 Mon panier" : "Passage en caisse"}</SheetTitle></SheetHeader>

        {phase === "cart" && <div className="mt-3 space-y-3 animate-page">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Ton panier est vide.</p>}
          <ul className="space-y-2">{items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.brand} {p.name}</p><p className="text-xs text-muted-foreground">Quantité : 1</p></div>
              <b>{eur(price(p))}</b>
              <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Retirer ${p.name}`} onClick={() => onRemove(p.id)}><Trash2 className="h-5 w-5" /></Button>
            </li>))}</ul>
          <div className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
            <p className="flex justify-between"><span>Total</span><b className="font-display text-xl">{eur(total)}</b></p>
            <p className="flex justify-between text-sm opacity-80"><span>Paiement</span><span>Carte bancaire · compte courant</span></p>
            <p className="flex justify-between text-sm opacity-80"><span>Solde après</span><span>{eur(balance - total)}</span></p>
          </div>
          {total > balance && <p className="text-sm text-destructive">Solde insuffisant : retire un article.</p>}
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={fast} onChange={(e) => setFast(e.target.checked)} /><FastForward className="h-4 w-4" />Caisse rapide (sans animation)</label>
          <Button className="min-h-14 w-full text-base" disabled={!items.length || total > balance} onClick={checkout}>Passer en caisse</Button>
          <p className="text-xs text-muted-foreground">Voitures et logements se paient à part (comptant ou à crédit).</p>
        </div>}

        {(phase === "scan" || phase === "pay") && <div className="mt-6 space-y-3 text-center animate-page">
          <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="font-display text-lg font-bold">{phase === "scan" ? "La caissière passe tes articles…" : "Paiement par carte…"}</p>
          <ul className="mx-auto max-w-xs space-y-1 text-sm">{lines.map((l, i) => <li key={l.p.id} className="flex justify-between animate-rise" style={{ animationDelay: `${i * 150}ms` }}><span className="truncate">{l.p.name}</span><span>{eur(l.price)}</span></li>)}</ul>
        </div>}

        {phase === "ticket" && <div className="mt-3 space-y-3 animate-page">
          <div className="mx-auto max-w-xs rounded-lg border border-dashed border-border bg-card p-4 font-mono text-sm shadow-card">
            <p className="text-center font-bold">BOUTIQUE CIVITAS</p>
            <p className="text-center text-xs text-muted-foreground">{new Date().toLocaleString("fr-FR")}</p>
            <hr className="my-2 border-dashed border-border" />
            {lines.map((l) => <p key={l.p.id} className={cn("flex justify-between gap-2", l.error && "text-destructive line-through")}><span className="truncate">1× {l.p.name}</span><span>{eur(l.price)}</span></p>)}
            <hr className="my-2 border-dashed border-border" />
            <p className="flex justify-between font-bold"><span>TOTAL</span><span>−{eur(paidTotal)}</span></p>
            <p className="text-xs text-muted-foreground">Carte bancaire · compte courant</p>
            {paid[0]?.ref && <p className="text-xs text-muted-foreground">Réf. {paid.map((l) => l.ref).join(", ")}</p>}
          </div>
          {lines.find((l) => l.error) && <p className="text-sm text-destructive">Un article n'a pas pu être payé : {lines.find((l) => l.error)?.error}</p>}
          {paid.length > 0 && <p className="flex items-center justify-center gap-2 text-center font-semibold"><Check className="h-5 w-5 text-primary" />Tes achats font maintenant partie de ta vie.</p>}
          <div className="grid gap-2">{next.map((a) => <Link key={a.to} to={a.to as "/chez-moi"} className="flex min-h-12 items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground active:scale-95">{a.label}</Link>)}
            <Button variant="outline" className="min-h-12" onClick={() => close(false)}>Continuer mes courses</Button></div>
        </div>}
      </SheetContent>
    </Sheet>
  </>;
}
