import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { BusFront, Car, Gauge, LoaderCircle, TrainFront, Camera, Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { driveQuery, driveReport, type DriveState } from "@/services/game";
import { isFlashed, limitAt, tripProgress } from "@/game/driving";
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
  const d = s.trip!.drive!;
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
    <header className="flex items-center gap-2"><Car className="h-7 w-7 text-primary" /><h1 className="font-heading text-xl font-bold">{s.trip!.title}</h1></header>
    <Progress pct={pct} />
    <div className={`relative h-72 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-secondary to-muted ${flash ? "ring-8 ring-primary" : ""}`}>
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-muted-foreground/20" style={{ clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ clipPath: "polygon(49.5% 0, 50.5% 0, 52% 100%, 48% 100%)",
        background: "repeating-linear-gradient(to bottom, hsl(var(--background)) 0 18px, transparent 18px 36px)", backgroundPositionY: `${(pct * 900 * Math.max(speed, 1) / 100) % 36}px` }} />
      <div className="absolute left-3 top-3 flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-destructive bg-background font-heading text-xl font-bold">{seg.limit}</div>
      <p className="absolute right-3 top-3 rounded-lg bg-background/80 px-2 py-1 text-xs font-semibold">{seg.label}</p>
      {next && next.at - pct < 4 && <p className="absolute left-1/2 top-14 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-background px-3 py-2 text-sm font-bold"><Camera className="h-4 w-4" />Radar {next.limit} !</p>}
      <div className="absolute bottom-4 left-1/2 h-14 w-24 -translate-x-1/2 rounded-t-3xl rounded-b-lg bg-primary shadow-lg"><div className="mx-auto mt-2 h-4 w-16 rounded bg-background/60" /></div>
    </div>
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

const PASSENGERS = ["👩‍💼", "🧑‍🎓", "👴", "👨‍🔧", "👩‍🍼", "🧔"];
function RideView({ kind, title, pct }: { kind: string; title: string; pct: number }) {
  const Icon = kind === "train" ? TrainFront : BusFront;
  const control = pct > 40 && pct < 55;
  return <div className="mx-auto max-w-2xl space-y-3 p-4 pb-24">
    <header className="flex items-center gap-2"><Icon className="h-7 w-7 text-primary" /><h1 className="font-heading text-xl font-bold">{title}</h1></header>
    <Progress pct={pct} />
    <div className="relative h-56 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-secondary to-muted">
      <div className="absolute inset-x-0 top-1/2 flex gap-16 text-4xl" style={{ transform: `translateX(-${(pct * 40) % 400}px)` }}>
        {Array.from({ length: 20 }, (_, i) => <span key={i}>{["🌳", "🏡", "🌲", "🐄", "⛪", "🌾"][i % 6]}</span>)}
      </div>
      <div className="absolute inset-x-3 bottom-3 flex justify-around rounded-xl bg-background/90 p-2 text-2xl">{PASSENGERS.map((p, i) => <span key={i} className={i === Math.floor(pct / 17) % 6 ? "animate-bounce" : ""}>{p}</span>)}</div>
    </div>
    <p className="rounded-xl border border-border bg-card p-3 text-sm">{control ? "🎫 Le contrôleur passe : « Billets, s'il vous plaît ! » Ton billet est en règle."
      : pct < 10 ? (kind === "train" ? "« Mesdames et messieurs, bienvenue à bord. »" : "Le chauffeur ferme les portes, départ !")
      : pct > 90 ? "« Prochain arrêt : terminus. Pensez à ne rien oublier. »" : "Tu regardes le paysage défiler. Tes voisins discutent tranquillement."}</p>
    <p className="text-xs text-muted-foreground">Rien à faire : tu arrives à l'heure prévue.</p>
  </div>;
}
