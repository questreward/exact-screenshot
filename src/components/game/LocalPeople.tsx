import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Users, UserRound, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { locationPresenceQuery } from '@/services/game';
import { localPeople } from '@/game/local-presence';
import { normalizeAppearance } from '@/game/appearance';
import { CharacterAvatar } from './CharacterAvatar';
import { ExperienceState } from './ExperienceState';
import { NpcChat } from './NpcChat';

export function LocalPeople({ locationId, here }: { locationId: string; here: boolean }) {
  const query = useQuery(locationPresenceQuery(locationId));
  const people = localPeople(query.data ?? []);
  return <section className="space-y-3 border-t border-border pt-4" aria-label="Habitants présents">
    <h4 className="flex items-center gap-2 font-semibold"><Users className="h-5 w-5 text-primary" />Les habitants ici</h4>
    {query.isPending && <ExperienceState kind="loading" title="Recherche des habitants présents…" />}
    {query.isError && <ExperienceState kind="error" title="Présences momentanément indisponibles" onRetry={() => void query.refetch()} />}
    {query.isSuccess && !people.length && <p className="text-sm text-muted-foreground">Aucun habitant signalé ici pour le moment.</p>}
    <ul className="grid gap-2 sm:grid-cols-2">{people.map(person => <li key={person.id} className="min-h-24 space-y-3 rounded-lg border border-border bg-surface p-3"><div className="flex items-center gap-3">
      <span className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent">{'appearance' in person && person.appearance ? <CharacterAvatar appearance={normalizeAppearance(person.appearance)} /> : <UserRound className="h-8 w-8 text-muted-foreground" />}</span>
      <span className="min-w-0"><span className="block break-words font-semibold">{person.first_name} {person.last_name}</span><span className="block break-words text-xs text-muted-foreground">{person.profession}</span><span className="mt-1 block text-xs text-primary">{person.known ? 'Vous vous connaissez' : 'À découvrir'}</span></span>
    </div>{here && <NpcChat npcId={person.id} name={person.first_name} here={here} />}</li>)}</ul>
    {people.length > 0 && (here ? <Button asChild variant="outline" className="min-h-12 w-full"><Link to="/telephone" search={{ app: 'contacts' }}><MessageCircle />Mes contacts</Link></Button> : <p className="text-xs text-muted-foreground">Rejoignez ce lieu pour rencontrer ses habitants.</p>)}
  </section>;
}