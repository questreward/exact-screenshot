import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Car, LoaderCircle, Repeat, Store, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dealerQuery, dealerRpc, type DealerState } from "@/services/game";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/concession")({
  head: () => ({ meta: gameMeta("Concessionnaire", "Acheter une voiture neuve ou d'occasion chez un joueur, faire reprendre la tienne, tenir ta concession.") }),
  component: DealerPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const KIND: Record<string, string> = { restock: "Achat en stock", sale: "Vente comptant", credit_sale: "Vente à crédit", trade_in: "Reprise", used_sale: "Vente d'occasion" };

function DealerPage() {
  const qc = useQueryClient();
  const { data: s, isLoading, isError } = useQuery(dealerQuery);
  const act = useMutation({
    mutationFn: (v: { fn: Parameters<typeof dealerRpc>[0]; args: Record<string, unknown>; ok: string }) => dealerRpc(v.fn, v.args).then(r => ({ r, ok: v.ok })),
    onSuccess: ({ r, ok }) => { toast.success(r?.already ? "Déjà fait." : ok); ["dealer", "economy", "shop", "bank", "character", "services"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <div className="flex justify-center py-20"><LoaderCircle className="animate-spin" /></div>;
  if (isError || !s) return <p className="py-10 text-center text-muted-foreground">Le concessionnaire n'est pas encore installé sur le serveur.</p>;
  const others = s.dealers.filter(d => !d.mine);
  return <div className="space-y-5 animate-rise">
    <div className="flex items-center gap-3"><Car className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Concessionnaire</h1>
      <p className="text-sm text-muted-foreground">Les concessions des joueurs de ta ville. Sans concession joueur, la <Link to="/boutique" className="underline">Boutique</Link> vend les voitures au prix normal.</p></div></div>
    <Tabs defaultValue="neuf">
      <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="neuf" className="h-11">Neuf</TabsTrigger>
        <TabsTrigger value="occasion" className="h-11">Occasion</TabsTrigger>
        <TabsTrigger value="reprise" className="h-11">Reprise</TabsTrigger>
        <TabsTrigger value="mienne" className="h-11">Ma concession</TabsTrigger>
      </TabsList>
      <TabsContent value="neuf" className="space-y-4">
        {others.every(d => !d.stock.length) && <p className="text-sm text-muted-foreground">Aucune voiture neuve en stock chez les joueurs de ta ville pour l'instant.</p>}
        {others.map(d => d.stock.length > 0 && <div key={d.id} className="space-y-2">
          <h2 className="font-heading text-lg font-bold">{d.name} <span className="text-sm font-normal text-muted-foreground">· tarif {d.percent} %{d.rating != null ? ` · ${d.rating}/5` : ""}</span></h2>
          {d.stock.map(c => <NewCar key={c.catalog_id} dealer={d.id} car={c} busy={act.isPending} onBuy={(args, ok) => act.mutate({ fn: "dealer_buy", args, ok })} />)}
        </div>)}
      </TabsContent>
      <TabsContent value="occasion" className="space-y-3">
        {others.every(d => !d.used.length) && <p className="text-sm text-muted-foreground">Aucune occasion pour l'instant.</p>}
        {others.flatMap(d => d.used.map(u => <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="min-w-0 flex-1"><p className="font-semibold">{u.name}</p><p className="text-xs text-muted-foreground">{d.name} · {u.condition}</p></div>
          <Button className="h-11" disabled={act.isPending} onClick={() => act.mutate({ fn: "dealer_used_buy", args: { _used_id: u.id }, ok: "Voiture achetée !" })}>{eur(u.price)}</Button>
        </div>))}
      </TabsContent>
      <TabsContent value="reprise" className="space-y-3">
        <p className="text-sm text-muted-foreground">La concession te rachète ta voiture {s.settings.trade_percent} % de sa valeur actuelle, avec l'argent de sa caisse. Un crédit en cours est remboursé d'abord.</p>
        {!s.my_cars.length && <p className="text-sm text-muted-foreground">Tu n'as pas de voiture.</p>}
        {s.my_cars.map(c => <TradeIn key={c.asset_id} car={c} dealers={others} busy={act.isPending} onTrade={biz => act.mutate({ fn: "dealer_trade_in", args: { _business_id: biz, _asset_id: c.asset_id }, ok: "Voiture reprise" })} />)}
      </TabsContent>
      <TabsContent value="mienne" className="space-y-4">
        {s.mine ? <MyDealer s={s} busy={act.isPending} run={(fn, args, ok) => act.mutate({ fn, args, ok })} />
          : <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <p>Tu n'as pas de concession. Crée une entreprise du type <strong>« Concessionnaire automobile »</strong> depuis Patrimoine.</p>
              <Button asChild variant="outline" className="mt-3 h-11"><Link to="/patrimoine"><Store />Aller à Patrimoine</Link></Button>
            </div>}
      </TabsContent>
    </Tabs>
  </div>;
}

function NewCar({ dealer, car, busy, onBuy }: { dealer: string; car: DealerState["dealers"][number]["stock"][number]; busy: boolean; onBuy: (a: Record<string, unknown>, ok: string) => void }) {
  const [credit, setCredit] = useState(false);
  const [down, setDown] = useState(String(Math.ceil(car.catalog_price * 0.1)));
  const [months, setMonths] = useState("48");
  return <div className="space-y-3 rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-2"><div><p className="font-semibold">{car.brand ? `${car.brand} ` : ""}{car.name}</p>
      <p className="text-xs text-muted-foreground">{car.quantity} en stock · prix catalogue {eur(car.catalog_price)}</p></div>
      <p className="font-heading text-lg font-bold">{eur(car.price)}</p></div>
    <div className="grid grid-cols-2 gap-2">
      <Button className="h-11" disabled={busy} onClick={() => onBuy({ _business_id: dealer, _catalog_id: car.catalog_id, _down_payment: null, _months: null }, "Voiture achetée !")}><ShoppingBag />Comptant</Button>
      <Button variant="outline" className="h-11" onClick={() => setCredit(c => !c)}>À crédit</Button>
    </div>
    {credit && <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">À crédit, le prix est celui du catalogue ({eur(car.catalog_price)}), avec les règles de crédit de la banque.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Apport (€)<Input className="mt-1 h-11" type="number" inputMode="numeric" value={down} onChange={e => setDown(e.target.value)} /></label>
        <label className="text-xs">Durée (mois)<Input className="mt-1 h-11" type="number" inputMode="numeric" value={months} onChange={e => setMonths(e.target.value)} /></label>
      </div>
      <Button className="h-11 w-full" disabled={busy} onClick={() => onBuy({ _business_id: dealer, _catalog_id: car.catalog_id, _down_payment: Number(down), _months: Number(months) }, "Crédit accepté, voiture achetée !")}>Confirmer le crédit</Button>
    </div>}
  </div>;
}

function TradeIn({ car, dealers, busy, onTrade }: { car: DealerState["my_cars"][number]; dealers: DealerState["dealers"]; busy: boolean; onTrade: (biz: string) => void }) {
  const [biz, setBiz] = useState(dealers[0]?.id ?? "");
  return <div className="space-y-2 rounded-xl border border-border bg-card p-4">
    <p className="font-semibold">{car.name}</p>
    <p className="text-sm text-muted-foreground">Valeur {eur(car.value)} · reprise proposée <strong className="text-foreground">{eur(car.offer)}</strong>{car.credit ? ` · crédit restant ${eur(car.credit)}` : ""}</p>
    {dealers.length ? <div className="flex gap-2">
      <select aria-label="Concession" className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={biz} onChange={e => setBiz(e.target.value)}>
        {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <Button className="h-11" disabled={busy || !biz || (car.credit != null && car.offer < car.credit)} onClick={() => onTrade(biz)}><Repeat />Faire reprendre</Button>
    </div> : <p className="text-xs text-muted-foreground">Aucune concession joueur dans ta ville. Tu peux revendre dans la Boutique.</p>}
  </div>;
}

function MyDealer({ s, busy, run }: { s: DealerState; busy: boolean; run: (fn: Parameters<typeof dealerRpc>[0], a: Record<string, unknown>, ok: string) => void }) {
  const mine = s.mine!;
  const me = s.dealers.find(d => d.mine);
  const [pct, setPct] = useState(String(me?.percent ?? 100));
  const [car, setCar] = useState(s.catalog[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const chosen = s.catalog.find(c => c.id === car);
  return <>
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Caisse</p><p className="font-heading text-2xl font-bold">{eur(mine.balance ?? 0)}</p></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Stock</p><p className="font-heading text-2xl font-bold">{mine.stock_count} / {s.settings.max_stock}</p></div>
    </div>
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Mon tarif</h2>
      <p className="text-sm text-muted-foreground">Entre {s.settings.min_percent} et {s.settings.max_percent} % du prix catalogue. Il compte aussi pour les occasions.</p>
      <div className="flex gap-2"><Input className="h-11" type="number" inputMode="numeric" value={pct} onChange={e => setPct(e.target.value)} />
        <Button className="h-11" disabled={busy} onClick={() => run("dealer_set_price", { _percent: Number(pct) }, "Tarif enregistré")}>Enregistrer</Button></div>
    </div>
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Acheter du stock</h2>
      <select aria-label="Voiture" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={car} onChange={e => setCar(e.target.value)}>
        {s.catalog.map(c => <option key={c.id} value={c.id}>{c.brand ? `${c.brand} ` : ""}{c.name} — gros {eur(c.wholesale)}</option>)}
      </select>
      <div className="flex gap-2"><Input className="h-11 w-24" type="number" inputMode="numeric" min={1} value={qty} onChange={e => setQty(e.target.value)} />
        <Button className="h-11 flex-1" disabled={busy || !chosen} onClick={() => run("dealer_restock", { _catalog_id: car, _quantity: Number(qty) }, "Stock acheté")}>
          Acheter{chosen ? ` · ${eur(chosen.wholesale * (Number(qty) || 0))}` : ""}</Button></div>
    </div>
    {me && (me.stock.length > 0 || me.used.length > 0) && <div className="space-y-1 rounded-xl border border-border bg-card p-4 text-sm">
      <h2 className="font-heading text-lg font-bold">En vente</h2>
      {me.stock.map(c => <p key={c.catalog_id}>{c.quantity} × {c.name} — {eur(c.price)}</p>)}
      {me.used.map(u => <p key={u.id}>Occasion : {u.name} — {eur(u.price)}</p>)}
    </div>}
    <div className="space-y-1 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Historique</h2>
      {mine.ops.length ? <ul className="divide-y divide-border text-sm">{mine.ops.map((o, i) => <li key={i} className="flex justify-between gap-2 py-2">
        <span className="min-w-0 truncate">{KIND[o.kind] ?? o.kind} · {o.quantity > 1 ? `${o.quantity} × ` : ""}{o.name}{o.kind !== "restock" ? ` · ${o.client}` : ""}</span>
        <span className={o.kind === "restock" || o.kind === "trade_in" ? "text-destructive" : "font-semibold"}>{o.kind === "restock" ? "" : o.kind === "trade_in" ? "−" : "+"}{eur(Math.abs(o.amount))}</span></li>)}</ul>
        : <p className="text-sm text-muted-foreground">Rien pour l'instant. Les clients fictifs passent chaque semaine.</p>}
    </div>
  </>;
}
