import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { vehicleWearQuery } from "@/services/game";
import { cn } from "@/lib/utils";

// Presentation of the existing wear state; repairs stay in the Garage card (Transports page).
export function vehicleMood(pct: number, breakdownBelow: number) {
  if (pct < breakdownBelow) return { tone: "bad" as const, text: "⚠️ Risque de panne : passe vite au garage." };
  if (pct < 70) return { tone: "warn" as const, text: "⚠️ Ta voiture commence à montrer des signes d'usure." };
  return { tone: "ok" as const, text: "✅ Ta voiture est en forme." };
}

export function VehicleHealth({ catalogId }: { catalogId: string }) {
  const { data } = useQuery(vehicleWearQuery);
  const car = data?.cars.find((c) => c.catalog_id === catalogId);
  if (!data || !car) return null;
  const m = vehicleMood(car.condition_pct, data.settings.breakdown_below);
  return (
    <div className={cn("rounded-2xl border p-3", m.tone === "ok" ? "border-border bg-card" : m.tone === "warn" ? "border-primary/50 bg-primary/10" : "border-destructive bg-destructive/10")}>
      <div className="flex items-center justify-between text-sm"><span className="font-semibold">🔧 État mécanique</span><b>{car.condition_pct} %</b></div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", m.tone === "bad" ? "bg-destructive" : "bg-gradient-primary")} style={{ width: `${car.condition_pct}%` }} /></div>
      <p className="mt-2 text-sm">{m.text}</p>
      {m.tone !== "ok" && <Link to="/transports" className="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">Aller au garage</Link>}
    </div>
  );
}

/** Shows a breakdown only if the existing wear history recorded one since `since`. */
export function BreakdownStory({ since }: { since: number }) {
  const { data } = useQuery({ ...vehicleWearQuery, refetchInterval: false });
  const panne = data?.history.find((h) => h.kind === "panne" && Date.parse(h.at) >= since - 60000);
  if (!panne) return null;
  return (
    <div className="rounded-3xl border-2 border-destructive bg-card p-4 text-left animate-rise">
      <p className="font-display text-lg font-bold">⚠️ Votre véhicule vient de tomber en panne.</p>
      <p className="mt-1 text-sm text-muted-foreground">{panne.label}{panne.amount ? ` · dépannage ${panne.amount} €` : ""}. Le véhicule est immobilisé.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to="/transports" className="flex min-h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">Garage</Link>
        <Link to="/transports" className="flex min-h-12 items-center justify-center rounded-xl border border-border text-sm font-semibold">🚌 Autre transport</Link>
      </div>
    </div>
  );
}
