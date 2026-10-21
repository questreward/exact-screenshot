import { CreditRecap } from "@/components/game/CreditRecap";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, ShoppingBag, Search, Check, Wrench, Heart, Target, BadgePercent, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { maintainAsset, secondhandBuy, shopBuy, shopBuyCredit, shopExtrasQuery, shopQuery, shopCatalogQuery, shopSell, shopWish, type SecondhandListing, type ShopAsset, type ShopProduct, type ShopState } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { HousingPreview, HousingVisit } from "@/components/game/HousingVisit";
import { filterHousing } from "@/game/housing-visuals";
import { ShopHall, AisleHeader, IMG as AISLE_IMG, EMOJI as AISLE_EMOJI } from "@/components/game/ShopAisles";
import { ShopCart } from "@/components/game/ShopCart";
import { SECTIONS, creditCost, creditMonthly, filterProducts, goalProgress, notaryFees, storePrice, type ShopSort } from "@/game/shop";

export const Route = createFileRoute("/_authenticated/_game/boutique")({
  head: () => ({ meta: gameMeta("Boutique", "Achetez de vrais produits comptant ou à crédit, revendez vos biens et trouvez des occasions de seconde main.") }),
  validateSearch: (s: Record<string, unknown>): { rayon?: string; q?: string } => ({
    ...(typeof s["rayon"] === "string" ? { rayon: s["rayon"] } : {}), ...(typeof s["q"] === "string" ? { q: s["q"] } : {}) }),
  component: ShopPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const day = (s: string) => new Date(s).toLocaleDateString("fr-FR");
const select = "h-12 w-full rounded-lg border border-input bg-background px-3 text-sm";
const STATUS: Record<string, string> = { active: "En cours", repaid: "Remboursé", sold: "Soldé par revente", seized: "Bien repris" };
const KEYS = ["shop", "economy", "character", "life", "housing"];

function ShopPage() {
  const qc = useQueryClient();
  const { data: s, isLoading, isError } = useQuery(shopQuery);
  const entry = Route.useSearch();
  const [search, setSearch] = useState(entry.q ?? ""); const [section, setSection] = useState(entry.rayon && entry.rayon in SECTIONS ? entry.rayon : ""); const [brand, setBrand] = useState("");
  const [max, setMax] = useState(""); const [sort, setSort] = useState<ShopSort>("populaire");
  const [confirm, setConfirm] = useState<ShopProduct | null>(null);
  const [visit, setVisit] = useState<ShopProduct | null>(null);
  const [housingCity, setHousingCity] = useState("");
  const [housingRooms, setHousingRooms] = useState("");
  const [page, setPage] = useState(0);
  const [showSearch, setShowSearch] = useState(!!entry.q);
  const pageSize = 24;
  useEffect(() => { setPage(0); }, [search, section, brand, max, sort, housingCity, housingRooms]);
  const catalog = useQuery({ ...shopCatalogQuery({ search, section, brand, max, sort, city: section === 'immobilier' ? housingCity : '', rooms: section === 'immobilier' ? housingRooms : '', page }), enabled: !!s });
  const [sell, setSell] = useState<ShopAsset | null>(null);
  const [used, setUsed] = useState<SecondhandListing | null>(null);
  const refresh = () => KEYS.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  const onError = (e: Error) => toast.error(e.message);
  const [cart, setCart] = useState<ShopProduct[]>([]);
  const [bump, setBump] = useState(0);
  const isCreditable = (p: ShopProduct) => p.kind === "vehicle" || !!p.details.realestate;
  const addOrConfirm = (p: ShopProduct) => {
    if (isCreditable(p)) return setConfirm(p);
    setCart(c => c.some(x => x.id === p.id) ? c.filter(x => x.id !== p.id) : [...c, p]);
    setBump(b => b + 1);
  };
  const buy = useMutation({ mutationFn: (p: ShopProduct) => shopBuy(p.id, crypto.randomUUID()),
    onSuccess: (r, p) => { toast.success(`Commande ${r.reference} : ${p.brand} ${p.name} livré.`); setConfirm(null); refresh(); }, onError });
  const buyCredit = useMutation({ mutationFn: (v: { p: ShopProduct; down: number; months: number }) => shopBuyCredit(v.p.id, v.down, v.months, crypto.randomUUID()),
    onSuccess: (r, v) => { toast.success(`${v.p.name} acheté à crédit : ${eur(r.monthly)} par mois.`); setConfirm(null); refresh(); }, onError });
  const resell = useMutation({ mutationFn: (a: ShopAsset) => shopSell(a.id, crypto.randomUUID()),
    onSuccess: (r, a) => { toast.success(`${a.name} revendu ${eur(r.amount)}${r.credit_repaid ? ` (dont ${eur(r.credit_repaid)} pour solder le crédit)` : ""}.`); setSell(null); refresh(); }, onError });
  const buyUsed = useMutation({ mutationFn: (l: SecondhandListing) => secondhandBuy(l.id, crypto.randomUUID()),
    onSuccess: (_r, l) => { toast.success(`${l.name} d'occasion acheté.`); setUsed(null); refresh(); }, onError });
  const maintain = useMutation({ mutationFn: (a: ShopAsset) => maintainAsset(a.catalog_id),
    onSuccess: () => { toast.success("Entretien payé, véhicule de nouveau disponible."); refresh(); }, onError });
  const extras = useQuery(shopExtrasQuery);
  const wish = useMutation({ mutationFn: (v: { cmd: "wish" | "goal"; p: ShopProduct }) => shopWish(v.cmd, v.p.id),
    onSuccess: (r, v) => { toast.success(v.cmd === "goal" ? (r.goal ? `${v.p.name} devient ton objectif d'achat.` : "Objectif retiré.") : (r.wished ? "Ajouté à tes envies." : "Retiré de tes envies.")); qc.invalidateQueries({ queryKey: ["shop"] }); }, onError });
  const promo = useMemo(() => new Map((extras.data?.promos ?? []).map(p => [p.id, p.percent])), [extras.data]);
  const wished = useMemo(() => new Map((extras.data?.wishlist ?? []).map(w => [w.id, w.goal])), [extras.data]);
  const cashPrice = (p: ShopProduct) => storePrice(p.price, promo.get(p.id) ?? 0);

  const brands = useMemo(() => catalog.data?.brands ?? [...new Set((s?.products ?? []).map(p => p.brand))].sort((a, b) => a.localeCompare(b, "fr")), [s, catalog.data]);
  const list = useMemo(() => filterProducts(filterHousing((s?.products ?? []).map(p => ({ ...p, price: storePrice(p.price, promo.get(p.id) ?? 0), base: p })), section === "immobilier" ? housingCity : "", section === "immobilier" ? housingRooms : ""), { search, section, brand, maxPrice: max ? Number(max) : null }, sort).map(x => x.base), [s, search, section, brand, max, sort, promo, housingCity, housingRooms]);
  const housingCities = [...new Set((s?.products ?? []).filter(p => p.details.realestate).flatMap(p => p.details.city ? [p.details.city] : []))].sort();
  const roomCounts = [...new Set((s?.products ?? []).filter(p => p.details.realestate).flatMap(p => p.details.rooms != null ? [p.details.rooms] : []))].sort((a, b) => a - b);
  const total = (s?.assets ?? []).reduce((n, a) => n + a.value, 0);
  const activeCredits = (s?.credit.list ?? []).filter(c => c.status === "active");
  const promoList = (s?.products ?? []).filter(p => promo.has(p.id));
  const wishList = (s?.products ?? []).filter(p => wished.has(p.id));
  const goal = wishList.find(p => wished.get(p.id));
  const count = catalog.data?.total ?? list.length;
  const lastPage = Math.max(0, Math.ceil(count / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = catalog.data?.products ?? list.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><ShoppingBag className="h-8 w-8 text-primary" />
      <div className="flex-1"><h1 className="font-heading text-2xl font-bold">Boutique</h1><p className="text-sm text-muted-foreground">Vrais produits, prix indicatifs, comptant ou à crédit.</p></div>
      {s && <div className="rounded-lg bg-secondary px-3 py-2 text-right text-secondary-foreground"><p className="text-xs opacity-80">Solde</p><p className="font-heading font-bold">{eur(s.balance)}</p></div>}</header>
    <Link to="/style" className="flex min-h-12 items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold">✨ Objets de style (argent réel, sans avantage) <ChevronRight className="h-5 w-5" /></Link>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Boutique : Disponible dans une prochaine étape.</p>}
    {s && <Tabs defaultValue="catalogue">
      <TabsList className="flex h-12 w-full justify-start overflow-x-auto">
        <TabsTrigger value="catalogue">Catalogue</TabsTrigger><TabsTrigger value="envies">Envies{wishList.length ? ` (${wishList.length})` : ""}</TabsTrigger>
        <TabsTrigger value="occasions">Occasions</TabsTrigger>
        <TabsTrigger value="credits">Crédits{activeCredits.length ? ` (${activeCredits.length})` : ""}</TabsTrigger>
        <TabsTrigger value="patrimoine">Mes biens</TabsTrigger><TabsTrigger value="achats">Historique</TabsTrigger></TabsList>

      <TabsContent value="catalogue" className="mt-4 space-y-3">
        {promoList.length > 0 && <section className="rounded-xl border border-primary/40 bg-primary/10 p-4">
          <p className="flex items-center gap-2 font-heading font-bold"><BadgePercent className="h-5 w-5 text-primary" />Promos de la semaine</p>
          <p className="text-xs text-muted-foreground">{promoList.length} produits remisés, au comptant{extras.data?.promo_ends ? `, jusqu'au ${day(extras.data.promo_ends)}` : ""}. Nouvelles promos chaque semaine de jeu.</p>
          <div className="mt-2 flex flex-wrap gap-2">{promoList.slice(0, 8).map(p => <Button key={p.id} variant="outline" onClick={() => setSearch(p.name)}
            className="min-h-11 h-auto whitespace-normal px-3 py-2 text-sm font-semibold">{p.name} <span className="text-primary">−{promo.get(p.id)} %</span></Button>)}</div>
        </section>}
        {!section && !search && !showSearch ? <>
          <ShopHall onPick={setSection} />
          <Button variant="outline" className="min-h-12 w-full gap-2" onClick={() => setShowSearch(true)}><Search className="h-5 w-5" />Rechercher un produit</Button>
        </> : <>
          {section && <AisleHeader section={section} onPick={(k) => { setSection(k); setSearch(""); }} onQuery={setSearch} active={search} />}
          {!section && <Button variant="ghost" className="min-h-11 gap-1 px-2" onClick={() => { setSearch(""); setShowSearch(false); }}><ChevronLeft className="h-5 w-5" />Retour à l'entrée du magasin</Button>}
          <label className="relative block"><Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
            <input className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3" placeholder={section ? `Chercher dans ${SECTIONS[section]}…` : "Rechercher une marque, un produit…"} value={search} onChange={e => setSearch(e.target.value)} autoFocus={!section} /></label>
          <details className="rounded-xl border border-border bg-card px-3">
            <summary className="flex min-h-12 cursor-pointer items-center text-sm font-semibold">Filtres et tri</summary>
            <div className="grid grid-cols-2 gap-2 pb-3 sm:grid-cols-4">
              <select className={select} value={section} onChange={e => setSection(e.target.value)} aria-label="Rayon"><option value="">Tous les rayons</option>{Object.entries(SECTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <select className={select} value={brand} onChange={e => setBrand(e.target.value)} aria-label="Marque"><option value="">Toutes marques</option>{brands.map(b => <option key={b}>{b}</option>)}</select>
              <select className={select} value={max} onChange={e => setMax(e.target.value)} aria-label="Budget"><option value="">Tout budget</option>{[100, 300, 500, 1000, 15000, 30000, 300000].map(n => <option key={n} value={n}>Jusqu'à {eur(n)}</option>)}</select>
              <select className={select} value={sort} onChange={e => setSort(e.target.value as ShopSort)} aria-label="Tri"><option value="populaire">Populaires</option><option value="prix-asc">Prix croissant</option><option value="prix-desc">Prix décroissant</option><option value="nom">Nom</option></select>
            </div>
          </details>
        </>}
        {(section || search || showSearch) && <>
        {section === "immobilier" && <div className="grid grid-cols-2 gap-2">
          <select className={select} aria-label="Ville du logement" value={housingCity} onChange={e => setHousingCity(e.target.value)}><option value="">Toutes les villes</option>{housingCities.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select>
          <select className={select} aria-label="Nombre de pièces" value={housingRooms} onChange={e => setHousingRooms(e.target.value)}><option value="">Toutes les pièces</option>{roomCounts.map(r => <option key={r} value={r}>{r} pièce{r > 1 ? "s" : ""}</option>)}</select>
        </div>}
        {catalog.isError && <p role="alert" className="text-sm text-destructive">Le catalogue ne peut pas être chargé pour le moment.</p>}
        {count === 0 && !catalog.isFetching && <p className="py-6 text-sm text-muted-foreground">Aucun produit ne correspond à ces critères.</p>}
        <p className="text-xs text-muted-foreground" aria-live="polite">{catalog.isFetching ? 'Chargement…' : `${count.toLocaleString('fr-FR')} produit${count > 1 ? 's' : ''}${catalog.data ? ` sur ${catalog.data.catalog_total.toLocaleString('fr-FR')}` : ''}`}</p>
        <ul className="grid gap-3 sm:grid-cols-2">{visible.map(p => <ProductCard key={p.id} p={p} s={s} pct={promo.get(p.id) ?? 0} wished={wished.has(p.id)} isGoal={!!wished.get(p.id)}
          busy={wish.isPending} onBuy={() => addOrConfirm(p)} inCart={cart.some(c => c.id === p.id)} onVisit={() => setVisit(p)} onWish={cmd => wish.mutate({ cmd, p })} />)}</ul>
        {count > pageSize && <nav aria-label="Pages du catalogue" className="flex items-center justify-between gap-3">
          <Button variant="outline" className="h-12 w-12" aria-label="Page précédente" disabled={currentPage === 0 || catalog.isFetching} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button>
          <span className="text-sm" aria-live="polite">{currentPage + 1} / {lastPage + 1}</span>
          <Button variant="outline" className="h-12 w-12" aria-label="Page suivante" disabled={currentPage >= lastPage || catalog.isFetching} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button>
        </nav>}
        </>}
      </TabsContent>

      <TabsContent value="envies" className="mt-4 space-y-3">
        {goal ? (() => { const g = goalProgress(s.balance, cashPrice(goal) + (goal.details.realestate ? notaryFees(goal.price) : 0)); return <div className="rounded-xl bg-secondary p-4 text-secondary-foreground">
          <p className="flex items-center gap-2 text-sm opacity-80"><Target className="h-4 w-4" />Mon objectif d'achat</p>
          <p className="font-heading text-xl font-bold">{goal.brand} {goal.name}</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-background/30"><div className="h-full bg-primary" style={{ width: `${g.percent}%` }} /></div>
          <p className="mt-1 text-sm">{g.missing === 0 ? "Objectif atteint : tu peux l'acheter !" : `${g.percent} % · il te manque ${eur(g.missing)}`}</p>
          <p className="text-xs opacity-80">Calculé sur ton solde : l'argent reste sur ton compte.</p></div>; })()
          : <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Pas d'objectif. Touche la cible sur un produit pour suivre ton épargne.</p>}
        <h2 className="font-display text-lg font-bold">📝 Ma liste de courses</h2>
        {wishList.length === 0 ? <p className="text-sm text-muted-foreground">Ta liste d'envies est vide. Touche le cœur sur un produit pour l'ajouter.</p> :
          <ul className="grid gap-3 sm:grid-cols-2">{wishList.map(p => <ProductCard key={p.id} p={p} s={s} pct={promo.get(p.id) ?? 0} wished isGoal={!!wished.get(p.id)}
            busy={wish.isPending} onBuy={() => addOrConfirm(p)} inCart={cart.some(c => c.id === p.id)} onVisit={() => setVisit(p)} onWish={cmd => wish.mutate({ cmd, p })} />)}</ul>}
        <p className="text-xs text-muted-foreground">Ta liste est privée. Un produit acheté en sort automatiquement.</p>
      </TabsContent>

      <TabsContent value="occasions" className="mt-4 space-y-3">
        <div className="rounded-3xl border border-border bg-gradient-card p-4"><p className="font-display text-lg font-bold">♻️ Le marché de l'occasion</p><p className="text-sm text-muted-foreground">Objets et voitures repris par la boutique, remis en vente moins cher que le neuf. Pour vendre entre joueurs : <Link to="/marche" className="font-semibold text-primary">Marché</Link>.</p></div>
        {s.secondhand.length === 0 ? <p className="text-sm text-muted-foreground">Aucune occasion pour l'instant.</p> :
          <ul className="grid gap-3 sm:grid-cols-2">{s.secondhand.map(l => {
            const blocked = l.kind === "vehicle" && !s.license;
            return <li key={l.id} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-card animate-rise">
              <div className="relative -mx-4 -mt-4 mb-3 h-24 overflow-hidden"><img src={AISLE_IMG[l.section]} alt="" loading="lazy" className="h-full w-full object-cover opacity-50 grayscale-[40%]" />
                <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2 py-1 text-xs font-semibold">♻️ {l.condition}</span>
                <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">−{Math.max(0, Math.round((1 - l.price / l.new_price) * 100))} % vs neuf</span></div>
              <p className="text-xs text-muted-foreground">Vendeur : stand des reprises de la boutique</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{l.brand} · {SECTIONS[l.section] ?? l.section}</p>
              <p className="font-heading text-lg font-bold">{l.name}</p>
              <p className="flex-1 text-sm text-muted-foreground">{l.condition} · neuf {eur(l.new_price)}</p>
              <div className="mt-3 flex items-center justify-between gap-2"><p className="font-heading text-xl font-bold">{eur(l.price)}</p>
                {l.owned ? <span className="flex items-center gap-1 text-sm text-primary"><Check className="h-4 w-4" />Déjà possédé</span>
                  : <Button className="h-11" disabled={blocked || l.price > s.balance} onClick={() => setUsed(l)}>{blocked ? "Permis requis" : l.price > s.balance ? "Solde insuffisant" : "Acheter"}</Button>}</div>
            </li>; })}</ul>}
      </TabsContent>

      <TabsContent value="credits" className="mt-4 space-y-3">
        <div className="rounded-xl bg-secondary p-4 text-secondary-foreground">
          <p className="text-sm opacity-80">Mensualités possibles en plus</p><p className="font-heading text-2xl font-bold">{eur(s.credit.max_monthly)} / mois</p>
          <p className="text-xs opacity-80">Maximum {s.credit.settings.max_debt_percent} % de tes revenus ({eur(s.credit.income)}). Déjà engagé : {eur(s.credit.burden)}. Note bancaire : {s.credit.score ?? "—"}/100.</p></div>
        <p className="text-xs text-muted-foreground">Crédit auto {s.credit.settings.auto_rate} % ({s.credit.settings.auto_min_months}–{s.credit.settings.auto_max_months} mois) · crédit immobilier {s.credit.settings.immo_rate} % ({s.credit.settings.immo_min_months / 12}–{s.credit.settings.immo_max_months / 12} ans) · apport minimum {s.credit.settings.min_down_percent} %. Mensualité prélevée chaque mois de jeu ; après {s.credit.settings.seizure_after} jours d'impayés, le bien est repris.</p>
        {s.credit.list.length === 0 ? <p className="text-sm text-muted-foreground">Aucun crédit. Choisis « à crédit » en achetant une voiture ou un logement.</p> :
          <ul className="space-y-2">{s.credit.list.map(c => <li key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{c.label}</p><p className="text-xs text-muted-foreground">Crédit {c.kind === "auto" ? "auto" : "immobilier"} · {c.rate} % · {c.months} mois</p></div>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">{STATUS[c.status]}</span></div>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
              <li><span className="text-muted-foreground">Mensualité</span> <b>{eur(c.monthly)}</b></li>
              <li><span className="text-muted-foreground">Reste dû</span> <b>{eur(c.remaining)}</b></li>
              <li><span className="text-muted-foreground">Payées</span> <b>{c.paid_count}/{c.months}</b></li>
              {c.status === "active" && <li><span className="text-muted-foreground">Prochaine</span> <b>{day(c.next_due)}</b></li>}</ul>
            {c.status === "active" && c.missed > 0 && <p className="mt-2 text-sm text-destructive">{c.missed} jour{c.missed > 1 ? "s" : ""} d'impayé : alimente ton compte pour éviter la reprise.</p>}
            {c.status === "active" && <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.round((1 - c.remaining / c.principal) * 100)}%` }} /></div>}
          </li>)}</ul>}
      </TabsContent>

      <TabsContent value="patrimoine" className="mt-4 space-y-3">
        <div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="text-sm opacity-80">Valeur estimée de tes biens</p><p className="font-heading text-2xl font-bold">{eur(total)}</p>
          <p className="text-xs opacity-80">Les objets perdent de la valeur avec le temps. La boutique reprend à 90 % de la valeur (95 % pour l'immobilier).</p></div>
        {s.assets.length === 0 ? <p className="text-sm text-muted-foreground">Aucun bien.</p> :
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">{s.assets.map(a => <li key={a.id} className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{a.brand ? `${a.brand} ` : ""}{a.name}</p>
              <p className="text-xs text-muted-foreground">Acheté {eur(a.price)} le {day(a.acquired_at)}{a.lived_in ? " · ton logement" : ""}</p>
              {a.kind === "vehicle" && <p className="text-xs text-muted-foreground">{a.condition}{a.next_maintenance ? ` · prochain entretien le ${day(a.next_maintenance)}` : ""}{a.maintenance ? ` (${eur(a.maintenance)})` : ""}</p>}
              {a.credit_remaining != null && <p className="text-xs text-primary">Crédit restant : {eur(a.credit_remaining)}</p>}</div>
              <p className="font-semibold">{eur(a.value)}</p></div>
            <div className="flex flex-wrap gap-2">
              {a.kind === "vehicle" && a.condition === "Entretien nécessaire" && <Button className="h-11" disabled={maintain.isPending} onClick={() => maintain.mutate(a)}><Wrench className="h-4 w-4" />Entretenir</Button>}
              {a.shop && <Button variant="outline" className="h-11" disabled={a.lived_in} onClick={() => setSell(a)}>{a.lived_in ? "Habité : déménage d'abord" : `Revendre ${eur(a.sell_price)}`}</Button>}</div>
          </li>)}</ul>}
        <div className="grid gap-2 sm:grid-cols-2">
          <Link to="/logement" className="block rounded-xl border border-border bg-card p-3 text-center text-sm font-semibold text-primary">Louer ou habiter un bien → Logement</Link>
          <Link to="/patrimoine" className="block rounded-xl border border-border bg-card p-3 text-center text-sm font-semibold text-primary">Assurer ta voiture → Assurances</Link></div>
      </TabsContent>

      <TabsContent value="achats" className="mt-4 space-y-4">
        {s.orders.length === 0 ? <p className="text-sm text-muted-foreground">Aucun achat pour l'instant.</p> :
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">{s.orders.map(o => <li key={o.reference} className="flex items-center justify-between gap-2 p-3">
            <div><p className="font-semibold">{o.brand} {o.name}</p><p className="text-xs text-muted-foreground">{day(o.at)} · {o.reference}</p></div>
            <p className="font-semibold">{eur(o.price)}</p></li>)}</ul>}
        {s.sales.length > 0 && <section><h2 className="mb-2 font-heading font-bold">Reventes</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">{s.sales.map((v, i) => <li key={i} className="flex items-center justify-between gap-2 p-3">
            <div><p className="font-semibold">{v.name}</p><p className="text-xs text-muted-foreground">{day(v.at)}{v.credit_repaid ? ` · ${eur(v.credit_repaid)} pour solder le crédit` : ""}</p></div>
            <p className="font-semibold text-primary">+{eur(v.amount - v.credit_repaid)}</p></li>)}</ul></section>}
      </TabsContent>
    </Tabs>}

    {s && <ShopCart items={cart} balance={s.balance} price={cashPrice} bump={bump}
      onRemove={(id) => setCart(c => c.filter(x => x.id !== id))} onDone={() => { setCart([]); refresh(); }} />}
    {visit && <HousingVisit key={visit.id} p={visit} pct={promo.get(visit.id) ?? 0} onClose={() => setVisit(null)} onBuy={() => { setConfirm(visit); setVisit(null); }} />}
    {confirm && s && <BuyDialog p={confirm} s={s} pct={promo.get(confirm.id) ?? 0} pending={buy.isPending || buyCredit.isPending} onClose={() => setConfirm(null)}
      onCash={() => buy.mutate(confirm)} onCredit={(down, months) => buyCredit.mutate({ p: confirm, down, months })} />}

    {sell && <Dialog title="Revendre à la boutique" onClose={() => setSell(null)}>
      <p>{sell.name}</p>
      <ul className="my-3 space-y-1 text-sm"><li className="flex justify-between"><span className="text-muted-foreground">Prix de reprise</span><b>{eur(sell.sell_price)}</b></li>
        {sell.credit_remaining != null && <li className="flex justify-between"><span className="text-muted-foreground">Crédit soldé</span><b>−{eur(sell.credit_remaining)}</b></li>}
        <li className="flex justify-between"><span className="text-muted-foreground">Tu reçois</span><b>{eur(Math.max(0, sell.sell_price - (sell.credit_remaining ?? 0)))}</b></li></ul>
      {sell.credit_remaining != null && sell.sell_price < sell.credit_remaining && <p className="mb-3 text-sm text-destructive">La vente ne couvre pas le crédit restant.</p>}
      <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-12" onClick={() => setSell(null)}>Annuler</Button>
        <Button className="h-12" disabled={resell.isPending || (sell.credit_remaining != null && sell.sell_price < sell.credit_remaining)} onClick={() => resell.mutate(sell)}>Revendre</Button></div>
    </Dialog>}

    {used && s && <Dialog title="Acheter d'occasion" onClose={() => setUsed(null)}>
      <p>{used.brand} {used.name} · {used.condition}</p>
      <ul className="my-3 space-y-1 text-sm"><li className="flex justify-between"><span className="text-muted-foreground">Prix</span><b>{eur(used.price)}</b></li>
        <li className="flex justify-between"><span className="text-muted-foreground">Solde après achat</span><b>{eur(s.balance - used.price)}</b></li></ul>
      <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-12" onClick={() => setUsed(null)}>Annuler</Button>
        <Button className="h-12" disabled={buyUsed.isPending} onClick={() => buyUsed.mutate(used)}>Payer</Button></div>
    </Dialog>}
  </div>;
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center" onClick={onClose}>
    <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-5" onClick={e => e.stopPropagation()}>
      <p className="font-heading text-lg font-bold">{title}</p>{children}</div></div>;
}

function BuyDialog({ p, s, pct, pending, onClose, onCash, onCredit }: { p: ShopProduct; s: ShopState; pct: number; pending: boolean; onClose: () => void; onCash: () => void; onCredit: (down: number, months: number) => void }) {
  const immo = !!p.details.realestate; const creditable = immo || p.kind === "vehicle";
  const cfg = s.credit.settings;
  const fees = immo ? notaryFees(p.price) : 0;
  const minDown = Math.ceil(p.price * cfg.min_down_percent / 100);
  const durations = (immo ? [60, 120, 180, 240, 300] : [12, 24, 36, 48, 60, 72, 84]).filter(m => m >= (immo ? cfg.immo_min_months : cfg.auto_min_months) && m <= (immo ? cfg.immo_max_months : cfg.auto_max_months));
  const cash = storePrice(p.price, pct);
  const [mode, setMode] = useState<"cash" | "credit">(creditable && cash + fees > s.balance ? "credit" : "cash");
  const [down, setDown] = useState(String(Math.max(minDown, Math.min(Math.max(0, s.balance - fees), Math.round(p.price * 0.2)))));
  const [months, setMonths] = useState(immo ? 240 : 48);
  const rate = immo ? cfg.immo_rate : cfg.auto_rate;
  const d = Number(down) || 0; const principal = Math.max(0, p.price - d);
  const monthly = creditMonthly(principal, rate, months);
  const creditProblem = d < minDown ? `Apport minimum ${eur(minDown)}` : d >= p.price ? "Apport égal au prix : paie comptant" : d + fees > s.balance ? "Solde insuffisant pour l'apport"
    : s.age < 18 ? "Crédit possible dès 18 ans" : s.credit.income <= 0 ? "Un emploi est nécessaire" : monthly > s.credit.max_monthly ? `Mensualité trop élevée (max ${eur(s.credit.max_monthly)})` : null;
  const row = (l: string, v: string) => <li className="flex justify-between gap-2"><span className="text-muted-foreground">{l}</span><b>{v}</b></li>;

  return <Dialog title="Confirmer l'achat" onClose={onClose}>
    <p className="mt-1">{p.brand} {p.name}</p>
    {creditable && <div className="mt-3 grid grid-cols-2 gap-2">
      <Button variant={mode === "cash" ? "default" : "outline"} className="h-11" onClick={() => setMode("cash")}>Comptant</Button>
      <Button variant={mode === "credit" ? "default" : "outline"} className="h-11" onClick={() => setMode("credit")}>À crédit</Button></div>}
    {mode === "cash" ? <>
      <ul className="my-3 space-y-1 text-sm">{pct > 0 && row("Prix normal", eur(p.price))}{row(pct > 0 ? `Prix promo (−${pct} %)` : "Prix", eur(cash))}{immo && row("Frais de notaire", eur(fees))}{row("Solde après achat", eur(s.balance - cash - fees))}</ul>
      {cash + fees > s.balance && <p className="mb-3 text-sm text-destructive">Solde insuffisant.</p>}
      <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-12" onClick={onClose}>Annuler</Button>
        <Button className="h-12" disabled={pending || cash + fees > s.balance} onClick={onCash}>Payer</Button></div>
    </> : <>
      <div className="my-3 space-y-2">
        <label className="block text-sm">Apport (min. {eur(minDown)})<input type="number" inputMode="numeric" className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3" value={down} onChange={e => setDown(e.target.value)} /></label>
        <label className="block text-sm">Durée<select className={`${select} mt-1`} value={months} onChange={e => setMonths(Number(e.target.value))}>
          {durations.map(m => <option key={m} value={m}>{immo ? `${m / 12} ans` : `${m} mois`}</option>)}</select></label></div>
      {pct > 0 && <p className="mb-2 text-xs text-muted-foreground">La promo s'applique seulement au comptant.</p>}
      <div className="mb-3"><CreditRecap kind={immo ? "immo" : "auto"} price={p.price} down={d} fees={immo ? fees : 0} rate={rate} months={months} balance={s.balance} income={s.credit.income} burden={s.credit.burden} /></div>
      <p className="mb-2 text-xs text-muted-foreground">Taux {rate} %.</p>
      {creditProblem && <p className="mb-3 text-sm text-destructive">{creditProblem}</p>}
      <p className="mb-3 text-xs text-muted-foreground">Mensualités prélevées chaque mois de jeu. Impayés : frais, baisse de la note bancaire, puis reprise du bien.</p>
      <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-12" onClick={onClose}>Annuler</Button>
        <Button className="h-12" disabled={pending || !!creditProblem} onClick={() => onCredit(d, months)}>Signer le crédit</Button></div>
    </>}
  </Dialog>;
}

function ProductCard({ p, s, pct, wished, isGoal, busy, onBuy, onVisit, onWish, inCart }: { p: ShopProduct; s: ShopState; pct: number; wished: boolean; isGoal: boolean; busy: boolean; inCart: boolean; onBuy: () => void; onVisit: () => void; onWish: (cmd: "wish" | "goal") => void }) {
  const creditable = p.kind === "vehicle" || !!p.details.realestate;
  const price = storePrice(p.price, pct);
  const cash = price + (p.details.realestate ? notaryFees(p.price) : 0);
  const blocked = p.kind === "vehicle" && !s.license;
  return <li className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-card animate-rise">
    {p.details.realestate ? <HousingPreview p={p} /> : <div className="relative -mx-4 -mt-4 mb-3 h-28 overflow-hidden">
      <img src={AISLE_IMG[p.section]} alt="" loading="lazy" className="h-full w-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
      <span className="absolute bottom-2 left-4 text-4xl" aria-hidden>{AISLE_EMOJI[p.section] ?? "🛍️"}</span>
      {p.sales > 0 && <span className="absolute right-3 top-3 rounded-full bg-card/90 px-2 py-1 text-xs font-semibold">⭐ Populaire</span>}
    </div>}
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{p.brand} · {SECTIONS[p.section] ?? p.section}</p>
      {pct > 0 && <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">−{pct} %</span>}</div>
    <p className="font-heading text-lg font-bold">{p.name}</p>
    <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{p.desc}</p>
    {p.kind === "vehicle" && <p className="mt-1 text-xs text-muted-foreground">{p.details.condition === "occasion" ? "Occasion" : "Neuve"} · entretien {eur(p.details.maintenance ?? 0)} / mois{p.details.conso ? ` · ${p.details.conso} L/100 km` : ""}{!s.license ? " · permis requis" : ""}</p>}
    {p.details.realestate && <p className="mt-1 text-xs text-muted-foreground">+ frais de notaire {eur(notaryFees(p.price))} · charges {eur(p.details.charges_monthly ?? 0)}/mois · taxe foncière {eur(p.details.tax_yearly ?? 0)}/an</p>}
    {p.details.realestate && <Button variant="outline" className="mt-3 min-h-11" onClick={onVisit}>Visiter</Button>}
    <div className="mt-3 flex items-center justify-between gap-2"><div>
      {pct > 0 && <p className="text-xs text-muted-foreground line-through">{eur(p.price)}</p>}
      <p className="font-heading text-xl font-bold">{eur(price)}</p>
      {creditable && <p className="text-xs text-muted-foreground">ou à crédit</p>}</div>
      {p.owned ? <span className="flex items-center gap-1 text-sm text-primary"><Check className="h-4 w-4" />Possédé</span>
        : <Button className="h-11" variant={inCart ? "outline" : "default"} disabled={blocked || (!creditable && !inCart && cash > s.balance)} onClick={onBuy}>
          {blocked ? "Permis requis" : creditable ? "Acheter" : inCart ? <><Check className="h-4 w-4" />Dans le panier</> : cash > s.balance ? "Solde insuffisant" : <><ShoppingBag className="h-4 w-4" />Au panier</>}</Button>}</div>
    {!p.owned && <div className="mt-2 grid grid-cols-2 gap-2">
      <Button variant="outline" className="h-11" disabled={busy} aria-pressed={wished} onClick={() => onWish("wish")}>
        <Heart className={`h-4 w-4 ${wished ? "fill-primary text-primary" : ""}`} />{wished ? "Dans mes envies" : "Envie"}</Button>
      <Button variant={isGoal ? "default" : "outline"} className="h-11" disabled={busy} aria-pressed={isGoal} onClick={() => onWish("goal")}>
        <Target className="h-4 w-4" />{isGoal ? "Mon objectif" : "Objectif"}</Button></div>}
  </li>;
}
