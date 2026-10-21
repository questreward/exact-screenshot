import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homeVisitQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { daylight } from "@/game/daylight";
import { RoomInterior } from "@/components/game/RoomInterior";
import { useWorldClock } from "@/components/game/WorldClock";

export const Route = createFileRoute("/_authenticated/_game/visite/$id")({
  head: () => ({ meta: gameMeta("Visite chez un ami", "Visite en lecture seule du logement d'un joueur qui t'a invité.") }),
  component: VisitPage,
});

function VisitPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery(homeVisitQuery(id));
  const { time } = useWorldClock();
  const [room, setRoom] = useState(0);
  if (isLoading) return <div className="flex justify-center py-20"><LoaderCircle className="animate-spin" /></div>;
  if (error || !data) return <div className="space-y-3 p-4"><p className="text-muted-foreground">{error?.message ?? "Visite impossible."}</p><Button asChild className="min-h-12"><Link to="/chez-moi">Retour chez moi</Link></Button></div>;
  const names = Array.from({ length: data.rooms }, (_, i) => data.room_names[i] ?? `Pièce ${i + 1}`);
  const items = data.placements.filter(p => p.room === room).map(p => data.furniture.find(f => f.asset_id === p.asset_id)?.name).filter(Boolean);
  return <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24 animate-page">
    <header><p className="text-xs text-primary">🚪 Tu es invité</p><h1 className="font-heading text-2xl font-bold">Chez {data.host}</h1><p className="text-sm text-muted-foreground">{data.name} · {data.rooms} pièce(s) · {data.placements.length} objet(s)</p></header>
    <div className="overflow-hidden rounded-2xl border border-border">
      <RoomInterior name={names[room] ?? ""} placements={data.placements} furniture={data.furniture} room={room} grid={data.grid} light={daylight(time.getUTCHours()).key} />
      <p className="px-3 pb-3 text-sm text-muted-foreground">{items.length ? items.join(" · ") : "Pièce vide."}</p>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{names.map((n, i) => <Button key={i} variant={room === i ? "default" : "outline"} className="min-h-14 whitespace-normal" onClick={() => setRoom(i)}>{n}</Button>)}</div>
    <p className="text-xs text-muted-foreground">Visite en lecture seule : tu ne peux rien déplacer.</p>
    <Button asChild variant="outline" className="min-h-12 w-full"><Link to="/reseau/$id" params={{ id }}>Voir son profil</Link></Button>
  </main>;
}
