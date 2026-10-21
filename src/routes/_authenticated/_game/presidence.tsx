import { createFileRoute } from "@tanstack/react-router";
import { presidencyQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { InstitutionScene } from "@/components/game/InstitutionScene";
import { PresidencyPage } from "@/components/game/PresidencyPage";

export const Route = createFileRoute("/_authenticated/_game/presidence")({
  head: () => ({ meta: gameMeta("Présidence", "Élysée : élection présidentielle, allocutions, lois et référendums dans CIVITAS.") }),
  loader: async ({ context: { queryClient: q } }) => { await q.ensureQueryData(presidencyQuery); },
  component: () => <div className="space-y-4"><InstitutionScene kind="elysee" /><PresidencyPage /></div>,
});
