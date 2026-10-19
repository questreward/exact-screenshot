import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { TrainFront } from "lucide-react";
import { lifeQuery, districtsQuery, locationsQuery, startLifeActivity, formatMoney, economyQuery, economyAction, transportPreviewQuery } from "@/services/game";
import { Button } from "@/components/ui/button";
import { useLifeMutation } from "./LifeControls";
import { IntercityControl } from "./IntercityControl";
import type { LifeLocation } from "@/game/life-state";
export function TransportControl({ location }: { location: LifeLocation }) {
  const { data: life }=useSuspenseQuery(lifeQuery);
  const { data: districts }=useSuspenseQuery(districtsQuery(location.city_id));
  const [district,setDistrict]=useState(location.district_id ?? districts[0]?.id ?? "");
  const { data: locations }=useSuspenseQuery(locationsQuery(district));
  const [target,setTarget]=useState("");
  const start=useLifeMutation(startLifeActivity,"Trajet commencé");
  const rule=life.rules.find(r=>r.id==='transport');
  const {data:economy}=useSuspenseQuery(economyQuery);
  const travel=useLifeMutation(economyAction,'Trajet commencé');
  const { data: preview }=useQuery(transportPreviewQuery(target));
  const delayed=preview && preview.delay_minutes>0;
  return <div className="space-y-3 border-t border-border pt-4"><h4 className="text-sm font-semibold">Mobilité</h4><label className="block text-xs text-muted-foreground">Quartier<select className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground" value={district} onChange={e=>{setDistrict(e.target.value);setTarget("");}}>{districts.filter(d=>d.available).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label className="block text-xs text-muted-foreground">Destination<select className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choisir un lieu</option>{locations.filter(l=>l.accessible && l.id!==location.id).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><Button className="w-full" disabled={!target || start.isPending || life.position.location_id!==location.id || life.activities.some(a=>a.status==='running')} onClick={()=>start.mutate({type:'transport',targetLocationId:target})}><TrainFront />Transport public · {delayed ? preview.total_minutes : rule?.duration_minutes} min · {formatMoney(rule?.money_cost ?? 0)}</Button>{delayed && <p role="status" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{preview.base_minutes} min + {preview.delay_minutes} min de travaux = <strong>{preview.total_minutes} min</strong><br /><span className="text-xs text-muted-foreground">{preview.events.map(e=>e.title).join(' · ')}</span></p>}{economy.assets.filter(a=>a.catalog.kind==='vehicle').map(a=><Button key={a.id} variant="outline" className="w-full" disabled={!target || travel.isPending || a.condition!=='Bon état' || life.position.location_id!==location.id || life.activities.some(a=>a.status==='running')} onClick={()=>travel.mutate({command:'travel',requestId:crypto.randomUUID(),input:{catalog_id:a.catalog_id,location_id:target}})}>{a.catalog.name} · {String(a.catalog.config['travel_minutes'])} min · {formatMoney(Number(a.catalog.config['usage']))}</Button>)}<IntercityControl location={location} /></div>;
}