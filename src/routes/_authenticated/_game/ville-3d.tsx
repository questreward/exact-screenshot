import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, DoorOpen, Volume2, VolumeX, RotateCcw, RotateCw, Smartphone, CreditCard } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { bankQuery, characterQuery, clockQuery, formatMoney, weatherQuery, shopQuery, housingQuery } from "@/services/game";
import { streetParking } from "@/game/street-parking";
import { useWorldClock } from "@/components/game/WorldClock";
import { normalizeAppearance } from "@/game/appearance";
import { STREETS, arrivalPoint, characterModel, type Door } from "@/game/street3d";
import { startAmbience, type Ambience } from "@/game/street-ambience";
import { INTERIORS } from "@/game/interior3d";
import { sceneWeather, streetLife } from "@/game/world-scene";
import { Joystick } from "@/components/game/street3d/Joystick";
import type { StreetInput, StreetQuality } from "@/components/game/street3d/Street3D";

const Street3D = lazy(() => import("@/components/game/street3d/Street3D").then((m) => ({ default: m.Street3D })));

export const Route = createFileRoute("/_authenticated/_game/ville-3d")({
  head: () => ({ meta: [{ title: "La rue en 3D — CIVITAS" }, { name: "description", content: "Promenez votre personnage dans la rue de CIVITAS et entrez dans les bâtiments." }, { property: "og:title", content: "La rue en 3D — CIVITAS" }, { property: "og:description", content: "Marchez, croisez les habitants et entrez dans la banque, la mairie ou votre logement." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>): { rue?: number; depuis?: "est" | "ouest" } => {
    const rue = Number(s["rue"]);
    return { ...(Number.isInteger(rue) && rue > 0 && rue < STREETS.length ? { rue } : {}), ...(s["depuis"] === "est" || s["depuis"] === "ouest" ? { depuis: s["depuis"] } : {}) };
  },
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(characterQuery), q.ensureQueryData(bankQuery), q.ensureQueryData(clockQuery), q.ensureQueryData(shopQuery), q.ensureQueryData(housingQuery)]),
  component: Street,
  errorComponent: () => <p role="alert" className="p-6">La rue n'a pas pu s'afficher. Revenez à l'accueil puis réessayez.</p>,
});

function Street() {
  const { data: character } = useSuspenseQuery(characterQuery);
  const { data: bank } = useSuspenseQuery(bankQuery);
  const { data: shop } = useSuspenseQuery(shopQuery);
  const { data: housing } = useSuspenseQuery(housingQuery);
  const { time, phase } = useWorldClock();
  const { rue = 0, depuis } = Route.useSearch();
  // Recorded city weather, re-read regularly so the street follows its changes.
  const { data: weatherRow } = useQuery({ ...weatherQuery(character?.city_id ?? ""), enabled: !!character?.city_id, refetchInterval: 120_000 });
  const weather = sceneWeather(weatherRow?.condition);
  const sound = useRef<Ambience | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const toggleSound = () => { if (sound.current) { sound.current.stop(); sound.current = null; setSoundOn(false); } else { sound.current = startAmbience(weather, phase); setSoundOn(!!sound.current); } };
  useEffect(() => { sound.current?.update(weather, phase); }, [weather, phase]);
  useEffect(() => () => sound.current?.stop(), []);
  const navigate = useNavigate();
  const input = useRef<StreetInput>({ x: 0, y: 0, yaw: Math.PI / 2 });
  const [door, setDoor] = useState<Door | null>(null);
  const doorRef = useRef<Door | null>(null);
  const [quality, setQuality] = useState<StreetQuality>("auto");
  useEffect(() => { const q = localStorage.getItem("civitas-street-quality"); if (q === "low" || q === "high") setQuality(q); }, []);
  const cycleQuality = () => setQuality((q) => { const n: StreetQuality = q === "auto" ? "low" : q === "low" ? "high" : "auto"; localStorage.setItem("civitas-street-quality", n); return n; });
  doorRef.current = door;
  const appearance = normalizeAppearance((character?.appearance ?? {}) as never);
  const enter = () => {
    const d = doorRef.current; if (!d) return;
    if (d.id.startsWith("rue-")) { const n = Number(d.id.slice(4)); navigate({ to: "/ville-3d", search: { ...(n ? { rue: n } : {}), depuis: d.x > 0 ? "ouest" : "est" }, replace: true }); return; }
    if (INTERIORS[d.id] || d.id === "logement") navigate({ to: "/lieu-3d/$id", params: { id: d.id } });
    else navigate({ to: d.to as "/banque" });
  };

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
          <Street3D phase={phase} characterUrl={characterModel(appearance.hair, appearance.skin)} input={input} onDoor={setDoor} crowd={streetLife(phase)} quality={quality} street={rue} weather={weather} parked={streetParking(rue, shop.assets, housing.current !== null)} key={`${rue}-${depuis ?? ""}`} {...(depuis ? { start: arrivalPoint(depuis === "est") } : {})} />
        </Suspense>
      </ClientOnly>

      <div className="pointer-events-none absolute inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between gap-2">
        <Link to="/tableau-de-bord" aria-label="Quitter la rue" className="glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex items-center gap-2">
          <span className="glass flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold shadow-card"><CreditCard className="h-4 w-4 text-primary" />{formatMoney(bank?.balance ?? 0)}</span>
          <span className="glass flex min-h-11 items-center rounded-full px-3 font-display text-sm font-bold shadow-card">{hour}</span>
          <button type="button" onClick={toggleSound} aria-label={soundOn ? "Couper les sons de la ville" : "Écouter les sons de la ville"} className="glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-card">{soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>
          <button type="button" onClick={cycleQuality} aria-label="Changer la qualité graphique" className="glass pointer-events-auto flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-bold shadow-card">⚙️ {quality === "auto" ? "Auto" : quality === "low" ? "Légère" : "Belle"}</button>
          <Link to="/telephone" aria-label="Ouvrir le téléphone" className="glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-card"><Smartphone className="h-5 w-5" /></Link>
        </div>
      </div>

      <p className="glass pointer-events-none absolute left-1/2 top-[calc(4.5rem+env(safe-area-inset-top))] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold shadow-card">
        {STREETS[rue]?.name} · {weather === "pluie" ? "🌧️ Pluie" : weather === "neige" ? "❄️ Neige" : weather === "nuageux" ? "☁️ Nuageux" : "☀️ Dégagé"}
      </p>
      {door && (
        <button type="button" onClick={enter} className="glass absolute left-1/2 top-1/3 flex min-h-14 -translate-x-1/2 items-center gap-2 rounded-2xl px-5 font-display text-base font-bold shadow-elegant animate-rise">
          <DoorOpen className="h-5 w-5 text-primary" /> {door.id.startsWith("rue-") ? "Aller vers" : "Entrer :"} {door.label}
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
