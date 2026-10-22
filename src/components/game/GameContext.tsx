import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, MapPin, CalendarClock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lifeQuery, positionQuery, notificationsQuery } from "@/services/game";
import type { LifeState } from "@/game/life-state";

/** Observe existing cache entries without mounting query observers or making requests. */
function useCached<T>(key: readonly string[]): T | undefined {
  const client = useQueryClient();
  const subscribe = useCallback((notify: () => void) => client.getQueryCache().subscribe(notify), [client]);
  const read = useCallback(() => client.getQueryData<T>(key), [client, key]);
  return useSyncExternalStore(subscribe, read, read);
}

type Position = { city?: { name: string } | null; location?: { name: string } | null };
type Notification = { id: string; read: boolean };

export function GameContext() {
  const position = useCached<Position | null>(positionQuery.queryKey);
  const life = useCached<LifeState>(lifeQuery.queryKey);
  const notifications = useCached<Notification[]>(notificationsQuery.queryKey);
  const active = life?.activities.find(a => a.status === "running");
  const unread = notifications?.filter(n => !n.read).length ?? 0;
  if (!position && !active && !notifications) return null;
  return <div className="game-context" aria-label="Votre situation dans le monde">
    <div className="min-w-0 flex-1">
      {position?.location?.name && <p className="flex items-start gap-2 text-sm"><MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="min-w-0"><span className="font-semibold">{position.location.name}</span>{position.city?.name && <span className="text-muted-foreground"> · {position.city.name}</span>}</span></p>}
      {active && <Link to="/agenda" className="mt-1 flex min-h-11 items-center gap-2 text-sm"><CalendarClock aria-hidden className="h-4 w-4 shrink-0 text-success" /><span className="min-w-0 flex-1">En cours · {active.title}</span><ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-primary" /></Link>}
    </div>
    <Button asChild variant="ghost" size="icon" className="relative shrink-0" title="Voir les notifications"><Link to="/telephone" search={{ app: "notifications" }} aria-label={unread ? `Notifications : ${unread} non lues` : "Notifications"}><Bell aria-hidden />{unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}</Link></Button>
  </div>;
}