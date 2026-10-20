import { BonhommeG } from './Bonhomme';

/** Scenic cabin only. Speed, route and trip outcomes stay with the existing server state. */
export function VehicleInterior({ kind, speed, limit, label }: { kind: 'voiture' | 'car' | 'train' | 'camion'; speed?: number; limit?: number; label: string }) {
  const driving = kind === 'voiture' || kind === 'camion';
  return <figure className="overflow-hidden border-y border-border bg-surface" aria-label={`Intérieur ${kind} · ${label}`}>
    <svg viewBox="0 0 600 330" className="block aspect-[20/11] w-full" role="img" aria-label={driving ? 'Vue du poste de conduite' : 'Vue de la cabine voyageurs'}>
      <rect width="600" height="330" fill="var(--surface)" />
      <path d="M25 25H575L560 238H40Z" fill="var(--secondary)" />
      <path d="M43 34H557L546 200H54Z" fill="var(--chart-3)" opacity=".35" />
      <path d="M45 126L105 75L156 112L228 70L308 111L389 73L460 111L550 86V204H45Z" fill="var(--success)" opacity=".35" />
      <path d="M258 128H342L435 216H165Z" fill="var(--muted)" />
      <path d="M300 137V154M300 166V188M300 198V215" stroke="var(--foreground)" strokeWidth="4" />
      <path d="M60 32L78 211M540 32L522 211" stroke="var(--foreground)" strokeWidth="8" />
      {limit !== undefined && <g transform="translate(437 116)"><circle r="25" fill="var(--background)" stroke="var(--destructive)" strokeWidth="5"/><text textAnchor="middle" y="6" fill="var(--foreground)" fontSize="17" fontWeight="bold">{limit}</text><path d="M0 25V69" stroke="var(--muted-foreground)" strokeWidth="4"/></g>}
      {driving ? <>
        <path d="M0 232Q300 194 600 232V330H0Z" fill="var(--foreground)" />
        <rect x="248" y="242" width="108" height="54" rx="6" fill="var(--background)" />
        <text x="302" y="266" textAnchor="middle" fill="var(--primary)" fontSize="23" fontWeight="bold">{speed === undefined ? '—' : Math.round(speed)}</text>
        <text x="302" y="285" textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">{speed === undefined ? 'POSTE DE CONDUITE' : 'km/h'}</text>
        <circle cx="145" cy="280" r="60" fill="none" stroke="var(--background)" strokeWidth="15" />
        <path d="M92 264L145 284L198 264M145 284V330" stroke="var(--background)" strokeWidth="12" />
        <circle cx="145" cy="280" r="16" fill="var(--primary)" />
        <rect x="400" y="246" width="116" height="37" rx="4" fill="var(--background)" />
        {[419, 443, 467, 491].map(x => <path key={x} d={`M${x} 252V278`} stroke="var(--muted-foreground)" strokeWidth="3"/>)}
        {kind === 'camion' && <>
          <path d="M278 26V93M278 38H327V77H278" fill="var(--background)" stroke="var(--foreground)" strokeWidth="4"/>
          <path d="M19 54H48V142H19ZM552 54H581V142H552Z" fill="var(--muted)" stroke="var(--foreground)" strokeWidth="5" />
          <path d="M22 78H44M556 78H578" stroke="var(--background)" strokeWidth="3" />
          <rect x="372" y="285" width="65" height="31" rx="4" fill="var(--muted)" />
          <path d="M398 286L400 252M384 294H423M384 305H423" stroke="var(--background)" strokeWidth="3" />
          <path d="M458 291H549V321H458Z" fill="var(--surface)" stroke="var(--background)" strokeWidth="2" />
          <text x="503" y="309" textAnchor="middle" fill="var(--foreground)" fontSize="9">RADIO · ÉQUIPE</text>
        </>}
      </> : <>
        <path d="M280 203H320L360 330H240Z" fill="var(--muted)" />
        {[60, 150, 390, 480].map((x, i) => <g key={x}>
          <g transform={`translate(${x + 15} 186)`}><BonhommeG seed={`passenger-${kind}-${i}`} mood="idle"/></g>
          <rect x={x} y="243" width="65" height="75" rx="8" fill="var(--primary)" />
          <path d={`M${x + 8} 276H${x + 57}`} stroke="var(--background)" strokeWidth="3" />
          <path d={`M${x + 6} 318V330M${x + 59} 318V330`} stroke="var(--foreground)" strokeWidth="5" />
        </g>)}
        <path d="M0 223H600" stroke="var(--foreground)" strokeWidth="9" />
      </>}
    </svg>
    <figcaption className="break-words px-3 py-2 text-xs text-muted-foreground">{label}</figcaption>
  </figure>;
}