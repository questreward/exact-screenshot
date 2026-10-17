import { Building2, GraduationCap, Home, Landmark, TrainFront, Trees, Coffee, Store, Briefcase, MapPin } from "lucide-react";

export const LOCATION_TYPES: Record<string, { label: string; icon: typeof MapPin }> = {
  logement: { label: "Logement", icon: Home }, universite: { label: "Université", icon: GraduationCap },
  mairie: { label: "Mairie", icon: Landmark }, banque: { label: "Banque", icon: Landmark },
  place: { label: "Place publique", icon: MapPin }, administration: { label: "Administration", icon: Building2 },
  entreprise: { label: "Entreprise", icon: Briefcase }, commerce: { label: "Commerce", icon: Store },
  cafe: { label: "Café", icon: Coffee }, parc: { label: "Parc", icon: Trees },
  gare: { label: "Gare", icon: TrainFront }, station: { label: "Station", icon: TrainFront },
};
export const locationType = (kind: string) => LOCATION_TYPES[kind] ?? { label: kind, icon: MapPin };
export type DayPhase = "matin" | "journee" | "soiree" | "nuit";
export function dayPhase(hour: number): DayPhase {
  if (hour >= 6 && hour < 10) return "matin";
  if (hour >= 10 && hour < 18) return "journee";
  if (hour >= 18 && hour < 22) return "soiree";
  return "nuit";
}
export const PHASE_LABELS: Record<DayPhase, string> = { matin: "Matin", journee: "Journée", soiree: "Soirée", nuit: "Nuit" };
export function movementAllowed(currentCity: string, target: { city_id: string; accessible: boolean }, districtAvailable = true, cityAvailable = true) {
  return target.city_id === currentCity && target.accessible && districtAvailable && cityAvailable;
}
export function worldTime(anchor: string, elapsedMs: number, speed: number) {
  return new Date(new Date(anchor.replace(" ", "T") + (anchor.endsWith("Z") ? "" : "Z")).getTime() + Math.max(0, elapsedMs) * speed);
}