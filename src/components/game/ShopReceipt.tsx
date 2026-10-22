import type { ShopState } from "@/services/game";

export type ShopOrder = ShopState["orders"][number];
const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;

/** Only persisted orders: no reconstructed discount, tax, store or payment method. */
export function ShopReceipt({ orders }: { orders: ShopOrder[] }) {
  return <article aria-label="Ticket d’achat" className="mx-auto w-full max-w-sm border-y border-dashed border-border bg-card px-4 py-6 font-mono text-sm">
    <header className="mb-4 text-center"><h2 className="font-bold">CIVITAS · TICKET D’ACHAT</h2><p className="text-xs text-muted-foreground">Document fictif du jeu</p></header>
    <ul className="divide-y divide-dashed divide-border">{orders.map(o => <li key={o.reference} className="space-y-1 py-3"><div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words">1 × {o.brand} {o.name}</span><b className="shrink-0 tabular-nums">{eur(o.price)}</b></div><time className="block text-xs text-muted-foreground">{new Date(o.at).toLocaleString("fr-FR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} · heure du jeu</time><p className="break-all text-xs text-muted-foreground">Réf. {o.reference}</p></li>)}</ul>
    <p className="mt-4 flex justify-between gap-3 border-t border-dashed border-border pt-3 font-bold"><span>TOTAL ENREGISTRÉ</span><span className="shrink-0">{eur(orders.reduce((sum, o) => sum + o.price, 0))}</span></p>
  </article>;
}