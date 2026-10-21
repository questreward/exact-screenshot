// « Pendant votre absence » : résumé construit uniquement à partir d'éléments déjà enregistrés. Aucun chiffre inventé.
import { opKind, opTitle } from "./money-labels";
type Tx = { id: string; amount: number; label: string; created_at: string };
type Notif = { id: string; title: string; world_at: string | null; created_at: string };
type News = { id: string; title: string; importance: number; published_at: string };

export function absenceSummary(since: string, now: string, d: { txs: Tx[]; notifs: Notif[]; news: News[] }) {
  const after = (iso: string | null) => !!iso && iso > since && iso <= now;
  const txs = d.txs.filter(t => after(t.created_at));
  const income = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter(t => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const salary = txs.find(t => t.amount > 0 && opKind(t.label, t.amount).place === "Salaire");
  const notifs = d.notifs.filter(n => after(n.world_at ?? n.created_at));
  const news = d.news.filter(n => after(n.published_at) && n.importance >= 60).slice(0, 3);
  const hours = Math.floor((Date.parse(now) - Date.parse(since)) / 3600000);
  const empty = !txs.length && !notifs.length && !news.length;
  return { hours, income, expenses, salary: salary ? opTitle(salary.label) : null, ops: txs.length, notifs: notifs.slice(0, 4), news, empty };
}
