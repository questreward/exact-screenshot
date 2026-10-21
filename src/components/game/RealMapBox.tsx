import { Suspense, lazy, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
const RealMap = lazy(() => import("./RealMap"));

// La vraie carte s'affiche seulement si le serveur de carte est installé ; sinon l'ancienne carte dessinée.
export function useRealMapReady() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useQuery({ queryKey: ["real-map-ready"], enabled: mounted, staleTime: Infinity, retry: false,
    queryFn: async () => { const r = await fetch("/tiles/france.pmtiles", { headers: { range: "bytes=0-15" } }).catch(() => null); return !!r && (r.status === 206 || r.status === 200); } });
  return mounted && data === true;
}

export function RealMapBox(props: React.ComponentProps<typeof RealMap>) {
  return <div className="relative min-w-0 overflow-hidden rounded-lg border border-border"><Suspense fallback={<div className="flex min-h-72 items-center justify-center gap-3 bg-surface"><LoaderCircle className="animate-spin" /> Chargement de la carte…</div>}><RealMap {...props} /></Suspense></div>;
}
