import { createFileRoute } from "@tanstack/react-router";
import { politicsQuery, positionQuery, governanceQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { PoliticsPage, type PoliticsSearch } from "@/components/game/PoliticsPage";

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
export const Route = createFileRoute("/_authenticated/_game/politique")({
  validateSearch: (s: Record<string, unknown>): PoliticsSearch => ({ tab: str(s["tab"]), a: str(s["a"]), b: str(s["b"]) }),
  head: () => ({ meta: gameMeta("Politique", "Mouvements et partis fictifs, opinions, comparateur et engagement politique dans CIVITAS.") }),
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(politicsQuery), q.ensureQueryData(positionQuery),q.ensureQueryData(governanceQuery)]),
  component: PoliticsRoute,
});
function PoliticsRoute() {
  return <PoliticsPage search={Route.useSearch()} />;
}
