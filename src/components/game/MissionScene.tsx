import { BonhommeG } from './Bonhomme';
import { missionStepLabel } from '@/game/job-missions';

/** Illustration only: the recorded mission step is the sole source of progress. */
export function MissionScene({ job, title, step, count, active }: { job: string; title: string; step: number; count: number; active: boolean }) {
  const fire = job === 'pompier_pro' || job === 'pompier_vol';
  const police = job === 'police' || job === 'gendarmerie';
  const health = job.startsWith('samu_') || job === 'protection_civile';
  const field = fire || police || health;
  const arrival = active && step === 0;
  return <figure className="mission-scene overflow-hidden border-y border-border bg-surface" aria-label={`Scène fictive : ${title}`}>
    <svg viewBox="0 0 600 210" className="block aspect-[20/7] w-full" aria-hidden="true">
      <rect width="600" height="210" fill="var(--surface)" />
      <path d="M0 166H600V210H0Z" fill="var(--muted)" />
      <path d="M15 195H125M160 195H270M305 195H415M450 195H560" stroke="var(--muted-foreground)" strokeWidth="3" strokeDasharray="15 15" />
      <rect x="320" y="24" width="190" height="144" rx="4" fill="var(--secondary)" />
      {[346, 399, 452].map(x => <g key={x}><rect x={x} y="44" width="30" height="30" fill="var(--background)" /><rect x={x} y="93" width="30" height="30" fill="var(--background)" /></g>)}
      <rect x="386" y="139" width="34" height="29" fill="var(--background)" />
      <path d="M306 25H524" stroke="var(--muted-foreground)" strokeWidth="5" />
      {field ? <g className={arrival ? 'mission-vehicle-arriving' : undefined}>
        <path d="M48 129V105Q48 98 58 98H158L193 129V165H48Z" fill={police ? 'var(--chart-3)' : fire ? 'var(--primary)' : 'var(--foreground)'} />
        <path d="M154 108H162L184 129H154Z" fill="var(--background)" />
        <rect x="62" y="110" width="37" height="20" rx="2" fill="var(--background)" />
        <path d="M51 141H190" stroke="var(--secondary)" strokeWidth="5" />
        <circle cx="79" cy="166" r="13" fill="var(--background)" /><circle cx="165" cy="166" r="13" fill="var(--background)" />
        <circle cx="79" cy="166" r="5" fill="var(--muted-foreground)" /><circle cx="165" cy="166" r="5" fill="var(--muted-foreground)" />
        <rect x="115" y="91" width="25" height="7" rx="2" fill="var(--chart-3)" />
        {health && <path d="M119 113V132M110 122H128" stroke="var(--success)" strokeWidth="6" />}
        {fire && <path d="M54 91H107M58 85V97M71 85V97M84 85V97M97 85V97" stroke="var(--muted-foreground)" strokeWidth="3" />}
      </g> : <g><rect x="65" y="120" width="130" height="48" fill="var(--secondary)" /><rect x="95" y="76" width="55" height="39" rx="4" fill="var(--muted)" /><path d="M120 112V121" stroke="var(--muted-foreground)" strokeWidth="4" /></g>}
      <g transform="translate(222 101)"><BonhommeG seed={`${job}-crew`} mood={arrival ? 'walk' : active ? 'talk' : 'idle'} /></g>
      <g transform="translate(281 101)"><BonhommeG seed={`${job}-colleague`} mood={active ? 'talk' : 'idle'} delay={0.5} /></g>
      <g transform="translate(530 101)"><BonhommeG seed={`${job}-resident`} mood="idle" /></g>
    </svg>
    <figcaption className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground"><span>{fire ? 'Équipe incendie' : police ? 'Patrouille' : health ? 'Équipe de secours' : 'Sur le lieu de travail'}</span><span>{active ? missionStepLabel(step, count) : 'Intervention clôturée'}</span></figcaption>
  </figure>;
}