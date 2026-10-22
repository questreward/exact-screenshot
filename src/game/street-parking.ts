import { STREETS } from "./street3d";

export type OwnedStreetCar = { id: string; name: string; kind: string; acquired_at: string };
export type ParkedCar = { id: string; model: string; x: number; z: number; rotation: number };
const KIT = "/models/car-kit/";

/** Illustrative silhouettes, not exact makes or persisted parking positions. */
export function ownedCarModel(name: string): string {
  if (/suv|3008|2008|duster|qashqai|tucson|sportage|rav4/i.test(name)) return KIT + "suv.glb";
  if (/clio|208|sandero|yaris|golf|megane|mégane|citadine|compact/i.test(name)) return KIT + "hatchback-sports.glb";
  return KIT + "sedan.glb";
}

export function streetParking(street: number, assets: readonly OwnedStreetCar[], hasHome: boolean): ParkedCar[] {
  const buildings = STREETS[street]?.buildings ?? [];
  const parked: ParkedCar[] = [];
  const cars = assets.filter(a => a.kind === "vehicle").sort((a, b) => b.acquired_at.localeCompare(a.acquired_at) || a.id.localeCompare(b.id));
  for (const b of buildings) {
    const door = b.door;
    if (!door) continue;
    const car = cars[0];
    const model = door.id === "logement" && hasHome && car ? ownedCarModel(car.name)
      : door.id === "secours" ? KIT + "police.glb"
      : door.id === "caserne" ? KIT + "firetruck.glb" : null;
    if (model) parked.push({ id: door.id === "logement" && car ? car.id : door.id, model, x: door.x - 2.5, z: Math.sign(door.z) * 4.6, rotation: Math.PI / 2 });
  }
  return parked;
}