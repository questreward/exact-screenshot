// « Ce mois-ci » : totaux du mois du jeu calculés à partir des opérations déjà enregistrées. Présentation seule.
import { opKind } from "./money-labels";
type Tx = { id: string; amount: number; label: string; created_at: string };

export function monthSummary(txs: Tx[], now: Date) {
  const m = now.toISOString().slice(0, 7);
  const inMonth = txs.filter(t => t.created_at.slice(0, 7) === m);
  let income = 0, expenses = 0, saved = 0;
  for (const t of inMonth) {
    if (opKind(t.label, t.amount).place === "Épargne") saved += -t.amount;
    else if (t.amount >= 0) income += t.amount; else expenses += -t.amount;
  }
  return { income, expenses, saved, left: income - expenses - saved, count: inMonth.length };
}

/** Dernier salaire reçu, s'il n'a pas encore été montré au joueur. */
export function newSalary(txs: Tx[], seenId: string | null): Tx | null {
  const s = [...txs].filter(t => t.amount > 0 && opKind(t.label, t.amount).place === "Salaire").sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return s && s.id !== seenId ? s : null;
}
