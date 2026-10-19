import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, ScrollText } from "lucide-react";
import { citizenCvQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { SKILL_LABELS } from "@/game/life-profile";

export const Route = createFileRoute("/_authenticated/_game/mon-parcours")({
  head: () => ({ meta: gameMeta("Mon parcours", "Votre CV citoyen : études, emplois, engagements, mandats et distinctions.") }),
  component: CvPage,
});

const yr = (s?: string | null) => (s ? new Date(s).getFullYear() : "…");
const period = (since?: string, until?: string | null, active?: boolean) => `${yr(since)} – ${active ? "aujourd'hui" : until ? yr(until) : "…"}`;
const ROLE: Record<string, string> = { founder: "Fondateur", manager: "Responsable", member: "Membre" };
const KIND: Record<string, string> = { party: "Parti", movement: "Mouvement", association: "Association" };
const PROJECT: Record<string, string> = { termine: "Réalisé", echec: "Échec" };

function Block({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4">
    <h2 className="mb-2 border-b border-border pb-1 font-heading text-sm font-bold uppercase tracking-wide text-primary">{title}</h2>
    {empty ? <p className="text-sm text-muted-foreground">Rien pour l'instant.</p> : <ul className="space-y-2">{children}</ul>}
  </section>;
}
const Line = ({ main, sub }: { main: string; sub: string }) => <li><p className="font-semibold">{main}</p><p className="text-xs text-muted-foreground">{sub}</p></li>;

function CvPage() {
  const { data: cv, isLoading, isError } = useQuery(citizenCvQuery);
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><ScrollText className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Mon parcours</h1><p className="text-sm text-muted-foreground">Ton CV citoyen, construit à partir de ce que tu as vraiment fait.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Mon parcours : Disponible dans une prochaine étape.</p>}
    {cv && <>
      <div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="font-heading text-xl font-bold">{cv.identity.name}</p><p className="text-sm opacity-80">{cv.identity.age} ans · {cv.identity.city}</p></div>
      <Block title="Compétences" empty={!cv.skills?.length}><li className="flex flex-wrap gap-2">{cv.skills?.map(s => <span key={s.dimension} className="rounded-full bg-muted px-3 py-1 text-sm">{SKILL_LABELS[s.dimension] ?? s.dimension} · {s.value}</span>)}</li></Block>
      <Block title="Emplois" empty={!cv.jobs.length}>{cv.jobs.map((j, i) => <Line key={i} main={j.title} sub={`${j.employer} · ${period(j.since, null, j.active)}${j.level ? ` · échelon ${j.level}` : ""}`} />)}</Block>
      <Block title="Études" empty={!cv.studies.length}>{cv.studies.map((s, i) => <Line key={i} main={s.title} sub={`Depuis ${yr(s.since)} · semestre ${s.semester} · ${s.progress} %`} />)}</Block>
      <Block title="Entreprises" empty={!cv.businesses.length}>{cv.businesses.map((b, i) => <Line key={i} main={b.name} sub={`Créée en ${yr(b.since)} · ${b.status === "active" ? "en activité" : "fermée"}`} />)}</Block>
      <Block title="Mandats et responsabilités" empty={!cv.mandates.length && !cv.organizations.some(o => o.role !== "member")}>
        {cv.mandates.map((m, i) => <Line key={"m" + i} main={`${m.function} de ${m.city}`} sub={period(m.since, m.until, m.active)} />)}
        {cv.organizations.filter(o => o.role !== "member").map((o, i) => <Line key={"r" + i} main={`${ROLE[o.role] ?? o.role} · ${o.name}`} sub={period(o.since, o.until, o.active)} />)}
      </Block>
      <Block title="Associations et engagements" empty={!cv.organizations.length && !cv.unions.length}>
        {cv.organizations.map((o, i) => <Line key={"o" + i} main={o.name} sub={`${KIND[o.kind] ?? o.kind} · ${ROLE[o.role] ?? o.role} · ${period(o.since, o.until, o.active)}`} />)}
        {cv.unions.map((u, i) => <Line key={"u" + i} main={u.name} sub={`Syndicat · ${period(u.since, u.until, !u.until)}`} />)}
      </Block>
      <Block title="Projets citoyens" empty={!cv.projects.length}>{cv.projects.map((p, i) => <Line key={i} main={p.title} sub={`${yr(p.at)} · ${PROJECT[p.status] ?? "En cours"}`} />)}</Block>
      <Block title="Distinctions" empty={!cv.distinctions.length}>{cv.distinctions.map((d, i) => <Line key={i} main={d.title} sub={d.at ? String(yr(d.at)) : ""} />)}</Block>
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {([["petitions", "Pétitions signées"], ["project_supports", "Projets soutenus"], ["protests", "Manifestations organisées"], ["forum_posts", "Interventions en débat"], ["polls_answered", "Sondages répondus"]] as const).map(([k, l]) =>
          <div key={k} className="rounded-xl border border-border bg-card p-3 text-center"><p className="font-heading text-2xl font-bold">{cv.engagements[k] ?? 0}</p><p className="text-xs text-muted-foreground">{l}</p></div>)}
      </section>
    </>}
  </div>;
}
