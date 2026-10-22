import { Link } from '@tanstack/react-router';
import { CalendarDays, MapPin, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { workSchedule } from '@/game/work-schedule';
import type { LifeActivity } from '@/game/life-state';
import { useWorldClock } from './WorldClock';

const when = (s: string) => new Date(s).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export function WorkSchedule({ activities }: { activities: LifeActivity[] }) {
  const { time } = useWorldClock();
  const { active, lastCompleted } = workSchedule(activities);
  return <section className="space-y-3 border-b border-border pb-4" aria-label="Planning professionnel">
    <h2 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 shrink-0 text-primary" />Mes services</h2>
    {active.length ? <ul className="divide-y divide-border">{active.map(a => <li key={a.id} className="space-y-2 py-3">
      <p className="break-words font-semibold">{a.title}</p>
      <p className="text-xs text-primary">{a.status === 'planned' ? 'Service prévu' : Date.parse(a.end_time) <= time.getTime() ? 'Relève en attente de confirmation' : 'En service'}</p>
      <p className="text-xs text-muted-foreground">{when(a.start_time)} → {when(a.end_time)}</p>
      {a.location && <p className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0 text-primary" /><span className="break-words">{a.location.name}</span></p>}
      <div className="grid gap-2">
        <Button asChild className="min-h-12 w-full"><Link to="/carriere"><Briefcase />{a.status === 'running' ? 'Reprendre mon service' : 'Préparer mon service'}</Link></Button>
        {a.location?.id && <Button asChild variant="outline" className="min-h-12 w-full"><Link to="/carte" search={{ city: a.location.city_id, district: a.location.district_id ?? undefined, location: a.location.id }}><MapPin />Voir le lieu du service</Link></Button>}
      </div>
    </li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun service réservé.</p>}
    {lastCompleted && <div className="space-y-2 border-t border-border pt-3"><p className="text-xs text-muted-foreground">Dernier service terminé · {when(lastCompleted.end_time)}</p><p className="break-words text-sm font-semibold">{lastCompleted.title}</p><Button asChild variant="outline" className="min-h-12 w-full"><Link to="/carriere">Consulter ma carrière et mes bilans</Link></Button></div>}
  </section>;
}