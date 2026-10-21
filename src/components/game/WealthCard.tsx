import { useQuery } from "@tanstack/react-query";
import { economyQuery, bankLoansQuery, bankQuery, formatMoney } from "@/services/game";
import { wealthHistory, type WealthPoint } from "@/game/wealth-history";
import { useWorldClock } from "./WorldClock";
import { wealthBreakdown } from "@/game/wealth";

/** « Mon patrimoine » : rubriques réelles + petite barre de répartition. */
export function WealthCard() {
  const { data: eco } = useQuery(economyQuery);
  const { data: bank } = useQuery(bankLoansQuery);
  const { data: acc } = useQuery(bankQuery);
  const { time } = useWorldClock();
  if (!eco) return null;
  const hist = acc ? wealthHistory({ txs: acc.transactions, assets: eco.assets, cash: acc.balance, saved: eco.saved, now: time }) : [];
  const w = wealthBreakdown({ assets: eco.assets, assetValue: eco.asset_value, saved: eco.saved, cash: eco.available, debt: bank?.loan?.remaining_principal ?? 0 });
  const parts = [
    { k: "🏠 Immobilier", v: w.home, c: "bg-primary" },
    { k: "🚗 Véhicules", v: w.vehicles, c: "bg-accent-foreground" },
    { k: "🛋️ Biens", v: w.goods, c: "bg-muted-foreground" },
    { k: "🐷 Épargne", v: w.saved, c: "bg-success" },
    { k: "💶 Argent disponible", v: w.cash, c: "bg-secondary-foreground" },
  ];
  const pos = parts.reduce((s, p) => s + Math.max(0, p.v), 0);
  return <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
    <h2 className="text-sm font-bold">🏛️ Mon patrimoine</h2>
    <p className="font-display text-3xl font-bold">{formatMoney(w.total)}</p>
    {pos > 0 && <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>{parts.map(p => p.v > 0 && <span key={p.k} className={p.c} style={{ width: `${(p.v / pos) * 100}%` }} />)}</div>}
    <dl className="space-y-1 text-sm">
      {parts.map(p => <div key={p.k} className="flex justify-between"><dt>{p.k}</dt><dd className="font-semibold">{formatMoney(p.v)}</dd></div>)}
      {w.debt > 0 && <div className="flex justify-between text-destructive"><dt>💳 Crédit restant</dt><dd className="font-semibold">−{formatMoney(w.debt)}</dd></div>}
    </dl>
    {hist.length > 0 && <WealthCurve pts={hist} />}
    <p className="text-xs text-muted-foreground">Calculé avec ce que tu possèdes vraiment dans le jeu.</p>
  </section>;
}

/** Courbe simple sur 6 mois (argent + épargne + biens au prix d'achat, avant crédits). */
function WealthCurve({ pts }: { pts: WealthPoint[] }) {
  const W = 300, H = 90, vals = pts.map(p => p.value);
  const min = Math.min(0, ...vals), max = Math.max(1, ...vals);
  const x = (i: number) => 8 + (i * (W - 16)) / (pts.length - 1);
  const y = (v: number) => H - 8 - ((v - min) / (max - min)) * (H - 16);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const first = pts[0]!.value, last = pts[pts.length - 1]!.value;
  return <div className="space-y-1 border-t border-border pt-3">
    <p className="text-xs font-semibold">📈 Mon parcours sur 6 mois</p>
    <p className="text-xs text-muted-foreground">Il y a 6 mois : <b className="text-foreground">{formatMoney(first)}</b> · Aujourd'hui : <b className="text-foreground">{formatMoney(last)}</b></p>
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full text-primary" role="img" aria-label="Évolution du patrimoine sur 6 mois">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill="currentColor" />)}
    </svg>
    <div className="flex justify-between text-[10px] text-muted-foreground">{pts.map((p, i) => <span key={i}>{p.label}</span>)}</div>
    <p className="text-[11px] text-muted-foreground">Argent, épargne et biens au prix d'achat, avant crédits.</p>
  </div>;
}
