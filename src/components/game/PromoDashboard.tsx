import { useQuery } from "@tanstack/react-query";
import { promoHistoryQuery } from "@/services/game";
import { promoResults } from "@/game/promo-results";

const day = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** Tableau de bord des promotions : clients, chiffre d'affaires et avis pendant chaque promo. */
export function PromoDashboard({ businessId }: { businessId: string }) {
  const { data } = useQuery(promoHistoryQuery(businessId));
  if (!data) return null;
  const rows = promoResults(data.promos, data.orders, data.reviews);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-heading font-bold">📊 Résultats de mes promotions</p>
      <p className="mt-1 text-xs text-muted-foreground">Chaque promo est comparée aux jours juste avant, sur la même durée.</p>
      {rows.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Aucune promotion lancée pour l'instant.</p> : (
        <ul className="mt-3 space-y-3">{rows.map((r) => {
          const max = Math.max(1, r.during.clients, r.before.clients);
          return (
            <li key={r.starts_at} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2"><b>−{r.percent} %</b><span className="text-xs text-muted-foreground">{day(r.starts_at)} → {day(r.ends_at)}</span></div>
              {[{ l: "Avant", w: r.before, c: "bg-muted-foreground/40" }, { l: "Pendant", w: r.during, c: "bg-primary" }].map((x) => (
                <div key={x.l} className="mt-2 text-sm">
                  <div className="flex justify-between"><span>{x.l}</span><span>{x.w.clients} client{x.w.clients > 1 ? "s" : ""} · {x.w.revenue} €{x.w.stars !== null ? ` · ⭐ ${x.w.stars}` : ""}</span></div>
                  <div className="mt-1 h-3 rounded-full bg-muted"><div className={`h-3 rounded-full ${x.c}`} style={{ width: `${(x.w.clients / max) * 100}%` }} /></div>
                </div>))}
              <p className="mt-2 text-sm font-semibold">{r.clientsChange === null ? (r.during.clients ? "Des clients sont venus, aucun juste avant." : "Pas encore de client.") : r.clientsChange >= 0 ? `📈 +${r.clientsChange} % de clients` : `📉 ${r.clientsChange} % de clients`}</p>
            </li>);
        })}</ul>)}
      <p className="mt-3 text-xs text-muted-foreground">Les visites sans achat ne sont pas enregistrées par le jeu : seuls les clients qui ont payé comptent.</p>
    </div>
  );
}
