import { useQuery } from "@tanstack/react-query";
import { bankQuery, bankLoansQuery, businessQuery, formatMoney } from "@/services/game";
import { moneyAlerts } from "@/game/money-alerts";
import { opKind } from "@/game/money-labels";
import { useWorldClock } from "./WorldClock";

export function MoneyAlerts() {
  const { data: bank } = useQuery(bankQuery);
  const { data: loans } = useQuery(bankLoansQuery);
  const { time } = useWorldClock();
  if (!bank) return null;
  const next = loans?.loan?.installments.find(i => i.status === "pending" || i.status === "late");
  const salary = bank.transactions.find(t => t.amount > 0 && opKind(t.label, t.amount).place === "Salaire");
  const list = moneyAlerts({ balance: bank.balance, now: time, nextDue: next ? { due_at: next.due_at, amount: next.principal_part + next.interest_part + next.late_fee, late: next.status === "late" } : null, lastSalaryAt: salary?.created_at ?? null });
  if (list.length === 0) return null;
  return <ul className="space-y-2">{list.map(a => <li key={a.id} className="flex items-start gap-2 rounded-xl bg-accent/60 p-3 text-sm"><span aria-hidden>{a.emoji}</span>{a.text}</li>)}</ul>;
}

/** Argent personnel et caisse de l'entreprise, bien séparés. */
export function PersonalVsBusiness() {
  const { data: bank } = useQuery(bankQuery);
  const { data: biz } = useQuery(businessQuery);
  if (!bank || !biz?.business) return null;
  return <section className="space-y-2">
    <h2 className="text-sm font-bold">🏢 Mon entreprise</h2>
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-2xl bg-card p-3"><p className="text-xs text-muted-foreground">💶 Argent personnel</p><p className="font-bold">{formatMoney(bank.balance)}</p></div>
      <div className="rounded-2xl bg-card p-3"><p className="text-xs text-muted-foreground">🏢 Caisse de {biz.business.name}</p><p className="font-bold">{formatMoney(biz.business.treasury)}</p></div>
    </div>
    <p className="text-xs text-muted-foreground">La caisse appartient à l'entreprise, pas à toi : tu touches seulement ton salaire de gérant.</p>
  </section>;
}
