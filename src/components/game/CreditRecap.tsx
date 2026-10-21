import { formatMoney } from "@/services/game";
import { creditRecap } from "@/game/shop";

/** Encadré clair avant de signer un crédit maison ou voiture. */
export function CreditRecap(p: { kind: "immo" | "auto"; price: number; down: number; fees: number; rate: number; months: number; balance: number; income?: number | null; burden?: number | null }) {
  const r = creditRecap({ ...p, income: p.income ?? 0, burden: p.burden ?? 0 });
  const known = p.income != null;
  const row = (k: string, v: string, bad = false) => <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className={`font-bold ${bad ? "text-destructive" : ""}`}>{v}</dd></div>;
  return <div className="space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
    <p className="font-semibold">{p.kind === "immo" ? "🏠" : "🚗"} Récapitulatif avant de signer</p>
    <dl className="space-y-1">
      {row("Prix", formatMoney(p.price))}
      {row("💶 Apport", formatMoney(p.down))}
      {p.fees > 0 && row("Frais de notaire", formatMoney(p.fees))}
      {row("🏦 Emprunté", formatMoney(r.principal))}
      {row("📅 Durée", p.kind === "immo" && p.months % 12 === 0 ? `${p.months / 12} ans` : `${p.months} mois`)}
      {row("💳 Mensualité", `${formatMoney(r.monthly)} / mois`)}
      {row("Intérêts", formatMoney(r.interest))}
      {row("🧾 Coût total", formatMoney(r.totalCost))}
    </dl>
    <div className="space-y-1 border-t border-border pt-2">
      <p className="text-xs font-semibold">🧮 Ton budget après signature</p>
      <dl className="space-y-1">
        {row("Solde restant aujourd'hui", formatMoney(r.balanceAfter), r.balanceAfter < 0)}
        {known && row("Reste chaque mois après tes crédits", formatMoney(r.monthlyLeft), r.monthlyLeft < 0)}
      </dl>
      {known && <p className="text-xs text-muted-foreground">Calculé sur tes revenus mensuels ({formatMoney(p.income!)}) moins tous tes crédits. Pense aussi à ton loyer et à tes dépenses.</p>}
    </div>
  </div>;
}
