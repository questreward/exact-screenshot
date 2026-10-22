import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { MapPin, Newspaper, Radio, CalendarDays } from 'lucide-react';
import { worldEventsQuery } from '@/services/game';
import { worldFeed } from '@/game/world-feed';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventSceneImage } from './EventScene';

export function WorldEventFeed({ cityId, districtId, cityName, compact = false }: { cityId: string; districtId?: string | undefined; cityName?: string | undefined; compact?: boolean }) {
  const query = useQuery(worldEventsQuery);
  const data = query.data;
  const events = data?.enabled ? worldFeed(data.events, data.now, cityId, districtId).slice(0, compact ? 1 : 3) : [];
  return <section aria-label="La ville en direct" className="min-w-0 space-y-3 border-y border-border py-4">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Radio className="h-5 w-5 shrink-0 text-primary" />{cityName ? `${cityName} en direct` : 'Dans votre ville'}</h2>
    {query.isError ? <div role="status" className="text-sm text-muted-foreground"><p>Les événements n’ont pas pu être actualisés.</p><Button variant="ghost" className="min-h-11" onClick={() => void query.refetch()}>Réessayer</Button></div> : query.isPending ? <p role="status" className="text-sm text-muted-foreground">Consultation des événements…</p> : !events.length ? <p className="text-sm text-muted-foreground">{data?.enabled === false ? 'Les événements sont momentanément suspendus.' : 'Aucun événement public en cours dans ce secteur.'}</p> :
      <ul className="divide-y divide-border">{events.map(event => <li key={event.id} className="space-y-3 py-3">
        {!compact && event.importance >= 65 && <EventSceneImage category={event.press_category ?? event.category} title={event.title} />}
        <div className="flex flex-wrap gap-2"><Badge variant={event.importance >= 65 ? 'destructive' : 'secondary'}>{event.importance >= 65 ? 'Important' : 'En cours'}</Badge><Badge variant="outline">{event.category}</Badge>{event.scope === 'national' && <Badge variant="outline">National</Badge>}</div>
        <h3 className="break-words font-semibold">{event.title}</h3>
        {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
        {event.location_name && <p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{event.location_name}</p>}
        <p className="text-xs text-muted-foreground">Début : {new Date(event.starts_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}{event.ends_at && <> · Fin prévue : {new Date(event.ends_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</>}</p>
        {(event.travel_delay_minutes ?? 0) > 0 && <p className="text-sm text-warning">Retard annoncé : +{event.travel_delay_minutes} min sur les transports concernés.</p>}
        <div className="flex flex-wrap gap-2">
          {event.location_id && event.city_id && <Button asChild variant="outline" className="min-h-12"><Link to="/carte" search={{ city: event.city_id, district: event.district_id ?? undefined, location: event.location_id }}><MapPin />Voir le lieu</Link></Button>}
          {event.news_id && <Button asChild variant="outline" className="min-h-12"><Link to="/actualites/$id" params={{ id: event.news_id }}><Newspaper />Lire l’article</Link></Button>}
          {event.participation?.activity_id && <Button asChild variant="outline" className="min-h-12"><Link to="/agenda"><CalendarDays />Mon activité</Link></Button>}
        </div>
      </li>)}</ul>}
    <Button asChild variant="ghost" className="min-h-12 w-full"><Link to="/evenements">Événements et historique</Link></Button>
  </section>;
}