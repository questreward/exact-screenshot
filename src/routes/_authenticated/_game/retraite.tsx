import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { claimRetirement, retirementQuery } from "@/services/game";
import { euros } from "@/game/income-tax";
import { quartersProgress } from "@/game/retirement";
import { FinancialDesk, GameDocument } from "@/components/game/FinancialTools";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/retraite")({
  head: () => ({ meta: gameMeta("Ma retraite", "Relevé de carrière, trimestres, estimation de pension et départ à la retraite (fictif).") }),
  component: RetirementPage,
});

function RetirementPage() {
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery(retirementQuery);
  const claim = useMutation({
    mutationFn: claimRetirement,
    onSuccess: (r) => { qc.setQueryData(retirementQuery.queryKey, r); toast.success("Bonne retraite ! Ta pension sera versée chaque mois."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><PiggyBank className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Ma retraite</h1><p className="text-sm text-muted-foreground">Espace retraite · FICTIF</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {!isLoading && !s && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Disponible dans une prochaine étape.</p>}
    {s && <>
      <FinancialDesk retirement title="Votre espace retraite" comment={s.retired_at ? `Votre pension enregistrée est de ${euros(s.monthly_pension ?? 0)} par mois. Votre relevé reprend les versements déjà reçus.` : `Votre carrière compte ${s.estimate.quarters} trimestres. Le départ est possible à ${s.settings.legal_age} ans ; l’estimation ci-dessous ne constitue pas encore un versement.`} />
      <GameDocument title="Relevé individuel de carrière" reference={`Âge : ${s.age} ans · CIVITAS Retraite`} text={`Trimestres : ${s.estimate.quarters} / ${s.settings.full_quarters}\nEstimation mensuelle : ${euros(s.estimate.monthly)}\nDépart possible : ${s.settings.legal_age} ans`}><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted-foreground">Trimestres enregistrés</dt><dd className="font-semibold">{s.estimate.quarters} / {s.settings.full_quarters}</dd></div><div><dt className="text-muted-foreground">{s.retired_at ? "Pension enregistrée" : "Estimation mensuelle"}</dt><dd className="font-semibold">{euros(s.retired_at ? s.monthly_pension ?? 0 : s.estimate.monthly)}</dd></div></dl></GameDocument>
      {s.retired_at ? (
        <section className="rounded-xl border border-primary/30 bg-primary/10 p-4">
          <h2 className="font-heading text-base font-bold">Tu es à la retraite</h2>
          <p className="mt-1 text-3xl font-bold">{euros(s.monthly_pension ?? 0)}<span className="text-base font-normal text-muted-foreground"> / mois</span></p>
          {s.payments.length > 0 && <ul className="mt-3 space-y-1 text-sm">{s.payments.map(p => <li key={p.month} className="flex justify-between"><span>Pension {p.month}</span><span>{euros(p.amount)}</span></li>)}</ul>}
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-base font-bold">Estimation de ma pension</h2>
          <p className="mt-1 text-3xl font-bold">{euros(s.estimate.monthly)}<span className="text-base font-normal text-muted-foreground"> / mois</span></p>
          <p className="text-xs text-muted-foreground">Base {euros(s.estimate.base_monthly)} + complémentaire {euros(s.estimate.compl_monthly)}, si tu partais aujourd'hui.</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm"><span>Trimestres validés</span><span className="font-semibold">{s.estimate.quarters} / {s.settings.full_quarters}</span></div>
            <Progress value={quartersProgress(s.estimate.quarters, s.settings.full_quarters)} />
          </div>
          <p className="mt-3 text-sm">Tu as <b>{s.age} ans</b>. Départ possible à <b>{s.settings.legal_age} ans</b>.</p>
          <Button className="mt-3 h-12 w-full" disabled={claim.isPending || s.age < s.settings.legal_age || s.employed} onClick={() => claim.mutate()}>Partir à la retraite</Button>
          {s.age >= s.settings.legal_age && s.employed && <p className="mt-2 text-xs text-muted-foreground">Quitte d'abord ton emploi pour partir.</p>}
        </section>
      )}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 font-heading text-base font-bold">Comment ça marche</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>1 an de jeu = 1 mois réel. Chaque année, ton salaire brut te fait gagner des trimestres : 1 par tranche de {euros(s.settings.quarter_gross)}, 4 au maximum.</li>
          <li>Pension de base : {s.settings.base_rate} % de ton salaire moyen ({s.settings.best_years} meilleures années) × trimestres / {s.settings.full_quarters}.</li>
          <li>Complémentaire : des points achetés avec tes cotisations, convertis en euros au départ.</li>
        </ul>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-heading text-base font-bold">Relevé de carrière</h2>
        {s.years.length === 0 ? <p className="text-sm text-muted-foreground">Ta première année sera comptée à ton prochain anniversaire.</p> :
          <ul className="divide-y divide-border text-sm">{s.years.map(y => <li key={y.age} className="flex justify-between py-2">
            <span>À {y.age} ans</span><span className="text-muted-foreground">{euros(y.gross_annual)} brut/an · <b className="text-foreground">{y.quarters} trim.</b> · {y.points} pts</span></li>)}</ul>}
      </section>
    </>}
  </div>;
}
