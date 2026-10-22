import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, DoorOpen, RotateCcw, RotateCw, Smartphone, CreditCard } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { bankQuery, characterQuery, clockQuery, formatMoney } from "@/services/game";
import { useWorldClock } from "@/components/game/WorldClock";
import { normalizeAppearance } from "@/game/appearance";
import { characterModel, type Door } from "@/game/street3d";
import { streetLife } from "@/game/world-scene";
import type { StreetInput, StreetQuality } from "@/components/game/street3d/Street3D";

const Street3D = lazy(() => import("@/components/game/street3d/Street3D").then((m) => ({ default: m.Street3D })));

export const Route = createFileRoute("/_authenticated/_game/ville-3d")({
  head: () => ({ meta: [{ title: "La rue en 3D — CIVITAS" }, { name: "description", content: "Promenez votre personnage dans la rue de CIVITAS et entrez dans les bâtiments." }, { property: "og:title", content: "La rue en 3D — CIVITAS" }, { property: "og:description", content: "Marchez, croisez les habitants et entrez dans la banque, la mairie ou votre logement." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(characterQuery), q.ensureQueryData(bankQuery), q.ensureQueryData(clockQuery)]),
  component: Street,
  errorComponent: () => <p role="alert" className="p-6">La rue n'a pas pu s'afficher. Revenez à l'accueil puis réessayez.</p>,
});

function Joystick({ input }: { input: React.RefObject<StreetInput> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const set = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = (cx - (r.left + r.width / 2)) / (r.width / 2), dy = (cy - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    input.current.x = dx; input.current.y = -dy; setKnob({ x: dx, y: dy });
  };
  const end = () => { input.current.x = 0; input.current.y = 0; setKnob({ x: 0, y: 0 }); };
  return (
    <div ref={base} role="application" aria-label="Manette de déplacement" className="glass relative h-32 w-32 touch-none rounded-full shadow-card"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); set(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") set(e.clientX, e.clientY); }}
      onPointerUp={end} onPointerCancel={end}>
      <span className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-primary/80 shadow-elegant" style={{ transform: `translate(calc(-50% + ${knob.x * 36}px), calc(-50% + ${knob.y * 36}px))` }} />
    </div>
  );
}

function Street() {
  const { data: character } = useSuspenseQuery(characterQuery);
  const { data: bank } = useSuspenseQuery(bankQuery);
  const { time, phase } = useWorldClock();
  const navigate = useNavigate();
  const input = useRef<StreetInput>({ x: 0, y: 0, yaw: Math.PI / 2 });
  const [door, setDoor] = useState<Door | null>(null);
  const doorRef = useRef<Door | null>(null);
  const [quality, setQuality] = useState<StreetQuality>("auto");
  useEffect(() => { const q = localStorage.getItem("civitas-street-quality"); if (q === "low" || q === "high") setQuality(q); }, []);
  const cycleQuality = () => setQuality((q) => { const n: StreetQuality = q === "auto" ? "low" : q === "low" ? "high" : "auto"; localStorage.setItem("civitas-street-quality", n); return n; });
  doorRef.current = door;
  const appearance = normalizeAppearance((character?.appearance ?? {}) as never);
  const enter = () => { if (doorRef.current) navigate({ to: doorRef.current.to as "/banque" }); };

  useEffect(() => {
    const keys = new Set<string>();
    const sync = () => {
      input.current.x = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("q") || keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      input.current.y = (keys.has("z") || keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "e" || k === "enter") return enter();
      if (k === "m") return; // reserved for the menu
      keys.add(k); sync();
    };
    const up = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); sync(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const turn = (d: number) => { input.current.yaw += d; };
  const hour = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <ClientOnly fallback={<p className="p-6">Chargement de la rue…</p>}>
        <Suspense fallback={<div className="flex h-full items-center justify-center font-display text-lg">Chargement de la rue…</div>}>
          <Street3D phase={phase} characterUrl={characterModel(appearance.hair, appearance.skin)} input={input} onDoor={setDoor} crowd={streetLife(phase)} quality={quality} />
        </Suspense>
      </ClientOnly>

      <div className="pointer-events-none absolute inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between gap-2">
        <Link to="/tableau-de-bord" aria-label="Quitter la rue" className="glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex items-center gap-2">
          <span className="glass flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold shadow-card"><CreditCard className="h-4 w-4 text-primary" />{formatMoney(bank?.balance ?? 0)}</span>
          <span className="glass flex min-h-11 items-center rounded-full px-3 font-display text-sm font-bold shadow-card">{hour}</span>
          <button type="button" onClick={cycleQuality} aria-label="Changer la qualité graphique" className="glass pointer-events-auto flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-bold shadow-card">⚙️ {quality === "auto" ? "Auto" : quality === "low" ? "Légère" : "Belle"}</button>
          <Link to="/telephone" aria-label="Ouvrir le téléphone" className="glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-card"><Smartphone className="h-5 w-5" /></Link>
        </div>
      </div>

      {door && (
        <button type="button" onClick={enter} className="glass absolute left-1/2 top-1/3 flex min-h-14 -translate-x-1/2 items-center gap-2 rounded-2xl px-5 font-display text-base font-bold shadow-elegant animate-rise">
          <DoorOpen className="h-5 w-5 text-primary" /> Entrer : {door.label}
        </button>
      )}

      <div className="absolute inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex items-end justify-between">
        <Joystick input={input} />
        <div className="flex gap-2">
          <button type="button" aria-label="Tourner la caméra à gauche" onClick={() => turn(Math.PI / 4)} className="glass flex h-14 w-14 items-center justify-center rounded-full shadow-card"><RotateCcw className="h-5 w-5" /></button>
          <button type="button" aria-label="Tourner la caméra à droite" onClick={() => turn(-Math.PI / 4)} className="glass flex h-14 w-14 items-center justify-center rounded-full shadow-card"><RotateCw className="h-5 w-5" /></button>
        </div>
      </div>
      <p className="pointer-events-none absolute inset-x-0 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] hidden text-center text-xs text-muted-foreground lg:block">Z Q S D ou flèches pour marcher · E pour entrer</p>
    </div>
  );
}
