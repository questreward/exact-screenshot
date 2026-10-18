import { createFileRoute } from '@tanstack/react-router';
import { clockQuery, eventsQuery } from '@/services/game';
import { EventsPage } from '@/components/game/EventsPage';
import { gameMeta } from '@/game/metadata';
export const Route = createFileRoute('/_authenticated/_game/evenements')({
  head: () => ({ meta: gameMeta('Événements', 'Événements locaux, nationaux et personnels de CIVITAS : participez, ignorez, suivez ce qui se passe dans votre ville.') }),
  loader: async ({ context: { queryClient: q } }) => { await q.ensureQueryData(eventsQuery); await q.ensureQueryData(clockQuery); },
  component: EventsPage,
});
