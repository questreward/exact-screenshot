import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VehicleHealth, BreakdownStory } from "./VehicleHealth";
import { CarFuel } from "./FuelStation";
import { Fuel, Gauge, Clock, FastForward, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { locationPlaceQuery } from "@/services/game";
import { realPlace } from "@/game/real-places";
import { midView } from "@/game/trip-map";
import { VehicleInterior } from "./VehicleInterior";
import { RealMapBox, useRealMapReady } from "./RealMapBox";
import { useWorldClock } from "./WorldClock";
import { daylight } from "@/game/daylight";
import { arrivalFor } from "@/game/arrival";

// Presentation only: the trip itself is recorded by the existing secured travel action.
type Phase = "ready" | "boarding" | "driving" | "light" | "arriving" | "parked";
const RIDE_MS = 14000;

export function DriveTrip({ open, onClose, vehicle, catalogId, condition, minutes, fromId, toId, toName, onStart }: {
  catalogId: string; open: boolean; onClose: () => void; vehicle: string; condition: string; minutes: number;
  fromId: string; toId: string; toName: string; onStart: () => Promise<unknown>;
}) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [pct, setPct] = useState(0);
  const [fast, setFast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lightDone = useRef(false);
  const startedAt = useRef(0);
  const qc = useQueryClient();
  const { time } = useWorldClock();
  const ready = useRealMapReady();
  const { data: from } = useQuery(locationPlaceQuery(fromId));
  const { data: to } = useQuery(locationPlaceQuery(toId));
  const a = from?.district ? realPlace(from.district.city_id, from.kind, from.name) : null;
  const b = to?.district ? realPlace(to.district.city_id, to.kind, to.name) : null;
  const v = a && b ? midView(a.at, b.at) : null;

  useEffect(() => { if (!open) { setPhase("ready"); setPct(0); setError(null); lightDone.current = false; } }, [open]);
  useEffect(() => {
    if (phase !== "driving") return;
    const id = setInterval(() => setPct((p) => {
      const n = Math.min(1, p + 100 / (fast ? RIDE_MS / 6 : RIDE_MS));
      if (!lightDone.current && n >= 0.45) { lightDone.current = true; setPhase("light"); }
      if (n >= 1) setPhase("arriving");
      return n;
    }), 100);
    return () => clearInterval(id);
  }, [phase, fast]);

  const go = async () => {
    setError(null); setPhase("boarding");
    startedAt.current = Date.now();
    try { await onStart(); qc.invalidateQueries({ queryKey: ["vehicle-wear"] }); qc.invalidateQueries({ queryKey: ["fuel"] }); setTimeout(() => setPhase("driving"), fast ? 0 : 1200); }
    catch (e) { setError((e as Error).message); setPhase("ready"); }
  };
  const speed = phase === "driving" ? 38 + Math.round(12 * Math.sin(pct * 20)) : 0;
  const left = Math.max(0, Math.round(minutes * (1 - pct)));
  const hm = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o && (phase === "ready" || phase === "parked")) onClose(); }}>
      <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[95dvh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle className="font-display text-xl">🚗 {phase === "parked" ? "Vous êtes arrivé" : phase === "ready" ? "Votre véhicule" : `Vers ${toName}`}</SheetTitle></SheetHeader>

        {phase === "ready" && <div className="mt-3 space-y-3 animate-page">
          <VehicleInterior kind="voiture" speed={0} label={vehicle} />
          <ul className="grid grid-cols-2 gap-2 text-sm">
            <li className="rounded-2xl bg-card p-3"><Gauge className="mb-1 h-4 w-4 text-primary" />{condition}</li>
            <li className="rounded-2xl bg-card p-3"><Clock className="mb-1 h-4 w-4 text-primary" />Départ {hm} · {minutes} min</li>
            <li className="col-span-2 rounded-2xl bg-card p-3"><MapPin className="mb-1 h-4 w-4 text-primary" />Destination : <b>{toName}</b></li>
          </ul>
          <VehicleHealth catalogId={catalogId} /><CarFuel catalogId={catalogId} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={fast} onChange={(e) => setFast(e.target.checked)} /><FastForward className="h-4 w-4" />Mode rapide</label>
          <Button className="min-h-14 w-full text-base" onClick={go}>Prendre la route</Button>
        </div>}

        {phase === "boarding" && <div className="mt-8 space-y-2 text-center animate-page">
          <p className="text-5xl">🧍 → 🚗</p><p className="font-display text-lg font-bold">Vous montez dans votre {vehicle}.</p><p className="text-muted-foreground">Le moteur démarre…</p>
        </div>}

        {(phase === "driving" || phase === "light" || phase === "arriving") && <div className="mt-3 space-y-3 animate-page">
          <div className="relative">
            <div className="relative overflow-hidden rounded-xl"><VehicleInterior kind="voiture" speed={speed} limit={50} label={`Vers ${toName}`} /><div className={`pointer-events-none absolute inset-0 ${daylight(time.getUTCHours()).overlay}`} /><span className="absolute left-2 top-2 rounded-md bg-background/85 px-2 py-1 text-xs">{daylight(time.getUTCHours()).emoji} {daylight(time.getUTCHours()).label}</span></div>
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[38%] h-8 overflow-hidden">
              {["🚙", "🚌", "🚲", "🚕"].map((c, i) => <span key={i} className="absolute text-xl animate-drift" style={{ left: `${i * 25}%`, animationDuration: `${12 + i * 5}s`, animationDelay: `-${i * 3}s` }}>{c}</span>)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-card p-2"><p className="text-xs text-muted-foreground">Heure</p><b>{hm}</b></div>
            <div className="rounded-2xl bg-card p-2"><p className="text-xs text-muted-foreground">Reste</p><b>{left} min</b></div>
            <div className="rounded-2xl bg-card p-2"><p className="text-xs text-muted-foreground">État</p><b className="text-xs">{condition}</b></div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct * 100}%` }} /></div>
          {ready && a && b && v && <RealMapBox viewKey={`drive-${toId}`} center={v.at} zoom={v.zoom} height="h-44 w-full" markers={[]} route={{ from: a.at, to: b.at, pct, icon: "🚗" }} />}

          {phase === "light" && <div className="rounded-3xl border-2 border-destructive bg-card p-4 text-center animate-rise">
            <p className="font-display text-lg font-bold">🚦 Feu rouge au carrefour</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-14" onClick={() => setPhase("driving")}>🟢 Continuer</Button>
              <Button className="min-h-14" onClick={() => setTimeout(() => setPhase("driving"), fast ? 0 : 1500)}>🛑 S'arrêter</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Ambiance seulement : aucune amende, ton trajet est déjà enregistré.</p>
          </div>}

          {phase === "arriving" && <div className="rounded-3xl border-2 border-primary bg-card p-4 text-center animate-rise">
            <p className="font-display text-lg font-bold">Vous arrivez à destination.</p>
            <Button className="mt-3 min-h-14 w-full text-base" onClick={() => setPhase("parked")}>🅿️ Se garer</Button>
          </div>}
        </div>}

        {phase === "parked" && <div className="mt-6 space-y-3 text-center animate-page">
          <p className="text-5xl">🅿️</p>
          <p className="font-display text-lg font-bold">Moteur coupé.</p>
          <p className="text-muted-foreground">Vous êtes arrivé : {toName}.</p>
          <BreakdownStory since={startedAt.current} />
          <p className="text-3xl">🚗 → 🧍 → {arrivalFor(to?.kind).emoji}</p>
          <Link to={arrivalFor(to?.kind).to} onClick={onClose} className="flex min-h-14 items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground active:scale-95">{arrivalFor(to?.kind).label}</Link>
          <Link to="/carte" onClick={onClose} className="flex min-h-12 items-center justify-center rounded-2xl border border-border font-semibold active:scale-95">Voir la carte</Link>
        </div>}
      </SheetContent>
    </Sheet>
  );
}
