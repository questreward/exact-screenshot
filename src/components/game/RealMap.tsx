// Chargé uniquement dans le navigateur (import dynamique). Vraie carte de France servie par le VPS.
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LonLat } from "@/game/real-places";

export type RealMarker = { id: string; at: LonLat; label: string; sub?: string | undefined; active?: boolean; selected?: boolean; onClick: () => void };

let protocolReady = false;

export type RealRoute = { from: LonLat; to: LonLat; pct: number; icon?: string };

export default function RealMap({ center, zoom, markers, viewKey, route, height }: { center: LonLat; zoom: number; markers: RealMarker[]; viewKey: string; route?: RealRoute | undefined; height?: string }) {
  const mover = useRef<maplibregl.Marker | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const pins = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!box.current) return;
    if (!protocolReady) { maplibregl.addProtocol("pmtiles", new Protocol().tile); protocolReady = true; }
    const origin = window.location.origin;
    const m = new maplibregl.Map({
      container: box.current,
      style: {
        version: 8,
        glyphs: `${origin}/tiles/fonts/{fontstack}/{range}.pbf`,
        sprite: `${origin}/tiles/sprites/v4/dark`,
        sources: { protomaps: { type: "vector", url: `pmtiles://${origin}/tiles/france.pmtiles`, attribution: "© OpenStreetMap" } },
        layers: layers("protomaps", namedFlavor("dark"), { lang: "fr" }),
      },
      center, zoom, minZoom: 4, maxZoom: 17, dragRotate: false, pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = m;
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { map.current?.flyTo({ center, zoom, duration: 900 }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    pins.current.forEach((p) => p.remove());
    pins.current = markers.map((mk) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", mk.label);
      el.className = `real-pin${mk.active ? " is-player" : ""}${mk.selected ? " is-selected" : ""}`;
      const dot = document.createElement("span"); dot.className = "real-pin-dot";
      const label = document.createElement("span"); label.className = "real-pin-label"; label.textContent = mk.label;
      el.append(dot, label);
      if (mk.sub) { el.title = mk.sub; }
      el.addEventListener("click", (e) => { e.stopPropagation(); mk.onClick(); });
      return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(mk.at).addTo(m);
    });
  }, [markers]);

  // Trajet animé : ligne départ → arrivée et véhicule placé selon l'avancement (heure du jeu).
  useEffect(() => {
    const m = map.current; if (!m || !route) return;
    const draw = () => {
      const line = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [route.from, route.to] } };
      const src = m.getSource("trip") as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(line);
      else {
        m.addSource("trip", { type: "geojson", data: line });
        m.addLayer({ id: "trip-line", type: "line", source: "trip", paint: { "line-color": getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#f06a4e", "line-width": 5, "line-dasharray": [2, 1.5] } });
      }
      const p = Math.max(0, Math.min(1, route.pct));
      const at: LonLat = [route.from[0] + (route.to[0] - route.from[0]) * p, route.from[1] + (route.to[1] - route.from[1]) * p];
      if (!mover.current) {
        const el = document.createElement("div"); el.className = "trip-mover"; el.textContent = route.icon ?? "●";
        mover.current = new maplibregl.Marker({ element: el }).setLngLat(at).addTo(m);
      } else mover.current.setLngLat(at);
    };
    if (m.isStyleLoaded()) draw(); else m.once("load", draw);
  }, [route?.from[0], route?.from[1], route?.to[0], route?.to[1], route?.pct]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className={height ?? "h-[26rem] w-full sm:h-[32rem]"} />;
}
