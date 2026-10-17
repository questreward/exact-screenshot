import { createFileRoute, notFound } from "@tanstack/react-router";
import { ComingSoon } from "@/components/game/ComingSoon";
import { SECTIONS } from "@/game/navigation";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/section/$id")({
  loader: ({ params }) => {
    const section = SECTIONS.find((s) => s.id === params.id && !s.available);
    if (!section) throw notFound();
    return { id: section.id };
  },
  head: ({ loaderData }) => {
    const section = SECTIONS.find(s => s.id === loaderData?.id);
    return { meta: gameMeta(section?.label ?? "Section indisponible", section?.description ?? "Section du monde CIVITAS indisponible.") };
  },
  component: SectionPage,
});

function SectionPage() {
  const { id } = Route.useLoaderData();
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) return null;
  return <div className="pt-6"><ComingSoon icon={s.icon} title={s.label} description={s.description} /></div>;
}
