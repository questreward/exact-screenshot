import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowRight, MapPin, Radio, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { weatherQuery, worldEventsQuery } from '@/services/game';
import { PHASE_LABELS } from '@/game/world';
import { publicPlaceEvents } from '@/game/living-city';
import { useWorldClock } from './WorldClock';

export function PlaceAtmosphere({ cityId }: { cityId: string }) {
  const { data: weather } = useSuspenseQuery(weatherQuery(cityId));
  const { time, phase } = useWorldClock();
  const Icon = phase === 'nuit' ? Moon : Sun;
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3 text-xs text-muted-foreground">
    <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{PHASE_LABELS[phase]} · {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</span>
    {weather && <span>{weather.condition === 'clair' ? 'Ciel clair' : weather.condition} · {weather.temperature} °C · Météo simulée</span>}
  </div>;
}

export function PublicPlaceLife({ cityId, locationId }: { cityId: string; locationId: string }) {
  const { data } = useSuspenseQuery(worldEventsQuery);
  const events = publicPlaceEvents(data.events, cityId, locationId, data.now);
  return <section aria-label="Vie du lieu" className="space-y-3 border-t border-border pt-4">
    <h4 className="flex items-center gap-2 font-semibold"><Radio className="h-4 w-4 text-primary" />La vie du lieu</h4>
    {events.length ? <ul className="divide-y divide-border">{events.map(e => <li key={e.id} className="py-3">
      <p className="mb-1 flex items-center gap-1 text-xs text-primary"><MapPin className="h-3 w-3" />{e.location_id === locationId ? 'Dans ce lieu' : 'Dans la ville · lieu non précisé'}</p>
      <p className="break-words text-sm font-semibold">{e.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">En cours</p>
    </li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun événement public en cours signalé ici.</p>}
    <Button asChild variant="outline" className="min-h-11 w-full"><Link to="/evenements">Les événements<ArrowRight /></Link></Button>
  </section>;
}