import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly, createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, DoorOpen, RotateCcw, RotateCw } from "lucide-react";
import { characterQuery } from "@/services/game";
import { normalizeAppearance } from "@/game/appearance";
import { characterModel } from "@/game/street3d";
import { INTERIORS, type Spot } from "@/game/interior3d";
import { Joystick } from "@/components/game/street3d/Joystick";
import type { StreetInput, StreetQuality } from "@/components/game/street3d/Street3D";

const Interior3D = lazy(() => import("@/components/game/street3d/Interior3D").then((m) => ({ default: m.Interior3D })));

export const Route = createFileRoute("/_authenticated/_game/lieu-3d/$id")({
  loader: ({ params, context: { queryClient } }) => {
    const room = INTERIORS[params.id];
    if (!room) throw notFound();
    return queryClient.ensureQueryData(characterQuery).then(() => ({ name: room.name }));
  },
  head: ({ loaderData }) => {
    const t = `${loaderData?.name ?? "Lieu"} en 3D — CIVITAS`;
    const d = "Entrez dans le lieu, approchez-vous des rayons, des véhicules ou du guichet.";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] };
  },
  component: Place,
  notFoundComponent: () => <p className="p-6">Ce lieu n'existe pas encore en 3D. <Link to="/ville-3d" className="underline">Retour à la rue</Link></p>,
  errorComponent: () => <p role="alert" className="p-6">Le lieu n'a pas pu s'afficher. <Link to="/ville-3d" className="underline">Retour à la rue</Link></p>,
});

function Place() {
  const { id } = Route.useParams();
  const room = INTERIORS[id]!;
  const { data: character } = useSuspenseQuery(characterQuery);
  const appearance = normalizeAppearance((character?.appearance ?? {}) as never);
  const navigate = useNavigate();
  const input = useRef<StreetInput>({ x: 0, y: 0, yaw: 0 });
  const [spot, setSpot] = useState<Spot | null>(null);
  const spotRef = useRef<Spot | null>(null); spotRef.current = spot;
  const [quality, setQuality] = useState<StreetQuality>("auto");
  const [shown, setShown] = useState(false);
  useEffect(() => { const q = localStorage.getItem("civitas-street-quality"); if (q === "low" || q === "high") setQuality(q); const t = setTimeout(() => setShown(true), 30); return () => clearTimeout(t); }, []);
  const act = () => { const s = spotRef.current; if (s) navigate({ to: s.to as "/banque" }); };

  useEffect(() => {
    const keys = new Set<string>();
    const sync = () => {
      input.current.x = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("q") || keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      input.current.y = (keys.has("z") || keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (k === "e" || k === "enter") return act(); keys.add(k); sync(); };
    const up = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); sync(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 bg-background transition-opacity duration-500 ${shown ? "opacity-100" : "opacity-0"}`}>
      <ClientOnly fallback={<p className="p-6">Entrée dans le lieu…</p>}>
        <Suspense fallback={<div className="flex h-full items-center justify-center font-display text-lg">Entrée dans le lieu…</div>}>
          <Interior3D room={room} characterUrl={characterModel(appearance.hair, appearance.skin)} input={input} onSpot={setSpot} quality={quality} />
        </Suspense>
      </ClientOnly>

      <div className="pointer-events-none absolute inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] flex items-start justify-between gap-2">
        <Link to="/ville-3d" aria-label="Retour à la rue" className="glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="glass max-w-[70%] rounded-2xl px-4 py-2 text-right shadow-card">
          <p className="font-display text-base font-bold">{room.name}</p>
          <p className="text-xs text-muted-foreground">{room.intro}</p>
        </div>
      </div>

      {spot && (
        <button type="button" onClick={act} className="glass absolute left-1/2 top-1/3 flex min-h-14 -translate-x-1/2 items-center gap-2 rounded-2xl px-5 font-display text-base font-bold shadow-elegant animate-rise">
          <DoorOpen className="h-5 w-5 text-primary" /> {spot.verb} {spot.label}
        </button>
      )}

      <div className="absolute inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex items-end justify-between">
        <Joystick input={input} />
        <div className="flex gap-2">
          <button type="button" aria-label="Tourner la caméra à gauche" onClick={() => { input.current.yaw += Math.PI / 4; }} className="glass flex h-14 w-14 items-center justify-center rounded-full shadow-card"><RotateCcw className="h-5 w-5" /></button>
          <button type="button" aria-label="Tourner la caméra à droite" onClick={() => { input.current.yaw -= Math.PI / 4; }} className="glass flex h-14 w-14 items-center justify-center rounded-full shadow-card"><RotateCw className="h-5 w-5" /></button>
        </div>
      </div>
    </div>
  );
}
