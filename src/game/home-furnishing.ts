export type Furniture = { asset_id: string; name: string; visual: string; width: number; height: number; placed_home: string | null };
export type Placement = { asset_id: string; room: number; x: number; y: number; rotation: number };
export type FurnishingHome = { id: string; name: string; rooms: number; version: number; room_names: string[]; placements: Placement[] };
export type FurnishingState = { available: boolean; homes: FurnishingHome[]; furniture: Furniture[]; grid: number };
export function footprint(item: Pick<Furniture, 'width' | 'height'>, rotation: number) {
  return rotation % 180 === 0 ? { width: item.width, height: item.height } : { width: item.height, height: item.width };
}
// Presentation hints only; the RPC validates the same constraints authoritatively.
export function canPlace(candidate: Placement, placements: Placement[], furniture: Furniture[], rooms: number, grid: number): boolean {
  const item = furniture.find(f => f.asset_id === candidate.asset_id);
  if (!item || ![0, 90, 180, 270].includes(candidate.rotation) || ![candidate.room, candidate.x, candidate.y].every(Number.isInteger) || candidate.room < 0 || candidate.room >= rooms) return false;
  const box = footprint(item, candidate.rotation);
  if (candidate.x < 0 || candidate.y < 0 || candidate.x + box.width > grid || candidate.y + box.height > grid) return false;
  return placements.every(p => {
    if (p.asset_id === candidate.asset_id || p.room !== candidate.room) return true;
    const other = furniture.find(f => f.asset_id === p.asset_id);
    if (!other) return false;
    const b = footprint(other, p.rotation);
    return candidate.x + box.width <= p.x || p.x + b.width <= candidate.x || candidate.y + box.height <= p.y || p.y + b.height <= candidate.y;
  });
}
