import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MapPin, ArrowUpRight } from "lucide-react";
import { positionQuery } from "@/services/game";
import { Button } from "@/components/ui/button";

export function PositionBlock() {
  const { data: p } = useSuspenseQuery(positionQuery);
  return <section className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-5">
    <div><h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> Position actuelle</h2>
      <p className="mt-2 font-display text-lg font-semibold">{p?.city?.name ?? "Position indisponible"}</p>
      {p && <p className="mt-1 text-sm text-muted-foreground">{p.district?.name} — {p.location?.name}</p>}
    </div>
    <Button asChild><Link to="/carte" search={{}}><MapPin /> Ouvrir la carte <ArrowUpRight /></Link></Button>
  </section>;
}