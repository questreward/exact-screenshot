import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LoaderCircle, Store, MapPin, Check, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { marketQuery, marketRpc, shopQuery, type MarketListing, type MarketState } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { SECTIONS, marketNet, storePrice } from "@/game/shop";

export const Route = createFileRoute("/_authenticated/_game/marche")({
  head: () => ({ meta: gameMeta("Marché", "Magasins des villes, commerces tenus par des joueurs et marché entre joueurs avec offres.") }),
  component: MarketPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const day = (s: string) => new Date(s).toLocaleDateString("fr-FR");
const input = "h-12 w-full rounded-lg border border-input bg-background px-3";
const OFFER: Record<string, string> = { pending: "En attente", accepted: "Acceptée — à payer", refused: "Refusée", cancelled: "Annulée", expired: "Expirée", done: "Payée" };

function MarketPage() {
  const qc = useQueryClient();
  const { data: s, isLoading, isError } = useQuery(marketQuery);
  const shop = useQuery(shopQuery);
  const refresh = () => ["market", "shop", "economy", "character", "life"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  const act = useMutation({
    mutationFn: (v: { fn: Parameters<typeof marketRpc>[0]; args: Record<string, unknown>; ok: string }) => marketRpc(v.fn, v.args),
    onSuccess: (_d, v) => { toast.success(v.ok); refresh(); }, onError: (e: Error) => toast.error(e.message),
  });
  useEffect(() => { if (s?.collected) toast.success(`Ventes encaissées : ${eur(s.collected)}`); }, [s?.collected]);
  const run = (fn: Parameters<typeof marketRpc>[0], args: Record<string, unknown>, ok: string) => act.mutate({ fn, args, ok });
  const pendingReceived = (s?.offers_received ?? []).filter(o => o.status === "pending").length;

  return <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Store className="h-8 w-8 text-primary" />
      <div className="flex-1"><h1 className="font-heading text-2xl font-bold">Marché</h1><p className="text-sm text-muted-foreground">Magasins, commerces de joueurs et petites annonces.</p></div>
      {s && <div className="rounded-lg bg-secondary px-3 py-2 text-right text-secondary-foreground"><p className="text-xs opacity-80">Solde</p><p className="font-heading font-bold">{eur(s.balance)}</p></div>}</header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Marché : Disponible dans une prochaine étape.</p>}
    {s && <Tabs defaultValue="annonces">
      <TabsList className="flex h-12 w-full justify-start overflow-x-auto">
        <TabsTrigger value="annonces">Annonces</TabsTrigger><TabsTrigger value="vendre">Vendre{pendingReceived ? ` (${pendingReceived})` : ""}</TabsTrigger>
        <TabsTrigger value="magasins">Magasins</TabsTrigger><TabsTrigger value="commerces">Commerces</TabsTrigger>
        {s.my_business && <TabsTrigger value="moncommerce">Mon commerce</TabsTrigger>}</TabsList>

      <TabsContent value="annonces" className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Achète au prix affiché ou propose ton prix (au moins {s.settings.min_offer_percent} %). Si le vendeur accepte, l'objet t'est réservé {s.settings.reservation_days} jours de jeu.</p>
        <Offers title="Mes offres envoyées" list={s.offers_sent} render={o => <>
          <span className="text-xs">{OFFER[o.status]}{o.reserved_until ? ` jusqu'au ${day(o.reserved_until)}` : ""}</span>
          {o.status === "pending" && <Button variant="outline" className="h-10" onClick={() => run("market_offer_answer", { _offer_id: o.id, _accept: false }, "Offre retirée.")}>Retirer</Button>}</>} />
        {s.listings.filter(l => !l.mine).length === 0 ? <p className="text-sm text-muted-foreground">Aucune annonce pour l'instant.</p> :
          <ul className="grid gap-3 sm:grid-cols-2">{s.listings.filter(l => !l.mine).map(l => <ListingCard key={l.id} l={l} s={s} busy={act.isPending}
            onBuy={() => run("market_buy", { _listing_id: l.id, _request_id: crypto.randomUUID() }, `${l.name} acheté.`)}
            onOffer={amount => run("market_offer", { _listing_id: l.id, _amount: amount }, "Offre envoyée au vendeur.")} />)}</ul>}
      </TabsContent>

      <TabsContent value="vendre" className="mt-4 space-y-4">
        <Offers title="Offres reçues" list={s.offers_received} render={o => o.status === "pending" ? <div className="flex gap-2">
          <Button variant="outline" className="h-10" disabled={act.isPending} onClick={() => run("market_offer_answer", { _offer_id: o.id, _accept: false }, "Offre refusée.")}>Refuser</Button>
          <Button className="h-10" disabled={act.isPending} onClick={() => run("market_offer_answer", { _offer_id: o.id, _accept: true }, "Offre acceptée : l'acheteur a quelques jours pour payer.")}>Accepter</Button></div>
          : <span className="text-xs">{OFFER[o.status]}</span>} showBuyer />
        <section className="space-y-2"><h2 className="font-heading font-bold">Mes annonces</h2>
          {s.listings.filter(l => l.mine).length === 0 ? <p className="text-sm text-muted-foreground">Aucune annonce en cours.</p> :
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">{s.listings.filter(l => l.mine).map(l => <li key={l.id} className="flex items-center justify-between gap-2 p-3">
              <div><p className="font-semibold">{l.name}</p><p className="text-xs text-muted-foreground">{eur(l.price)} · tu recevras {eur(marketNet(l.status === "reserved" && l.reserved_price ? l.reserved_price : l.price, s.settings.fee_percent))}
                {l.status === "reserved" && l.reserved_until ? ` · réservé (${eur(l.reserved_price ?? 0)}) jusqu'au ${day(l.reserved_until)}` : ""}</p></div>
              <Button variant="outline" className="h-10" disabled={act.isPending} onClick={() => run("market_cancel", { _listing_id: l.id }, "Annonce retirée.")}>Retirer</Button></li>)}</ul>}</section>
        <SellForm s={s} busy={act.isPending} onList={(id, price, note) => run("market_list", { _asset_id: id, _price: price, _note: note }, "Annonce publiée.")} />
        {s.sales.length > 0 && <section className="space-y-2"><h2 className="font-heading font-bold">Ventes encaissées</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">{s.sales.map((v, i) => <li key={i} className="flex justify-between gap-2 p-3 text-sm">
            <span>{v.name}<br /><span className="text-xs text-muted-foreground">{day(v.at)} · frais {eur(v.fee)}</span></span><b className="text-primary">+{eur(v.amount)}</b></li>)}</ul></section>}
      </TabsContent>

      <TabsContent value="magasins" className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Achète sur place, dans ta ville, avec la remise de l'enseigne. Pour un magasin d'une autre ville, il faut d'abord t'y rendre.</p>
        {s.stores.map(st => <details key={st.id} className="rounded-xl border border-border bg-card p-4" open={st.here && st.sections.length === 1}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
            <div><p className="font-heading font-bold">{st.name}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{st.district}, {st.city} · {st.kind} · {st.hours}</p></div>
            <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">−{st.discount} %</span></summary>
          {!st.here ? <p className="mt-3 text-sm text-muted-foreground">Tu n'es pas à {st.city}.</p> :
            <ul className="mt-3 divide-y divide-border">{(shop.data?.products ?? []).filter(p => st.sections.includes(p.section) && !p.details.realestate).map(p => {
              const price = storePrice(p.price, st.discount); const blocked = p.kind === "vehicle" && !s.license;
              return <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <div><p className="font-semibold">{p.brand} {p.name}</p><p className="text-xs text-muted-foreground"><s>{eur(p.price)}</s> {eur(price)} · {SECTIONS[p.section]}</p></div>
                {p.owned ? <Check className="h-5 w-5 text-primary" /> : <Button className="h-10" disabled={act.isPending || blocked || price > s.balance}
                  onClick={() => run("store_buy", { _store_id: st.id, _catalog_id: p.id, _request_id: crypto.randomUUID() }, `${p.name} acheté chez ${st.name}.`)}>
                  {blocked ? "Permis" : price > s.balance ? "Solde" : "Acheter"}</Button>}</li>; })}</ul>}
        </details>)}
      </TabsContent>

      <TabsContent value="commerces" className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Commerces ouverts par des joueurs. L'argent va dans la caisse du commerce.</p>
        {s.shops.filter(b => !b.mine).length === 0 ? <p className="text-sm text-muted-foreground">Aucun commerce de joueur n'a de stock pour l'instant.</p> :
          s.shops.filter(b => !b.mine).map(b => <section key={b.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-heading font-bold">{b.name}</p><p className="text-xs text-muted-foreground">Tenu par {b.owner}{b.listings ? ` · ${b.listings} annonce(s) au marché` : ""}</p>
            <ul className="mt-2 divide-y divide-border">{b.stock.map(i => <li key={i.id} className="flex items-center justify-between gap-2 py-2">
              <div><p className="font-semibold">{i.brand} {i.name}</p><p className="text-xs text-muted-foreground">{eur(i.price)} (neuf {eur(i.new_price)}) · {i.quantity} en stock</p></div>
              {i.owned ? <Check className="h-5 w-5 text-primary" /> : <Button className="h-10" disabled={act.isPending || i.price > s.balance}
                onClick={() => run("business_stock_buy", { _stock_id: i.id, _request_id: crypto.randomUUID() }, `${i.name} acheté chez ${b.name}.`)}>Acheter</Button>}</li>)}</ul>
          </section>)}
        <Link to="/patrimoine" className="block rounded-xl border border-border bg-card p-3 text-center text-sm font-semibold text-primary">Ouvrir ton propre commerce → Patrimoine</Link>
      </TabsContent>

      {s.my_business && <TabsContent value="moncommerce" className="mt-4 space-y-3"><MyShop s={s} busy={act.isPending}
        onRestock={(id, qty, price) => run("business_restock", { _biz: s.my_business!.id, _catalog_id: id, _quantity: qty, _price: price, _request_id: crypto.randomUUID() }, "Stock mis à jour.")} /></TabsContent>}
    </Tabs>}
  </div>;
}

function Offers({ title, list, render, showBuyer }: { title: string; list: MarketState["offers_sent"]; render: (o: MarketState["offers_sent"][number]) => React.ReactNode; showBuyer?: boolean }) {
  if (list.length === 0) return null;
  return <section className="space-y-2"><h2 className="font-heading font-bold">{title}</h2>
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">{list.map(o => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
      <div><p className="font-semibold">{o.name}</p><p className="text-xs text-muted-foreground">{eur(o.amount)} proposé (prix {eur(o.price)}){showBuyer && o.buyer ? ` · par ${o.buyer}` : ""}</p></div>
      {render(o)}</li>)}</ul></section>;
}

function ListingCard({ l, s, busy, onBuy, onOffer }: { l: MarketListing; s: MarketState; busy: boolean; onBuy: () => void; onOffer: (n: number) => void }) {
  const [offer, setOffer] = useState("");
  const price = l.reserved_for_me && l.reserved_price ? l.reserved_price : l.price;
  const blocked = l.kind === "vehicle" && !s.license;
  const min = Math.ceil(l.price * s.settings.min_offer_percent / 100);
  return <li className="flex flex-col rounded-xl border border-border bg-card p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{l.brand} · {SECTIONS[l.section] ?? l.section}</p>
    <p className="font-heading text-lg font-bold">{l.name}</p>
    <p className="flex-1 text-sm text-muted-foreground">Vendu par {l.seller} · neuf {eur(l.new_price)}{l.note ? ` · « ${l.note} »` : ""}</p>
    {l.reserved_for_me && <p className="mt-1 flex items-center gap-1 text-sm text-primary"><Tag className="h-4 w-4" />Réservé pour toi jusqu'au {l.reserved_until ? day(l.reserved_until) : ""}</p>}
    <div className="mt-3 flex items-center justify-between gap-2"><p className="font-heading text-xl font-bold">{eur(price)}</p>
      {l.owned ? <span className="text-sm text-muted-foreground">Déjà possédé</span>
        : <Button className="h-11" disabled={busy || blocked || price > s.balance} onClick={onBuy}>{blocked ? "Permis requis" : price > s.balance ? "Solde insuffisant" : "Acheter"}</Button>}</div>
    {!l.owned && !l.reserved_for_me && <div className="mt-2 flex gap-2">
      <input type="number" inputMode="numeric" className={input} placeholder={`Ton prix (min. ${min})`} value={offer} onChange={e => setOffer(e.target.value)} />
      <Button variant="outline" className="h-12" disabled={busy || !offer} onClick={() => { onOffer(Number(offer)); setOffer(""); }}>Proposer</Button></div>}
  </li>;
}

function SellForm({ s, busy, onList }: { s: MarketState; busy: boolean; onList: (id: string, price: number, note: string) => void }) {
  const free = s.my_assets.filter(a => !a.listed && !a.credit);
  const [id, setId] = useState(""); const [price, setPrice] = useState(""); const [note, setNote] = useState("");
  const asset = free.find(a => a.id === id);
  return <section className="space-y-2 rounded-xl border border-border bg-card p-4"><h2 className="font-heading font-bold">Mettre un bien en vente</h2>
    {free.length === 0 ? <p className="text-sm text-muted-foreground">Aucun objet ou voiture à vendre (les biens à crédit ou déjà en vente sont exclus).</p> : <>
      <select className={input} value={id} onChange={e => setId(e.target.value)} aria-label="Bien"><option value="">Choisir un bien</option>{free.map(a => <option key={a.id} value={a.id}>{a.brand} {a.name}</option>)}</select>
      <input type="number" inputMode="numeric" className={input} placeholder={asset ? `Prix (neuf ${eur(asset.new_price)})` : "Prix"} value={price} onChange={e => setPrice(e.target.value)} />
      <input className={input} maxLength={200} placeholder="Petit mot (facultatif)" value={note} onChange={e => setNote(e.target.value)} />
      {Number(price) > 0 && <p className="text-xs text-muted-foreground">Tu recevras {eur(marketNet(Number(price), s.settings.fee_percent))} après {s.settings.fee_percent} % de frais, au prochain passage sur le Marché.</p>}
      <Button className="h-12 w-full" disabled={busy || !id || !(Number(price) > 0)} onClick={() => { onList(id, Number(price), note); setId(""); setPrice(""); setNote(""); }}>Publier l'annonce</Button></>}
  </section>;
}

function MyShop({ s, busy, onRestock }: { s: MarketState; busy: boolean; onRestock: (id: string, qty: number, price: number) => void }) {
  const b = s.my_business!;
  const [id, setId] = useState(""); const [qty, setQty] = useState("5"); const [price, setPrice] = useState("");
  const item = b.wholesale.find(w => w.id === id);
  if (b.sector !== "commerce") return <p className="text-sm text-muted-foreground">Ton entreprise n'est pas un commerce : la vente de produits est réservée au secteur Commerce.</p>;
  return <>
    <div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="text-sm opacity-80">Caisse de {b.name}</p><p className="font-heading text-2xl font-bold">{eur(b.treasury)}</p>
      <p className="text-xs opacity-80">Achat en gros à {s.settings.wholesale_percent} % du prix neuf. Des clients passent chaque semaine : moins c'est cher, plus tu vends.</p></div>
    {b.stock.length > 0 && <ul className="divide-y divide-border rounded-xl border border-border bg-card">{b.stock.map(i => <li key={i.id} className="flex items-center justify-between gap-2 p-3">
      <div><p className="font-semibold">{i.name}</p><p className="text-xs text-muted-foreground">{i.quantity} en stock · vendu {eur(i.price)} (coût {eur(i.unit_cost)}) · {i.sold_npc} clients, {i.sold_players} joueurs</p></div>
      <Button variant="outline" className="h-10" onClick={() => { setId(i.catalog_id); setPrice(String(i.price)); setQty("0"); }}>Modifier</Button></li>)}</ul>}
    <section className="space-y-2 rounded-xl border border-border bg-card p-4"><h2 className="font-heading font-bold">Commander du stock / changer un prix</h2>
      <select className={input} value={id} onChange={e => { setId(e.target.value); const w = b.wholesale.find(x => x.id === e.target.value); if (w) setPrice(String(w.price)); }} aria-label="Produit">
        <option value="">Choisir un produit</option>{b.wholesale.map(w => <option key={w.id} value={w.id}>{w.brand} {w.name} — gros {eur(w.unit_cost)}</option>)}</select>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">Quantité<input type="number" inputMode="numeric" className={input} value={qty} onChange={e => setQty(e.target.value)} /></label>
        <label className="text-sm">Prix de vente<input type="number" inputMode="numeric" className={input} value={price} onChange={e => setPrice(e.target.value)} /></label></div>
      {item && <p className="text-xs text-muted-foreground">Coût : {eur(item.unit_cost * (Number(qty) || 0))} · prix autorisé de {eur(Math.ceil(item.price * s.settings.shop_min_percent / 100))} à {eur(Math.floor(item.price * s.settings.shop_max_percent / 100))}</p>}
      <Button className="h-12 w-full" disabled={busy || !id || !(Number(price) > 0)} onClick={() => onRestock(id, Number(qty) || 0, Number(price))}>Valider</Button>
    </section>
  </>;
}
