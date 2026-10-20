import { useState } from 'react';
import { Megaphone, Flag, Footprints } from 'lucide-react';
import manif from '@/assets/v2/manif.webp';
import { crowdDots } from '@/game/v2-scenes';
import { play } from '@/game/sfx';
import { SoundToggle } from './SoundToggle';

/** Illustration du cortège : banderole = vraie cause, foule = vrais participants. Aucun gain. */
export function ProtestScene({ cause, participants, city }: { cause: string; participants: number; city: string }) {
  const [action, setAction] = useState<string | null>(null);
  const dots = crowdDots(participants);
  const act = (id: string, sound: 'megaphone' | 'foule') => { setAction(id); play(sound); };
  return <figure className="overflow-hidden rounded-lg border border-border">
    <div className={`relative ${action === 'avancer' ? 'protest-march' : ''}`}>
      <img src={manif} alt={`Cortège fictif à ${city}`} width={1280} height={720} loading="lazy" className="block aspect-video w-full object-cover" />
      <div className="absolute inset-x-[18%] bottom-[18%] rotate-[-1deg] rounded bg-background/90 px-2 py-1 text-center font-display text-sm font-bold uppercase text-foreground shadow sm:text-lg">{cause}</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-6 flex-wrap-reverse justify-center gap-0.5 px-2" aria-hidden="true">
        {Array.from({ length: dots }, (_, i) => <span key={i} className="crowd-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: `${(i % 7) * 0.15}s` }} />)}
      </div>
      {action === 'pancarte' && <Flag className="crowd-dot absolute bottom-[35%] left-[45%] h-10 w-10 text-primary" aria-hidden="true" />}
      <SoundToggle className="absolute right-2 top-2" />
    </div>
    <div className="grid grid-cols-3 gap-2 p-2">
      <button type="button" className="flex min-h-12 flex-col items-center justify-center rounded-md bg-secondary text-xs" onClick={() => act('megaphone', 'megaphone')}><Megaphone className="h-5 w-5" />Mégaphone</button>
      <button type="button" className="flex min-h-12 flex-col items-center justify-center rounded-md bg-secondary text-xs" onClick={() => act('pancarte', 'foule')}><Flag className="h-5 w-5" />Pancarte</button>
      <button type="button" className="flex min-h-12 flex-col items-center justify-center rounded-md bg-secondary text-xs" onClick={() => act('avancer', 'foule')}><Footprints className="h-5 w-5" />Avancer</button>
    </div>
    <figcaption className="px-3 pb-3 text-xs text-muted-foreground" aria-live="polite">
      {action === 'megaphone' ? `« ${cause} ! » — la foule reprend le slogan.` : action === 'pancarte' ? 'Pancarte levée.' : action === 'avancer' ? 'Le cortège avance.' : `${participants} participant${participants > 1 ? 's' : ''} · illustration, sans gain supplémentaire.`}
    </figcaption>
  </figure>;
}
