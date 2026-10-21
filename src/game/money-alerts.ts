// Alertes d'argent utiles et calmes, dérivées des données existantes. Présentation seule.
export type MoneyAlert = { id: string; emoji: string; text: string };
export const LOW_BALANCE = 100;

export function moneyAlerts(i: { balance: number; now: Date; nextDue?: { due_at: string; amount: number; late: boolean } | null; lastSalaryAt?: string | null }): MoneyAlert[] {
  const out: MoneyAlert[] = [];
  if (i.balance < LOW_BALANCE) out.push({ id: "low", emoji: "⚠️", text: `Solde faible : il te reste ${Math.round(i.balance)} €. Pense à tes prochaines dépenses.` });
  if (i.nextDue) {
    const h = (new Date(i.nextDue.due_at).getTime() - i.now.getTime()) / 3600000;
    if (i.nextDue.late) out.push({ id: "late", emoji: "💳", text: `Une échéance de crédit de ${Math.round(i.nextDue.amount)} € est en retard.` });
    else if (h >= 0 && h <= 48) out.push({ id: "due", emoji: "💳", text: `Échéance de crédit ${h <= 24 ? "aujourd'hui ou demain" : "dans 2 jours"} : ${Math.round(i.nextDue.amount)} €.` });
  }
  if (i.lastSalaryAt && i.now.getTime() - new Date(i.lastSalaryAt).getTime() < 86400000) out.push({ id: "pay", emoji: "💶", text: "Salaire reçu aujourd'hui." });
  return out;
}
