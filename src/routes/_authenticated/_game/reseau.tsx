import { createFileRoute } from "@tanstack/react-router";
import { networkQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { NetworkPanel } from "@/components/game/NetworkPanel";

export const Route = createFileRoute("/_authenticated/_game/reseau")({
  head: () => ({ meta: gameMeta("Réseau", "Annuaire des joueurs, contacts, personnalités suivies et messages privés dans CIVITAS.") }),
  loader: async ({ context: { queryClient: q } }) => { await q.ensureQueryData(networkQuery); },
  component: () => <div className="space-y-4"><h1 className="text-2xl font-bold">Réseau</h1><NetworkPanel /></div>,
});
