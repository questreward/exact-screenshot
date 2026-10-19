import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLifeMutation } from "@/components/game/LifeControls";
import { cancelInsurance, formatMoney, insuranceQuery, subscribeInsurance } from "@/services/game";
import { newsDate } from "@/game/news";

export function InsuranceCard({ compact = false }: { compact?: boolean }) {
  const { data: s, isLoading } = useQuery(insuranceQuery);
  const sub = useLifeMutation(subscribeInsurance, "Assurance souscrite");
  const cancel = useLifeMutation(cancelInsurance, "Contrat résilié");
  if (isLoading || !s) return null;
  const covered = new Set(s.contracts.flatMap(c => c.covers));
  const cov = (t: string) => s.coverage.find(c => c.type === t);
  return <section className="space-y-4 rounded-lg border border-border bg-card p-5">
    <div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /><h2 className="text-xl font-semibold">Assurances</h2></div>
    <p className="text-sm text-muted-foreground">Des imprévus peuvent arriver chaque semaine (habitation, santé, accident, sinistre auto si vous avez une voiture). Assuré, vous ne payez que la franchise.</p>
    {(s.debt ?? 0) > 0 && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">Imprévus restant à payer : {formatMoney(s.debt ?? 0)} (remboursés automatiquement dès que votre compte le permet).</p>}

    {s.contracts.length > 0 && <div className="space-y-2">{s.contracts.map(c => <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
      <div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.status === "suspended" ? "Suspendu : cotisation impayée" : new Date(c.covered_from) > new Date(s.now) ? `Couvert à partir du ${newsDate(c.covered_from)}` : "Actif"} · {formatMoney(c.monthly_price)} / mois · prochaine cotisation {newsDate(c.next_due_at)}</p></div>
      <Button variant="ghost" className="h-12 shrink-0" disabled={cancel.isPending} onClick={() => cancel.mutate(c.id)} aria-label={`Résilier ${c.name}`}><X /> Résilier</Button>
    </div>)}</div>}

    {s.age < s.settings.min_age ? <p className="text-sm text-muted-foreground">Assurance possible dès {s.settings.min_age} ans.</p> :
      <div className="grid gap-2 sm:grid-cols-2">{s.products.filter(p => !p.covers.some(t => covered.has(t))).map(p => <div key={p.id} className="space-y-2 rounded-md border border-border p-3">
        <p className="font-semibold">{p.name} · {formatMoney(p.monthly_price)} / mois</p>
        <ul className="text-xs text-muted-foreground">{p.covers.map(t => { const c = cov(t); return c ? <li key={t}>{c.label} : franchise {formatMoney(c.deductible)}, jusqu'à {formatMoney(c.cap)}</li> : null; })}</ul>
        <Button className="h-12 w-full" disabled={sub.isPending} onClick={() => sub.mutate(p.id)}>{sub.isPending ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} Souscrire</Button>
      </div>)}</div>}
    <p className="text-xs text-muted-foreground">Couverture {s.settings.waiting_days} jours après la souscription · résiliable à tout moment, sans remboursement du mois en cours.</p>

    {!compact && <div className="space-y-1 border-t border-border pt-4"><h3 className="font-semibold">Mes imprévus</h3>
      {s.incidents.length === 0 ? <p className="text-sm text-muted-foreground">Aucun imprévu pour l'instant.</p> : s.incidents.map(i => <p key={i.id} className="text-sm">{newsDate(i.occurred_at)} · {i.type_label} : {i.label} · {formatMoney(i.cost)}<span className="block text-xs text-muted-foreground">Assurance {formatMoney(i.insurer_paid)} · vous {formatMoney(i.player_paid)}{i.unpaid > 0 ? ` · reste dû ${formatMoney(i.unpaid)}` : ""}</span></p>)}
    </div>}
  </section>;
}
