import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { lifeQuery } from "@/services/game";
import { gameHour } from "@/game/life";
import { Button } from "@/components/ui/button";
export function LifeSummary() {
  const { data:life }=useSuspenseQuery(lifeQuery);
  const q=useQueryClient();
  useEffect(()=>{q.invalidateQueries({queryKey:["character"]});q.invalidateQueries({queryKey:["bank"]});},[life.character.energy,life.employment?.progress,life.enrollment?.progress,q]);
  const current=life.activities.find(a=>a.status==='running');
  const next=life.activities.find(a=>a.status==='planned');
  return <section className="space-y-4 border-y border-border py-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Ma journée</h2><Button variant="ghost" asChild><Link to="/agenda"><CalendarDays />Agenda</Link></Button></div><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase text-muted-foreground">Activité actuelle</p><p className="mt-1 font-semibold">{current?.title ?? "Temps libre"}</p>{current && <p className="text-sm text-primary">{gameHour(current.start_time)} → {gameHour(current.end_time)}</p>}</div><div><p className="text-xs uppercase text-muted-foreground">Prochaine activité</p><p className="mt-1 font-semibold">{next?.title ?? "Aucune activité prévue"}</p>{next && <p className="text-sm text-muted-foreground">{next.start_time.slice(0,10)} · {gameHour(next.start_time)}</p>}</div></div></section>;
}