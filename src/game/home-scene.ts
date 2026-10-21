// Présentation seulement : choix des décors de l'écran principal.
import type { DayPhase } from "./world";

export type CityKey = "paris" | "lyon" | "marseille" | "bordeaux" | "lille";

export function cityKey(name: string | null | undefined): CityKey {
  const n = (name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const keys: CityKey[] = ["paris", "lyon", "marseille", "bordeaux", "lille"];
  return keys.find((k) => n.includes(k)) ?? "paris";
}

/** Filtre appliqué à l'image de la ville selon le moment de la journée. */
export function phaseFilter(phase: DayPhase): string {
  switch (phase) {
    case "matin": return "brightness(1.02) saturate(1.05) hue-rotate(-6deg)";
    case "journee": return "none";
    case "soiree": return "brightness(0.8) saturate(1.25) sepia(0.25)";
    case "nuit": return "brightness(0.45) saturate(0.8) hue-rotate(200deg)";
  }
}

export type HomeTile = { id: string; label: string; to: string; image: string };
export const HOME_TILES: Omit<HomeTile, "image">[] = [
  { id: "travail", label: "Travail", to: "/carriere" },
  { id: "vie", label: "Ma vie", to: "/vie" },
  { id: "ville", label: "Ma ville", to: "/ma-ville" },
  { id: "carte", label: "Carte", to: "/carte" },
  { id: "telephone", label: "Téléphone", to: "/telephone" },
  { id: "services", label: "Services", to: "/civitas-services" },
];

export function gaugeTone(value: number): "low" | "mid" | "high" {
  return value < 25 ? "low" : value < 60 ? "mid" : "high";
}
