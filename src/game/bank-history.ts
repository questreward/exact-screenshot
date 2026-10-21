export type BankMovement = { at: string; amount: number; category: string; label: string };
export type CashReceipt = { operation_key: string; amount: number; occurred_at: string };
export function bankDay(at: string) {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function filterBankHistory<T extends BankMovement>(rows: T[], from: string, to: string, type: string) {
  return rows.filter(row => {
    const day = bankDay(row.at);
    return Boolean(day) && (!from || day >= from) && (!to || day <= to)
      && (type === 'all' || (type === 'withdraw' ? row.category === 'especes' && row.amount < 0
        : type === 'deposit' ? row.category === 'especes' && row.amount > 0 : row.category === type));
  }).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
export const bankDate = (at: string) => new Date(at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
export function cashReceiptText(row: CashReceipt) {
  return `CIVITAS — REÇU FICTIF\nRéférence : ${row.operation_key}\nDate du jeu (Paris) : ${bankDate(row.occurred_at)}\nType : ${row.amount < 0 ? 'Retrait' : 'Dépôt'}\nMontant : ${Math.abs(row.amount)} €\nMouvement du compte : ${row.amount} €\nMouvement des espèces : ${-row.amount} €\nOpération enregistrée. Sans valeur bancaire réelle.`;
}