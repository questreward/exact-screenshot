import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Hammer, HandCoins, LoaderCircle, Megaphone, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { EffectsList } from "@/components/game/EffectsList";
import { projectAction, projectsQuery, type CitizenProject, type ProjectsState } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { INDICATOR_LABELS, formatEuros } from "@/game/society";

export const Route = createFileRoute("/_authenticated/_game/projets")({
  head: () => ({ meta: gameMeta("Projets citoyens", "Proposez un projet pour votre ville, rassemblez des soutiens et convainquez la mairie.") }),
  component: ProjectsPage,
});

const STATUS: Record<CitizenProject["status"], string> = {
  soutiens: "Collecte de soutiens", examen: "Examen par la mairie", reporte: "Reporté", travaux: "Travaux en cours",
  termine: "Réalisé", refuse: "Refusé", echoue: "Pas assez de soutiens",
};
const STEPS = ["soutiens", "examen", "travaux", "termine"] as const;
const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Steps({ status }: { status: CitizenProject["status"] }) {
  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);
  const at = status === "reporte" ? 1 : idx;
  return <div className="flex gap-1">{STEPS.map((s, i) => <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= at && at >= 0 ? "bg-primary" : "bg-muted"}`} />)}</div>;
}

function CreateForm({ st }: { st: ProjectsState }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(st.types[0]?.id ?? "");
  const t = st.types.find(x => x.id === type);
  const [title, setTitle] = useState(""); const [problem, setProblem] = useState(""); const [goal, setGoal] = useState("");
  const [cost, setCost] = useState<number>(t?.min_cost ?? 0); const [district, setDistrict] = useState("");
  const [rid, setRid] = useState(() => crypto.randomUUID());
  const act = useLifeMutation(async (i: Parameters<typeof projectAction>[0]) => { await projectAction(i); setOpen(false); setTitle(""); setProblem(""); setGoal(""); setRid(crypto.randomUUID()); }, "Projet lancé");
  if (st.age < st.settings.min_age || st.city !== st.my_city) return null;
  if (!open) return <Button className="h-14 w-full text-base" onClick={() => setOpen(true)}><Hammer />Proposer un projet</Button>;
  const ok = title.trim().length >= 5 && problem.trim().length >= 15 && goal.trim().length >= 10 && t && cost >= t.min_cost && cost <= t.max_cost;
  return <section className="space-y-3 rounded-xl border border-primary/40 bg-card p-4">
    <h2 className="font-heading text-lg font-bold">Nouveau projet</h2>
    <p className="text-sm font-semibold">1. Quel type de projet ?</p>
    <div className="grid grid-cols-2 gap-2">{st.types.map(x => <Button key={x.id} variant={type === x.id ? "default" : "outline"} className="h-auto min-h-12 whitespace-normal py-2 text-sm"
      onClick={() => { setType(x.id); setCost(x.min_cost); }}>{x.label}</Button>)}</div>
    <p className="text-sm font-semibold">2. Quel problème voulez-vous régler ?</p>
    <Input className="h-12" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Nom du projet" />
    <Textarea value={problem} onChange={e => setProblem(e.target.value)} maxLength={500} placeholder="Le problème constaté" className="min-h-20" />
    <p className="text-sm font-semibold">3. Quel objectif ?</p>
    <Textarea value={goal} onChange={e => setGoal(e.target.value)} maxLength={300} placeholder="Ce que le projet doit changer" className="min-h-16" />
    {st.districts.length > 0 && <div className="flex flex-wrap gap-2">
      <Button variant={district === "" ? "default" : "outline"} className="h-11" onClick={() => setDistrict("")}>Toute la ville</Button>
      {st.districts.map(d => <Button key={d.id} variant={district === d.id ? "default" : "outline"} className="h-11" onClick={() => setDistrict(d.id)}>{d.name}</Button>)}</div>}
    {t && <><p className="text-sm font-semibold">4. Estimer le coût : {formatEuros(cost)}</p>
      <input type="range" className="h-10 w-full accent-primary" min={t.min_cost} max={t.max_cost} step={5000} value={cost} onChange={e => setCost(Number(e.target.value))} />
      <p className="text-xs text-muted-foreground">Moins cher = plus facile à faire accepter. Effet attendu : {INDICATOR_LABELS[t.indicator]} +{t.effect} après {t.work_days} jours de travaux, puis +{t.followup} à long terme.</p></>}
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" className="h-12" onClick={() => setOpen(false)}>Annuler</Button>
      <Button className="h-12" disabled={!ok || act.isPending} onClick={() => act.mutate({ command: "create", request_id: rid, type_id: type, title, problem, goal, cost, district_id: district || undefined })}>
        {act.isPending && <LoaderCircle className="animate-spin" />}Lancer</Button>
    </div>
  </section>;
}

function ProjectCard({ p, st }: { p: CitizenProject; st: ProjectsState }) {
  const [open, setOpen] = useState(p.mine && !["termine", "refuse", "echoue"].includes(p.status));
  const [amount, setAmount] = useState(20); const [newCost, setNewCost] = useState(p.cost);
  const [rid, setRid] = useState(() => crypto.randomUUID());
  const act = useLifeMutation(projectAction, "C'est fait");
  const don = useLifeMutation(async (i: Parameters<typeof projectAction>[0]) => { await projectAction(i); setRid(crypto.randomUUID()); }, "Merci pour votre don");
  const s = st.settings; const type = st.types.find(t => t.id === p.type_id);
  return <article className="space-y-3 rounded-xl border border-border bg-card p-4">
    <button className="flex w-full items-start gap-2 text-left" onClick={() => setOpen(!open)}>
      <span className="min-w-0 flex-1"><span className="block font-heading font-bold">{p.title}</span>
        <span className="text-xs text-muted-foreground">{type?.label}{p.district && ` · ${p.district}`} · {formatEuros(p.cost)} · par {p.author.name}</span></span>
      <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    <Steps status={p.status} />
    <div className="flex items-center justify-between text-sm"><span className="font-semibold">{STATUS[p.status]}{p.funding_pct > 0 && p.funding_pct < 100 && " (financé à 50 %)"}</span><span>Soutien {p.score} %</span></div>
    {open && <>
      <p className="text-sm"><b>Problème :</b> {p.problem}</p>
      <p className="text-sm"><b>Objectif :</b> {p.goal}</p>
      <p className="text-xs text-muted-foreground">{p.supporters} soutien(s) joueur · {p.donations} crédits de dons</p>
      {p.status === "soutiens" && <p className="text-xs text-muted-foreground">Fin de la collecte : {fmt(new Date(new Date(p.stage_at).getTime() + s.support_days * 86400000).toISOString())}. Il faut au moins {s.postpone_score} % pour être examiné, {s.approve_score} % pour un financement complet.</p>}
      {p.status === "travaux" && p.works_end && <p className="text-xs text-muted-foreground">Fin des travaux : {fmt(p.works_end)}</p>}
      <div className="grid grid-cols-2 gap-2">
        {p.status === "soutiens" && !p.i_support && st.city === st.my_city && <Button className="h-12" disabled={act.isPending} onClick={() => act.mutate({ command: "support", project_id: p.id })}><ThumbsUp />Soutenir</Button>}
        {(p.status === "soutiens" || p.status === "examen") && p.i_support && <Button variant="outline" className="h-12" disabled={p.mobilized_today || act.isPending} onClick={() => act.mutate({ command: "mobilize", project_id: p.id })}>
          <Megaphone />{p.mobilized_today ? "Mobilisé aujourd'hui" : `Mobiliser (−${s.mobilize_energy} énergie)`}</Button>}
      </div>
      {["soutiens", "examen", "reporte"].includes(p.status) && <div className="flex gap-2">
        <Input type="number" inputMode="numeric" className="h-12 w-28" min={5} max={500} value={amount} onChange={e => setAmount(Number(e.target.value))} />
        <Button variant="outline" className="h-12 flex-1" disabled={amount < 5 || amount > 500 || don.isPending} onClick={() => don.mutate({ command: "donate", project_id: p.id, request_id: rid, amount })}><HandCoins />Donner</Button>
      </div>}
      {p.status === "examen" && st.is_mayor && <div className="space-y-2 rounded-lg bg-muted p-3">
        <p className="text-sm font-semibold">Votre décision de maire (budget : {st.treasury != null ? formatEuros(st.treasury) : "?"})</p>
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-12" onClick={() => act.mutate({ command: "decide", project_id: p.id, decision: "accepte" })}>Financer</Button>
          <Button variant="outline" className="h-12" onClick={() => act.mutate({ command: "decide", project_id: p.id, decision: "partiel" })}>Financer à 50 %</Button>
          <Button variant="outline" className="h-12" onClick={() => act.mutate({ command: "decide", project_id: p.id, decision: "reporte" })}>Reporter</Button>
          <Button variant="outline" className="h-12 text-destructive" onClick={() => act.mutate({ command: "decide", project_id: p.id, decision: "refuse" })}>Refuser</Button>
        </div>
        {p.score >= s.approve_score && <p className="text-xs text-muted-foreground">Projet très soutenu : le refuser vous coûterait {s.refusal_political} points de réputation politique.</p>}
      </div>}
      {p.status === "reporte" && p.mine && type && <div className="space-y-2 rounded-lg bg-muted p-3">
        <p className="text-sm font-semibold">Modifier le projet : nouveau coût {formatEuros(newCost)}</p>
        <input type="range" className="h-10 w-full accent-primary" min={type.min_cost} max={p.cost} step={5000} value={newCost} onChange={e => setNewCost(Number(e.target.value))} />
        <Button className="h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ command: "amend", project_id: p.id, cost: newCost })}>Représenter le projet</Button>
      </div>}
      <EffectsList effects={p.effects} />
      {p.log.length > 0 && <ol className="space-y-1 border-l-2 border-border pl-3">
        {p.log.map((l, i) => <li key={i} className="text-xs"><span className="text-muted-foreground">{new Date(l.at).toLocaleDateString("fr-FR")} · </span>{l.message}</li>)}
      </ol>}
    </>}
  </article>;
}

function ProjectsPage() {
  const { data: st, isError, isLoading } = useQuery(projectsQuery);
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Hammer className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Projets citoyens</h1><p className="text-sm text-muted-foreground">Une idée, des soutiens, une décision, des résultats.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Projets citoyens : Disponible dans une prochaine étape.</p>}
    {st && <>
      <CreateForm st={st} />
      <p className="text-xs text-muted-foreground">Collecte de soutiens pendant {st.settings.support_days} jours (habitants simulés + {st.settings.player_weight} points par joueur + mobilisations + dons). Puis la mairie décide : {st.settings.approve_score} % ou plus, financement complet ; {st.settings.partial_score} %, moitié ; {st.settings.postpone_score} %, report (le projet peut être modifié). Les dons restent dans la cagnotte du projet.</p>
      {st.projects.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet dans votre ville pour l'instant. Lancez le premier !</p>}
      {st.projects.map(p => <ProjectCard key={p.id} p={p} st={st} />)}
    </>}
  </div>;
}
