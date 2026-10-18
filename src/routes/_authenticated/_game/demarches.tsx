import { createFileRoute } from '@tanstack/react-router';
import { adminQuery, clockQuery } from '@/services/game';
import { AdminPage } from '@/components/game/AdminPage';
import { gameMeta } from '@/game/metadata';
export const Route = createFileRoute('/_authenticated/_game/demarches')({
  head: () => ({ meta: gameMeta('Mes démarches', 'Démarches administratives simulées : déclaration de revenus, aides, documents et échéances dans CIVITAS.') }),
  loader: async ({ context: { queryClient: q } }) => { await q.ensureQueryData(adminQuery); await q.ensureQueryData(clockQuery); },
  component: AdminPage,
});
