import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bankQuery, formatMoney } from "@/services/game";
import { monthSummary, newSalary } from "@/game/month-budget";
import { opTitle } from "@/game/money-labels";
import { useWorldClock } from "./WorldClock";

/** Vue « Ce mois-ci » et « Mon budget » dans l'app Banque. */
export function MoneyMonth() {
  const { data: bank } = useQuery(bankQuery);
  const { time } = useWorldClock();
  if (!bank) return null;
  const s = monthSummary(bank.transactions, time);
  const row = "flex items-center justify-between rounded-xl bg-card p-3";
  return <section className="space-y-2">
    <h2 className="text-sm font-bold">📅 Ce mois-ci</h2>
    <div className="space-y-2">
      <div className={row}><span className="text-sm">📈 Revenus</span><span className="font-bold text-success">+{formatMoney(s.income)}</span></div>
      <div className={row}><span className="text-sm">📉 Dépenses</span><span className="font-bold text-destructive">−{formatMoney(s.expenses)}</span></div>
      <div className={row}><span className="text-sm">🐷 Mis de côté</span><span className="font-bold">{formatMoney(s.saved)}</span></div>
    </div>
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">🧮 Mon budget · reste ce mois-ci</p>
      <p className={`font-display text-2xl font-bold ${s.left < 0 ? "text-destructive" : ""}`}>{formatMoney(s.left)}</p>
      <p className="mt-1 text-xs text-muted-foreground">Avant un gros achat, compare son prix à ton solde de {formatMoney(bank.balance)} et pense à ton loyer.</p>
    </div>
  </section>;
}

const SEEN = "civitas:salary-seen";
/** Fenêtre « Salaire reçu », montrée une fois par salaire. */
export function SalaryMoment({ onOpenBank }: { onOpenBank: () => void }) {
  const { data: bank } = useQuery(bankQuery);
  const [seen, setSeen] = useState<string | null | undefined>(undefined);
  useEffect(() => { setSeen(localStorage.getItem(SEEN)); }, []);
  if (!bank || seen === undefined) return null;
  const s = newSalary(bank.transactions, seen);
  if (!s) return null;
  const close = () => { localStorage.setItem(SEEN, s.id); setSeen(s.id); };
  return <div role="dialog" aria-label="Salaire reçu" className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 sm:items-center">
    <div className="w-full max-w-sm space-y-3 rounded-3xl bg-card p-6 text-center shadow-elegant">
      <p className="text-5xl" aria-hidden>💶</p>
      <p className="font-display text-lg font-bold">Salaire reçu</p>
      <p className="font-display text-3xl font-bold text-success">+{formatMoney(s.amount)}</p>
      <p className="text-sm text-muted-foreground">{opTitle(s.label)}</p>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button type="button" className="min-h-12 rounded-xl bg-primary font-semibold text-primary-foreground" onClick={() => { close(); onOpenBank(); }}>Voir mon compte</button>
        <button type="button" className="min-h-12 rounded-xl border border-border font-semibold" onClick={close}>Continuer</button>
      </div>
    </div>
  </div>;
}
