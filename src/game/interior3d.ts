// Explorable 3D interiors. Pure data: each place is a rectangular room with
// fixtures and interaction points. An interaction only opens an existing
// secured page — the 3D never buys, sells or records anything itself.
import type { Door } from "@/game/street3d";

export type FixtureKind = "item" | "wall" | "shelf" | "counter" | "rack" | "table" | "sofa" | "bed" | "plant" | "desk" | "car" | "clerk" | "shopper";
export type Fixture = { kind: FixtureKind; x: number; z: number; rot?: number; w?: number; d?: number; h?: number; color?: string; model?: string; label?: string; visual?: string };
export type Spot = Door & { verb: string; section?: string };
export type Interior = {
  id: string; name: string; intro: string;
  w: number; d: number; // half sizes
  floor: string; wall: string; accent: string;
  fixtures: Fixture[]; spots: Spot[]; exitX?: number;
};

const spot = (id: string, verb: string, label: string, to: string, x: number, z: number, section?: string): Spot => (section ? { id, verb, label, to, x, z, section } : { id, verb, label, to, x, z });
const P = "/models/characters/";
const CAR = "/models/car-kit/";

export const INTERIORS: Record<string, Interior> = {
  superette: {
    id: "superette", name: "Supérette", intro: "Parcourez les rayons, puis passez en caisse.",
    w: 9, d: 7, floor: "#d9d3c4", wall: "#f1ece0", accent: "#e8664a",
    fixtures: [
      ...[-5, -1.5, 2].map((x) => ({ kind: "shelf" as const, x, z: -1, rot: Math.PI / 2, w: 6 })),
      { kind: "counter", x: 6, z: 4, w: 2.5, color: "#3c4654" },
      { kind: "clerk", x: 6, z: 5.2, rot: Math.PI, model: P + "character-female-c.glb" },
      { kind: "shopper", x: -3.2, z: 2, rot: 0.6, model: P + "character-male-d.glb" },
      { kind: "plant", x: -8, z: 6 },
    ],
    spots: [
      spot("rayon-loisirs", "Voir", "le rayon Loisirs", "/boutique", -3.2, -1, "loisirs"),
      spot("rayon-maison", "Voir", "le rayon Électroménager", "/boutique", 0.3, -1, "electromenager"),
      spot("rayon-tech", "Voir", "le rayon Technologie", "/boutique", 3.8, -1, "tech"),
      spot("caisse", "Payer", "mon panier à la caisse", "/boutique", 6, 2.7),
    ],
  },
  vetements: {
    id: "vetements", name: "Boutique de vêtements", intro: "Regardez les portants et essayez une tenue.",
    w: 8, d: 6, floor: "#c9b9a6", wall: "#f5efe8", accent: "#2f6f73",
    fixtures: [
      ...[-5, -1.5, 2].map((x, i) => ({ kind: "rack" as const, x, z: -2, w: 2.6, color: ["#c75b4a", "#3d6fa8", "#e0b84a"][i] ?? "#c75b4a" })),
      { kind: "counter", x: 5.5, z: 3.5, w: 2, color: "#2b2f36" },
      { kind: "clerk", x: 5.5, z: 4.6, rot: Math.PI, model: P + "character-male-b.glb" },
      { kind: "plant", x: -7, z: 5 },
    ],
    spots: [
      spot("portants", "Voir", "les vêtements", "/boutique", -1.5, -0.4, "mode"),
      spot("caisse", "Payer", "mon panier à la caisse", "/boutique", 5.5, 2.3),
    ],
  },
  meubles: {
    id: "meubles", name: "Magasin de meubles", intro: "Un salon et une chambre exposés : imaginez-les chez vous.",
    w: 10, d: 7, floor: "#b89a76", wall: "#efe9df", accent: "#5c7a4c",
    fixtures: [
      { kind: "sofa", x: -5, z: -3.5, color: "#5c7a4c" }, { kind: "table", x: -5, z: -1 },
      { kind: "bed", x: 4, z: -3.5, color: "#d8cfc0" }, { kind: "desk", x: 0, z: -4.5 },
      { kind: "counter", x: 7, z: 4, w: 2.2, color: "#3c4654" },
      { kind: "clerk", x: 7, z: 5.2, rot: Math.PI, model: P + "character-female-a.glb" },
      { kind: "plant", x: -9, z: 6 },
    ],
    spots: [
      spot("salon", "Voir", "les meubles", "/boutique", -5, 0.6, "maison"),
      spot("chambre", "Voir", "la literie et la déco", "/boutique", 4, -1.4, "maison"),
      spot("caisse", "Payer", "mon panier à la caisse", "/boutique", 7, 2.7),
    ],
  },
  concession: {
    id: "concession", name: "Concessionnaire", intro: "Faites le tour des véhicules exposés.",
    w: 12, d: 8, floor: "#e4e6ea", wall: "#f7f8fa", accent: "#d64c3c",
    fixtures: [
      { kind: "car", x: -7, z: -3, rot: 0.6, model: CAR + "sedan.glb" },
      { kind: "car", x: 0, z: -3.5, rot: 0, model: CAR + "suv.glb" },
      { kind: "car", x: 7, z: -3, rot: -0.6, model: CAR + "hatchback-sports.glb" },
      { kind: "desk", x: 8, z: 5 },
      { kind: "clerk", x: 8, z: 6.2, rot: Math.PI, model: P + "character-male-a.glb" },
    ],
    spots: [
      spot("voiture-1", "Regarder", "la berline", "/concession", -7, 0),
      spot("voiture-2", "Regarder", "le SUV", "/concession", 0, -0.3),
      spot("voiture-3", "Regarder", "la sportive", "/concession", 7, 0),
      spot("bureau", "Parler", "au vendeur", "/concession", 8, 3.5),
    ],
  },
};

/** Public counters: a hall with one desk that opens the existing page. */
function hall(id: string, name: string, intro: string, to: string, accent: string, verb = "Aller", label = "au guichet"): Interior {
  return {
    id, name, intro, w: 8, d: 6, floor: "#cfd3d8", wall: "#f2f3f5", accent,
    fixtures: [
      { kind: "counter", x: 0, z: -3.2, w: 5, color: "#3c4654" },
      { kind: "clerk", x: -1.2, z: -4.3, rot: 0, model: P + "character-female-d.glb" },
      { kind: "clerk", x: 1.4, z: -4.3, rot: 0, model: P + "character-male-c.glb" },
      { kind: "shopper", x: -5, z: 2, rot: 2.4, model: P + "character-female-b.glb" },
      { kind: "plant", x: -7, z: -5 }, { kind: "plant", x: 7, z: -5 },
    ],
    spots: [spot("guichet", verb, label, to, 0, -1.8)],
  };
}
Object.assign(INTERIORS, {
  banque: hall("banque", "Banque", "Un conseiller vous attend au guichet.", "/banque", "#1f5c8a", "Parler", "au conseiller"),
  mairie: hall("mairie", "Mairie", "Accueil des citoyens et vie de la ville.", "/ma-ville", "#2c4a7a"),
  poste: hall("poste", "La Poste", "Courriers, colis et lettres recommandées.", "/la-poste", "#e0b030"),
  sante: hall("sante", "Centre de santé", "Accueil et prise de rendez-vous.", "/espace-sante", "#3a9a7a"),
  emploi: hall("emploi", "Espace Emploi", "Offres et accompagnement.", "/espace-emploi", "#4a6fb0"),
  secours: hall("secours", "Commissariat et secours", "Accueil du public.", "/secours", "#2b3a55"),
  travail: hall("travail", "Mon travail", "Votre lieu de travail.", "/carriere", "#6a5a8a", "Commencer", "ma journée"),
  agence: hall("agence", "Agence immobilière", "Annonces et visites de logements.", "/agence", "#8a5a3a", "Voir", "les annonces"),
});

export function exitSpot(r: Interior): Spot { return spot("sortie", "Sortir", "dans la rue", "/ville-3d", r.exitX ?? 0, r.d - 0.8); }

/** Inside the room, keeping a margin from walls and around solid fixtures. */
export function roomWalkable(r: Interior, x: number, z: number): boolean {
  if (Math.abs(x) > r.w - 0.5 || Math.abs(z) > r.d - 0.5) return false;
  for (const f of r.fixtures) {
    if (f.kind === "clerk" || f.kind === "shopper") continue;
    const [hx, hz] = footprint(f);
    if (Math.abs(x - f.x) < hx && Math.abs(z - f.z) < hz) return false;
  }
  return true;
}
export function footprint(f: Fixture): [number, number] {
  const turned = Math.abs(Math.sin(f.rot ?? 0)) > 0.7;
  if (f.kind === "item" || f.kind === "wall") return [(f.w ?? 1) / 2 + 0.25, (f.d ?? 1) / 2 + 0.25];
  const base: [number, number] = f.kind === "shelf" || f.kind === "rack" || f.kind === "counter" ? [(f.w ?? 2) / 2 + 0.3, 0.8]
    : f.kind === "car" ? [2.4, 2.4] : f.kind === "bed" ? [1.3, 1.6] : f.kind === "sofa" ? [1.4, 0.8] : f.kind === "plant" ? [0.5, 0.5] : [0.9, 0.7];
  return turned ? [base[1], base[0]] : base;
}
export function nearestSpot(r: Interior, x: number, z: number, reach = 1.8): Spot | null {
  let best: Spot | null = null, dist = reach;
  for (const s of [...r.spots, exitSpot(r)]) { const d = Math.hypot(s.x - x, s.z - z); if (d < dist) { dist = d; best = s; } }
  return best;
}

// ---- Player home, rebuilt from the saved furnishing layout (read only) ----
type HomeLike = { name: string; rooms: number; room_names: string[]; placements: { asset_id: string; room: number; x: number; y: number; rotation: number }[] };
type FurnitureLike = { asset_id: string; name: string; visual: string; width: number; height: number };
const CELL = 1; // one layout square = one metre
const GAP = 1;  // wall thickness between rooms
const LOOK: Record<string, { h: number; color: string }> = {
  sofa: { h: 0.9, color: "#5c7a4c" }, bed: { h: 0.6, color: "#d8cfc0" }, mattress: { h: 0.35, color: "#e4ddd0" },
  shelf: { h: 1.8, color: "#8a6a4a" }, washer: { h: 0.9, color: "#e8eaee" }, fridge: { h: 1.9, color: "#dfe3e8" },
  tv: { h: 1.1, color: "#22262c" }, table: { h: 0.75, color: "#9a7a55" }, desk: { h: 0.75, color: "#7a5c3e" }, chair: { h: 0.9, color: "#6b4f3a" },
};
export function furnitureLook(visual: string) { return LOOK[visual] ?? { h: 0.8, color: "#b08a64" }; }

/** Rooms sit side by side along x; each placement keeps its saved square, size and rotation. */
export function homeInterior(home: HomeLike, furniture: FurnitureLike[], grid: number): Interior {
  const rooms = Math.max(1, home.rooms);
  const total = rooms * grid * CELL + (rooms - 1) * GAP;
  const w = total / 2, d = (grid * CELL) / 2;
  const roomLeft = (r: number) => -w + r * (grid * CELL + GAP);
  const fixtures: Fixture[] = [];
  for (let r = 1; r < rooms; r++) {
    const x = roomLeft(r) - GAP / 2;
    // Partition with a 1.6 m doorway in the middle.
    const seg = d - 0.8;
    fixtures.push({ kind: "wall", x, z: -d + seg / 2, w: GAP, d: seg, h: 3 }, { kind: "wall", x, z: d - seg / 2, w: GAP, d: seg, h: 3 });
  }
  for (const p of home.placements) {
    const f = furniture.find((x) => x.asset_id === p.asset_id); if (!f || p.room < 0 || p.room >= rooms) continue;
    const turned = p.rotation % 180 !== 0;
    const bw = (turned ? f.height : f.width) * CELL, bd = (turned ? f.width : f.height) * CELL;
    const look = furnitureLook(f.visual);
    fixtures.push({ kind: "item", x: roomLeft(p.room) + p.x * CELL + bw / 2, z: -d + p.y * CELL + bd / 2, w: bw - 0.1, d: bd - 0.1, h: look.h, color: look.color, label: f.name, visual: f.visual });
  }
  const spots: Spot[] = Array.from({ length: rooms }, (_, r) => spot(`piece-${r}`, "Aménager", home.room_names[r] ?? `la pièce ${r + 1}`, "/chez-moi", roomLeft(r) + (grid * CELL) / 2, d - 1.2));
  // Keep room-arrangement spots reachable even when furniture stands there.
  const free = spots.filter((s) => !fixtures.some((f) => f.kind === "item" && Math.abs(s.x - f.x) < (f.w ?? 1) / 2 + 0.3 && Math.abs(s.z - f.z) < (f.d ?? 1) / 2 + 0.3));
  return { id: "logement", name: home.name, intro: "Votre logement, meublé comme vous l'avez aménagé.", w, d, floor: "#c8a97e", wall: "#f3ede2", accent: "#d97757", fixtures, spots: free, exitX: roomLeft(0) + 1.2 };
}
