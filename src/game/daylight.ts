// Presentation only: lighting mood from the game clock hour.
export type Daylight = { key: "night" | "morning" | "day" | "sunset"; label: string; emoji: string; overlay: string };

export function daylight(hour: number): Daylight {
  if (hour >= 21 || hour < 6) return { key: "night", label: "Conduite de nuit", emoji: "🌙", overlay: "bg-foreground/45" };
  if (hour < 9) return { key: "morning", label: "Lumière du matin", emoji: "🌅", overlay: "bg-accent/25" };
  if (hour >= 18) return { key: "sunset", label: "Coucher de soleil", emoji: "🌇", overlay: "bg-primary/25" };
  return { key: "day", label: "En journée", emoji: "☀️", overlay: "bg-transparent" };
}
