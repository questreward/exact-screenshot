import { GameSelect } from "@/components/game/GameSelect";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, LoaderCircle, KeyRound, Home, Wallet, Briefcase, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { agencyQuery, agencyRpc, shopQuery, type AgencyState } from "@/services/game";
import { agencyBuyFee, manageCut, rentBounds } from "@/game/services";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/agence")({
  head: () => ({ meta: gameMeta("Agence immobilière", "Louer le logement d'un joueur, confier ton bien à une agence, acheter avec une agence.") }),
  component: AgencyPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const day = (s: string) => new Date(s).toLocaleDateString("fr-FR");
const FICTIVE = "Agence fictive CIVITAS (tarif normal)";

function AgencySelect({ s, city, value, onChange }: { s: AgencyState; city: string; value: string; onChange: (v: string) => void }) {
  const list = s.agencies.filter(a => a.city_id === city && !a.mine);
  return <label className="block text-sm">Agence
    <GameSelect className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{FICTIVE}</option>
      {list.map(a => <option key={a.id} value={a.id}>{a.name} ({a.owner}) — {a.percent} %{a.rating != null ? ` · ${a.rating}/5` : ""}</option>)}
    </GameSelect></label>;
}

function AgencyPage() {
  const qc = useQueryClient();
  const { data: s, isLoading, isError } = useQuery(agencyQuery);
  const shop = useQuery(shopQuery);
  const refresh = () => ["agency", "housing", "economy", "life", "character", "shop", "services"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  const act = useMutation({
    mutationFn: (v: { fn: Parameters<typeof agencyRpc>[0]; args: Record<string, unknown>; ok: string }) => agencyRpc(v.fn, v.args).then(r => ({ r, ok: v.ok })),
    onSuccess: ({ r, ok }) => { toast.success(r?.already ? "Déjà fait." : ok); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Building2 className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Agence immobilière</h1>
        <p className="text-sm text-muted-foreground">Propriétaire, agence, locataire : tout passe par une agence de joueur, sinon par l'agence fictive.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Agence immobilière : Disponible dans une prochaine étape.</p>}
    {s && <>
      <p className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">Solde : <b>{eur(s.balance)}</b> · {s.city}</p>
      <Tabs defaultValue="louer">
        <TabsList className="grid h-auto w-full grid-cols-5">
          {[["louer", Home, "Louer"], ["acheter", ShoppingBag, "Acheter"], ["biens", KeyRound, "Mes biens"], ["location", Wallet, "Mon loyer"], ["agence", Briefcase, "Mon agence"]].map(([v, I, l]) => {
            const Icon = I as typeof Home;
            return <TabsTrigger key={v as string} value={v as string} className="flex min-h-12 flex-col gap-0.5 text-[11px]"><Icon className="h-4 w-4" />{l as string}</TabsTrigger>;
          })}
        </TabsList>
        <TabsContent value="louer"><RentTab s={s} act={act} /></TabsContent>
        <TabsContent value="acheter"><BuyTab s={s} products={(shop.data?.products ?? []).filter(p => p.details.realestate && p.details.city === s.city_id && !p.owned)} act={act} /></TabsContent>
        <TabsContent value="biens"><PropertiesTab s={s} act={act} /></TabsContent>
        <TabsContent value="location"><LeaseTab s={s} /></TabsContent>
        <TabsContent value="agence"><MyAgencyTab s={s} /></TabsContent>
      </Tabs>
    </>}
  </div>;
}

type Act = ReturnType<typeof useMutation<{ r: unknown; ok: string }, Error, { fn: Parameters<typeof agencyRpc>[0]; args: Record<string, unknown>; ok: string }>>;

function RentTab({ s, act }: { s: AgencyState; act: Act }) {
  return <section className="space-y-3">
    <p className="text-sm text-muted-foreground">Logements mis en location par d'autres joueurs. À l'entrée : frais d'agence ({s.settings.rent_months} mois de loyer) + dépôt de garantie (1 mois). Ensuite, le loyer est payé tous les {s.settings.period_days} jours au propriétaire.</p>
    {s.listings.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Aucun logement de joueur à louer à {s.city} pour l'instant. Les annonces habituelles sont dans <Link to="/logement" className="font-semibold text-primary">Logement</Link>.</p>}
    {s.listings.map(l => { const cost = l.fee + l.rent;
      return <div key={l.id} className="rounded-xl border border-border bg-card p-4">
        <p className="font-semibold">{l.name}</p>
        <p className="text-xs text-muted-foreground">{l.surface ? `${l.surface} m² · ` : ""}{l.rooms ? `${l.rooms} pièce(s) · ` : ""}{l.dpe ? `DPE ${l.dpe} · ` : ""}propriétaire {l.owner} · {l.agency}</p>
        <p className="mt-1 text-sm"><b>{eur(l.rent)}</b> / mois · à l'entrée : frais {eur(l.fee)} + dépôt {eur(l.rent)}</p>
        <Button className="mt-2 h-12 w-full" disabled={act.isPending || cost > s.balance}
          onClick={() => act.mutate({ fn: "agency_rent", args: { _mandate_id: l.id, _mover_id: null }, ok: "Bail signé ! Tu emménages." })}>
          {cost > s.balance ? "Solde insuffisant" : `Louer (${eur(cost)} à l'entrée)`}</Button>
      </div>; })}
  </section>;
}

function BuyTab({ s, products, act }: { s: AgencyState; products: { id: string; name: string; price: number }[]; act: Act }) {
  const [agency, setAgency] = useState("");
  const pct = s.agencies.find(a => a.id === agency)?.percent ?? 100;
  return <section className="space-y-3">
    <p className="text-sm text-muted-foreground">Acheter au comptant avec une agence : frais de {s.settings.buy_percent} % du prix, en plus des frais de notaire. Pour un crédit, passe par la <Link to="/boutique" className="font-semibold text-primary">Boutique</Link>.</p>
    <AgencySelect s={s} city={s.city_id} value={agency} onChange={setAgency} />
    {products.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Aucun bien à vendre dans ta ville.</p>}
    {products.map(p => { const fee = agencyBuyFee(p.price, s.settings.buy_percent, pct); const notary = Math.ceil(p.price * 0.075); const total = p.price + fee + notary;
      return <div key={p.id} className="rounded-xl border border-border bg-card p-4">
        <p className="font-semibold">{p.name}</p>
        <p className="text-sm">{eur(p.price)} + agence {eur(fee)} + notaire {eur(notary)}</p>
        <Button variant="outline" className="mt-2 h-12 w-full" disabled={act.isPending || total > s.balance}
          onClick={() => act.mutate({ fn: "agency_buy", args: { _catalog_id: p.id, _agency_id: agency || null }, ok: "Achat signé avec l'agence !" })}>
          {total > s.balance ? "Solde insuffisant" : `Acheter (${eur(total)})`}</Button>
      </div>; })}
  </section>;
}

function PropertiesTab({ s, act }: { s: AgencyState; act: Act }) {
  return <section className="space-y-3">
    <p className="text-sm text-muted-foreground">Confie un bien à une agence pour le louer à un autre joueur. L'agence garde {s.settings.manage_percent} % de chaque loyer (rien avec l'agence fictive), le reste arrive sur ton compte.</p>
    {s.my_properties.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Tu ne possèdes aucun logement.</p>}
    {s.my_properties.map(p => <PropertyCard key={p.catalog_id} s={s} p={p} act={act} />)}
    {s.payouts.length > 0 && <div className="rounded-xl border border-border bg-card p-4 text-sm">
      <h3 className="mb-2 font-heading font-bold">Argent reçu</h3>
      <ul className="space-y-1">{s.payouts.map((x, i) => <li key={i} className="flex justify-between gap-2"><span>{x.label}</span><b className="shrink-0">+{eur(x.amount)}</b></li>)}</ul>
    </div>}
  </section>;
}

function PropertyCard({ s, p, act }: { s: AgencyState; p: AgencyState["my_properties"][number]; act: Act }) {
  const [min, max] = rentBounds(p.ref_rent, s.settings.min_percent, s.settings.max_percent);
  const [rent, setRent] = useState(String(p.ref_rent));
  const [agency, setAgency] = useState("");
  const pct = s.agencies.find(a => a.id === agency)?.percent ?? null;
  const r = Number(rent) || 0;
  return <div className="rounded-xl border border-border bg-card p-4 text-sm">
    <p className="font-semibold">{p.name}</p>
    {p.mandate ? <>
      <p className="mt-1">{p.mandate.agency} · {eur(p.mandate.rent)} / mois</p>
      <p className="text-muted-foreground">{p.mandate.status === "loue" ? `Loué à ${p.mandate.tenant}` : "En attente d'un locataire"} · tu reçois {eur(p.mandate.rent - p.mandate.cut)} / mois</p>
      {p.mandate.status === "libre" && <Button variant="outline" className="mt-2 h-11 w-full" disabled={act.isPending}
        onClick={() => act.mutate({ fn: "agency_mandate_end", args: { _mandate_id: p.mandate!.id }, ok: "Annonce retirée." })}>Retirer l'annonce</Button>}
    </> : p.living ? <p className="mt-1 text-muted-foreground">Tu y habites : déménage avant de le louer.</p> : <>
      <p className="text-muted-foreground">Loyer conseillé {eur(p.ref_rent)} (entre {eur(min)} et {eur(max)})</p>
      <div className="mt-2 space-y-2">
        <AgencySelect s={s} city={p.city_id} value={agency} onChange={setAgency} />
        <label className="block">Loyer mensuel (€)<Input type="number" inputMode="numeric" className="mt-1 h-12" value={rent} min={min} max={max} onChange={e => setRent(e.target.value)} /></label>
        <p className="text-xs text-muted-foreground">Tu recevras {eur(Math.max(0, r - manageCut(r, s.settings.manage_percent, pct)))} par mois.</p>
        <Button className="h-12 w-full" disabled={act.isPending || r < min || r > max}
          onClick={() => act.mutate({ fn: "agency_mandate", args: { _property_id: p.catalog_id, _agency_id: agency || null, _rent: r }, ok: "Bien confié à l'agence !" })}>Mettre en location</Button>
      </div>
    </>}
  </div>;
}

function LeaseTab({ s }: { s: AgencyState }) {
  const l = s.my_lease;
  if (!l) return <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Tu ne loues pas le logement d'un joueur.</p>;
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
    <h3 className="font-heading font-bold">{l.title}</h3>
    <p>Propriétaire {l.owner} · {l.agency}</p>
    <p className="text-muted-foreground">Depuis le {day(l.started_at)} · {eur(l.rent)} / mois · prochain loyer le {day(l.next_due)}</p>
    {l.unpaid > 0 && <p className="rounded-lg bg-destructive/10 p-3 text-destructive">{l.unpaid} loyer(s) impayé(s). Au bout de {s.settings.max_unpaid}, le bail s'arrête : ton dépôt paie ce que tu dois et tu es relogé en chambre.</p>}
    <ul className="space-y-1">{l.rents.map(r => <li key={r.period} className="flex justify-between"><span>Mois {r.period}</span><span className={r.status === "paye" ? "" : "text-destructive"}>{eur(r.amount)} · {r.status === "paye" ? "payé" : "impayé"}</span></li>)}</ul>
    <p className="text-xs text-muted-foreground">DOCUMENT FICTIF — CIVITAS.</p>
  </section>;
}

function MyAgencyTab({ s }: { s: AgencyState }) {
  const a = s.my_agency;
  if (!a) return <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Tu n'as pas d'agence. Crée une entreprise « Agence immobilière » depuis <Link to="/patrimoine" className="font-semibold text-primary">Patrimoine</Link>.</p>;
  return <section className="space-y-3 text-sm">
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-heading text-lg font-bold">{a.name}</p>
      <p>Caisse : <b>{eur(a.treasury)}</b> · tarif {a.percent} %{a.rating != null ? ` · ${a.rating}/5` : ""}</p>
      <Link to="/services" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary">Changer mon tarif et voir mes avis → Services</Link>
    </div>
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 font-heading font-bold">Biens gérés</h3>
      {a.mandates.length === 0 ? <p className="text-muted-foreground">Aucun bien confié pour l'instant.</p>
        : <ul className="space-y-1">{a.mandates.map((m, i) => <li key={i}>{m.name} · {m.owner} → {m.tenant ?? "libre"} · +{eur(m.cut)} / mois</li>)}</ul>}
    </div>
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 font-heading font-bold">Activité</h3>
      <ul className="space-y-1">{a.orders.map(o => <li key={o.reference} className="flex justify-between gap-2"><span>{o.label} · {o.client}</span><b className="shrink-0">+{eur(o.amount)}</b></li>)}
        {a.weeks.map(w => <li key={w.week} className="flex justify-between text-muted-foreground"><span>Semaine {w.week} : {w.clients} client(s) fictif(s)</span><span>+{eur(w.revenue)}</span></li>)}</ul>
    </div>
  </section>;
}
