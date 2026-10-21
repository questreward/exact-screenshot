import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Users, MessageCircle, UserPlus, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CharacterAvatar } from './CharacterAvatar';
import { normalizeAppearance } from '@/game/appearance';
import { socialQuery, lifeQuery, interactSocial } from '@/services/game';
import { gameDate, gameHour } from '@/game/life';
import { LocationLink, useLifeMutation } from './LifeControls';
import type { SocialNpc } from '@/game/social';
import { NpcChat } from './NpcChat';
import { useWorldClock } from './WorldClock';
import { personMood, personNow } from '@/game/person-life';
export function SocialContacts({ locationId }: { locationId?: string }) {
 const {data:s}=useSuspenseQuery(socialQuery); const {data:life}=useSuspenseQuery(lifeQuery);
 const {time}=useWorldClock(); const [selected,setSelected]=useState<string>(); const [nearby,setNearby]=useState(false);
 const mutation=useLifeMutation(interactSocial,'Interaction enregistrée');
 const people=locationId?s.nearby.filter(n=>n.location_id===locationId):nearby?s.nearby:s.relations.map(r=>r.npc);
 const person=people.find(n=>n.id===selected);
 return <section className="space-y-4"><div className="flex flex-wrap items-center gap-2"><h2 className="flex flex-1 items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5 text-primary"/>{locationId?'Rencontres ici':'Mes contacts'}</h2>{!locationId&&<Button variant="outline" onClick={()=>{setNearby(!nearby);setSelected(undefined);}}>{nearby?'Mes contacts':'À proximité'}</Button>}</div>
 {people.length===0&&<p className="py-5 text-sm text-muted-foreground">{nearby||locationId?'Personne à rencontrer ici pour le moment.':'Aucune personne rencontrée.'}</p>}
 <div className="divide-y divide-border">{people.map(n=>{const r=s.relations.find(r=>r.npc_id===n.id);return <Button key={n.id} variant="ghost" onClick={()=>setSelected(selected===n.id?undefined:n.id)} className="h-auto min-h-20 w-full justify-start gap-3 whitespace-normal px-0 py-3 text-left"><span className="block h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-accent"><CharacterAvatar className="h-full! w-full!" appearance={normalizeAppearance(n.appearance)}/></span><span className="min-w-0"><span className="block font-semibold">{n.first_name} {n.last_name}</span><span className="block text-xs font-normal text-muted-foreground">{n.profession} · {r?.level??'Inconnu'}</span><span className="block text-xs font-normal">{personMood(n.id,time).emoji} {personNow(n.profession,time).emoji} {n.first_name} {personNow(n.profession,time).text}</span>{r?.last_interaction&&<span className="block text-xs font-normal text-muted-foreground">Dernier échange : {gameDate(r.last_interaction).toLocaleDateString('fr-FR',{timeZone:'UTC'})} · {gameHour(r.last_interaction)}</span>}</span></Button>;})}</div>
 {person&&<PersonDetails person={person}/>}
 </section>;
 function PersonDetails({person:n}:{person:SocialNpc}){const r=s.relations.find(r=>r.npc_id===n.id);const here=life.position.location_id===n.location_id;const busy=life.activities.some(a=>a.status==='running');return <div className="space-y-3 border-y border-border py-4"><h3 className="font-semibold">{n.first_name} · {n.age} ans</h3><div className="grid grid-cols-2 gap-2 text-sm"><p className="rounded-xl bg-surface p-3"><span className="block text-[11px] text-muted-foreground">Maintenant</span>{personNow(n.profession,time).emoji} {personNow(n.profession,time).text}</p><p className="rounded-xl bg-surface p-3"><span className="block text-[11px] text-muted-foreground">Humeur du jour</span>{personMood(n.id,time).emoji} {personMood(n.id,time).label}</p></div><p className="text-xs text-muted-foreground">💼 {n.profession}</p><p className="text-sm text-muted-foreground">{n.description}</p><p className="text-xs text-primary">{n.traits.join(' · ')}{r&&` · Relation ${r.score}/100`}</p><LocationLink location={n.location} label="Voir sur la carte"/><div className="grid gap-2">{s.rules.filter(rule=>r?rule.id!=='introduce':rule.id==='introduce').map(rule=>{const cool=!!r?.last_interaction&&gameDate(r.last_interaction).getTime()+rule.cooldown_minutes*60000>gameDate(s.world_now).getTime();const disabled=!here||busy||mutation.isPending||cool||(r?.score??0)<rule.min_score||life.character.energy<rule.energy_cost;const Icon=rule.id==='introduce'?UserPlus:rule.id==='invite'?CalendarPlus:MessageCircle;return <Button key={rule.id} variant="outline" disabled={disabled} onClick={()=>mutation.mutate({npcId:n.id,actionId:rule.id})} className="min-h-12 justify-start whitespace-normal"><Icon/>{rule.title}{cool&&<span className="text-xs text-muted-foreground">Plus tard</span>}</Button>;})}</div><NpcChat key={n.id} npcId={n.id} name={n.first_name} here={here}/>{!here&&<p className="text-xs text-muted-foreground">Rejoignez {n.location.name} pour échanger.</p>}<ul className="space-y-1 text-xs text-muted-foreground">{s.history.filter(i=>i.npc_id===n.id).slice(0,5).map(i=><li key={i.id}>{gameHour(i.occurred_at)} · {s.rules.find(r=>r.id===i.action_id)?.title} · +{i.relation_gain} relation</li>)}</ul></div>;}
}
