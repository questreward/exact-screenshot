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
