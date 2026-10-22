import { Clock, Flag, Route, Camera, Navigation } from 'lucide-react';
import { journeySummary } from '@/game/journey-summary';
import type { DriveSegment, DriveRadar } from '@/game/driving';

export function JourneyProgress({ start, end, now, destination, segments, radars }: { start: string; end: string; now: number; destination: string; segments?: DriveSegment[]; radars?: DriveRadar[] }) {
  const s = journeySummary(start, end, now, segments, radars);
  return <section className="space-y-3 border-y border-border py-3" aria-label="Suivi du trajet">
    <p className="flex min-w-0 items-start gap-2 text-sm font-semibold"><Navigation className="h-5 w-5 shrink-0 text-primary" /><span className="min-w-0 break-words">{destination}</span></p>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <p className="flex items-start gap-2"><Clock className="h-4 w-4 shrink-0 text-primary" /><span>{s.awaitingConfirmation ? 'Arrivée à confirmer' : s.remainingMinutes === null ? 'Durée indisponible' : `${s.remainingMinutes} min du jeu restantes`}</span></p>
      <p className="flex items-start gap-2"><Flag className="h-4 w-4 shrink-0 text-primary" /><span>{Math.round(s.progress)} % du trajet</span></p>
    </div>
    {s.segment && <p className="flex items-start gap-2 text-sm"><Route className="h-4 w-4 shrink-0 text-primary" /><span className="break-words">{s.segment.label} · {s.segment.limit} km/h</span></p>}
    {s.nextSegment && <p className="text-xs text-muted-foreground">À suivre : {s.nextSegment.label} · {s.nextSegment.limit} km/h</p>}
    {s.nextRadar && <p className="flex items-start gap-2 text-xs text-muted-foreground"><Camera className="h-4 w-4 shrink-0" /><span>Prochain radar : {s.nextRadar.limit} km/h · à {Math.round(s.nextRadar.at)} % du trajet</span></p>}
  </section>;
}