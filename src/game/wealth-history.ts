// Évolution sur 6 mois reconstituée à partir des vraies données : opérations du compte, épargne et dates d'achat des biens.
import { opKind } from "./money-labels";
type Tx = { amount: number; label: string; created_at: string };
type Asset = { purchase_price: number; acquired_at: string };
export type WealthPoint = { label: string; value: number };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Valeur (argent + épargne + biens au prix d'achat) à la fin de chacun des 6 derniers mois, puis aujourd'hui. */
export function wealthHistory(i: { txs: Tx[]; assets: Asset[]; cash: number; saved: number; now: Date }): WealthPoint[] {
  const at = (t: Date) => {
    const after = i.txs.filter(x => new Date(x.created_at) > t);
    const cash = i.cash - after.reduce((s, x) => s + x.amount, 0);
    const saved = i.saved + after.filter(x => opKind(x.label, x.amount).place === "Épargne").reduce((s, x) => s + x.amount, 0);
    const goods = i.assets.filter(a => new Date(a.acquired_at) <= t).reduce((s, a) => s + a.purchase_price, 0);
    return Math.round(cash + Math.max(0, saved) + goods);
  };
  const pts: WealthPoint[] = [];
  for (let k = 6; k >= 1; k--) {
    const end = new Date(Date.UTC(i.now.getUTCFullYear(), i.now.getUTCMonth() - k + 1, 1) - 1);
    pts.push({ label: MONTHS[end.getUTCMonth()]!, value: at(end) });
  }
  pts.push({ label: "auj.", value: at(i.now) });
  return pts;
}
