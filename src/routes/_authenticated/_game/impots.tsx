import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, LoaderCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { declareIncome, incomeTaxQuery } from "@/services/game";
import { estimateTax, euros, monthLabel } from "@/game/income-tax";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/impots")({
  head: () => ({ meta: gameMeta("Impôts", "Prélèvement à la source, déclaration de revenus et avis d'imposition (fictif).") }),
  component: TaxPage,
});

function TaxPage() {
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery(incomeTaxQuery);
  const declare = useMutation({
    mutationFn: declareIncome,
    onSuccess: (r) => { qc.setQueryData(incomeTaxQuery.queryKey, r); qc.invalidateQueries({ queryKey: ["bank"] }); toast.success("Déclaration envoyée. Ton avis d'imposition est disponible."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Landmark className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Impôts</h1><p className="text-sm text-muted-foreground">Espace particulier · FICTIF</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {!isLoading && !s && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Disponible dans une prochaine étape.</p>}
    {s && (() => {
      const now = new Date(s.now), y = now.getUTCFullYear(), mo = now.getUTCMonth() + 1;
      const open = mo >= s.settings.declare_from_month && mo <= s.settings.declare_until_month;
      const lastYear = y - 1;
      const hasIncome = s.months.some(m => m.month.startsWith(`${lastYear}-`));
      const declared = s.returns.some(r => r.year === lastYear);
      const est = estimateTax(s.current_month.income * 12, s.settings.thresholds, s.settings.rates);
      return <>
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-heading text-base font-bold">Prélèvement à la source</h2>
          <p className="text-sm">Revenus de {monthLabel(s.current_month.month)} : <b>{euros(s.current_month.income)}</b></p>
          <p className="text-sm">Taux estimé : <b>{est.rate} %</b> · prélevé au début du mois suivant.</p>
          {(s.profile?.debt ?? 0) > 0 && <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">Reste à payer : {euros(s.profile!.debt)}. Il sera prélevé dès que ton compte le permet.</p>}
          <p className="mt-2 text-xs text-muted-foreground">Total déjà réglé : {euros(s.profile?.paid_total ?? 0)}</p>
        </section>

        <section className={`rounded-xl border-2 bg-card p-4 ${open && hasIncome && !declared ? "border-primary" : "border-border"}`}>
          <h2 className="mb-2 font-heading text-base font-bold">Déclaration des revenus {lastYear}</h2>
          {declared ? <p className="text-sm">✓ Déclaration faite.</p>
            : !hasIncome ? <p className="text-sm text-muted-foreground">Aucun revenu imposé en {lastYear}. Rien à déclarer.</p>
            : open ? <>
              <p className="mb-3 text-sm">À faire avant le 31 mai. Sans déclaration, l'impôt est calculé automatiquement avec {s.settings.late_pct} % de majoration.</p>
              <Button className="min-h-12 w-full" disabled={declare.isPending} onClick={() => declare.mutate(lastYear)}>Déclarer mes revenus {lastYear}</Button></>
            : <p className="text-sm text-muted-foreground">Ouverte du 1er avril au 31 mai {y}.</p>}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-heading text-base font-bold">Mes avis d'imposition</h2>
          {s.returns.length === 0 ? <p className="text-sm text-muted-foreground">Aucun avis pour l'instant.</p>
            : <div className="space-y-3">{s.returns.map(r => <div key={r.year} className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-1 font-semibold"><FileText className="mr-1 inline h-4 w-4 text-primary" />Revenus {r.year} {r.kind === "automatique" && <span className="text-destructive">· non déclarés</span>}</p>
              <dl className="grid grid-cols-2 gap-1">
                <dt>Salaires</dt><dd className="text-right">{euros(r.income)}</dd>
                <dt>Abattement 10 %</dt><dd className="text-right">− {euros(r.abatement)}</dd>
                <dt>Revenu imposable</dt><dd className="text-right">{euros(r.taxable)}</dd>
                <dt>Impôt</dt><dd className="text-right">{euros(r.tax)}</dd>
                {r.late_fee > 0 && <><dt>Majoration</dt><dd className="text-right">+ {euros(r.late_fee)}</dd></>}
                <dt>Déjà prélevé</dt><dd className="text-right">− {euros(r.withheld)}</dd>
                <dt className="font-bold">{r.balance >= 0 ? "À payer" : "Remboursé"}</dt><dd className="text-right font-bold">{euros(Math.abs(r.balance))}</dd>
              </dl></div>)}</div>}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-heading text-base font-bold">Prélèvements mensuels</h2>
          {s.months.length === 0 ? <p className="text-sm text-muted-foreground">Le premier prélèvement aura lieu au début du mois prochain.</p>
            : <ul className="divide-y divide-border text-sm">{s.months.map(m => <li key={m.month} className="flex justify-between py-2">
              <span>{monthLabel(m.month)}</span><span>{euros(m.income)} · {m.rate} % · <b>{euros(m.withheld)}</b></span></li>)}</ul>}
        </section>

        <p className="text-xs text-muted-foreground">Barème : 0 % jusqu'à 11 497 €, 11 %, 30 %, 41 %, 45 % au-delà de 180 294 € (une part). Simulation pédagogique, montants fictifs.</p>
      </>;
    })()}
  </div>;
}
