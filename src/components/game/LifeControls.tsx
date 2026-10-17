import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LoaderCircle, MapPin, Moon, Utensils, BookOpen, Briefcase, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lifeQuery, startLifeActivity, formatMoney } from "@/services/game";
import { durationLabel } from "@/game/life";
import type { LifeLocation } from "@/game/life-state";

export function useLifeMutation<T>(action: (input: T) => Promise<unknown>, message: string) {
  const q = useQueryClient();
  return useMutation({ mutationFn: action, onSuccess: async () => {
    await Promise.all(["daily-life", "character", "bank", "position", "notifications"].map(key => q.invalidateQueries({ queryKey: [key] })));
    toast.success(message);
  }, onError: (error: Error) => toast.error(error.message) });
}
export function LocationLink({ location, label = "Voir le lieu" }: { location: LifeLocation; label?: string }) {
  return <Button variant="outline" asChild><Link to="/carte" search={{ city: location.city_id, district: location.district_id ?? undefined, location: location.id }}><MapPin />{label}</Link></Button>;
}
const ICONS = { rest: Moon, eat: Utensils, study: BookOpen, work: Briefcase };
export function DailyActions({ locationId }: { locationId?: string | undefined }) {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const action = useLifeMutation(startLifeActivity, "Activité commencée");
  const busy = life.activities.some(a => a.status === "running");
  const here = !locationId || locationId === life.position.location_id;
  const currentLocation = locationId ?? life.position.location_id;
  const location = life.housing?.location.id === currentLocation ? life.housing.location : life.enrollment?.location.id === currentLocation ? life.enrollment.location : life.offers.find(o => o.location.id === currentLocation)?.location;
  const kinds = location?.kind ?? "";
  const options = life.rules.filter(r => r.id in ICONS && r.allowed_kinds.includes(kinds) && (r.id !== "study" || life.enrollment) && (r.id !== "work" || life.employment?.location.id === currentLocation));
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">{options.map(r => {
      const Icon = ICONS[r.id as keyof typeof ICONS];
      return <Button key={r.id} variant="outline" disabled={!here || busy || action.isPending || life.character.energy < r.energy_cost} onClick={() => action.mutate({ type: r.id })} className="h-auto min-h-20 justify-start whitespace-normal px-4 py-3 text-left">
        {action.isPending && action.variables?.type === r.id ? <LoaderCircle className="animate-spin" /> : <Icon className="text-primary" />}
        <span><span className="block">{r.title}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{durationLabel(r.duration_minutes)} · {r.energy_gain ? `+${r.energy_gain}` : `−${r.energy_cost}`} énergie{r.money_cost ? ` · ${formatMoney(r.money_cost)}` : ""}</span></span>
      </Button>;
    })}</div>
    {!here && options.length > 0 && <p className="text-sm text-muted-foreground">Rejoignez ce lieu pour commencer une activité.</p>}
    {busy && <p className="text-sm text-primary">Une activité est en cours.</p>}
    <Button variant="ghost" asChild><Link to="/agenda"><CalendarDays /> Consulter l’agenda</Link></Button>
  </div>;
}