import { useQuery } from "@tanstack/react-query";
import { economyQuery, bankLoansQuery, formatMoney } from "@/services/game";
import { wealthBreakdown } from "@/game/wealth";

/** « Mon patrimoine » : rubriques réelles + petite barre de répartition. */
export function WealthCard() {
  const { data: eco } = useQuery(economyQuery);
  const { data: bank } = useQuery(bankLoansQuery);
  if (!eco) return null;
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
    <p className="text-xs text-muted-foreground">Calculé avec ce que tu possèdes vraiment dans le jeu.</p>
  </section>;
}
