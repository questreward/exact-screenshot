import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { BusFront, TrainFront, Zap, Clock } from "lucide-react";
import { citiesQuery, lifeQuery, intercityRoutesQuery, travelIntercity, formatMoney } from "@/services/game";
import { Button } from "@/components/ui/button";
import { useLifeMutation } from "./LifeControls";
import type { LifeLocation } from "@/game/life-state";

const duration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);

export function IntercityControl({ location }: { location: LifeLocation }) {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { data: cities } = useSuspenseQuery(citiesQuery);
  const { data: routes, isError } = useQuery(intercityRoutesQuery(location.city_id));
  const travel = useLifeMutation(travelIntercity, "Voyage commencé");
  const mode = location.kind === "gare" ? "train" : "car";
  const list = (routes ?? []).filter(r => r.mode === mode);
  const here = life.position.location_id === location.id;
  const busy = life.activities.some(a => a.status === "running");
  const Icon = mode === "train" ? TrainFront : BusFront;
  if (isError) return <p className="border-t border-border pt-4 text-sm text-muted-foreground">Voyages vers d’autres villes : Disponible dans une prochaine étape.</p>;
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4" />{mode === "train" ? "Trains vers d’autres villes" : "Cars vers d’autres villes"}</h4>
      {!here && <p className="text-xs text-muted-foreground">Rendez-vous sur place pour acheter un billet.</p>}
      {list.map(r => {
        const city = cities.find(c => c.id === r.to_city_id);
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="font-heading">{city?.name ?? r.to_city_id}</strong>
              <span className="font-semibold text-primary">{formatMoney(r.money_cost)}</span>
            </div>
            <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="size-3" />{duration(r.duration_minutes)}</span>
              <span className="flex items-center gap-1"><Zap className="size-3" />{r.energy_cost} énergie</span>
            </div>
            <Button className="mt-3 h-11 w-full" disabled={!here || busy || travel.isPending} onClick={() => travel.mutate({ toCity: r.to_city_id, mode: r.mode })}>
              <Icon />Partir
            </Button>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Votre ville de résidence ne change pas : travail, études et vote restent chez vous.</p>
    </div>
  );
}
