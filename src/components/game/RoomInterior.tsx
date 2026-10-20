import type { Furniture, Placement } from '@/game/home-furnishing';
import { footprint } from '@/game/home-furnishing';
import { FurnitureVisual } from './FurnitureVisual';

/** Projection of actual placed possessions, not a seeded decorative room. */
export function RoomInterior({ name, placements, furniture, room, grid }: { name: string; placements: Placement[]; furniture: Furniture[]; room: number; grid: number }) {
  return <figure className="overflow-hidden border-y border-border bg-surface" aria-label={`Intérieur : ${name}`}>
    <svg viewBox="0 0 600 390" className="block aspect-[20/13] w-full" aria-hidden="true">
      <rect width="600" height="390" fill="var(--surface)" />
      <path d="M50 60H550V280H50Z" fill="var(--secondary)" />
      <path d="M50 280H550L590 365H10Z" fill="var(--muted)" />
      <path d="M50 60V280L10 365M550 60V280L590 365M50 280H550" fill="none" stroke="var(--border)" strokeWidth="4" />
      <rect x="84" y="91" width="106" height="82" fill="var(--chart-3)" opacity=".45" />
      <path d="M137 91V173M84 132H190" stroke="var(--foreground)" strokeWidth="4" />
      <rect x="475" y="152" width="49" height="128" fill="var(--surface)" />
      <circle cx="486" cy="221" r="3" fill="var(--primary)" />
      {placements.filter(p => p.room === room).sort((a,b) => a.y-b.y).map(p => {
        const item = furniture.find(f => f.asset_id === p.asset_id);
        if (!item || grid <= 0) return null;
        const box = footprint(item,p.rotation);
        return <foreignObject key={p.asset_id} x={60+p.x/grid*465} y={190+p.y/grid*95} width={box.width/grid*465} height={Math.max(32,box.height/grid*145)}><div className="h-full w-full" title={item.name}><FurnitureVisual kind={item.visual}/></div></foreignObject>;
      })}
    </svg>
    <figcaption className="px-3 py-2 text-sm font-semibold break-words">{name}</figcaption>
  </figure>;
}