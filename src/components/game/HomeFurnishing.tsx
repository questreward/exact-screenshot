import { useState } from 'react';
import { Link, useBlocker } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Home, RotateCw, Archive, Save, ShoppingBag, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { furnishingSave } from '@/services/game';
import { canPlace, footprint, type FurnishingState, type FurnishingHome, type Placement } from '@/game/home-furnishing';
import { FurnitureVisual } from './FurnitureVisual';

export function HomeFurnishing({ data }: { data: FurnishingState }) {
  const [homeId, setHomeId] = useState(data.homes[0]?.id ?? '');
  const home = data.homes.find(h => h.id === homeId) ?? data.homes[0];
  if (!data.available) return <p className="p-4 text-muted-foreground">Chez moi : Disponible dans une prochaine étape.</p>;
  if (!home) return <section className="space-y-4 py-6"><p className="text-muted-foreground">Aucun logement disponible à aménager.</p>{!data.rentals_available && <p className="text-sm text-muted-foreground">Aménagement des locations : Disponible dans une prochaine étape.</p>}<Button asChild><Link to="/logement"><Home/>Logement</Link></Button></section>;
  return <Editor key={`${home.id}:${home.version}:${JSON.stringify(home.placements)}`} home={home} data={data} onHomeChange={setHomeId}/>;
}
function Editor({ home, data, onHomeChange }: { home: FurnishingHome; data: FurnishingState; onHomeChange: (id: string) => void }) {
  const qc = useQueryClient();
  const [placements, setPlacements] = useState(home.placements);
  const initialNames = Array.from({ length: home.rooms }, (_, i) => home.room_names[i] ?? `Pièce ${i + 1}`);
  const [names, setNames] = useState(initialNames);
  const [room, setRoom] = useState(0);
  const [selected, setSelected] = useState('');
  const [rotation, setRotation] = useState(0);
  const dirty = JSON.stringify(placements) !== JSON.stringify(home.placements) || JSON.stringify(names) !== JSON.stringify(initialNames);
  const leave = () => !dirty || window.confirm('Quitter sans enregistrer les changements ?');
  useBlocker({ shouldBlockFn: () => !leave(), enableBeforeUnload: dirty });
  const save = useMutation({
    mutationFn: () => furnishingSave(home, home.version, names, placements, crypto.randomUUID()),
    onSuccess: () => { toast.success('Aménagement enregistré.'); qc.invalidateQueries({ queryKey: ['furnishing'] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const chosen = data.furniture.find(f => f.asset_id === selected);
  const pick = (id: string) => { setSelected(id); setRotation(placements.find(p => p.asset_id === id)?.rotation ?? 0); };
  const put = (x: number, y: number) => {
    if (!chosen || save.isPending) return;
    const candidate: Placement = { asset_id: selected, room, x, y, rotation };
    if (!canPlace(candidate, placements, data.furniture, home.rooms, data.grid)) { toast.error('Cet emplacement est occupé ou trop petit.'); return; }
    setPlacements(old => [...old.filter(p => p.asset_id !== selected), candidate]);
  };
  const turn = () => {
    const next = (rotation + 90) % 360;
    const placed = placements.find(p => p.asset_id === selected);
    if (placed) {
      const candidate = { ...placed, rotation: next };
      if (!canPlace(candidate, placements, data.furniture, home.rooms, data.grid)) { toast.error('Pas assez de place pour tourner cet objet.'); return; }
      setPlacements(old => old.map(p => p.asset_id === selected ? candidate : p));
    }
    setRotation(next);
  };
  return <div className="space-y-5">
    <label className="block text-sm font-semibold">Mon logement<select aria-label="Mon logement" value={home.id} disabled={save.isPending} onChange={e => { if (leave()) onHomeChange(e.target.value); }} className="mt-2 min-h-12 w-full rounded-lg border border-input bg-background px-3">{data.homes.map(h=><option key={h.id} value={h.id}>{h.name} · {h.kind==='location'?'Location':'Propriété'}</option>)}</select></label>
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3"><span className="text-sm font-semibold">{home.kind==='location'?'Ma location':'Ma propriété'}</span><span className="text-xs text-muted-foreground">{names.length} {names.length===1?'pièce':'pièces'} · {placements.length} {placements.length===1?'objet':'objets'}</span></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Pièces">{names.map((name,i)=><Button key={i} variant={room===i?'default':'outline'} aria-pressed={room===i} className="h-auto min-h-16 min-w-0 justify-start whitespace-normal p-3 text-left" onClick={()=>setRoom(i)}><span className="min-w-0"><span className="block break-words">{name}</span><span className="block text-xs opacity-80">{placements.filter(p=>p.room===i).length} objet(s)</span></span></Button>)}</div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 space-y-3" aria-label="Aménagement de la pièce">
        <Input aria-label="Nom de la pièce" maxLength={40} className="h-12" value={names[room] ?? ''} disabled={save.isPending} onChange={e=>setNames(old=>old.map((n,i)=>i===room?e.target.value:n))}/>
        <div className="relative isolate grid aspect-square w-full overflow-hidden border-4 border-secondary bg-surface" style={{ gridTemplateColumns: `repeat(${data.grid}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${data.grid}, minmax(0, 1fr))` }}>
          {Array.from({length:data.grid*data.grid},(_,i)=><Button key={i} variant="ghost" aria-label={`Emplacement ${i%data.grid+1}, ${Math.floor(i/data.grid)+1}`} disabled={!chosen || save.isPending} className="h-full min-h-0 w-full rounded-none border border-border p-0" onClick={()=>put(i%data.grid,Math.floor(i/data.grid))}/>)}
          {placements.filter(p=>p.room===room).map(p=>{
            const f=data.furniture.find(item=>item.asset_id===p.asset_id); if(!f)return null;
            const box=footprint(f,p.rotation);
            return <Button key={p.asset_id} variant="ghost" aria-label={`Sélectionner ${f.name}`} disabled={save.isPending} onClick={()=>pick(p.asset_id)} className={`absolute z-10 h-auto overflow-hidden rounded-sm border-2 bg-secondary p-1 ${selected===p.asset_id?'border-primary ring-2 ring-ring':'border-border'}`} style={{ left:`${p.x/data.grid*100}%`, top:`${p.y/data.grid*100}%`, width:`${box.width/data.grid*100}%`, height:`${box.height/data.grid*100}%` }}><span className="absolute left-1/2 top-1/2 block" style={{width:`${f.width/box.width*100}%`,height:`${f.height/box.height*100}%`,transform:`translate(-50%, -50%) rotate(${p.rotation}deg)`}}><FurnitureVisual kind={f.visual}/></span></Button>;
          })}
        </div>
        <p className="text-xs text-muted-foreground">Disposition de jeu · sans dimensions immobilières contractuelles</p>
        <div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-12 w-12" title="Tourner" aria-label="Tourner" disabled={!chosen || save.isPending} onClick={turn}><RotateCw/></Button><Button variant="outline" size="icon" className="h-12 w-12" title="Ranger" aria-label="Ranger" disabled={!placements.some(p=>p.asset_id===selected) || save.isPending} onClick={()=>setPlacements(old=>old.filter(p=>p.asset_id!==selected))}><Archive/></Button><p className="min-w-0 break-words text-sm">{chosen?.name ?? 'Aucun objet sélectionné'}{chosen && <span className="block text-xs text-muted-foreground">{rotation}°</span>}</p></div>
      </section>
      <section aria-label="Mes objets" className="min-w-0 space-y-3"><h2 className="font-heading text-lg font-semibold">Mes objets</h2>
        {data.furniture.length===0 && <p className="text-sm text-muted-foreground">Aucun objet compatible possédé.</p>}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">{data.furniture.map(f=>{
          const elsewhere=f.placed_home && f.placed_home!==home.id;
          const placed=placements.find(p=>p.asset_id===f.asset_id);
          return <Button key={f.asset_id} variant={selected===f.asset_id?'secondary':'outline'} disabled={Boolean(elsewhere) || save.isPending} onClick={()=>pick(f.asset_id)} className="h-auto min-h-24 min-w-0 justify-start gap-2 whitespace-normal p-2 text-left"><span className="h-12 w-12 shrink-0"><FurnitureVisual kind={f.visual}/></span><span className="min-w-0 break-words text-xs">{f.name}<span className="mt-1 block text-muted-foreground">{elsewhere?'Dans un autre logement':placed?names[placed.room]:'Rangé'}</span></span></Button>;
        })}</div>
        <Button asChild variant="outline" className="min-h-12 w-full"><Link to="/boutique"><ShoppingBag/>Boutique</Link></Button>
      </section>
    </div>
    <footer className="flex flex-wrap items-center gap-3 border-t border-border py-4"><Button className="min-h-12 flex-1" disabled={!dirty || save.isPending || names.some(n=>n.trim().length===0)} onClick={()=>save.mutate()}><Save/>{save.isPending?'Enregistrement…':'Enregistrer'}</Button><Button variant="outline" size="icon" aria-label="Annuler les changements" title="Annuler les changements" className="h-12 w-12" disabled={!dirty || save.isPending} onClick={()=>{if(window.confirm('Annuler les changements ?')){setPlacements(home.placements);setNames(initialNames);}}}><Undo2/></Button><span role="status" className="w-full text-xs text-muted-foreground">{dirty?'Changements non enregistrés':'Aménagement enregistré'}</span></footer>
  </div>;
}
