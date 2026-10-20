import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { repairVehicle, vehicleWearQuery } from "@/services/game";
import { garagePrice, wearLevel } from "@/game/vehicle-wear";
import { euros } from "@/game/income-tax";

const LEVEL = { bon: "Bon état", use: "Usée", risque: "Risque de panne", immobilise: "Immobilisée" } as const;

export function GarageCard() {
  const qc = useQueryClient();
  const { data: s } = useQuery(vehicleWearQuery);
  const repair = useMutation({
    mutationFn: (v: { car: string; biz: string | null }) => repairVehicle(v.car, v.biz),
    onSuccess: (r) => { qc.setQueryData(vehicleWearQuery.queryKey, r); qc.invalidateQueries({ queryKey: ["bank"] }); toast.success("Voiture réparée à 100 %"); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!s || s.cars.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold"><Wrench className="h-5 w-5 text-primary" />État de mes voitures</h2>
      <p className="mb-3 text-xs text-muted-foreground">Chaque trajet use la voiture. Sous {s.settings.breakdown_below} % : risque de panne entre villes (dépanneuse {euros(s.settings.tow_price)}). À 0 % : immobilisée.</p>
      <div className="space-y-4">
        {s.cars.map(c => {
          const lvl = wearLevel(c.condition_pct, s.settings.breakdown_below);
          return (
            <div key={c.catalog_id} className="space-y-2">
              <div className="flex items-baseline justify-between"><span className="font-semibold">{c.name}</span>
                <span className={lvl === "bon" ? "text-sm text-muted-foreground" : "text-sm font-semibold text-destructive"}>{c.condition_pct} % · {LEVEL[lvl]}</span></div>
              <Progress value={c.condition_pct} />
              {c.repair_ref > 0 && <div className="grid gap-2">
                {s.garages.map(g => (
                  <Button key={g.id} className="h-12 justify-between" disabled={repair.isPending} onClick={() => repair.mutate({ car: c.catalog_id, biz: g.id })}>
                    <span>{g.name}{g.rating ? ` · ${g.rating.toFixed(1)}★` : ""}</span><span>{euros(garagePrice(c.repair_ref, g.percent))}</span>
                  </Button>))}
                <Button variant={s.garages.length ? "outline" : "default"} className="h-12 justify-between" disabled={repair.isPending} onClick={() => repair.mutate({ car: c.catalog_id, biz: null })}>
                  <span>Garage du quartier (fictif)</span><span>{euros(c.repair_ref)}</span>
                </Button>
              </div>}
            </div>);
        })}
      </div>
      {s.history.length > 0 && <ul className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        {s.history.slice(0, 6).map((h, i) => <li key={i} className="flex justify-between"><span>{h.label}</span><span>{h.kind === "reparation" ? `+${h.delta} % · ${euros(h.amount)}` : h.kind === "panne" ? euros(h.amount) : `${h.delta} %`}</span></li>)}
      </ul>}
    </section>
  );
}
