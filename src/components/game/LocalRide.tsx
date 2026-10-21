import { useQuery } from "@tanstack/react-query";
import { locationPlaceQuery } from "@/services/game";
import { realPlace } from "@/game/real-places";
import { midView } from "@/game/trip-map";
import { VehicleInterior } from "./VehicleInterior";
import { RealMapBox, useRealMapReady } from "./RealMapBox";
import { useWorldClock } from "./WorldClock";
import type { LifeActivity } from "@/game/life-state";

// Trajet en bus dans la ville : intérieur + bus qui avance sur la vraie carte (animation seulement).
export function LocalRide({ activity }: { activity: LifeActivity }) {
  const ready = useRealMapReady();
  const { data: from } = useQuery(locationPlaceQuery(activity.location_id ?? ""));
  const { data: to } = useQuery(locationPlaceQuery(activity.target_location_id ?? ""));
  const now = useWorldClock().time.getTime();
  const start = Date.parse(activity.start_time), end = Date.parse(activity.end_time);
  const pct = end > start ? Math.max(0, Math.min(1, (now - start) / (end - start))) : 0;
  const a = from?.district ? realPlace(from.district.city_id, from.kind) : null;
  const b = to?.district ? realPlace(to.district.city_id, to.kind) : null;
  const v = a && b ? midView(a.at, b.at) : null;
  return <div className="space-y-2">
    <VehicleInterior kind="bus" label={to ? `Vers ${to.name}` : "Transport public"} />
    {ready && a && b && v && <RealMapBox viewKey={`${activity.id}`} center={v.at} zoom={v.zoom} height="h-52 w-full"
      markers={[]} route={{ from: a.at, to: b.at, pct, icon: "🚌" }} />}
  </div>;
}
