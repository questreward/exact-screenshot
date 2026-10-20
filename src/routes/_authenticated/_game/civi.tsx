import { createFileRoute } from "@tanstack/react-router";
import { civiNetworkQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { CiviNetwork } from "@/components/game/CiviNetwork";

export const Route = createFileRoute("/_authenticated/_game/civi")({
  head: () => ({ meta: gameMeta("Civi", "Le réseau social de CIVITAS : publications, abonnés, commentaires et buzz.") }),
  loader: async ({ context: { queryClient: q } }) => { await q.ensureQueryData(civiNetworkQuery("pour_toi")); },
  component: () => <div className="space-y-4"><h1 className="text-2xl font-bold">Civi</h1><CiviNetwork /></div>,
});
