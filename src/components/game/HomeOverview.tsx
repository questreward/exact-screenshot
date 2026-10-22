import { GameSelect } from "@/components/game/GameSelect";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { FurnishingHome, FurnishingState } from "@/game/home-furnishing";
import { homeGlance, welcomeLine } from "@/game/home-view";
import { daylight } from "@/game/daylight";
import { RoomInterior } from "./RoomInterior";
import { useWorldClock } from "./WorldClock";
import { HomeLife } from "./HomeLife";

/** "Voilà chez moi": visual first, editing second. Shows only real placements. */
export function HomeOverview({ home, data, onHomeChange, onEdit }: { home: FurnishingHome; data: FurnishingState; onHomeChange: (id: string) => void; onEdit: (asset?: string, room?: number) => void }) {
  const { time } = useWorldClock();
  const hour = time.getUTCHours();
  const light = daylight(hour);
  const g = homeGlance(home, data.furniture);
  const names = Array.from({ length: home.rooms }, (_, i) => home.room_names[i] ?? `Pièce ${i + 1}`);
  const [room, setRoom] = useState(0);
  const [seen, setSeen] = useState<string[] | null>(null);
  useEffect(() => { try { setSeen(JSON.parse(localStorage.getItem("civitas-home-seen") ?? "[]")); } catch { setSeen([]); } }, []);
  const fresh = seen === null ? [] : data.furniture.filter(f => !f.placed_home && !seen.includes(f.asset_id));
  const markSeen = (id: string) => { const next = [...(seen ?? []), id]; setSeen(next); localStorage.setItem("civitas-home-seen", JSON.stringify(next)); };
  const items = home.placements.filter(p => p.room === room).map(p => data.furniture.find(f => f.asset_id === p.asset_id)?.name).filter(Boolean);

  return <div className="space-y-4 animate-page">
    {data.homes.length > 1 && <GameSelect aria-label="Mon logement" value={home.id} onChange={e => onHomeChange(e.target.value)} className="min-h-12 w-full rounded-lg border border-input bg-background px-3">
      {data.homes.map(h => <option key={h.id} value={h.id}>{h.name} · {h.kind === "location" ? "Location" : "Propriété"}</option>)}</GameSelect>}
    <div className="border-b border-border pb-4">
      <p className="text-xs text-primary">{light.emoji} {time.toISOString().slice(11, 16)} · {home.kind === "location" ? "Ma location" : "Ma propriété"}</p>
      <h2 className="font-display text-2xl font-bold">{home.name}</h2>
      <p className="text-sm text-muted-foreground">{welcomeLine(hour)}</p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div className="flex items-baseline gap-2"><p className="font-display text-lg font-bold">{home.rooms}</p><p className="text-xs">pièce(s)</p></div>
        <div className="flex items-baseline gap-2"><p className="font-display text-lg font-bold">{g.placed}</p><p className="text-xs">objet(s) installés</p></div>
        <div className="flex items-baseline gap-2"><p className="font-display text-lg font-bold">{g.stored}</p><p className="text-xs">rangé(s)</p></div>
      </div>
      <p className="mt-2 text-sm">{g.emoji} {g.status}{g.emptyRooms > 0 && g.placed > 0 ? ` · ${g.emptyRooms} pièce(s) encore vide(s)` : ""}</p>
    </div>

    {fresh.length > 0 && <div className="space-y-2 rounded-2xl border-2 border-primary bg-card p-4">
      <p className="font-display font-bold">📦 Objets prêts à installer</p>
      {fresh.slice(0, 3).map(f => <div key={f.asset_id} className="rounded-xl bg-muted p-3">
        <p className="text-sm">📦 Ton objet <strong>{f.name}</strong> est disponible.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button className="min-h-12" onClick={() => { markSeen(f.asset_id); onEdit(f.asset_id, room); }}>Installer dans {names[room]}</Button>
          <Button variant="outline" className="min-h-12" onClick={() => markSeen(f.asset_id)}>Le ranger</Button>
        </div></div>)}
    </div>}
    <div className="overflow-hidden rounded-2xl border border-border">
      <RoomInterior name={names[room] ?? ""} placements={home.placements} furniture={data.furniture} room={room} grid={data.grid} light={light.key} />
      <div className="px-3 pb-3 text-sm text-muted-foreground">{items.length ? items.join(" · ") : "Pièce vide pour l'instant."}</div>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Pièces">
      {names.map((n, i) => { const c = home.placements.filter(p => p.room === i).length; return <Button key={i} variant={room === i ? "default" : "outline"} aria-pressed={room === i} className="h-auto min-h-16 justify-start whitespace-normal p-3 text-left" onClick={() => setRoom(i)}>
        <span><span className="block break-words">{n}</span><span className="block text-xs opacity-80">{c ? `${c} objet(s)` : "vide"}</span></span></Button>; })}
    </div>

    <div className="grid gap-2">
      <Button className="min-h-14 text-base" onClick={() => onEdit()}>🛋️ Aménager mon logement</Button>
      <Button asChild variant="outline" className="min-h-12"><Link to="/boutique">🛍️ Acheter des meubles</Link></Button>
    </div>
    <HomeLife home={home} furniture={data.furniture} />
  </div>;
}
