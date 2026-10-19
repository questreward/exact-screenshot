import { createFileRoute } from '@tanstack/react-router';
import { economyQuery, lifeQuery, clockQuery } from '@/services/game';
import { EconomyPage } from '@/components/game/EconomyPage';
import { gameMeta } from '@/game/metadata';
import { BankLoans } from '@/components/game/BankLoans';
import { InsuranceCard } from '@/components/game/InsuranceCard';
import { BusinessCard } from '@/components/game/BusinessCard';
export const Route = createFileRoute('/_authenticated/_game/patrimoine')({
  head: () => ({ meta: gameMeta('Mon patrimoine', 'Épargne, budget personnel, biens, logement, formations et projets de vie dans CIVITAS.') }),
  loader: async ({ context: { queryClient:q } }) => { await q.ensureQueryData(economyQuery); await Promise.all([q.ensureQueryData(lifeQuery), q.ensureQueryData(clockQuery)]); },
  component: Patrimoine,
});
function Patrimoine(){return <div className="space-y-6"><EconomyPage/><BankLoans/><InsuranceCard/><BusinessCard/></div>;}
