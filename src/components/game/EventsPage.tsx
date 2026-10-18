import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Sparkles, MapPin, Clock, Check, X, AlertTriangle, Newspaper, User, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { worldEventsQuery, eventAction } from '@/services/game';
import { canAct, displayPhase, filterEvents, rewardSummary, PARTICIPATION_LABEL, type EventTab, type WorldEvent } from '@/game/events';
import { gameHour } from '@/game/life';
import { useLifeMutation } from './LifeControls';
import { WorldClock } from './WorldClock';

const TABS: [EventTab, string][] = [['aujourdhui', 'Aujourd’hui'], ['a_venir', 'À venir'], ['pour_vous', 'Pour vous'], ['ma_ville', 'Ma ville'], ['recents', 'Récents']];
const when = (e: WorldEvent) => {
  const d = new Date(e.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return `${d} · ${gameHour(e.starts_at)}${e.ends_at ? ' → ' + gameHour(e.ends_at) : ''}`;
};
const PHASE: Record<WorldEvent['phase'], string> = { a_venir: 'À venir', en_cours: 'En cours', termine: 'Terminé' };

export function EventCard({ e, now }: { e: WorldEvent; now: string }) {
  const act = useLifeMutation(eventAction, 'Choix enregistré');
  const gains = rewardSummary(e.reward);
  const open = canAct(e, now);
  return <article className="space-y-3 rounded-lg border border-border bg-card p-4">
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{e.category}</Badge>
      <Badge variant={displayPhase(e, now) === 'en_cours' ? 'default' : 'secondary'}>{e.ends_at || e.phase === 'a_venir' ? PHASE[displayPhase(e, now)] : displayPhase(e, now) === 'termine' ? 'Archive' : 'Aujourd’hui'}</Badge>
      {e.personal && <Badge><User className="h-3 w-3" />Pour vous</Badge>}
      {e.scope === 'national' && <Badge variant="secondary">National</Badge>}
      {e.importance >= 65 && <Badge variant="destructive">Important</Badge>}
    </div>
    <h3 className="text-lg font-semibold">{e.title}</h3>
    {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
    <dl className="space-y-1 text-sm">
      <div className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><dd className="capitalize">{when(e)}</dd></div>
      {e.location_name && <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><dd>{e.location_name}</dd></div>}
      {e.reason && <div className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><dd>{e.reason}</dd></div>}
    </dl>
    {e.interactive && e.reward && <p className="text-xs text-muted-foreground">Énergie : −{e.reward.energy}{gains.length > 0 && <> · En cas de réussite : <span className="text-primary">{gains.join(' · ')}</span></>}{e.reward.success_rate < 100 && <> · Réussite non garantie</>}</p>}
    {e.participation && <p className="text-sm font-semibold text-primary">{PARTICIPATION_LABEL[e.participation.status]}</p>}
    {e.participation?.status === 'inscrit' && <p className="text-xs text-muted-foreground">Rendez-vous sur place et commencez l’activité depuis l’Agenda pendant les 30 premières minutes. Sinon, vous serez noté absent.</p>}
    {open && e.interactive && e.conflict && <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Conflit avec votre agenda : {e.conflict}</p>}
    {open && e.interactive && !e.eligible && <p className="text-sm text-muted-foreground">Cet événement ne correspond pas à votre situation.</p>}
    <div className="flex flex-wrap gap-2">
      {open && e.interactive && e.eligible && <Button className="min-h-11" disabled={act.isPending || !!e.conflict} onClick={() => act.mutate({ eventId: e.id, choice: 'participer' })}><Check />Participer</Button>}
      {open && <Button variant="outline" className="min-h-11" disabled={act.isPending} onClick={() => act.mutate({ eventId: e.id, choice: 'ignorer' })}><X />Ignorer</Button>}
      {e.location_id && e.city_id && <Button variant="outline" className="min-h-11" asChild><Link to="/carte" search={{ city: e.city_id, district: e.district_id ?? undefined, location: e.location_id }}><MapPin />Voir le lieu</Link></Button>}
      {e.news_id && <Button variant="ghost" className="min-h-11" asChild><Link to="/actualites/$id" params={{ id: e.news_id }}><Newspaper />Lire l’article</Link></Button>}
    </div>
  </article>;
}

export function EventsPage() {
  const { data } = useSuspenseQuery(worldEventsQuery);
  const [tab, setTab] = useState<EventTab>('aujourdhui');
  return <div className="space-y-6 animate-rise">
    <div><p className="mb-1 text-xs uppercase tracking-wider text-primary">CIVITAS · Monde vivant</p><h1 className="text-3xl font-bold">Événements</h1>
      <p className="mt-1 text-sm text-muted-foreground">La ville continue de vivre, même quand vous n’êtes pas connecté.</p></div>
    <WorldClock />
    {!data.enabled && <p className="rounded-lg border border-border p-3 text-sm">Les événements sont momentanément suspendus.</p>}
    <Tabs value={tab} onValueChange={v => setTab(v as EventTab)}>
      <TabsList className="flex h-auto w-full flex-wrap justify-start">{TABS.map(([id, label]) => <TabsTrigger key={id} value={id} className="min-h-11">{label}</TabsTrigger>)}</TabsList>
      {TABS.map(([id]) => {
        const list = filterEvents(data.events, id, data.now, data.city_id);
        return <TabsContent key={id} value={id} className="space-y-3">
          {list.length === 0 ? <div className="border-y border-border py-10 text-center"><Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" /><p>Rien de prévu ici pour le moment.</p></div>
            : list.map(e => <EventCard key={e.id} e={e} now={data.now} />)}
        </TabsContent>;
      })}
    </Tabs>
  </div>;
}

export function LocationEvents({ locationId }: { locationId: string }) {
  const { data } = useSuspenseQuery(worldEventsQuery);
  const list = data.events.filter(e => e.location_id === locationId && e.phase !== 'termine');
  if (list.length === 0) return null;
  return <div className="space-y-2 border-y border-border py-3">
    <p className="flex items-center gap-2 text-xs font-semibold text-primary"><Sparkles className="h-4 w-4" />Événements ici</p>
    {list.map(e => <p key={e.id} className="text-sm"><span className="font-semibold">{e.title}</span><br /><span className="text-xs capitalize text-muted-foreground">{when(e)}</span></p>)}
    <Button variant="outline" size="sm" className="min-h-11" asChild><Link to="/evenements">Voir les événements</Link></Button>
  </div>;
}
