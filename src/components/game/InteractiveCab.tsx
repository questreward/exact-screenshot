import { useEffect, useState } from 'react';
import pompiers from '@/assets/v2/cab-pompiers.webp';
import police from '@/assets/v2/cab-police.webp';
import gendarmerie from '@/assets/v2/cab-gendarmerie.webp';
import samu from '@/assets/v2/cab-samu.webp';
import pc from '@/assets/v2/cab-protection-civile.webp';
import { CAB_HOTSPOTS, CAB_SIREN, CAB_TITLE, type CabKind } from '@/game/v2-scenes';
import { play } from '@/game/sfx';
import { SoundToggle } from './SoundToggle';

const IMG: Record<CabKind, string> = { pompiers, police, gendarmerie, samu, protection_civile: pc };

/** Intérieur réaliste à explorer. Illustration : aucune action ici ne change la mission enregistrée. */
export function InteractiveCab({ kind, title }: { kind: CabKind; title: string }) {
  const spots = CAB_HOTSPOTS[kind];
  const [active, setActive] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => { play(CAB_SIREN[kind]); }, [kind]);
  const spot = spots.find(s => s.id === active);
  return <figure className="overflow-hidden rounded-lg border border-border bg-card">
    <div className="relative">
      <img src={IMG[kind]} alt={`Intérieur fictif : ${CAB_TITLE[kind]}`} width={1280} height={720} loading="lazy" className="block aspect-video w-full object-cover" />
      <div className="cab-beacon pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="absolute left-2 top-2 rounded bg-background/80 px-2 py-1 text-xs font-semibold backdrop-blur">{CAB_TITLE[kind]}</div>
      <SoundToggle className="absolute right-2 top-2" />
      {spots.map(s => <button key={s.id} type="button" aria-label={s.label} aria-pressed={active === s.id}
        style={{ left: `${s.x}%`, top: `${s.y}%` }}
        className={`hotspot absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background ${seen.includes(s.id) ? 'bg-secondary' : 'bg-primary'}`}
        onClick={() => { setActive(s.id); setSeen(v => v.includes(s.id) ? v : [...v, s.id]); play(s.sound); }}>
        <span className="h-3 w-3 rounded-full bg-background" />
      </button>)}
    </div>
    <figcaption className="space-y-1 p-3 text-sm" aria-live="polite">
      {spot ? <><p className="font-semibold">{spot.label}</p><p className="text-muted-foreground">{spot.info}</p></>
        : <p className="text-muted-foreground">Touchez les points pour découvrir le matériel. {seen.length}/{spots.length} découverts.</p>}
      <p className="text-xs text-muted-foreground">{title} · vue illustrative, la mission avance avec vos choix ci-dessous.</p>
    </figcaption>
  </figure>;
}
