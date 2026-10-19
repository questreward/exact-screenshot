// Chargé uniquement dans le navigateur (import dynamique depuis la page France).
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
type GeoJSONSource = maplibregl.GeoJSONSource; type MLMap = maplibregl.Map;
import "maplibre-gl/dist/maplibre-gl.css";
import { PLAYABLE_INSEE, type CommuneRow } from "@/game/france";

export type MapSelection =
  | { kind: "commune"; row: CommuneRow; dep: string }
  | { kind: "circo"; code: string; dep: string; depName: string }
  | { kind: "departement"; code: string; name: string };

type Props = { onSelect: (s: MapSelection) => void; focus: { lon: number; lat: number; zoom: number; key: number } | null; showCircos: boolean };

function cssColor(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const ctx = c.getContext("2d")!; ctx.fillStyle = v || "#888"; ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r},${g},${b})`;
}

export default function FranceMap({ onSelect, focus, showCircos }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const loaded = useRef(new Set<string>());
  const rows = useRef<Record<string, CommuneRow[]>>({});
  const selectRef = useRef(onSelect); selectRef.current = onSelect;

  useEffect(() => {
    if (!box.current) return;
    const bg = cssColor("--background"), card = cssColor("--card"), fg = cssColor("--foreground"), primary = cssColor("--primary"), muted = cssColor("--muted-foreground"), sec = cssColor("--accent");
    const m = new maplibregl.Map({
      container: box.current,
      style: { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": bg } }]},
      center: [2.4, 46.6], zoom: 4.6, minZoom: 4, maxZoom: 13, attributionControl: false, dragRotate: false, pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = m;

    const loadDep = async (dep: string) => {
      if (loaded.current.has(dep)) return; loaded.current.add(dep);
      const res = await fetch(`/geo/communes/${dep}.json`); if (!res.ok) return;
      rows.current[dep] = await res.json();
      const all = Object.entries(rows.current).flatMap(([d, list]) => list.map(r => ({
        type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [r[4], r[5]] },
        properties: { code: r[0], dep: d, pop: r[3], playable: r[0] in PLAYABLE_INSEE ? 1 : 0 },
      })));
      (m.getSource("communes") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: all });
    };
    const loadVisible = () => {
      if (m.getZoom() < 7) return;
      
      const deps = m.queryRenderedFeatures(undefined, { layers: ["dep-fill"] }).map(f => String(f.properties?.["code"]));
      for (const d of new Set(deps)) void loadDep(d);
    };

    m.on("load", () => {
      m.addSource("regions", { type: "geojson", data: "/geo/regions.json" });
      m.addSource("deps", { type: "geojson", data: "/geo/departements.json", promoteId: "code" });
      m.addSource("circos", { type: "geojson", data: "/geo/circonscriptions.json" });
      m.addSource("communes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource("playable", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "dep-fill", type: "fill", source: "deps", paint: { "fill-color": card, "fill-opacity": 1 } });
      m.addLayer({ id: "circo-line", type: "line", source: "circos", minzoom: 6, layout: { visibility: showCircos ? "visible" : "none" }, paint: { "line-color": primary, "line-opacity": 0.45, "line-width": 0.8 } });
      m.addLayer({ id: "circo-fill", type: "fill", source: "circos", layout: { visibility: showCircos ? "visible" : "none" }, paint: { "fill-color": primary, "fill-opacity": 0.02 } });
      // Couleur du parti du député (base : législatives 2024)
      void fetch("/geo/legislatives-2024.json").then(r => r.json()).then((leg: { parties: Record<string, { color: string }>; seats: Record<string, { n: string }> }) => {
        const pairs = Object.entries(leg.seats).flatMap(([code, s]) => [code, leg.parties[s.n]?.color ?? primary]);
        if (!m.getLayer("circo-fill") || !pairs.length) return;
        m.setPaintProperty("circo-fill", "fill-color", ["match", ["get", "codeCirconscription"], ...pairs, primary] as never);
        m.setPaintProperty("circo-fill", "fill-opacity", ["interpolate", ["linear"], ["zoom"], 4, 0.7, 8, 0.4, 11, 0.15] as never);
      }).catch(() => undefined);
      m.addLayer({ id: "dep-line", type: "line", source: "deps", paint: { "line-color": muted, "line-opacity": 0.5, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 9, 1.4] } });
      m.addLayer({ id: "reg-line", type: "line", source: "regions", paint: { "line-color": fg, "line-opacity": 0.7, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 9, 2.5] } });
      m.addLayer({ id: "communes", type: "circle", source: "communes", minzoom: 7, paint: {
        "circle-color": ["case", ["==", ["get", "playable"], 1], primary, sec],
        "circle-stroke-color": fg, "circle-stroke-width": ["case", ["==", ["get", "playable"], 1], 1.5, 0.3],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, ["case", [">", ["get", "pop"], 20000], 3, 1.5], 12, ["case", [">", ["get", "pop"], 20000], 9, 5]],
      } });
      const playable = Object.entries(PLAYABLE_INSEE).map(([code]) => code);
      void Promise.all(["75", "69", "13", "59", "33"].map(loadDep)).then(() => {
        const feats = Object.entries(rows.current).flatMap(([d, list]) => list.filter(r => playable.includes(r[0])).map(r => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [r[4], r[5]] }, properties: { code: r[0], dep: d } })));
        (m.getSource("playable") as GeoJSONSource).setData({ type: "FeatureCollection", features: feats });
      });
      m.addLayer({ id: "playable", type: "circle", source: "playable", maxzoom: 7, paint: { "circle-color": primary, "circle-radius": 7, "circle-stroke-color": fg, "circle-stroke-width": 2 } });

      m.on("moveend", loadVisible);
      m.on("click", e => {
        const pad = 8;
        const hit = m.queryRenderedFeatures([[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]], { layers: ["communes", "playable"] });
        const p = hit[0]?.properties;
        if (p) { const r = rows.current[p["dep"]]?.find(x => x[0] === p["code"]); if (r) { selectRef.current({ kind: "commune", row: r, dep: p["dep"] }); return; } }
        const c = m.getLayoutProperty("circo-fill", "visibility") === "visible" ? m.queryRenderedFeatures(e.point, { layers: ["circo-fill"] })[0]?.properties : null;
        if (c) { selectRef.current({ kind: "circo", code: c["codeCirconscription"], dep: c["codeDepartement"], depName: c["nomDepartement"] }); return; }
        const d = m.queryRenderedFeatures(e.point, { layers: ["dep-fill"] })[0]?.properties;
        if (d) selectRef.current({ kind: "departement", code: d["code"], name: d["nom"] });
      });
    });
    return () => { m.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current; if (!m || !m.isStyleLoaded()) return;
    for (const id of ["circo-line", "circo-fill"]) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", showCircos ? "visible" : "none");
  }, [showCircos]);

  useEffect(() => { if (focus && map.current) map.current.flyTo({ center: [focus.lon, focus.lat], zoom: focus.zoom, speed: 1.6 }); }, [focus]);

  return <div ref={box} className="h-[65vh] min-h-[420px] w-full overflow-hidden rounded-xl border border-border touch-none" aria-label="Carte de France" />;
}
