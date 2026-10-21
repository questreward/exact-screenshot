// Présentation seulement : retrouve les villes d'un trajet pour l'afficher sur la carte.
import { CITY_CENTER, type LonLat } from "./real-places";

const NAMES: Record<string, string> = { paris: "paris", lyon: "lyon", marseille: "marseille", bordeaux: "bordeaux", lille: "lille" };

export function citiesInTitle(title: string): string[] {
  const t = title.toLowerCase();
  return Object.keys(NAMES).map((id) => ({ id, at: t.indexOf(NAMES[id]!) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at).map((x) => x.id);
}

export function tripEnds(from?: string | null, to?: string | null, title = ""): { from: LonLat; to: LonLat } | null {
  const ids = from && to ? [from.toLowerCase(), to.toLowerCase()] : citiesInTitle(title);
  const a = ids[0] ? CITY_CENTER[ids[0]] : undefined, b = ids[1] ? CITY_CENTER[ids[1]] : undefined;
  return a && b ? { from: a.at, to: b.at } : null;
}

export function midView(from: LonLat, to: LonLat): { at: LonLat; zoom: number } {
  const d = Math.max(Math.abs(from[0] - to[0]), Math.abs(from[1] - to[1]));
  return { at: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], zoom: d > 6 ? 4.8 : d > 3 ? 5.6 : d > 1 ? 6.6 : d > 0.05 ? 11 : 13.5 };
}
