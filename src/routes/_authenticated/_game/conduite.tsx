import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { BusFront, Car, Gauge, LoaderCircle, TrainFront, Camera, Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { driveQuery, driveReport, type DriveState } from "@/services/game";
import { isFlashed, limitAt, tripProgress } from "@/game/driving";
import { VehicleInterior } from "@/components/game/VehicleInterior";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/conduite")({
  head: () => ({ meta: gameMeta("En route", "Conduis ta voiture entre les villes ou profite du trajet en car ou en train.") }),
  component: TripPage,
});

// Heure du jeu estimée côté client (animation seulement).
function useGameNow(s: DriveState | null | undefined) {
  const [now, setNow] = useState(0);
  const base = useRef<{ server: number; local: number; speed: number } | null>(null);
  useEffect(() => { if (s) base.current = { server: Date.parse(s.now), local: Date.now(), speed: Number(s.time_speed) || 1 }; }, [s]);
  useEffect(() => { const id = setInterval(() => { const b = base.current; if (b) setNow(b.server + (Date.now() - b.local) * b.speed); }, 100); return () => clearInterval(id); }, []);
  return now;
}

function TripPage() {
  const { data: s, isLoading } = useQuery({ ...driveQuery, refetchInterval: 15000 });
  const now = useGameNow(s);
  if (isLoading) return <LoaderCircle className="mx-auto mt-10 animate-spin text-primary" />;
  const trip = s?.trip;
  if (!s || !trip || trip.status !== "running") return <div className="mx-auto max-w-2xl space-y-4 p-4">
    <h1 className="font-heading text-2xl font-bold">En route</h1>
    <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Aucun voyage en cours. Pars depuis la Gare, la Station de transport, ou avec ta voiture.</p>
    <Button asChild className="min-h-12 w-full"><Link to="/carte">Ouvrir la carte</Link></Button></div>;
  const pct = tripProgress(trip.start_time, trip.end_time, now || Date.parse(s.now));
  return trip.kind === "voiture" && trip.drive ? <DriveSim s={s} pct={pct} /> : <RideView kind={trip.kind} title={trip.title} pct={pct} />;
}

function Progress({ pct }: { pct: number }) {
  return <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>;
}

function DriveSim({ s, pct }: { s: DriveState; pct: number }) {
  const qc = useQueryClient();
  const d = s.trip?.drive;
  if (!d) return null;
  const [speed, setSpeed] = useState(0);
  const speeds = useRef<(number | null)[]>(d.radars.map(() => null));
  const [flash, setFlash] = useState(false);
  const seg = limitAt(d.segments, pct);
  const report = useMutation({
    mutationFn: (v: { speeds: number[] | null; auto: boolean }) => driveReport(d.activity_id, v.speeds, v.auto),
    onSuccess: (r) => { qc.setQueryData(driveQuery.queryKey, r); qc.invalidateQueries({ queryKey: ["transport"] }); qc.invalidateQueries({ queryKey: ["bank"] });
      const f = r.trip?.drive?.flashes ?? 0; f > 0 ? toast.error(`Flashé ${f} fois : avis de contravention dans Transports.`) : toast.success("Aucun radar ne t'a flashé. Bonne route !"); },
    onError: (e: Error) => toast.error(e.message),
  });
  // Relevé au passage de chaque radar ; envoi quand tous sont passés.
  useEffect(() => {
    if (d.settled || d.mode !== "manuel") return;
    d.radars.forEach((r, i) => {
      if (speeds.current[i] === null && pct >= r.at) {
        speeds.current[i] = speed;
        if (isFlashed(speed, r.limit, s.settings.tolerance)) { setFlash(true); setTimeout(() => setFlash(false), 400); }
      }
    });
    if (!report.isPending && speeds.current.every(v => v !== null)) report.mutate({ speeds: speeds.current as number[], auto: false });
  }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = d.radars.find((r, i) => speeds.current[i] === null && r.at >= pct);
  const over = speed > seg.limit + s.settings.tolerance;

  return <div className="mx-auto max-w-2xl space-y-3 p-4 pb-24">
    <header className="flex min-w-0 items-center gap-2"><Car className="h-7 w-7 shrink-0 text-primary" /><h1 className="min-w-0 break-words font-heading text-xl font-bold">{s.trip?.title}</h1></header>
    <Progress pct={pct} />
    <div className={flash ? "ring-4 ring-primary" : ""}><VehicleInterior kind="voiture" speed={speed} limit={seg.limit} label={seg.label}/></div>
    {next && next.at - pct < 4 && <p className="flex items-center gap-2 text-sm text-primary"><Camera className="h-5 w-5"/>Radar · {next.limit} km/h</p>}
    {d.settled ? <p className="rounded-xl border border-border bg-card p-4 text-center text-sm">{d.mode === "automatique" ? "Conduite automatique activée." : `Radars passés · ${d.flashes} flash${d.flashes > 1 ? "s" : ""}.`} Arrivée à {Math.round(100 - pct)} % du trajet restant.</p> : <>
      <div className={`flex items-center justify-center gap-3 rounded-xl border bg-card p-3 ${over ? "border-destructive text-destructive" : "border-border"}`}>
        <Gauge className="h-7 w-7" /><span className="font-heading text-4xl font-bold">{speed}</span><span>km/h</span></div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="min-h-16 text-lg" onClick={() => setSpeed(v => Math.max(0, v - 10))}>Freiner −10</Button>
        <Button className="min-h-16 text-lg" onClick={() => setSpeed(v => Math.min(180, v + 10))}>Accélérer +10</Button>
      </div>
      <Button variant="ghost" className="min-h-12 w-full" disabled={report.isPending} onClick={() => report.mutate({ speeds: null, auto: true })}><Bot />Conduite automatique</Button>
      <p className="text-xs text-muted-foreground">Respecte les panneaux : au-delà de {s.settings.tolerance} km/h de plus, un radar te flashe (135 €, 1 point). Simulation, l'arrivée se fait à l'heure prévue.</p>
    </>}
  </div>;
}

function RideView({ kind, title, pct }: { kind: string; title: string; pct: number }) {
  const Icon = kind === "train" ? TrainFront : BusFront;
  return <div className="mx-auto max-w-2xl space-y-3 p-4 pb-24">
    <header className="flex min-w-0 items-center gap-2"><Icon className="h-7 w-7 shrink-0 text-primary" /><h1 className="min-w-0 break-words font-heading text-xl font-bold">{title}</h1></header>
    <Progress pct={pct} />
    <VehicleInterior kind={kind === "train" ? "train" : "car"} label={title}/>
    <p className="border-y border-border py-3 text-sm">{pct < 10 ? "Départ du trajet." : pct > 90 ? "Arrivée proche." : "Trajet en cours."}</p>
    <p className="text-xs text-muted-foreground">Rien à faire : tu arrives à l'heure prévue.</p>
  </div>;
}
