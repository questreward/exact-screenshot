import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, PieChart, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pollAction, pollsQuery, type Poll, type PollsState } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { FILTER_LABELS, SPONSOR_LABELS, percents } from "@/game/opinion";

export const Route = createFileRoute("/_authenticated/_game/sondages")({
  head: () => ({ meta: gameMeta("Sondages", "Sondages de votre ville : opinion des joueurs et opinion simulée des habitants.") }),
  component: PollsPage,
});

function Bars({ labels, values, highlight }: { labels: string[]; values: number[]; highlight?: number | null }) {
  return <div className="space-y-1.5">{labels.map((l, i) => <div key={i}>
    <div className="flex justify-between text-sm"><span className={highlight === i ? "font-bold" : ""}>{l}{highlight === i ? " · ton choix" : ""}</span><span>{values[i] ?? 0} %</span></div>
    <div className="h-2.5 rounded-full bg-muted"><div className="h-2.5 rounded-full bg-primary" style={{ width: `${values[i] ?? 0}%` }} /></div>
  </div>)}</div>;
}

function PollCard({ p }: { p: Poll }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string | null>(null);
  const r = p.results;
  const answer = async (i: number) => {
    try { await pollAction("answer", { poll_id: p.id, option: i }); await qc.invalidateQueries({ queryKey: ["polls"] }); toast.success("Réponse enregistrée. Elle reste anonyme."); }
    catch (e) { toast.error((e as Error).message); }
  };
  return <article className="space-y-3 rounded-xl border border-border bg-card p-4">
    <p className="text-xs text-muted-foreground">{SPONSOR_LABELS[p.sponsor_kind]} · {p.sponsor_label} · {p.open ? `jusqu'au ${new Date(p.ends_at).toLocaleDateString("fr-FR")}` : "terminé"}</p>
    <h2 className="font-heading text-lg font-bold">{p.question}</h2>
    {p.open && r.my_answer === null && <div className="grid gap-2">{p.options.map((o, i) => <Button key={i} variant="outline" className="h-12" onClick={() => answer(i)}>{o}</Button>)}</div>}
    {(r.my_answer !== null || !p.open) && <>
      <section className="space-y-2"><p className="text-sm font-semibold">Opinion des joueurs · {r.total} réponse(s)</p><Bars labels={p.options} values={percents(r.players)} highlight={r.my_answer} /></section>
      <section className="space-y-2 rounded-lg bg-muted/50 p-3"><p className="text-sm font-semibold">Opinion simulée des habitants · échantillon fictif de {r.simulated_sample}</p><Bars labels={p.options} values={r.simulated} /></section>
      {r.filters ? <section className="space-y-2">
        <div className="flex flex-wrap gap-2">{Object.keys(r.filters).map(k => <Button key={k} size="sm" className="h-10" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(filter === k ? null : k)}>{FILTER_LABELS[k] ?? k}</Button>)}</div>
        {filter && r.filters[filter]?.map(g => <div key={g.group} className="rounded-lg border border-border p-2">
          <p className="text-sm font-semibold">{g.group} · {g.count} réponse(s)</p>
          {g.counts ? <Bars labels={p.options} values={percents(g.counts)} /> : <p className="text-xs text-muted-foreground">Groupe trop petit : détail masqué pour protéger l'anonymat.</p>}
        </div>)}
      </section> : <p className="text-xs text-muted-foreground">Les filtres apparaissent à partir de {r.min_answers_filters} réponses de joueurs.</p>}
    </>}
    <p className="text-[11px] text-muted-foreground">Un sondage n'est pas un vote : il ne change jamais le résultat d'une élection.</p>
  </article>;
}

function NewPoll({ s, onDone }: { s: PollsState; onDone: () => void }) {
  const qc = useQueryClient();
  const [sponsor, setSponsor] = useState(0);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["Oui", "Non"]);
  const send = async () => {
    const sp = s.sponsors[sponsor]; if (!sp) return;
    try { await pollAction("create", { sponsor_kind: sp.kind, sponsor_label: sp.label, question, options }); await qc.invalidateQueries({ queryKey: ["polls"] }); toast.success("Sondage lancé"); onDone(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return <div className="space-y-3 rounded-xl border border-border bg-card p-4">
    <p className="font-semibold">Nouveau sondage</p>
    <select className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={sponsor} onChange={e => setSponsor(Number(e.target.value))}>
      {s.sponsors.map((x, i) => <option key={i} value={i}>{SPONSOR_LABELS[x.kind]} · {x.label}</option>)}</select>
    <Input className="h-11 text-base" maxLength={200} placeholder="Ta question (10 caractères minimum)" value={question} onChange={e => setQuestion(e.target.value)} />
    {options.map((o, i) => <div key={i} className="flex gap-2"><Input className="h-11 text-base" maxLength={60} value={o} onChange={e => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
      {options.length > 2 && <Button variant="ghost" className="h-11 w-11" aria-label="Retirer" onClick={() => setOptions(options.filter((_, j) => j !== i))}><X /></Button>}</div>)}
    {options.length < 4 && <Button variant="outline" className="h-11 w-full" onClick={() => setOptions([...options, ""])}><Plus /> Ajouter une réponse</Button>}
    <Button className="h-12 w-full" disabled={question.trim().length < 10 || options.some(o => !o.trim())} onClick={send}>Lancer le sondage</Button>
  </div>;
}

function PollsPage() {
  const { data, isLoading, isError } = useQuery(pollsQuery);
  const [creating, setCreating] = useState(false);
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><PieChart className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Sondages</h1><p className="text-sm text-muted-foreground">Ce que pensent les joueurs et les habitants de ta ville.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Sondages : Disponible dans une prochaine étape.</p>}
    {data && (data.sponsors.length > 0
      ? (creating ? <NewPoll s={data} onDone={() => setCreating(false)} /> : <Button className="h-12 w-full" onClick={() => setCreating(true)}><Plus /> Lancer un sondage</Button>)
      : <p className="text-xs text-muted-foreground">Pour lancer un sondage, il faut diriger une organisation, avoir une carte de presse ou être élu.</p>)}
    {data && (data.polls.length === 0 ? <p className="text-sm text-muted-foreground">Aucun sondage dans ta ville pour l'instant.</p> : data.polls.map(p => <PollCard key={p.id} p={p} />))}
  </div>;
}
