import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gameMeta } from "@/game/metadata";
import { portalById } from "@/game/civitas-portals";

export const Route = createFileRoute("/_authenticated/_game/portail/$id")({
  loader: ({ params }) => { const p = portalById(params.id); if (!p) throw notFound(); return p; },
  head: ({ loaderData }) => ({ meta: gameMeta(loaderData?.name ?? "Portail", loaderData ? `${loaderData.name} : simulation CIVITAS inspirée de ${loaderData.real}.` : "Portail de services CIVITAS.") }),
  component: PortalPage,
  notFoundComponent: () => <main className="mx-auto max-w-2xl space-y-4 p-4"><p>Ce portail n'existe pas.</p><Button asChild variant="outline" className="min-h-12"><Link to="/civitas-services"><ArrowLeft />CIVITAS Services</Link></Button></main>,
  errorComponent: () => <main className="p-4">Portail indisponible.</main>,
});

function PortalPage() {
  const p = Route.useLoaderData();
  return <main className="mx-auto max-w-2xl space-y-5 p-4 pb-24">
    <Button asChild variant="outline" className="min-h-11"><Link to="/civitas-services"><ArrowLeft />CIVITAS Services</Link></Button>
    <header className="flex items-center gap-3 rounded-xl bg-secondary p-4 text-secondary-foreground"><Landmark className="h-10 w-10 shrink-0" />
      <div><h1 className="font-heading text-2xl font-bold">{p.name}</h1><p className="text-sm opacity-80">Équivalent réel : {p.real}</p></div></header>
    <p className="rounded-lg border border-primary p-3 text-xs font-semibold text-primary">Simulation CIVITAS — pas un vrai service public.</p>
    <section className="space-y-2"><h2 className="font-heading text-lg font-semibold">Dans la vraie vie</h2><p className="text-sm">{p.about}</p></section>
    <section className="space-y-2"><h2 className="font-heading text-lg font-semibold">Dans le jeu</h2><ul className="list-disc space-y-1 pl-5 text-sm">{p.inGame.map(t => <li key={t}>{t}</li>)}</ul></section>
    <div className="grid gap-2">{p.links.map(l => <Link key={l.path} to={l.path} className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-card px-4 font-semibold hover:border-primary">{l.label}<ChevronRight className="h-5 w-5 text-primary" /></Link>)}</div>
  </main>;
}
