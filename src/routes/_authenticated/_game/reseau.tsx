import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { characterQuery, networkQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { NetworkPanel } from "@/components/game/NetworkPanel";
import { InviteFriends } from "@/components/game/InviteFriends";

export const Route = createFileRoute("/_authenticated/_game/reseau")({
  head: () => ({ meta: gameMeta("Réseau", "Annuaire des joueurs, contacts, personnalités suivies et messages privés dans CIVITAS.") }),
  loader: async ({ context: { queryClient: q } }) => { await q.ensureQueryData(networkQuery); },
  component: NetworkPage,
});

function NetworkPage() {
  const { data: ch } = useQuery({ ...characterQuery, throwOnError: false });
  return <div className="space-y-4"><h1 className="text-2xl font-bold">Réseau</h1>
    {ch?.first_name && <InviteFriends firstName={ch.first_name} />}
    <NetworkPanel /></div>;
}
