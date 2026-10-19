import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LoaderCircle, ShoppingBag, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { shopBuy, shopQuery, type ShopProduct } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { SECTIONS, filterProducts, notaryFees, type ShopSort } from "@/game/shop";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_game/boutique")({
  head: () => ({ meta: gameMeta("Boutique", "Achetez de vrais produits avec votre compte : téléphones, maison, mode, loisirs. Historique et patrimoine.") }),
  component: ShopPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const day = (s: string) => new Date(s).toLocaleDateString("fr-FR");
const select = "h-12 w-full rounded-lg border border-input bg-background px-3 text-sm";

function ShopPage() {
  const qc = useQueryClient();
  const { data: s, isLoading, isError } = useQuery(shopQuery);
  const [search, setSearch] = useState(""); const [section, setSection] = useState(""); const [brand, setBrand] = useState("");
  const [max, setMax] = useState(""); const [sort, setSort] = useState<ShopSort>("populaire");
  const [confirm, setConfirm] = useState<ShopProduct | null>(null);
  const buy = useMutation({
    mutationFn: (p: ShopProduct) => shopBuy(p.id, crypto.randomUUID()),
    onSuccess: (r, p) => { toast.success(`Commande ${r.reference} : ${p.brand} ${p.name} livré.`); setConfirm(null);
      ["shop", "economy", "character", "life"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => toast.error(e.message),
  });
  const brands = useMemo(() => [...new Set((s?.products ?? []).map(p => p.brand))].sort((a, b) => a.localeCompare(b, "fr")), [s]);
  const list = useMemo(() => filterProducts(s?.products ?? [], { search, section, brand, maxPrice: max ? Number(max) : null }, sort), [s, search, section, brand, max, sort]);
  const total = (s?.assets ?? []).reduce((n, a) => n + a.value, 0);

  return <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><ShoppingBag className="h-8 w-8 text-primary" />
      <div className="flex-1"><h1 className="font-heading text-2xl font-bold">Boutique</h1><p className="text-sm text-muted-foreground">Vrais produits, prix indicatifs, payés avec ton compte courant.</p></div>
      {s && <div className="rounded-lg bg-secondary px-3 py-2 text-right text-secondary-foreground"><p className="text-xs opacity-80">Solde</p><p className="font-heading font-bold">{eur(s.balance)}</p></div>}</header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Boutique : Disponible dans une prochaine étape.</p>}
    {s && <Tabs defaultValue="catalogue">
      <TabsList className="grid h-12 w-full grid-cols-3"><TabsTrigger value="catalogue">Catalogue</TabsTrigger><TabsTrigger value="achats">Mes achats</TabsTrigger><TabsTrigger value="patrimoine">Patrimoine</TabsTrigger></TabsList>

      <TabsContent value="catalogue" className="mt-4 space-y-3">
        <label className="relative block"><Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <input className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3" placeholder="Rechercher une marque, un produit…" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select className={select} value={section} onChange={e => setSection(e.target.value)} aria-label="Rubrique"><option value="">Toutes rubriques</option>{Object.entries(SECTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={select} value={brand} onChange={e => setBrand(e.target.value)} aria-label="Marque"><option value="">Toutes marques</option>{brands.map(b => <option key={b}>{b}</option>)}</select>
          <select className={select} value={max} onChange={e => setMax(e.target.value)} aria-label="Budget"><option value="">Tout budget</option>{[100, 300, 500, 1000, 15000, 30000, 300000].map(n => <option key={n} value={n}>Jusqu'à {eur(n)}</option>)}</select>
          <select className={select} value={sort} onChange={e => setSort(e.target.value as ShopSort)} aria-label="Tri"><option value="populaire">Populaires</option><option value="prix-asc">Prix croissant</option><option value="prix-desc">Prix décroissant</option><option value="nom">Nom</option></select>
        </div>
        <p className="text-xs text-muted-foreground">{list.length} produit{list.length > 1 ? "s" : ""}</p>
        <ul className="grid gap-3 sm:grid-cols-2">{list.map(p => <li key={p.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{p.brand} · {SECTIONS[p.section] ?? p.section}</p>
          <p className="font-heading text-lg font-bold">{p.name}</p>
          <p className="flex-1 text-sm text-muted-foreground">{p.desc}</p>
          {p.kind === "vehicle" && <p className="mt-1 text-xs text-muted-foreground">{p.details.condition === "occasion" ? "Occasion" : "Neuve"} · entretien {eur(p.details.maintenance ?? 0)} / mois{p.details.conso ? ` · ${p.details.conso} L/100 km` : ""}{!s.license ? " · permis requis" : ""}</p>}
          {p.details.realestate && <p className="mt-1 text-xs text-muted-foreground">+ frais de notaire {eur(notaryFees(p.price))} · charges {eur(p.details.charges_monthly ?? 0)}/mois · taxe foncière {eur(p.details.tax_yearly ?? 0)}/an</p>}
          <div className="mt-3 flex items-center justify-between gap-2"><p className="font-heading text-xl font-bold">{eur(p.price)}</p>
            {p.owned ? <span className="flex items-center gap-1 text-sm text-primary"><Check className="h-4 w-4" />Possédé</span>
              : <Button className="h-11" disabled={p.price + (p.details.realestate ? notaryFees(p.price) : 0) > s.balance || (p.kind === "vehicle" && !s.license)} onClick={() => setConfirm(p)}>{p.kind === "vehicle" && !s.license ? "Permis requis" : p.price + (p.details.realestate ? notaryFees(p.price) : 0) > s.balance ? "Solde insuffisant" : "Acheter"}</Button>}</div>
        </li>)}</ul>
      </TabsContent>

      <TabsContent value="achats" className="mt-4">
        {s.orders.length === 0 ? <p className="text-sm text-muted-foreground">Aucun achat pour l'instant.</p> :
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">{s.orders.map(o => <li key={o.reference} className="flex items-center justify-between gap-2 p-3">
            <div><p className="font-semibold">{o.brand} {o.name}</p><p className="text-xs text-muted-foreground">{day(o.at)} · {o.reference} · compte courant</p></div>
            <p className="font-semibold">{eur(o.price)}</p></li>)}</ul>}
      </TabsContent>

      <TabsContent value="patrimoine" className="mt-4 space-y-3">
        <div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="text-sm opacity-80">Valeur estimée de tes biens</p><p className="font-heading text-2xl font-bold">{eur(total)}</p>
          <p className="text-xs opacity-80">Les objets perdent de la valeur avec le temps (décote annuelle).</p></div>
        {s.assets.length === 0 ? <p className="text-sm text-muted-foreground">Aucun bien.</p> :
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">{s.assets.map((a, i) => <li key={i} className="flex items-center justify-between gap-2 p-3">
            <div><p className="font-semibold">{a.brand ? `${a.brand} ` : ""}{a.name}</p><p className="text-xs text-muted-foreground">Acheté {eur(a.price)} le {day(a.acquired_at)}</p></div>
            <p className="font-semibold">{eur(a.value)}</p></li>)}</ul>}
        <p className="text-xs text-muted-foreground">Revente et seconde main : Disponible dans une prochaine étape.</p>
        <Link to="/logement" className="block rounded-xl border border-border bg-card p-3 text-center text-sm font-semibold text-primary">Louer ou habiter un bien → Logement</Link>
      </TabsContent>
    </Tabs>}

    {confirm && s && <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center" onClick={() => setConfirm(null)}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-5" onClick={e => e.stopPropagation()}>
        <p className="font-heading text-lg font-bold">Confirmer l'achat</p>
        <p className="mt-1">{confirm.brand} {confirm.name}</p>
        <ul className="my-3 space-y-1 text-sm"><li className="flex justify-between"><span className="text-muted-foreground">Prix</span><b>{eur(confirm.price)}</b></li>
          {confirm.details.realestate && <li className="flex justify-between"><span className="text-muted-foreground">Frais de notaire</span><b>{eur(notaryFees(confirm.price))}</b></li>}
          <li className="flex justify-between"><span className="text-muted-foreground">Solde après achat</span><b>{eur(s.balance - confirm.price - (confirm.details.realestate ? notaryFees(confirm.price) : 0))}</b></li></ul>
        {confirm.details.realestate && <p className="mb-3 text-xs text-muted-foreground">Paiement comptant. Le crédit immobilier arrive dans une prochaine étape. Pour y habiter : page Logement.</p>}
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-12" onClick={() => setConfirm(null)}>Annuler</Button>
          <Button className="h-12" disabled={buy.isPending} onClick={() => buy.mutate(confirm)}>Payer</Button></div>
      </div></div>}
  </div>;
}
