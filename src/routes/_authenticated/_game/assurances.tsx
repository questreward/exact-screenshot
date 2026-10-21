import { GameSelect } from "@/components/game/GameSelect";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Store, X, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insurerQuery, insurerAction, cancelInsurance, formatMoney } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { serviceAmount } from "@/game/services";
import { newsDate } from "@/game/news";

export const Route = createFileRoute("/_authenticated/_game/assurances")({
  head: () => ({ meta: gameMeta("Assurances", "Garanties, contrats et compagnies d’assurance des joueurs dans CIVITAS.") }),
  loader: ({ context }) => context.queryClient.ensureQueryData(insurerQuery),
  errorComponent: () => <div className="space-y-4 p-4"><h1 className="font-heading text-2xl font-bold">Assurances</h1><p className="text-muted-foreground">Disponible dans une prochaine étape.</p><Button asChild variant="outline"><Link to="/patrimoine">Patrimoine</Link></Button></div>,
  component: InsurancePage,
});

function InsurancePage() {
  const { data: s } = useSuspenseQuery(insurerQuery);
  const q = useQueryClient();
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [percent, setPercent] = useState(s.mine?.percent ?? 100);
  const refresh = () => Promise.all(["bank", "economy", "character", "daily-life", "services"].map(key => q.invalidateQueries({ queryKey: [key] })));
  const act = useMutation({
    mutationFn: (v: { fn: Parameters<typeof insurerAction>[0]; args: Record<string, unknown>; message: string }) => insurerAction(v.fn, v.args),
    onSuccess: async (_, v) => { await refresh(); toast.success(v.message); },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancel = useMutation({ mutationFn: cancelInsurance, onSuccess: async () => { await refresh(); toast.success("Contrat résilié."); }, onError: (e: Error) => toast.error(e.message) });
  const run = (fn: Parameters<typeof insurerAction>[0], args: Record<string, unknown>, message: string) => act.mutate({ fn, args, message });
  const ins = s.insurance;
  const selected = s.providers.find(p => p.id === provider);
  const covered = new Set(ins.contracts.flatMap(c => c.covers));
  const busy = act.isPending || cancel.isPending;
  return <div className="mx-auto max-w-3xl space-y-5 p-4 pb-24">
    <header className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 shrink-0 text-primary" /><h1 className="font-heading text-2xl font-bold">Assurances</h1></header>
    <Tabs defaultValue="contrats">
      <TabsList className="grid h-auto w-full grid-cols-3"><TabsTrigger value="contrats" className="min-h-12">Contrats</TabsTrigger><TabsTrigger value="sinistres" className="min-h-12">Sinistres</TabsTrigger><TabsTrigger value="compagnie" className="min-h-12">Compagnie</TabsTrigger></TabsList>
      <TabsContent value="contrats" className="space-y-4">
        {ins.contracts.map(c => <article key={c.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="font-heading font-bold">{c.name}</h2><p className="break-words text-sm">{c.insurer ?? "Assureur fictif CIVITAS"}</p>
          <p className="text-sm text-muted-foreground">{c.status === "suspended" ? "Suspendu : cotisation impayée" : new Date(c.covered_from) > new Date(ins.now) ? `Couvert le ${newsDate(c.covered_from)}` : "Actif"} · {formatMoney(c.monthly_price)} / mois</p><p className="text-xs text-muted-foreground">Prochaine cotisation : {newsDate(c.next_due_at)}</p>
          <Button variant="outline" className="min-h-12" disabled={busy} onClick={() => cancel.mutate(c.id)}><X />Résilier</Button>
        </article>)}
        <label htmlFor="insurer" className="block font-semibold">Mon assureur</label>
        <GameSelect id="insurer" value={provider} onChange={e => setProvider(e.target.value)} className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-foreground"><option value="">Assureur fictif CIVITAS · tarif de référence</option>{s.providers.map(p => <option key={p.id} value={p.id}>{p.name} · {p.percent} %</option>)}</GameSelect>
        {selected && <p className="text-sm text-muted-foreground">Si la caisse ne suffit pas, l’assureur fictif complète sans frais supplémentaires pour toi.</p>}
        {ins.age < ins.settings.min_age ? <p>Assurance possible dès {ins.settings.min_age} ans.</p> : <div className="grid gap-3 sm:grid-cols-2">{ins.products.filter(p => !p.covers.some(t => covered.has(t))).map(p => {
          const auto = !["home", "health", "accident", "pack"].includes(p.id);
          const price = serviceAmount(p.monthly_price, auto ? 100 : selected?.percent ?? 100);
          return <article key={p.id} className="space-y-3 rounded-lg border border-border bg-card p-4"><h2 className="font-heading font-bold">{p.name}</h2><p>{formatMoney(price)} / mois</p>{auto && <p className="text-xs text-muted-foreground">Assureur fictif CIVITAS uniquement</p>}
            <ul className="space-y-1 text-xs text-muted-foreground">{p.covers.map(t => { const c = ins.coverage.find(v => v.type === t); return c ? <li key={t}>{c.label} · franchise {formatMoney(c.deductible)} · plafond {formatMoney(c.cap)}</li> : null; })}</ul>
            <Button className="min-h-12 w-full" disabled={busy} onClick={() => run("insurer_subscribe", { _product: p.id, _business_id: auto ? null : selected?.id ?? null }, "Assurance souscrite.")}><ShieldCheck />Souscrire</Button>
          </article>;
        })}</div>}
        <p className="text-xs text-muted-foreground">Couverture après {ins.settings.waiting_days} jours de jeu. Résiliation sans remboursement du mois en cours.</p>
      </TabsContent>
      <TabsContent value="sinistres" className="space-y-4">
        {(ins.debt ?? 0) > 0 && <p className="text-destructive">Reste dû : {formatMoney(ins.debt ?? 0)}</p>}
        {!ins.incidents.length && <p className="text-muted-foreground">Aucun sinistre pour le moment.</p>}
        {ins.incidents.map(i => <article key={i.id} className="space-y-2 rounded-lg border border-border bg-card p-4"><h2 className="font-semibold">{i.label}</h2><p className="text-xs text-muted-foreground">{newsDate(i.occurred_at)} · {i.type_label}</p><p>Coût : {formatMoney(i.cost)}</p><p className="text-sm">Assurance : {formatMoney(i.insurer_paid)} · toi : {formatMoney(i.player_paid)}{i.unpaid > 0 ? ` · reste dû : ${formatMoney(i.unpaid)}` : ""}</p></article>)}
      </TabsContent>
      <TabsContent value="compagnie" className="space-y-4">
        {s.mine ? <>
          <h2 className="break-words font-heading text-xl font-bold">{s.mine.name}</h2><div className="grid grid-cols-2 gap-4 border-y border-border py-4"><div><p className="text-xs text-muted-foreground">Caisse</p><p className="font-bold">{formatMoney(s.mine.balance)}</p></div><div><p className="text-xs text-muted-foreground">Contrats actifs</p><p className="font-bold">{s.mine.contracts}</p></div></div>
          <label htmlFor="premium-percent" className="block font-semibold">Mes cotisations · {percent} %</label><input id="premium-percent" type="range" min={s.settings.min_percent} max={s.settings.max_percent} step="5" value={percent} onChange={e => setPercent(Number(e.target.value))} className="h-12 w-full accent-primary" /><p className="text-xs text-muted-foreground">Les tarifs des contrats déjà signés restent inchangés.</p><Button className="min-h-12" disabled={busy || percent === s.mine.percent} onClick={() => run("insurer_set_price", { _percent: percent }, "Tarif enregistré.")}><Save />Enregistrer</Button>
          <h3 className="font-heading font-bold">Cotisations et prises en charge</h3>{!s.mine.ledger.length && <p className="text-muted-foreground">Aucune opération pour le moment.</p>}
          {s.mine.ledger.map(l => <div key={l.id} className="space-y-1 border-b border-border py-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><span>{l.kind === "premium" ? "Cotisation reçue" : "Prise en charge"}</span><span>{formatMoney(l.treasury_amount)}</span></div><p className="text-xs text-muted-foreground">{newsDate(l.world_at)}{l.fictive_amount > 0 ? ` · relais fictif : ${formatMoney(l.fictive_amount)}` : ""}</p></div>)}
          <Button asChild variant="outline" className="min-h-12"><Link to="/patrimoine"><Store />Gérer mon entreprise</Link></Button>
        </> : s.can_found ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); run("insurer_found", { _name: name }, "Compagnie créée."); }}><h2 className="font-heading text-xl font-bold">Ouvrir ma compagnie</h2><p>{formatMoney(s.settings.founding_total)} au total : {formatMoney(s.founding_fee)} de frais et {formatMoney(s.settings.founding_total-s.founding_fee)} dans la caisse.</p><label htmlFor="company-name" className="block font-semibold">Nom de la compagnie</label><Input id="company-name" value={name} onChange={e => setName(e.target.value)} minLength={3} maxLength={60} required className="min-h-12" /><Button type="submit" className="min-h-12 w-full" disabled={busy || name.trim().length < 3}><Store />Ouvrir ma compagnie</Button></form> : <><p className="text-muted-foreground">Tu diriges déjà une entreprise.</p><Button asChild variant="outline" className="min-h-12"><Link to="/patrimoine">Mon entreprise</Link></Button></>}
      </TabsContent>
    </Tabs>
  </div>;
}