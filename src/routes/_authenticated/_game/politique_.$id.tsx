import { createFileRoute } from "@tanstack/react-router";
import { politicsQuery, positionQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { PoliticalOrgPage } from "@/components/game/PoliticalOrgPage";

export const Route = createFileRoute("/_authenticated/_game/politique_/$id")({
  head: () => ({ meta: gameMeta("Organisation politique", "Idées, priorités, implantation et activités d’une organisation politique fictive de CIVITAS.") }),
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(politicsQuery), q.ensureQueryData(positionQuery)]),
  component: PoliticalOrgRoute,
});
function PoliticalOrgRoute() {
  const { id } = Route.useParams();
  return <PoliticalOrgPage id={id} />;
}
