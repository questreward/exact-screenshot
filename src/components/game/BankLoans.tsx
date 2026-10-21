import { GameSelect } from "@/components/game/GameSelect";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Landmark, LoaderCircle, ShieldAlert, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLifeMutation } from "@/components/game/LifeControls";
import { bankLoansQuery, drawOverdraft, formatMoney, repayLoanEarly, requestLoan } from "@/services/game";
import { monthlyPayment, scoreLabel } from "@/game/bank";
import { newsDate } from "@/game/news";
import { QuickAmounts } from './FinancialTools';

const fieldClass = "h-12 w-full rounded-md border border-input bg-background px-3 text-sm";
const STATUS: Record<string, string> = { pending: "À venir", late: "En retard", paid: "Payée", seized: "Couverte par saisie", cancelled: "Annulée" };

export function BankLoans({ compact = false }: { compact?: boolean }) {
  const { data: b, isLoading } = useQuery(bankLoansQuery);
  const [amount, setAmount] = useState(1000);
  const [months, setMonths] = useState(12);
  const [od, setOd] = useState(50);
  const ask = useLifeMutation(requestLoan, "Prêt accordé");
  const early = useLifeMutation(repayLoanEarly, "Prêt remboursé");
  const draw = useLifeMutation(drawOverdraft, "Avance versée sur votre compte");
  if (isLoading || !b) return null;
  const s = b.settings;
  const lowScore = b.profile.blocked || b.profile.score < s.score_min;
  const canBorrow = !b.loan && !lowScore && b.loan_cap >= s.min_loan;
  const validAmount = amount >= s.min_loan && amount <= b.loan_cap;
  const monthly = monthlyPayment(amount, months, b.rate);
  const odLeft = Math.max(0, b.overdraft_limit - b.profile.overdraft_used);
  const next = b.loan?.installments.find(i => i.status === "pending" || i.status === "late");
  return <section className="space-y-5 rounded-lg border border-border bg-card p-5">
    <div className="flex items-center gap-2"><Landmark className="h-6 w-6 text-primary" /><h2 className="text-xl font-semibold">Banque : prêt et découvert</h2></div>
    <div className="grid grid-cols-2 gap-3">
      <p className="text-sm text-muted-foreground">Note bancaire<strong className="block text-2xl text-foreground">{b.profile.score} / 100</strong><span className="text-xs">{scoreLabel(b.profile.score, s.score_min)}</span></p>
      <p className="text-sm text-muted-foreground">Découvert utilisé<strong className="block text-2xl text-foreground">{formatMoney(b.profile.overdraft_used)}</strong><span className="text-xs">sur {formatMoney(b.overdraft_limit)} autorisés</span></p>
    </div>
    {lowScore && <p className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"><ShieldAlert className="h-5 w-5 shrink-0" />{b.profile.blocked ? "Compte bloqué par la banque : remboursez votre dette pour retrouver prêt et découvert." : `Note sous ${s.score_min} : plus de nouveau prêt ni de découvert.`}</p>}

    {b.loan ? <div className="space-y-3 border-t border-border pt-4">
      <h3 className="font-semibold">Prêt en cours : {formatMoney(b.loan.principal)} à {b.loan.rate} %</h3>
      {(() => { const done = b.loan.installments.filter(i => i.status === "paid" || i.status === "seized").length; return <dl className="grid grid-cols-2 gap-2 text-sm">{([["💶 Montant initial", formatMoney(b.loan.principal)], ["🏦 Reste à rembourser", formatMoney(b.loan.remaining_principal)], ["💳 Mensualité", formatMoney(b.loan.monthly)], ["📅 Durée restante", `${b.loan.months - done} mois`], ["📊 Taux", `${b.loan.rate} %`], ["✅ Payées", `${done} / ${b.loan.months}`]] as const).map(([k, v]) => <div key={k} className="rounded-xl bg-muted/50 p-2"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-bold">{v}</dd></div>)}</dl>; })()}
      {next && <p className={next.status === "late" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>Prochaine échéance : {newsDate(next.due_at)} · {formatMoney(next.principal_part + next.interest_part + next.late_fee)}{next.status === "late" ? ` (retard, ${b.profile.consecutive_missed} / ${s.seizure_after} avant saisie)` : ""}</p>}
      <Button variant="outline" className="h-12" disabled={early.isPending || b.balance < b.loan.remaining_principal} onClick={() => early.mutate(undefined)}>{early.isPending ? <LoaderCircle className="animate-spin" /> : <HandCoins />} Tout rembourser ({formatMoney(b.loan.remaining_principal)}, sans frais)</Button>
      {!compact && <ul className="space-y-1 text-xs text-muted-foreground">{b.loan.installments.map(i => <li key={i.id}>{i.number}. {newsDate(i.due_at)} · {formatMoney(i.principal_part + i.interest_part + i.late_fee)} · {STATUS[i.status]}</li>)}</ul>}
    </div> : <div className="space-y-3 border-t border-border pt-4">
      <h3 className="font-semibold">Demander un prêt</h3>
      {b.loan_cap < s.min_loan ? <p className="text-sm text-muted-foreground">Un emploi est nécessaire pour emprunter (plafond : {s.income_multiplier} fois votre salaire mensuel).</p> : <>
        <p className="text-sm text-muted-foreground">Jusqu'à {formatMoney(b.loan_cap)} · taux fixe {b.rate} % par an · {s.min_months} à {s.max_months} mois.</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1 text-sm">Montant<Input className="h-12" type="number" inputMode="numeric" min={s.min_loan} max={b.loan_cap} value={amount} onChange={e => setAmount(Number(e.target.value))} /></label>
          <label className="block space-y-1 text-sm">Durée<GameSelect className={fieldClass} value={months} onChange={e => setMonths(Number(e.target.value))}>{Array.from({ length: s.max_months - s.min_months + 1 }, (_, k) => s.min_months + k).map(m => <option key={m} value={m}>{m} mois</option>)}</GameSelect></label>
        </div>
        {validAmount && <p className="rounded-md bg-accent/60 p-3 text-sm">Mensualité : <strong>{formatMoney(monthly)}</strong> · coût total {formatMoney(monthly * months)} (dont {formatMoney(Math.max(0, monthly * months - amount))} d'intérêts)</p>}
        <p className="text-xs text-muted-foreground">Impayé : frais de {s.late_fee_percent} %, note en baisse. Après {s.seizure_after} impayés de suite, la banque vend votre bien le plus cher à {s.seizure_percent} % de sa valeur.</p>
        <Button className="h-12" disabled={!canBorrow || !validAmount || ask.isPending} onClick={() => ask.mutate({ amount, months })}>{ask.isPending ? <LoaderCircle className="animate-spin" /> : <Landmark />} Signer le prêt</Button>
      </>}
    </div>}

    {b.overdraft_limit > 0 && <div className="space-y-3 border-t border-border pt-4">
      <h3 className="font-semibold">Avance sur découvert</h3>
      <p className="text-xs text-muted-foreground">Disponible : {formatMoney(odLeft)} · frais {formatMoney(s.overdraft_daily_fee)} par jour tant que le découvert n'est pas remboursé. Remboursement automatique dès que votre compte le permet. Le découvert sert aussi à payer vos mensualités si votre compte est vide.</p>
      <div className="flex gap-2"><Input className="h-12" type="number" inputMode="numeric" min={1} max={odLeft} value={od} onChange={e => setOd(Number(e.target.value))} /><Button className="h-12 shrink-0" variant="outline" disabled={od < 1 || od > odLeft || draw.isPending} onClick={() => draw.mutate(od)}>Recevoir</Button></div>
      <QuickAmounts value={String(od)} max={odLeft} onChange={v => setOd(Number(v))} />
    </div>}

    {!compact && b.seizures.length > 0 && <div className="space-y-1 border-t border-border pt-4 text-sm"><h3 className="font-semibold">Saisies</h3>{b.seizures.map((z, k) => <p key={k}>{newsDate(z.world_at)} · {z.asset_name ? `${z.asset_name} vendu ${formatMoney(z.asset_value)}` : "Aucun bien saisissable, compte bloqué"}</p>)}</div>}
    {!compact && b.history.length > 0 && <div className="space-y-1 border-t border-border pt-4"><h3 className="font-semibold">Historique bancaire</h3>{b.history.map((h, k) => <p key={k} className="text-xs text-muted-foreground">{newsDate(h.world_at)} · {h.label}{h.kind === "score" ? ` (${h.amount > 0 ? "+" : ""}${h.amount} note)` : ` · ${formatMoney(h.amount)}`}</p>)}</div>}
  </section>;
}
