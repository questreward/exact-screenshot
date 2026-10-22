// Layout of the explorable 3D street. Doors only open existing game pages: the
// 3D street is presentation; every action still happens on the secured page.
export type Door = { id: string; label: string; to: string; x: number; z: number };
export type Building = { model: string; x: number; z: number; rot: number; scale: number; door?: Door };

const ROAD = 4;      // half width of each road
export const WALK = 7; // half width of road + sidewalk band
export const LIMIT = 29;

/** The walkable area is the cross formed by the two streets and their sidewalks. */
export function walkable(x: number, z: number): boolean {
  return (Math.abs(z) <= WALK && Math.abs(x) <= LIMIT) || (Math.abs(x) <= WALK && Math.abs(z) <= LIMIT);
}

/** Moves toward the target but slides along walls instead of stopping dead. */
export function slide(x: number, z: number, nx: number, nz: number): [number, number] {
  if (walkable(nx, nz)) return [nx, nz];
  if (walkable(nx, z)) return [nx, z];
  if (walkable(x, nz)) return [x, nz];
  return [x, z];
}

const C = "/models/city-kit-commercial/";
const S = "/models/city-kit-suburban/";
const door = (id: string, label: string, to: string, x: number, side: 1 | -1): Door => ({ id, label, to, x, z: side * (WALK - 0.8) });

// North side (z < 0) faces +z, south side faces -z.
const MAIN: Building[] = [
  { model: S + "building-type-a.glb", x: -24, z: -10, rot: 0, scale: 4, door: door("logement", "Mon logement", "/chez-moi", -24, -1) },
  { model: C + "building-b.glb", x: -16.5, z: -9.8, rot: 0, scale: 4.5, door: door("banque", "Banque", "/banque", -16.5, -1) },
  { model: C + "building-c.glb", x: -10, z: -9.8, rot: 0, scale: 4.5, door: door("superette", "Supérette", "/marche", -10, -1) },
  { model: C + "building-d.glb", x: 10, z: -9.8, rot: 0, scale: 4.5, door: door("mairie", "Mairie", "/ma-ville", 10, -1) },
  { model: C + "building-skyscraper-a.glb", x: 17, z: -10, rot: 0, scale: 4.5, door: door("meubles", "Magasin de meubles", "/marche", 17, -1) },
  { model: C + "building-e.glb", x: 24, z: -9.8, rot: 0, scale: 4.5, door: door("poste", "La Poste", "/la-poste", 24, -1) },
  { model: C + "building-f.glb", x: -24, z: 9.8, rot: Math.PI, scale: 4.5, door: door("sante", "Centre de santé", "/espace-sante", -24, 1) },
  { model: C + "building-g.glb", x: -16.5, z: 9.8, rot: Math.PI, scale: 4.5, door: door("vetements", "Boutique de vêtements", "/style", -16.5, 1) },
  { model: C + "building-h.glb", x: -10, z: 9.8, rot: Math.PI, scale: 4.5, door: door("emploi", "Espace Emploi", "/espace-emploi", -10, 1) },
  { model: C + "building-a.glb", x: 10, z: 9.8, rot: Math.PI, scale: 4.5, door: door("secours", "Commissariat", "/secours", 10, 1) },
  { model: S + "building-type-c.glb", x: 17, z: 10, rot: Math.PI, scale: 5, door: door("concession", "Concessionnaire", "/concession", 17, 1) },
  { model: C + "building-b.glb", x: 24, z: 9.8, rot: Math.PI, scale: 4.5, door: door("travail", "Mon travail", "/carriere", 24, 1) },
];

// Second street: shops. Third street: homes around a small park.
const AVENUE: Building[] = [
  { model: C + "building-e.glb", x: -24, z: -9.8, rot: 0, scale: 4.5, door: door("agence", "Agence immobilière", "/agence", -24, -1) },
  { model: C + "building-c.glb", x: -16.5, z: -9.8, rot: 0, scale: 4.5, door: door("vetements", "Boutique de vêtements", "/style", -16.5, -1) },
  { model: C + "building-h.glb", x: -10, z: -9.8, rot: 0, scale: 4.5, door: door("caserne", "Caserne", "/secours", -10, -1) },
  { model: C + "building-a.glb", x: 10, z: -9.8, rot: 0, scale: 4.5, door: door("superette", "Supérette", "/marche", 10, -1) },
  { model: C + "building-g.glb", x: 17, z: -9.8, rot: 0, scale: 4.5 },
  { model: C + "building-skyscraper-a.glb", x: 24, z: -10, rot: 0, scale: 4.5, door: door("meubles", "Magasin de meubles", "/marche", 24, -1) },
  { model: C + "building-d.glb", x: -24, z: 9.8, rot: Math.PI, scale: 4.5 },
  { model: S + "building-type-c.glb", x: -16.5, z: 10, rot: Math.PI, scale: 5, door: door("concession", "Concessionnaire", "/concession", -16.5, 1) },
  { model: C + "building-f.glb", x: -10, z: 9.8, rot: Math.PI, scale: 4.5 },
  { model: C + "building-b.glb", x: 10, z: 9.8, rot: Math.PI, scale: 4.5, door: door("banque", "Banque", "/banque", 10, 1) },
  { model: C + "building-e.glb", x: 17, z: 9.8, rot: Math.PI, scale: 4.5 },
  { model: C + "building-c.glb", x: 24, z: 9.8, rot: Math.PI, scale: 4.5, door: door("emploi", "Espace Emploi", "/espace-emploi", 24, 1) },
];
const HOMES: Building[] = [
  ...[-24, -16.5, -10, 10, 17, 24].map((x, i) => ({ model: S + (i % 2 ? "building-type-c.glb" : "building-type-a.glb"), x, z: -10, rot: 0, scale: i % 2 ? 5 : 4, ...(x === -16.5 ? { door: door("logement", "Mon logement", "/chez-moi", x, -1) } : {}) })),
  ...[-24, -16.5, -10].map((x, i) => ({ model: S + (i % 2 ? "building-type-a.glb" : "building-type-c.glb"), x, z: 10, rot: Math.PI, scale: i % 2 ? 4 : 5 })),
  ...[10, 14, 18, 22, 26].map((x, i) => ({ model: S + (i % 2 ? "tree-small.glb" : "tree-large.glb"), x, z: 10 + (i % 2) * 1.5, rot: 0, scale: 4 })),
];

export type Street = { name: string; buildings: Building[]; park?: boolean };
export const STREETS: Street[] = [
  { name: "Rue centrale", buildings: MAIN },
  { name: "Avenue des commerces", buildings: AVENUE },
  { name: "Quartier résidentiel", buildings: HOMES, park: true },
];
export const BUILDINGS = MAIN;

/** Road ends lead to the neighbouring streets (west = previous, east = next). */
export function connectors(street: number): Door[] {
  const n = STREETS.length, prev = (street + n - 1) % n, next = (street + 1) % n;
  return [
    { id: `rue-${prev}`, label: STREETS[prev]!.name, to: "/ville-3d", x: -(LIMIT - 1.5), z: 0 },
    { id: `rue-${next}`, label: STREETS[next]!.name, to: "/ville-3d", x: LIMIT - 1.5, z: 0 },
  ];
}
export const doorsOf = (street: number): Door[] => [...(STREETS[street] ?? STREETS[0]!).buildings.flatMap((b) => (b.door ? [b.door] : [])), ...connectors(street)];
export const DOORS: Door[] = STREETS.flatMap((st) => st.buildings.flatMap((b) => (b.door ? [b.door] : [])));
/** Where the player appears when arriving from another street. */
export function arrivalPoint(fromEast: boolean): [number, number, number] { return [fromEast ? LIMIT - 4 : -(LIMIT - 4), 0, 2]; }

/** Closest door within reach, or null. */
export function nearestDoor(x: number, z: number, reach = 2.6, street = 0): Door | null {
  let best: Door | null = null;
  let dist = reach;
  for (const d of doorsOf(street)) {
    const dd = Math.hypot(d.x - x, d.z - z);
    if (dd < dist) { dist = dd; best = d; }
  }
  return best;
}

export const ROAD_HALF = ROAD;

/** Character model from the saved appearance (long hair → second set); purely visual. */
export function characterModel(hair: string | undefined, skin: string | undefined): string {
  const letters = ["a", "b", "c", "d"];
  const idx = Math.max(0, ["s1", "s2", "s3", "s4", "s5"].indexOf(skin ?? "s1")) % 4;
  return `/models/characters/character-${hair === "long" ? "female" : "male"}-${letters[idx]}.glb`;
}
