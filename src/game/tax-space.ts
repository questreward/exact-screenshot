/** Presentation only; authoritative amounts and deadlines live in PostgreSQL. */
export function taxInstalments(amount: number): number[] {
  const total = Math.max(0, Math.round(amount));
  return Array.from({ length: 10 }, (_, i) => Math.floor(total / 10) + (i < total % 10 ? 1 : 0));
}
export function taxReplyDue(sent: string): string {
  return new Date(new Date(sent).getTime() + 2 * 86400000).toISOString();
}
export function propertyTax(price: number, dailyRent?: number): number {
  return Math.max(0, Math.round(dailyRent === undefined ? price / 240 : dailyRent * 30));
}
export interface TaxNotice {
  id: string; notice_key: string; year: number; kind: 'revenu' | 'foncier'; label: string;
  city_id?: string | null; base_amount?: number | null; rate_pct?: number | null;
  amount: number; paid: number; instalments: 1 | 10 | null; chosen_at: string | null; created_at: string;
}
export interface TaxMessage {
  id: string; category: string; body: string; created_at: string; reply_at: string; answer: string | null;
}
export interface TaxSpaceState { notices: TaxNotice[]; messages: TaxMessage[] }
