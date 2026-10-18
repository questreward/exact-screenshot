import { createFileRoute } from '@tanstack/react-router';
import { economyQuery, lifeQuery, clockQuery } from '@/services/game';
import { EconomyPage } from '@/components/game/EconomyPage';
import { gameMeta } from '@/game/metadata';
export const Route = createFileRoute('/_authenticated/_game/patrimoine')({
  head: () => ({ meta: gameMeta('Mon patrimoine', 'Épargne, budget personnel, biens, logement, formations et projets de vie dans CIVITAS.') }),
  loader: async ({ context: { queryClient:q } }) => { await q.ensureQueryData(economyQuery); await Promise.all([q.ensureQueryData(lifeQuery), q.ensureQueryData(clockQuery)]); },
  component: EconomyPage,
});