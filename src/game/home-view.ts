// Presentation only: how "Chez moi" reads at a glance, from actual placements.
import type { FurnishingHome, Furniture } from "./home-furnishing";

export type HomeGlance = { placed: number; stored: number; emptyRooms: number; status: string; emoji: string };

export function homeGlance(home: FurnishingHome, furniture: Furniture[]): HomeGlance {
  const placed = home.placements.length;
  const stored = furniture.filter(f => !f.placed_home).length;
  const used = new Set(home.placements.map(p => p.room));
  const emptyRooms = Math.max(0, home.rooms - used.size);
  const perRoom = home.rooms ? placed / home.rooms : 0;
  const [status, emoji] = placed === 0 ? ["Logement vide : tout reste à installer", "📦"]
    : emptyRooms > 0 ? ["Installation en cours", "🛠️"]
    : perRoom >= 3 ? ["Logement bien aménagé", "✨"] : ["Logement habité", "🏠"];
  return { placed, stored, emptyRooms, status, emoji };
}

export function welcomeLine(hour: number): string {
  if (hour >= 21 || hour < 6) return "Bonne nuit, la ville s'est calmée.";
  if (hour < 10) return "Bonjour ! Le café t'attend.";
  if (hour >= 18) return "Bonsoir, bienvenue chez toi.";
  return "Bienvenue chez toi.";
}

import { canPlace, type Placement } from "./home-furnishing";
/** First free spot in a room (row by row), trying both orientations. Null when the room is full. */
export function firstFreeSpot(assetId: string, room: number, placements: Placement[], furniture: Furniture[], rooms: number, grid: number): Placement | null {
  for (const rotation of [0, 90]) for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
    const c = { asset_id: assetId, room, x, y, rotation };
    if (canPlace(c, placements, furniture, rooms, grid)) return c;
  }
  return null;
}
