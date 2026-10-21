import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWorldClock } from "./WorldClock";
import { daylight } from "@/game/daylight";

// Presentation only: stop/station → wait → vehicle arrives → board. The trip itself is the existing secured action (onBoard).
type Kind = "bus" | "train" | "car";
const TXT: Record<Kind, { place: string; icon: string; wait: string; arrive: string; board: string }> = {
  bus: { place: "Arrêt de bus", icon: "🚏", wait: "Le bus arrive dans 2 min…", arrive: "Le bus entre en station", board: "Monter dans le bus" },
  train: { place: "Gare · quai", icon: "🚉", wait: "Train annoncé voie 3…", arrive: "Le train entre en gare", board: "Monter dans le train" },
  car: { place: "Gare routière", icon: "🚏", wait: "Le car arrive au quai…", arrive: "Le car ouvre ses portes", board: "Monter dans le car" },
};
const VEH: Record<Kind, string> = { bus: "🚌", train: "🚆", car: "🚍" };

export function BoardingSheet({ open, onClose, kind, destination, price, onBoard }: {
  open: boolean; onClose: () => void; kind: Kind; destination: string; price: string; onBoard: () => Promise<unknown>;
}) {
  const [phase, setPhase] = useState<"stop" | "wait" | "here" | "boarding">("stop");
  const [error, setError] = useState<string | null>(null);
  const { time } = useWorldClock();
  const light = daylight(time.getUTCHours());
  const t = TXT[kind];
  useEffect(() => { if (!open) { setPhase("stop"); setError(null); } }, [open]);
  useEffect(() => { if (phase !== "wait") return; const id = setTimeout(() => setPhase("here"), 2500); return () => clearTimeout(id); }, [phase]);
  const board = async () => {
    setError(null); setPhase("boarding");
    try { await onBoard(); onClose(); } catch (e) { setError((e as Error).message); setPhase("here"); }
  };
  return (
    <Sheet open={open} onOpenChange={(o) => !o && phase !== "boarding" && onClose()}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader><SheetTitle className="font-heading">{t.icon} {t.place}</SheetTitle></SheetHeader>
        <div className="relative mt-3 h-40 overflow-hidden rounded-xl border border-border bg-muted">
          <div className="absolute inset-x-0 bottom-0 h-10 bg-secondary" />
          <div className="absolute bottom-10 left-4 text-5xl">{t.icon}</div>
          <div className="absolute bottom-10 left-20 text-3xl">🧍🧍‍♀️</div>
          {phase !== "stop" && <div className={`absolute bottom-8 text-6xl transition-all duration-[2400ms] ease-out ${phase === "wait" ? "-right-24" : "right-6"}`}>{VEH[kind]}</div>}
          <div className={`pointer-events-none absolute inset-0 ${light.overlay}`} />
          <span className="absolute right-2 top-2 rounded-md bg-background/85 px-2 py-1 text-xs">{light.emoji} {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</span>
        </div>
        <p className="mt-3 text-sm">Direction <strong>{destination}</strong> · {price}</p>
        <p className="text-xs text-muted-foreground">Ticket ou abonnement : le système habituel s'applique.</p>
        {phase === "wait" && <p role="status" className="mt-3 animate-pulse text-sm">{t.wait}</p>}
        {phase === "here" && <p role="status" className="mt-3 text-sm font-semibold">{t.arrive}</p>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
        <div className="mt-4 grid gap-2">
          {phase === "stop" && <Button className="h-12" onClick={() => setPhase("wait")}>Attendre à l'arrêt</Button>}
          {(phase === "here" || phase === "boarding") && <Button className="h-12" disabled={phase === "boarding"} onClick={board}>{phase === "boarding" ? "Montée…" : t.board}</Button>}
          {phase === "stop" && <Button variant="ghost" className="h-12" onClick={board}>Mode rapide : partir tout de suite</Button>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
