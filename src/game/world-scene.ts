import type { DayPhase } from "@/game/world";

export type SceneWeather = "clair" | "pluie" | "neige" | "nuageux";

/** Reads the recorded city weather label; unknown labels stay "clair" (no invented rain). */
export function sceneWeather(condition: string | null | undefined): SceneWeather {
  const c = (condition ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/pluie|pluv|averse|orage|bruine/.test(c)) return "pluie";
  if (/neige/.test(c)) return "neige";
  if (/nuage|couvert|gris|brume|brouillard/.test(c)) return "nuageux";
  return "clair";
}

/** Short arrival line, never a dashboard greeting. */
export function arrivalLine(phase: DayPhase): string {
  return {
    matin: "Une nouvelle journée commence.",
    journee: "La ville tourne à plein régime.",
    soiree: "La ville s'allume doucement.",
    nuit: "La ville s'endort.",
  }[phase];
}

/** Energy only appears in the HUD when it matters. */
export function showEnergy(energy: number): boolean {
  return energy < 30;
}

/** Number of moving passers-by and cars, calmer at night. */
export function streetLife(phase: DayPhase): { people: number; cars: number } {
  return { matin: { people: 5, cars: 3 }, journee: { people: 7, cars: 4 }, soiree: { people: 4, cars: 3 }, nuit: { people: 1, cars: 2 } }[phase];
}
