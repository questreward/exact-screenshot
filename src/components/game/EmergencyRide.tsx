import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { lifeQuery, locationPlaceQuery } from "@/services/game";
import { CITY_CENTER, realPlace } from "@/game/real-places";
import { midView } from "@/game/trip-map";
import { emergencyTrip } from "@/game/emergency-trip";
import { daylight } from "@/game/daylight";
import { VehicleInterior } from "./VehicleInterior";
import { RealMapBox, useRealMapReady } from "./RealMapBox";
import { useWorldClock } from "./WorldClock";

// Scene only: base → vehicle → siren trip → on site. The mission and its result stay with the secured shift.
export function EmergencyRide({ service, missionId, title }: { service: string; missionId: string; title: string }) {
  const trip = emergencyTrip(service, missionId);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"base" | "ride" | "site">("base");
  const [pct, setPct] = useState(0);
  const { data: life } = useQuery(lifeQuery);
  const { data: here } = useQuery(locationPlaceQuery(life?.position.location_id ?? ""));
  const city = here?.district?.city_id;
  const ready = useRealMapReady();
  const { time } = useWorldClock();
  const light = daylight(time.getUTCHours());
  useEffect(() => { if (phase !== "ride") return; const id = setInterval(() => setPct(p => { const n = Math.min(1, p + 0.012); if (n >= 1) setPhase("site"); return n; }), 100); return () => clearInterval(id); }, [phase]);
  if (!trip.dest) return null;
  const a = city ? CITY_CENTER[city]?.at : null;
  const b = city ? realPlace(city, trip.dest)?.at : null;
  const v = a && b ? midView(a, b) : null;
  const close = () => { setOpen(false); setPhase("base"); setPct(0); };
  return <>
    <Button className="mb-3 min-h-14 w-full text-base" onClick={() => setOpen(true)}>{trip.emoji} Partir en intervention</Button>
    <Sheet open={open} onOpenChange={o => !o && close()}>
      <SheetContent side="bottom" className="max-h-[94dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader><SheetTitle className="font-heading">{trip.emoji} {title}</SheetTitle></SheetHeader>
        {phase === "base" && <div className="mt-4 space-y-3 text-center">
          <p className="text-5xl">🏢 → {trip.emoji}</p>
          <p className="font-semibold">{trip.base}</p>
          <p className="text-sm text-muted-foreground">Départ en {trip.vehicle.toLowerCase()} vers : {trip.destLabel}.</p>
          <Button className="min-h-14 w-full" onClick={() => setPhase("ride")}>Monter dans le véhicule</Button>
          <Button variant="ghost" className="min-h-12 w-full" onClick={() => { setPct(1); setPhase("site"); }}>Mode rapide : arriver sur place</Button>
        </div>}
        {phase !== "base" && <div className="mt-3 space-y-3">
          <div className="relative overflow-hidden rounded-xl">
            <VehicleInterior kind={trip.emoji === "🚓" ? "voiture" : "camion"} speed={phase === "ride" ? 60 + Math.round(15 * Math.sin(pct * 18)) : 0} label={trip.vehicle} />
            <div className={`pointer-events-none absolute inset-0 ${light.overlay}`} />
            {phase === "ride" && <span className="absolute left-2 top-2 animate-pulse rounded-md bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">🚨 Gyrophares et sirène</span>}
          </div>
          {ready && a && b && v && <RealMapBox viewKey={`sec-${missionId}`} center={v.at} zoom={v.zoom} height="h-44 w-full" markers={[]} route={{ from: a, to: b, pct, icon: trip.emoji }} />}
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct * 100}%` }} /></div>
          {phase === "site" && <div className="space-y-2 rounded-2xl border-2 border-primary bg-card p-4 text-center">
            <p className="font-display text-lg font-bold">Sur les lieux : {trip.destLabel}</p>
            <p className="text-sm text-muted-foreground">À toi de choisir comment agir dans la mission.</p>
            <Button className="min-h-14 w-full" onClick={close}>Descendre du véhicule</Button>
          </div>}
        </div>}
      </SheetContent>
    </Sheet>
  </>;
}
