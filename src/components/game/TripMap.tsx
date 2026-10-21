import { RealMapBox, useRealMapReady } from "./RealMapBox";
import { midView, tripEnds } from "@/game/trip-map";

const ICON: Record<string, string> = { voiture: "🚗", train: "🚆", car: "🚌", bus: "🚌" };

// Trajet affiché sur la vraie carte ; l'avancement vient de l'heure du jeu (aucune décision ici).
export function TripMap({ kind, pct, from, to, title }: { kind: string; pct: number; from?: string | null; to?: string | null; title: string }) {
  const ready = useRealMapReady();
  const ends = tripEnds(from, to, title);
  if (!ready || !ends) return null;
  const v = midView(ends.from, ends.to);
  return <RealMapBox viewKey={`${ends.from}-${ends.to}`} center={v.at} zoom={v.zoom} markers={[]} height="h-56 w-full sm:h-72"
    route={{ from: ends.from, to: ends.to, pct: pct / 100, icon: ICON[kind] ?? "●" }} />;
}
