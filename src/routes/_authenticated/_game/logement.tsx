import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Home, LoaderCircle, KeyRound, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { agencyQuery, agencyRpc, housingAction, housingQuery, serviceQuery } from "@/services/game";
import { agencyRentFee, serviceAmount } from "@/game/services";
import { gameMeta } from "@/game/metadata";
import { housingShare } from "@/game/career";
import { Facade, VisitSheet, MoveMoment } from "@/components/game/HousingMoments";

export const Route = createFileRoute("/_authenticated/_game/logement")({
  head: () => ({ meta: gameMeta("Logement", "Annonces de location, dépôt de garantie, bail fictif et emménagement dans un bien acheté.") }),
  component: HousingPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const day = (s: string) => new Date(s).toLocaleDateString("fr-FR");
const TYPES: Record<string, string> = { "": "Tous", room: "Chambre", studio: "Studio", flat: "Appartement", house: "Maison" };

function HousingPage() {
  const qc = useQueryClient();
  const { data: s, isLoading, isError } = useQuery(housingQuery);
  const [type, setType] = useState("");
  const services = useQuery(serviceQuery);
  const movers = (services.data?.providers ?? []).filter(p => p.service === "demenagement" && !p.mine);
  const [mover, setMover] = useState("");
  const moverPct = movers.find(m => m.id === mover)?.percent ?? 100;
  const agencyData = useQuery(agencyQuery);
  const agencies = (agencyData.data?.agencies ?? []).filter(a => a.city_id === agencyData.data?.city_id && !a.mine);
  const [agency, setAgency] = useState("");
  const agencyPct = agencies.find(a => a.id === agency)?.percent ?? 100;
  const [visit, setVisit] = useState<string | null>(null);
  const [moved, setMoved] = useState<null | { kind: "rent" | "own"; from: string | null; to: string }>(null);
  const months = agencyData.data?.settings.rent_months ?? 1;
  const act = useMutation({
    mutationFn: (v: { cmd: "rent" | "move_in"; input: Record<string, unknown>; to?: string }) => v.cmd === "rent"
      ? agencyRpc("agency_rent_listing", { _listing_id: v.input['listing_id'], _mover_id: v.input['mover_id'] ?? null, _agency_id: agency || null }) as Promise<{ deposit?: number }>
      : housingAction(v.cmd, v.input),
    onSuccess: (r, v) => {
      toast.success(v.cmd === "rent" ? `Bail signé. Dépôt ${eur(r.deposit ?? 0)} (rendu à ton départ), déménageur payé.` : "Tu habites maintenant chez toi !");
      setVisit(null); setMoved({ kind: v.cmd === "rent" ? "rent" : "own", from: s?.lease?.title ?? null, to: v.to ?? "Nouveau logement" });
      ["housing", "economy", "life", "character", "shop", "services", "agency"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rentals = (s?.rentals ?? []).filter(r => !type || r.type_id === type);

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Home className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Logement</h1><p className="text-sm text-muted-foreground">Louer, signer un bail, ou habiter un bien que tu possèdes.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Logement : Disponible dans une prochaine étape.</p>}
    {s && <>
      <section className="rounded-xl bg-secondary p-4 text-secondary-foreground">
        <p className="text-sm opacity-80">Logement actuel</p>
        <p className="font-heading text-xl font-bold">{s.lease?.title ?? s.current?.type ?? "Aucun"}</p>
        {s.current && <p className="text-sm opacity-80">{s.current.type_id === "owner" ? "Charges" : "Loyer"} : {eur(s.current.monthly)} / mois{s.salary > 0 ? ` · ${housingShare(s.current.monthly, s.salary)} % de ton salaire` : ""}</p>}
        <p className="mt-1 text-xs opacity-80">Solde : {eur(s.balance)}</p>
        {(s.owned.length > 0 || s.lease?.kind === 'location') && <Button asChild variant="outline" className="mt-3 min-h-12 w-full"><Link to="/chez-moi"><Home />Aménager chez moi</Link></Button>}
      </section>

      {s.lease && <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="mb-2 flex items-center gap-2 font-heading font-bold"><FileSignature className="h-5 w-5 text-primary" />{s.lease.kind === "location" ? "Mon bail (fictif)" : "Ma résidence principale"}</h2>
        <p>{s.lease.title}</p>
        <p className="text-muted-foreground">Depuis le {day(s.lease.started_at)} · {eur(s.lease.monthly)} / mois{s.lease.deposit ? ` · dépôt de garantie ${eur(s.lease.deposit)}` : ""}</p>
        <p className="mt-2 text-xs text-muted-foreground">DOCUMENT FICTIF — CIVITAS. Le loyer est prélevé chaque jour par ton budget habituel.</p>
      </section>}

      {s.owned.length > 0 && <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-heading font-bold"><KeyRound className="h-5 w-5 text-primary" />Mes biens immobiliers</h2>
        <ul className="space-y-2">{s.owned.map(o => <li key={o.id} className="rounded-lg border border-border p-3">
          <p className="font-semibold">{o.name}</p><p className="text-xs text-muted-foreground">Acheté {eur(o.price)}</p>
          {s.lease?.kind === "propriete" && s.lease.title === o.name ? <p className="mt-1 text-xs text-primary">Tu y habites</p>
            : o.city !== s.city ? <p className="mt-1 text-xs text-muted-foreground">Dans une autre ville</p>
            : <Button className="mt-2 h-11 w-full" disabled={act.isPending} onClick={() => act.mutate({ cmd: "move_in", input: { property_id: o.id }, to: o.name })}>Emménager ici</Button>}
        </li>)}</ul>
      </section>}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-heading font-bold">Annonces de location</h2>
        <div className="mb-3 flex gap-2 overflow-x-auto">{Object.entries(TYPES).map(([k, v]) =>
          <Button key={k} type="button" variant={type === k ? "default" : "secondary"} aria-pressed={type === k} onClick={() => setType(k)} className="min-h-11 shrink-0 rounded-full px-4 text-sm">{v}</Button>)}</div>
        {movers.length > 0 && <label className="mb-3 block text-sm">Déménageur
          <select className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3" value={mover} onChange={e => setMover(e.target.value)}>
            <option value="">Déménageurs fictifs CIVITAS (prix normal)</option>
            {movers.map(m => <option key={m.id} value={m.id}>{m.name} — {m.percent} %{m.rating != null ? ` · ${m.rating}/5` : ""}</option>)}</select></label>}
        <label className="mb-3 block text-sm">Agence immobilière
          <select className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3" value={agency} onChange={e => setAgency(e.target.value)}>
            <option value="">Agence fictive CIVITAS (prix normal)</option>
            {agencies.map(a => <option key={a.id} value={a.id}>{a.name} — {a.percent} %{a.rating != null ? ` · ${a.rating}/5` : ""}</option>)}</select></label>
        <Link to="/agence" className="mb-3 block text-sm font-semibold text-primary">Logements de joueurs à louer → Agence immobilière</Link>
        <ul className="space-y-2">{rentals.map(r => { const moveCost = serviceAmount(r.move, moverPct); const fee = agencyRentFee(r.monthly, months, agencyPct); const cost = r.deposit + moveCost + fee; const mine = s.lease?.title === r.title && s.lease.kind === "location";
          const rentBtn = mine ? <p className="mt-1 text-xs text-primary">Ton logement actuel</p>
              : <Button className="mt-2 min-h-12 w-full" disabled={act.isPending || cost > s.balance} onClick={() => act.mutate({ cmd: "rent", input: { listing_id: r.id, ...(mover ? { mover_id: mover } : {}) }, to: r.title })}>{cost > s.balance ? "Solde insuffisant" : `Louer (${eur(cost)} à l'entrée)`}</Button>;
          return <li key={r.id} className="overflow-hidden rounded-lg border border-border">
            <Facade type={r.type_id} className="max-h-28" />
            <div className="p-3">
            <p className="font-semibold">{r.title}</p>
            <p className="text-xs text-muted-foreground">{r.type} · {r.surface} m² · étage {r.floor} · DPE {r.dpe}</p>
            <p className="mt-1 text-sm"><b>{eur(r.monthly)}</b> / mois · à l'entrée : dépôt {eur(r.deposit)} + agence {eur(fee)} + déménagement {eur(moveCost)}</p>
            {!mine && <Button variant="outline" className="mt-2 min-h-12 w-full" onClick={() => setVisit(r.id)}>👀 Visiter</Button>}
            {mine && rentBtn}
            </div>
            <VisitSheet r={r} open={visit === r.id} onOpenChange={o => setVisit(o ? r.id : null)} action={rentBtn} />
          </li>; })}</ul>
      </section>

      <Link to="/boutique" className="block rounded-xl border border-border bg-card p-3 text-center text-sm font-semibold text-primary">Acheter un bien → Boutique, rubrique Immobilier</Link>
      {s.past_leases.length > 0 && <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="mb-2 font-heading font-bold">Anciens logements</h2>
        <ul className="space-y-1">{s.past_leases.map(l => <li key={l.id}>{l.title} <span className="text-xs text-muted-foreground">· {day(l.started_at)} → {l.ended_at ? day(l.ended_at) : "…"}</span></li>)}</ul>
      </section>}
    </>}
    {moved && <MoveMoment {...moved} onClose={() => setMoved(null)} />}
  </div>;
}
