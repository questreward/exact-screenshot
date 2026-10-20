import { personLook, type PersonMood } from '@/game/people';
import { cn } from '@/lib/utils';

/** SVG <g> of a small animated person, drawn in a 40×70 box (feet at y=70). Usable inside any SVG. */
export function BonhommeG({ seed, mood = 'idle', delay = 0, sign }: { seed: string; mood?: PersonMood; delay?: number; sign?: string }) {
  const l = personLook(seed);
  const style = { animationDelay: `${delay}s` };
  return <g className={cn('bh', `bh-${mood}`)} style={style}>
    <g transform={l.flip ? 'translate(40,0) scale(-1,1)' : undefined}>
      <ellipse cx="20" cy="69" rx="10" ry="2" className="bh-shadow" />
      <g className="bh-body" style={style}>
        <rect className="bh-leg bh-leg-l" style={style} x="14" y="46" width="5" height="22" rx="2.5" fill={l.legs} />
        <rect className="bh-leg bh-leg-r" style={style} x="21" y="46" width="5" height="22" rx="2.5" fill={l.legs} />
        <rect x="11" y="27" width="18" height="22" rx="7" fill={l.top} />
        <rect className="bh-arm bh-arm-l" style={style} x="7" y="28" width="5" height="17" rx="2.5" fill={l.top} />
        <rect className="bh-arm bh-arm-r" style={style} x="28" y="28" width="5" height="17" rx="2.5" fill={l.top} />
        {l.hairStyle === 'long' && <rect x="10" y="10" width="20" height="20" rx="8" fill={l.hair} />}
        <circle cx="20" cy="17" r="9" fill={l.skin} />
        {l.hairStyle === 'short' && <path d="M11 16 Q11 7 20 7 Q29 7 29 16 Q25 11 20 11 Q15 11 11 16Z" fill={l.hair} />}
        {l.hairStyle === 'long' && <path d="M11 16 Q11 7 20 7 Q29 7 29 16 Q24 10 20 11 Q16 10 11 16Z" fill={l.hair} />}
        {l.hairStyle === 'bun' && <><circle cx="20" cy="6" r="4" fill={l.hair} /><path d="M11 15 Q11 8 20 8 Q29 8 29 15 Q24 11 20 11 Q16 11 11 15Z" fill={l.hair} /></>}
        <g className="bh-eyes" style={style}><circle cx="17" cy="17" r="1.2" fill="#1d232b" /><circle cx="23" cy="17" r="1.2" fill="#1d232b" /></g>
        {mood === 'tired' ? <path d="M17 22 H23" stroke="#1d232b" strokeWidth="1.2" strokeLinecap="round" /> : <path className="bh-mouth" style={style} d="M17 21 Q20 24 23 21" stroke="#1d232b" strokeWidth="1.2" fill="none" strokeLinecap="round" />}
        {sign && <g className="bh-sign"><rect x="26" y="0" width="2" height="30" fill="#6b5440" /><rect x="18" y="-12" width="22" height="14" rx="2" fill="var(--card)" stroke="var(--primary)" strokeWidth="1.5" /><text x="29" y="-2.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--primary)">{sign}</text></g>}
      </g>
    </g>
  </g>;
}

/** Standalone animated person. */
export function Bonhomme({ seed, mood = 'idle', delay = 0, className, sign }: { seed: string; mood?: PersonMood; delay?: number; className?: string; sign?: string }) {
  return <svg viewBox="0 -14 40 86" className={cn('h-16 w-8 overflow-visible', className)} aria-hidden><BonhommeG seed={seed} mood={mood} delay={delay} sign={sign} /></svg>;
}

/** A strip of people walking across, for places and scenes. */
export function Crowd({ seedBase, count, moods, signs, className }: { seedBase: string; count: number; moods?: PersonMood[]; signs?: string[]; className?: string }) {
  if (count <= 0) return null;
  return <div className={cn('relative flex items-end justify-around gap-1 overflow-hidden', className)} aria-hidden>
    {Array.from({ length: count }, (_, i) => {
      const mood = moods?.[i % moods.length] ?? 'walk';
      return <Bonhomme key={i} seed={`${seedBase}-${i}`} mood={mood} delay={i * 0.37} sign={signs?.[i]} className={mood === 'walk' ? 'bh-wander' : undefined} />;
    })}
  </div>;
}
