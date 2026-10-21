import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LoaderCircle, Wrench, Truck, Star, Receipt, Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { serviceQuery, serviceRpc, type ServiceInvoice, type ServiceProvider, type ServiceState } from "@/services/game";
import { BusinessPromo } from "@/components/game/BusinessPromo";
import { gameMeta } from "@/game/metadata";
import { FICTIVE_LABEL, SERVICE_LABEL, expectedNpcClients, serviceAmount } from "@/game/services";

export const Route = createFileRoute("/_authenticated/_game/services")({
  head: () => ({ meta: gameMeta("Services", "Garages et déménageurs tenus par des joueurs, ou entreprises fictives quand personne ne propose le service.") }),
  component: ServicesPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const day = (s: string) => new Date(s).toLocaleDateString("fr-FR");

function Stars({ value, count }: { value: number | null; count?: number }) {
  if (value == null) return <span className="text-xs text-muted-foreground">Pas encore noté</span>;
  return <span className="inline-flex items-center gap-1 text-sm font-semibold"><Star className="h-4 w-4 fill-primary text-primary" />{value.toLocaleString("fr-FR")} / 5{count != null ? <span className="font-normal text-muted-foreground"> ({count} avis)</span> : null}</span>;
}

function ServicesPage() {
  const qc = useQueryClient();
  const { data: s, isLoading, isError } = useQuery(serviceQuery);
  const act = useMutation({
    mutationFn: (v: { fn: Parameters<typeof serviceRpc>[0]; args: Record<string, unknown>; ok: string }) => serviceRpc(v.fn, v.args),
    onSuccess: (_d, v) => { toast.success(v.ok); ["services", "shop", "economy", "character", "life"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => toast.error(e.message),
  });
  const run = (fn: Parameters<typeof serviceRpc>[0], args: Record<string, unknown>, ok: string) => act.mutate({ fn, args, ok });

  return <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Wrench className="h-8 w-8 text-primary" />
      <div className="flex-1"><h1 className="font-heading text-2xl font-bold">Services</h1><p className="text-sm text-muted-foreground">Garages et déménageurs{s ? ` à ${s.city}` : ""}. Les entreprises de joueurs passent en premier.</p></div>
      {s && <div className="rounded-lg bg-secondary px-3 py-2 text-right text-secondary-foreground"><p className="text-xs opacity-80">Solde</p><p className="font-heading font-bold">{eur(s.balance)}</p></div>}</header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Services : Disponible dans une prochaine étape.</p>}
    {s && <Tabs defaultValue="garage">
      <TabsList className="flex h-12 w-full justify-start overflow-x-auto">
        <TabsTrigger value="garage">Garage</TabsTrigger><TabsTrigger value="demenagement">Déménagement</TabsTrigger>
        <TabsTrigger value="factures">Factures{s.invoices.some(i => i.can_review && !i.reviewed) ? " •" : ""}</TabsTrigger>
        {s.my_business && <TabsTrigger value="entreprise">Mon entreprise</TabsTrigger>}</TabsList>

      <TabsContent value="garage" className="mt-4 space-y-3"><GarageTab s={s} busy={act.isPending}
        onService={(catalogId, bizId, name) => run("service_garage", { _catalog_id: catalogId, _business_id: bizId, _request_id: crypto.randomUUID() }, `Entretien fait par ${name}.`)} /></TabsContent>

      <TabsContent value="demenagement" className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Quand tu loues un logement, tu choisis ton déménageur sur la page Logement. Sans déménageur joueur dans ta ville, une entreprise fictive s'en charge au prix normal.</p>
        <ProviderList list={s.providers.filter(p => p.service === "demenagement")} fictive="Déménageurs fictifs CIVITAS" />
        <Link to="/logement" className="block rounded-xl border border-border bg-card p-3 text-center text-sm font-semibold text-primary">Chercher un logement → Logement</Link>
      </TabsContent>

      <TabsContent value="factures" className="mt-4 space-y-3">
        {s.invoices.length === 0 ? <p className="text-sm text-muted-foreground">Aucune facture pour l'instant.</p> :
          <ul className="space-y-2">{s.invoices.map(i => <InvoiceRow key={i.id} i={i} busy={act.isPending}
            onReview={(stars, comment) => run("service_review", { _order_id: i.id, _stars: stars, _comment: comment }, "Merci pour ton avis !")} />)}</ul>}
      </TabsContent>

      {s.my_business && <TabsContent value="entreprise" className="mt-4 space-y-3"><MyServiceBusiness s={s} busy={act.isPending}
        onPrice={p => run("service_set_price", { _percent: p }, "Tarif mis à jour.")} /><BusinessPromo businessId={s.my_business.id} /></TabsContent>}
    </Tabs>}
    {s && !s.my_business && <Link to="/patrimoine" className="block rounded-xl border border-border bg-card p-3 text-center text-sm font-semibold text-primary">Ouvrir ton garage ou ta société de déménagement → Patrimoine</Link>}
  </div>;
}

function ProviderList({ list, fictive }: { list: ServiceProvider[]; fictive: string }) {
  return <ul className="space-y-2">
    {list.map(p => <li key={p.id} className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2"><div><p className="font-heading font-bold">{p.name}</p>
        <p className="text-xs text-muted-foreground">Tenu par {p.mine ? "toi" : p.owner} · tarif {p.percent} % du prix normal</p></div><Stars value={p.rating} count={p.reviews} /></div>
      {p.last_reviews.length > 0 && <ul className="mt-2 space-y-1 text-sm">{p.last_reviews.map((r, k) => <li key={k} className="text-muted-foreground">« {r.comment ?? "—"} » <span className="text-xs">— {r.author}, {r.stars}/5</span></li>)}</ul>}
    </li>)}
    <li className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4"><Bot className="h-6 w-6 text-muted-foreground" />
      <div><p className="font-semibold">{fictive}</p><p className="text-xs text-muted-foreground">{FICTIVE_LABEL} · prix normal{list.length ? " · utilisée si tu ne choisis pas de joueur" : ""}</p></div></li>
  </ul>;
}

function GarageTab({ s, busy, onService }: { s: ServiceState; busy: boolean; onService: (catalogId: string, bizId: string | null, name: string) => void }) {
  const garages = s.providers.filter(p => p.service === "garage");
  const due = s.vehicles.filter(v => v.condition === "Entretien nécessaire");
  return <>
    {s.vehicles.length === 0 ? <p className="text-sm text-muted-foreground">Tu n'as pas de voiture. Elles s'achètent dans la Boutique.</p>
      : due.length === 0 ? <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Tes véhicules sont en bon état. {s.vehicles[0]?.next_maintenance ? `Prochain entretien le ${day(s.vehicles[0].next_maintenance)}.` : ""}</p>
      : due.map(v => <section key={v.catalog_id} className="space-y-2 rounded-xl border border-primary/40 bg-primary/10 p-4">
        <p className="font-heading font-bold"><Truck className="mr-1 inline h-5 w-5 text-primary" />{v.brand} {v.name} : entretien nécessaire</p>
        <p className="text-xs text-muted-foreground">Choisis ton garage. Prix normal : {eur(v.maintenance)}.</p>
        {garages.filter(g => !g.mine).map(g => { const price = serviceAmount(v.maintenance, g.percent);
          return <Button key={g.id} variant="outline" className="h-auto min-h-12 w-full justify-between whitespace-normal py-2 text-left" disabled={busy || price > s.balance} onClick={() => onService(v.catalog_id, g.id, g.name)}>
            <span>{g.name} <span className="text-xs text-muted-foreground">({g.rating != null ? `${g.rating.toLocaleString("fr-FR")}/5` : "nouveau"})</span></span><b>{eur(price)}</b></Button>; })}
        <Button className="h-12 w-full justify-between" disabled={busy || v.maintenance > s.balance} onClick={() => onService(v.catalog_id, null, "le garage fictif")}>
          <span>Garage fictif CIVITAS</span><b>{eur(v.maintenance)}</b></Button>
      </section>)}
    <h2 className="font-heading font-bold">Garages de {s.city}</h2>
    <ProviderList list={garages} fictive="Garage fictif CIVITAS" />
  </>;
}

function InvoiceRow({ i, busy, onReview }: { i: ServiceInvoice; busy: boolean; onReview: (stars: number, comment: string) => void }) {
  const [stars, setStars] = useState(0); const [comment, setComment] = useState("");
  return <li className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-2"><div><p className="font-semibold"><Receipt className="mr-1 inline h-4 w-4 text-primary" />{i.label}</p>
      <p className="text-xs text-muted-foreground">{i.provider}{i.fictive ? " (fictive)" : ""} · {day(i.at)} · {i.reference}</p></div><b>{eur(i.amount)}</b></div>
    {i.can_review && !i.reviewed && <div className="mt-3 space-y-2">
      <p className="text-sm">Comment s'est passé ce service ?</p>
      <div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={`${n} étoile${n > 1 ? "s" : ""}`} onClick={() => setStars(n)} className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
        <Star className={`h-6 w-6 ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>)}</div>
      <input className="h-12 w-full rounded-lg border border-input bg-background px-3" maxLength={200} placeholder="Petit avis (facultatif)" value={comment} onChange={e => setComment(e.target.value)} />
      <Button className="h-12 w-full" disabled={busy || stars === 0} onClick={() => onReview(stars, comment)}>Envoyer mon avis</Button></div>}
    {i.reviewed && <p className="mt-2 text-xs text-primary">Avis envoyé, merci.</p>}
  </li>;
}

function MyServiceBusiness({ s, busy, onPrice }: { s: ServiceState; busy: boolean; onPrice: (p: number) => void }) {
  const b = s.my_business!;
  const [pct, setPct] = useState(b.percent);
  const ticket = b.service === "garage" ? s.settings.garage_npc_ticket : s.settings.moving_npc_ticket;
  const clients = expectedNpcClients(b.rating, pct, s.settings.npc_base_clients, s.settings.npc_max_clients);
  return <>
    <div className="rounded-xl bg-secondary p-4 text-secondary-foreground">
      <p className="text-sm opacity-80">{SERVICE_LABEL[b.service]} · caisse de {b.name}</p><p className="font-heading text-2xl font-bold">{eur(b.treasury)}</p>
      <p className="mt-1"><Stars value={b.rating} /></p>
      <p className="text-xs opacity-80">Salariés, paie et bilan hebdomadaire restent sur la page Patrimoine.</p></div>
    <section className="space-y-2 rounded-xl border border-border bg-card p-4"><h2 className="font-heading font-bold">Mon tarif</h2>
      <input type="range" min={s.settings.min_percent} max={s.settings.max_percent} step={5} value={pct} onChange={e => setPct(Number(e.target.value))} className="h-11 w-full accent-primary" aria-label="Tarif" />
      <p className="text-sm"><b>{pct} %</b> du prix normal · un client fictif paie {eur(serviceAmount(ticket, pct))} · environ {clients} client{clients > 1 ? "s" : ""} fictif{clients > 1 ? "s" : ""} par semaine</p>
      <p className="text-xs text-muted-foreground">Moins cher et mieux noté = plus de clients. Les joueurs de ta ville te voient avant l'entreprise fictive.</p>
      <Button className="h-12 w-full" disabled={busy || pct === b.percent} onClick={() => onPrice(pct)}>Enregistrer</Button></section>
    {b.weeks.length > 0 && <section className="space-y-2"><h2 className="font-heading font-bold">Clients fictifs par semaine</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">{b.weeks.map(w => <li key={w.week} className="flex justify-between p-3 text-sm"><span>Semaine {w.week} · {w.clients} client{w.clients > 1 ? "s" : ""}</span><b className="text-primary">+{eur(w.revenue)}</b></li>)}</ul></section>}
    <section className="space-y-2"><h2 className="font-heading font-bold">Clients joueurs</h2>
      {b.orders.length === 0 ? <p className="text-sm text-muted-foreground">Aucun joueur n'a encore fait appel à toi.</p> :
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">{b.orders.map(o => <li key={o.reference} className="flex justify-between gap-2 p-3 text-sm">
          <span>{o.label}<br /><span className="text-xs text-muted-foreground">{o.client} · {day(o.at)} · {o.reference}</span></span><b className="text-primary">+{eur(o.amount)}</b></li>)}</ul>}</section>
    {b.reviews.length > 0 && <section className="space-y-2"><h2 className="font-heading font-bold">Avis reçus</h2>
      <ul className="space-y-1 rounded-xl border border-border bg-card p-3 text-sm">{b.reviews.map((r, k) => <li key={k}><b>{r.stars}/5</b> « {r.comment ?? "—"} » <span className="text-xs text-muted-foreground">— {r.author}</span></li>)}</ul></section>}
  </>;
}
