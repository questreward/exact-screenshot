// Presentation only: authoritative settlement lives in PostgreSQL.
export const ONLINE_BANK_CEILING = 1500;
export const ONLINE_BANK_MONTHLY_FEE = 2;
export const isFictionalBankIban = (value: string) => /^FR760000000000\d{13}$/.test(value);
export const cardRemaining = (spent: number) => Math.max(0, ONLINE_BANK_CEILING - spent);
export type OnlineBankStatement = { month: string; opening: number; closing: number; movements: { at: string; label: string; amount: number; category: string }[] };
export type OnlineBankState = { balance: number; iban: string; bic: string; blocked: boolean; spent: number; ceiling: number; fee: number; statements: OnlineBankStatement[]; fees: { month: string; paid: number }[] };
export function statementText(s: OnlineBankStatement) {
  return `Banque Horizon · FICTIF — ${s.month}\nOuverture : ${s.opening} €\n${s.movements.map(m => `${m.at} | ${m.label} | ${m.amount} €`).join('\n')}\nClôture : ${s.closing} €`;
}
