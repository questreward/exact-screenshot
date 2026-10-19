import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, ChevronDown, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lifeProfileQuery, type LifeDimension } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { JOURNAL_KINDS, REPUTATION_LABELS, SKILL_LABELS, SOURCE_LABELS, groupByAge, levelLabel } from "@/game/life-profile";

export const Route = createFileRoute("/_authenticated/_game/ma-vie")({
  head: () => ({ meta: gameMeta("Ma vie dans CIVITAS", "Vos réputations, vos compétences et le journal de votre parcours.") }),
  component: LifePage,
});

type Tab = "journal" | "reputations" | "competences";

function Bar({ d, label, hint }: { d: LifeDimension; label: string; hint?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const parts = d.parts ?? [];
  return <button type="button" onClick={() => setOpen(o => !o)} className="w-full rounded-xl border border-border bg-card p-3 text-left">
    <div className="flex items-center justify-between gap-2">
      <span className="font-semibold">{label}</span>
      <span className="flex items-center gap-1 text-sm"><b>{d.value}</b><span className="text-muted-foreground">· {levelLabel(d.value)}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></span>
    </div>
    <div className="mt-2 h-2.5 rounded-full bg-muted"><div className="h-2.5 rounded-full bg-primary" style={{ width: `${d.value}%` }} /></div>
    {open && <div className="mt-2 space-y-1 text-xs">
      {hint && <p className="text-muted-foreground">{hint}</p>}
      {parts.length === 0 ? <p className="text-muted-foreground">Aucune action comptée pour l'instant.</p>
        : parts.map(p => <p key={p.source} className="flex justify-between"><span>{SOURCE_LABELS[p.source] ?? p.source}</span>
          <span className={p.points < 0 ? "text-destructive" : "text-primary"}>{p.points > 0 ? "+" : ""}{p.points}</span></p>)}
    </div>}
  </button>;
}

function LifePage() {
  const { data, isLoading, isError } = useQuery(lifeProfileQuery);
  const [tab, setTab] = useState<Tab>("journal");
  const reps = data?.dimensions.filter(d => d.axis === "reputation") ?? [];
  const skills = (data?.dimensions.filter(d => d.axis === "skill") ?? []).sort((a, b) => b.value - a.value);
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><BookOpenText className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Ma vie dans CIVITAS</h1>
        <p className="text-sm text-muted-foreground">Tout évolue selon ce que vous faites vraiment.</p></div></header>
    <div className="grid grid-cols-3 gap-2">
      {([["journal", "Journal"], ["reputations", "Réputations"], ["competences", "Compétences"]] as const).map(([id, l]) =>
        <Button key={id} variant={tab === id ? "default" : "outline"} className="h-12" onClick={() => setTab(id)}>{l}</Button>)}
    </div>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Ma vie dans CIVITAS : Disponible dans une prochaine étape.</p>}
    {data && tab === "journal" && (data.journal.length === 0
      ? <p className="text-sm text-muted-foreground">Votre histoire commence. Chaque étape importante s'inscrira ici.</p>
      : <ol className="space-y-4">{groupByAge(data.journal).map(g => <li key={g.age} className="flex gap-3">
          <div className="flex w-14 shrink-0 flex-col items-center"><span className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">{g.age} ans</span>
            <span className="mt-1 w-0.5 flex-1 bg-border" /></div>
          <div className="flex-1 space-y-2">{g.items.map((e, i) => <div key={i} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{JOURNAL_KINDS[e.kind] ?? e.kind} · {new Date(e.at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="font-semibold">{e.title}</p></div>)}</div>
        </li>)}</ol>)}
    {data && tab === "reputations" && <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Plusieurs réputations distinctes : on peut être très populaire et peu crédible. Touchez une barre pour voir ce qui compte.</p>
      {reps.map(d => <Bar key={d.dimension} d={d} label={REPUTATION_LABELS[d.dimension]?.label ?? d.dimension} hint={REPUTATION_LABELS[d.dimension]?.hint} />)}
    </div>}
    {data && tab === "competences" && <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Vos compétences progressent avec vos actions : travail, études, débats, associations, mandats…</p>
      {skills.map(d => <Bar key={d.dimension} d={d} label={SKILL_LABELS[d.dimension] ?? d.dimension} />)}
    </div>}
  </div>;
}
