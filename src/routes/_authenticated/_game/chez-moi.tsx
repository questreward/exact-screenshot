import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Home, ArrowLeft } from 'lucide-react';
import { furnishingQuery } from '@/services/game';
import { gameMeta } from '@/game/metadata';
import { HomeFurnishing } from '@/components/game/HomeFurnishing';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/_authenticated/_game/chez-moi')({
  head: () => ({ meta: gameMeta('Chez moi', 'Aménagement privé de mes logements et placement de mes objets possédés dans CIVITAS.') }),
  loader: ({ context }) => context.queryClient.ensureQueryData(furnishingQuery),
  component: HomePage,
});
function HomePage() {
  const { data } = useSuspenseQuery(furnishingQuery);
  return <main className="mx-auto max-w-5xl space-y-5 p-4 pb-24"><header className="flex items-center gap-3"><Home className="h-8 w-8 text-primary"/><h1 className="font-heading text-2xl font-bold">Chez moi</h1></header><Button asChild variant="outline" className="min-h-11"><Link to="/logement"><ArrowLeft/>Logement</Link></Button><HomeFurnishing data={data}/></main>;
}
