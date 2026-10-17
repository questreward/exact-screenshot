import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, Play, X, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { lifeQuery, startLifeActivity, cancelLifeActivity, formatMoney } from "@/services/game";
import { ACTIVITY_STATUS, durationLabel, gameDate, gameHour } from "@/game/life";
import type { LifeActivity } from "@/game/life-state";
import { LocationLink, useLifeMutation } from "./LifeControls";
import { WorldClock } from "./WorldClock";

export function AgendaPage() {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const [week,setWeek] = useState(false);
  const [selected,setSelected] = useState<LifeActivity | null>(null);
  const start = useLifeMutation(startLifeActivity,"Activité commencée");
  const cancel = useLifeMutation(cancelLifeActivity,"Activité annulée");
  const day = life.world_now.slice(0,10);
  const current = selected ? life.activities.find(a => a.id===selected.id) ?? selected : null;
  const activities = life.activities.filter(a => week ? a.start_time.slice(0,10)>=day && gameDate(a.start_time).getTime()<gameDate(day+"T00:00:00Z").getTime()+7*86400000 : a.start_time.slice(0,10)===day);
  const groups = Array.from(new Set(activities.map(a=>a.start_time.slice(0,10))));
  return <div className="space-y-6 animate-rise"><div><p className="mb-1 text-xs uppercase tracking-wider text-primary">CIVITAS · Mon temps</p><h1 className="text-3xl font-bold">Agenda</h1></div><WorldClock />
    <div className="flex gap-2" role="group" aria-label="Période de l’agenda"><Button variant={!week ? "default":"outline"} aria-pressed={!week} onClick={()=>setWeek(false)}>Aujourd’hui</Button><Button variant={week ? "default":"outline"} aria-pressed={week} onClick={()=>setWeek(true)}>Semaine</Button></div>
    {activities.length===0 && <div className="border-y border-border py-10 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-primary" /><p>Aucune activité prévue {week ? "cette semaine" : "aujourd’hui"}.</p></div>}
    {groups.map(date=><section key={date}><h2 className="mb-3 text-sm font-semibold capitalize text-muted-foreground">{gameDate(date+"T00:00:00Z").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"})}</h2><div className="divide-y divide-border">{activities.filter(a=>a.start_time.slice(0,10)===date).map(a=><Button key={a.id} variant="ghost" className="h-auto min-h-24 w-full justify-start whitespace-normal rounded-none px-2 py-4 text-left" onClick={()=>setSelected(a)}><span className="w-16 shrink-0 text-primary">{gameHour(a.start_time)}<br/><span className="text-xs text-muted-foreground">{gameHour(a.end_time)}</span></span><span className="min-w-0 flex-1"><span className="block font-semibold">{a.title}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{a.location.name} · {durationLabel(Math.round((gameDate(a.end_time).getTime()-gameDate(a.start_time).getTime())/60000))}</span><span className="mt-2 block text-xs text-primary">{ACTIVITY_STATUS[a.status]}</span></span></Button>)}</div></section>)}
    <Dialog open={!!current} onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent className="max-w-md">{current && <><DialogHeader><DialogTitle>{current.title}</DialogTitle><DialogDescription>{ACTIVITY_STATUS[current.status]}</DialogDescription></DialogHeader><div className="space-y-4"><p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" />{gameHour(current.start_time)} → {gameHour(current.end_time)}</p><p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary" />{current.location.name}</p><p className="text-sm text-muted-foreground">Énergie : −{current.energy_cost} / +{current.energy_gain}<br/>Coût : {formatMoney(current.money_cost)}{current.reward>0 && <><br/>Revenu à la fin : {formatMoney(current.reward)}</>}{current.progression_gain>0 && <><br/>Progression : +{current.progression_gain} points</>}</p><LocationLink location={current.location} />{current.status==='planned' && <div className="flex flex-wrap gap-2"><Button disabled={start.isPending || life.position.location_id!==current.location_id || gameDate(life.world_now)<gameDate(current.start_time)} onClick={()=>start.mutate({activityId:current.id})}><Play />Commencer</Button><Button variant="outline" disabled={cancel.isPending} onClick={()=>cancel.mutate(current.id)}><X />Annuler</Button></div>}{current.status==='running' && <p className="text-sm text-primary">Activité en cours, jusqu’à {gameHour(current.end_time)}.</p>}</div></>}</DialogContent></Dialog>
  </div>;
}