import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { electionsQuery, newsQuery, politicsQuery } from "@/services/game";
import { ELECTION_STATUS } from "@/game/elections";
import { PATH_STEPS, politicalPath } from "@/game/political-path";

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// Phone app gathering the existing political spaces in one place. Read-only; actions stay on their pages.
export function PoliticsApp() {
  const { data: pol } = useQuery(politicsQuery);
  const { data: el } = useQuery(electionsQuery);
  const { data: news } = useQuery(newsQuery);
  const elections = el?.elections ?? [];
  const mine = elections.flatMap(e => e.candidates.filter(c => c.mine).map(c => ({ electionStatus: e.status, status: c.status })));
  const mandates = elections.flatMap(e => e.mandate && e.candidates.some(c => c.mine && c.id === e.mandate?.candidacy_id) ? [e.mandate] : []);
  const path = politicalPath({ opinions: pol?.opinions.length ?? 0, memberships: pol?.memberships ?? [], candidacies: mine, mandates });
  const open = elections.filter(e => e.status !== "completed");
  const agenda = open.flatMap(e => [
    { at: e.candidacy_ends_at, label: `Fin des candidatures · ${e.name}` },
    { at: e.debate_at, label: `Débat · ${e.name}` },
    { at: e.vote_starts_at, label: `Vote · ${e.name}` },
    { at: e.count_at, label: `Résultats · ${e.name}` },
  ]).filter(x => pol && x.at >= pol.world_now).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 4);
  const polNews = (news?.articles ?? []).filter(a => /polit|élect|mairie|conseil|assembl|gouvern/i.test(a.category + " " + a.title)).slice(0, 3);
  const parties = (pol?.organizations ?? []).filter(o => o.city_id === pol?.city_id).slice(0, 4);

  return <div className="space-y-4">
    <section className="experience-section">
      <p className="text-xs text-muted-foreground">Mon parcours politique</p>
      <p className="font-heading text-xl font-bold">{path.step.emoji} {path.step.label}</p>
      <div className="mt-2 flex gap-1">{PATH_STEPS.map((s, i) => <span key={s.id} className={`h-2 flex-1 rounded-full ${i <= path.level ? "bg-primary" : "bg-muted"}`} />)}</div>
      {path.next ? <p className="mt-2 text-sm">Prochaine étape : {path.next.emoji} {path.next.label} — {path.next.how}</p> : <p className="mt-2 text-sm">Tu es au sommet du parcours.</p>}
    </section>

    <section>
      <h2 className="mb-2 font-semibold">🗳️ Élections</h2>
      {open.length ? open.map(e => <Link key={e.id} to="/elections/$id" params={{ id: e.id }} className="mb-2 flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border py-3 text-sm">
        <span>{e.name}</span><span className="text-xs text-primary">{ELECTION_STATUS[e.status] ?? e.status}</span></Link>)
        : <p className="text-sm text-muted-foreground">Aucune élection en cours.</p>}
    </section>

    <section>
      <h2 className="mb-2 font-semibold">📅 Agenda politique</h2>
      {agenda.length ? <ul className="space-y-1 text-sm">{agenda.map(a => <li key={a.label} className="flex gap-2"><span className="w-20 shrink-0 text-xs text-muted-foreground">{day(a.at)}</span>{a.label}</li>)}</ul>
        : <p className="text-sm text-muted-foreground">Rien de prévu pour l'instant.</p>}
    </section>

    <section>
      <h2 className="mb-2 font-semibold">👥 Partis et mouvements de ta ville</h2>
      {parties.map(o => <Link key={o.id} to="/politique/$id" params={{ id: o.id }} className="mb-2 flex min-h-12 items-center gap-2 rounded-xl bg-muted px-3 text-sm">
        <span className="text-lg">{o.symbol}</span><span className="min-w-0 flex-1 break-words">{o.name}</span><span className="text-xs text-muted-foreground">{o.member_count} membres</span></Link>)}
    </section>

    {mandates.length > 0 && <Link to="/mandat" className="flex min-h-12 items-center rounded-xl bg-primary/15 px-3 text-sm font-semibold">🏛️ Mon mandat</Link>}

    <section>
      <h2 className="mb-2 font-semibold">📰 Actualités politiques</h2>
      {polNews.length ? polNews.map(a => <p key={a.id} className="mb-1 text-sm">• {a.title}</p>) : <p className="text-sm text-muted-foreground">Pas d'actualité politique récente.</p>}
    </section>

    <div className="grid grid-cols-2 gap-2">
      <Link to="/politique" className="flex min-h-12 items-center justify-center rounded-xl border text-sm">Tous les partis</Link>
      <Link to="/elections" className="flex min-h-12 items-center justify-center rounded-xl border text-sm">Toutes les élections</Link>
      <Link to="/vie-des-partis" className="flex min-h-12 items-center justify-center rounded-xl border text-sm">Vie des partis</Link>
      <Link to="/actualites" className="flex min-h-12 items-center justify-center rounded-xl border text-sm">Actualités</Link>
    </div>
  </div>;
}
