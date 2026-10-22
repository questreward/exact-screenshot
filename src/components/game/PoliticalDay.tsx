import { Link } from '@tanstack/react-router';
import { CalendarDays, MapPin, ArrowRight, Users, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PoliticalState } from '@/game/politics';
import type { ElectionState } from '@/game/elections';
import { localPoliticalEvents, politicalAppointments } from '@/game/political-day';

const when = (at: string) => new Date(at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export function PoliticalDay({ politics, elections }: { politics: PoliticalState; elections?: ElectionState }) {
  const appointments = politicalAppointments(politics, elections);
  const events = localPoliticalEvents(politics).slice(0, 3);
  const mine = elections?.elections.find(e => e.status !== 'completed' && e.candidates.some(c => c.mine && c.status === 'validated'));
  return <section className="experience-section space-y-4" aria-label="Ma vie politique dans la ville">
    <header><p className="text-xs text-primary">Sur le terrain</p><h2 className="font-heading text-xl font-bold">Ma vie politique dans la ville</h2></header>
    {appointments.length ? <ol className="divide-y divide-border">{appointments.slice(0, 5).map(a => <li key={a.id} className="space-y-2 py-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" />{when(a.start)} · {a.status === 'running' ? 'En cours' : 'Prévue'}</p>
      <h3 className="break-words font-semibold">{a.title}</h3>
      {a.location && <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{a.location.name}</p>}
      <div className="flex flex-wrap gap-2">
        {a.location && <Button asChild variant="outline" className="min-h-12"><Link to="/carte" search={{ city: a.location.city_id, district: a.location.district_id ?? undefined, location: a.location.id }}>Voir le lieu<MapPin /></Link></Button>}
        <Button asChild variant="ghost" className="min-h-12">{a.electionId ? <Link to="/elections/$id" params={{ id: a.electionId }}>Ma campagne<ArrowRight /></Link> : a.organizationId ? <Link to="/politique/$id" params={{ id: a.organizationId }}>L’activité du parti<ArrowRight /></Link> : <Link to="/agenda">Mon agenda<ArrowRight /></Link>}</Button>
      </div>
    </li>)}</ol> : <p className="text-sm text-muted-foreground">Aucune activité politique prévue dans votre agenda.</p>}
    {events.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Rencontres proposées dans ma ville</h3>{events.map(({ event, organization }) => <article key={event.id} className="space-y-2 border-b border-border py-3">
      <p className="font-semibold">{event.title}</p><p className="text-sm text-muted-foreground">{event.location.name} · {organization.name}</p>
      <p className="text-xs text-muted-foreground">À partir de {event.start_hour} h · {event.duration_minutes} min · −{event.energy_cost} énergie</p>
      <Button asChild variant="outline" className="min-h-12"><Link to="/politique/$id" params={{ id: organization.id }}>Examiner cette activité<ArrowRight /></Link></Button>
    </article>)}</div>}
    <div className="grid grid-cols-2 gap-2">
      <Button asChild variant="outline" className="min-h-12"><Link to="/agenda"><CalendarDays />Agenda</Link></Button>
      <Button asChild variant="outline" className="min-h-12"><Link to="/politique" search={{ tab: 'personnalites' }}><Users />Rencontres</Link></Button>
      <Button asChild variant="outline" className="min-h-12"><Link to="/actualites"><Newspaper />Actualités</Link></Button>
      <Button asChild variant="outline" className="min-h-12">{mine ? <Link to="/elections/$id" params={{ id: mine.id }}>Ma campagne<ArrowRight /></Link> : <Link to="/elections">Élections<ArrowRight /></Link>}</Button>
    </div>
  </section>;
}