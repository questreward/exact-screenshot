import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { TrainFront } from "lucide-react";
import { lifeQuery, districtsQuery, locationsQuery, startLifeActivity, formatMoney } from "@/services/game";
import { Button } from "@/components/ui/button";
import { useLifeMutation } from "./LifeControls";
import type { LifeLocation } from "@/game/life-state";
export function TransportControl({ location }: { location: LifeLocation }) {
  const { data: life }=useSuspenseQuery(lifeQuery);
  const { data: districts }=useSuspenseQuery(districtsQuery(location.city_id));
  const [district,setDistrict]=useState(location.district_id ?? districts[0]?.id ?? "");
  const { data: locations }=useSuspenseQuery(locationsQuery(district));
  const [target,setTarget]=useState("");
  const start=useLifeMutation(startLifeActivity,"Trajet commencé");
  const rule=life.rules.find(r=>r.id==='transport');
  return <div className="space-y-3 border-t border-border pt-4"><h4 className="text-sm font-semibold">Transport public</h4><label className="block text-xs text-muted-foreground">Quartier<select className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground" value={district} onChange={e=>{setDistrict(e.target.value);setTarget("");}}>{districts.filter(d=>d.available).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label className="block text-xs text-muted-foreground">Destination<select className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choisir un lieu</option>{locations.filter(l=>l.accessible && l.id!==location.id).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><Button className="w-full" disabled={!target || start.isPending || life.position.location_id!==location.id || life.activities.some(a=>a.status==='running')} onClick={()=>start.mutate({type:'transport',targetLocationId:target})}><TrainFront />{rule?.duration_minutes} min · {formatMoney(rule?.money_cost ?? 0)}</Button></div>;
}