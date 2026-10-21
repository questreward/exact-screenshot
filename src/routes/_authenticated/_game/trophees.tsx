import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Lock, Trophy } from "lucide-react";
import { trophyFactsQuery } from "@/services/game";
import { CATEGORY_LABEL, computeTrophies, nextObjectives, progressionDomains, rankTitle, type Category, type Term } from "@/game/trophies";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/trophees")({
  head: () => ({ meta: gameMeta("Progression, trophées et objectifs", "Vos succès dans CIVITAS et vos prochains objectifs.") }),
  loader: ({ context }) => context.queryClient.ensureQueryData(trophyFactsQuery),
  component: TrophiesPage,
});

function Bar({ v, max }: { v: number; max: number }) {
  return <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(v * 100 / max)}%` }} /></div>;
}

function TrophiesPage() {
  const { data: facts } = useSuspenseQuery(trophyFactsQuery);
  const all = computeTrophies(facts);
  const done = all.filter(t => t.done).length;
  const next = nextObjectives(all);
  const cats = Object.keys(CATEGORY_LABEL) as Category[];
  return <div className="mx-auto max-w-2xl space-y-5 p-4 pb-24">
    <header className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3"><Trophy className="h-8 w-8 text-primary" />
        <div><h1 className="font-heading text-2xl font-bold">Trophées</h1><p className="text-sm text-muted-foreground">{rankTitle(done)} · {done}/{all.length} obtenus</p></div></div>
      <Bar v={done} max={all.length} />
    </header>
    <section className="space-y-2">
      <h2 className="font-heading text-lg font-bold">Ma progression</h2>
      <div className="grid grid-cols-2 gap-2">{progressionDomains(facts, done).map(d => <div key={d.id} className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-semibold">{d.emoji} {d.label}</p><p className="text-xs text-muted-foreground">Niveau {d.level} / 5</p><Bar v={d.level} max={5} /></div>)}</div>
    </section>
    <section className="space-y-2">
      <h2 className="font-heading text-lg font-bold">Mes objectifs</h2>
      {(["court", "moyen", "long"] as Term[]).map(term => { const list = all.filter(t => t.term === term && !t.done && !t.secret).slice(0, 3); return list.length ? <div key={term} className="space-y-1">
        <p className="text-sm font-semibold text-primary">{term === "court" ? "⏱️ Court terme" : term === "moyen" ? "📆 Moyen terme" : "🏔️ Long terme"}</p>
        {list.map(t => <Link key={t.id} to={t.to} className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-muted px-3 text-sm"><span>{t.title} — {t.hint}</span><span className="shrink-0 text-xs">{t.progress}/{t.goal}</span></Link>)}</div> : null; })}
    </section>
    {next.length > 0 && <section className="space-y-2">
      <h2 className="font-heading text-lg font-bold">Vos prochains objectifs</h2>
      {next.map(t => <Link key={t.id} to={t.to} className="flex min-h-16 items-center gap-3 rounded-xl border border-primary/40 bg-card p-3">
        <div className="min-w-0 flex-1 space-y-1"><p className="font-semibold">{t.title}</p><p className="text-sm text-muted-foreground">{t.hint}</p>
          <Bar v={t.progress} max={t.goal} /><p className="text-xs text-muted-foreground">{t.progress} / {t.goal}</p></div>
        <ChevronRight className="h-5 w-5 shrink-0 text-primary" /></Link>)}
    </section>}
    {cats.map(c => <section key={c} className="space-y-2">
      <h2 className="font-heading text-base font-bold">{CATEGORY_LABEL[c]}</h2>
      <div className="grid grid-cols-2 gap-2">{all.filter(t => t.category === c).map(t =>
        <div key={t.id} className={`space-y-1 rounded-xl border p-3 ${t.done ? "border-primary bg-primary/10" : "border-border bg-card opacity-80"}`}>
          <p className="flex items-center gap-1 text-sm font-semibold">{t.done ? <Trophy className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}{t.secret && !t.done ? "???" : t.title}</p>
          <p className="text-xs text-muted-foreground">{t.secret && !t.done ? "Accomplissement secret" : t.hint}</p>
          {!t.done && !t.secret && <Bar v={t.progress} max={t.goal} />}
        </div>)}</div>
    </section>)}
    <p className="text-xs text-muted-foreground">Les trophées se débloquent tout seuls selon ce que vous faites dans le jeu. Récompenses en jeu : Disponible dans une prochaine étape.</p>
  </div>;
}
