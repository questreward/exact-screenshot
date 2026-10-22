import { useQuery } from "@tanstack/react-query";
import { locationPlaceQuery } from "@/services/game";
import { realPlace } from "@/game/real-places";
import { midView } from "@/game/trip-map";
import { VehicleInterior } from "./VehicleInterior";
import { RealMapBox, useRealMapReady } from "./RealMapBox";
import { useWorldClock } from "./WorldClock";
import { daylight } from "@/game/daylight";
import { arrivalFor } from "@/game/arrival";
import { Link } from "@tanstack/react-router";
import type { LifeActivity } from "@/game/life-state";
import { JourneyProgress } from './JourneyProgress';
import { Button } from '@/components/ui/button';

// Trajet en bus dans la ville : intérieur + bus qui avance sur la vraie carte (animation seulement).
export function LocalRide({ activity }: { activity: LifeActivity }) {
  const ready = useRealMapReady();
  const { data: from } = useQuery(locationPlaceQuery(activity.location_id ?? ""));
  const { data: to } = useQuery(locationPlaceQuery(activity.target_location_id ?? ""));
  const now = useWorldClock().time.getTime();
  const start = Date.parse(activity.start_time), end = Date.parse(activity.end_time);
  const pct = end > start ? Math.max(0, Math.min(1, (now - start) / (end - start))) : 0;
  const a = from?.district ? realPlace(from.district.city_id, from.kind, from.name) : null;
  const b = to?.district ? realPlace(to.district.city_id, to.kind, to.name) : null;
  const v = a && b ? midView(a.at, b.at) : null;
  return <div className="space-y-2">
    <div className="relative overflow-hidden rounded-xl"><VehicleInterior kind="bus" speed={0} label={to ? `Vers ${to.name}` : "Transport public"} /><div className={`pointer-events-none absolute inset-0 ${daylight(new Date(now).getUTCHours()).overlay}`} /></div>
    <JourneyProgress start={activity.start_time} end={activity.end_time} now={now} destination={to?.name ?? 'Transport public'} />
    <p role="status" className="text-sm">{activity.status === 'completed' ? `Arrivée confirmée${to ? ` : ${to.name}` : ''}` : pct >= 1 ? 'Arrivée en attente de confirmation' : `${daylight(new Date(now).getUTCHours()).emoji} En route`}</p>
    {ready && a && b && v && <RealMapBox viewKey={`${activity.id}`} center={v.at} zoom={v.zoom} height="h-52 w-full"
      markers={[]} route={{ from: a.at, to: b.at, pct, icon: "🚌" }} />}
    {activity.status === 'completed' && <Button asChild className="min-h-14 w-full"><Link to={arrivalFor(to?.kind).to}>{arrivalFor(to?.kind).emoji} {arrivalFor(to?.kind).label}</Link></Button>}
  </div>;
}
