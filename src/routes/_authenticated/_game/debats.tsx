import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, Mic, Search, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { debateAction, debateQuery, playerDirectoryQuery, type Debate, type DebateState, type PlayerCard } from "@/services/game";
import { WritingHelper } from "@/components/game/WritingHelper";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/debats")({
  head: () => ({ meta: gameMeta("Débats", "Défiez un autre joueur en débat écrit et laissez le public trancher.") }),
  component: DebatesPage,
});

const ROUND = ["Ouverture", "Réponse", "Conclusion"];
const fmt = (s: string) => new Date(s).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const STATUS: Record<Debate["status"], string> = {
  invited: "Défi en attente", declined: "Défi refusé", expired: "Défi expiré", running: "Débat en cours", voting: "Vote du public", done: "Terminé",
};

function DebateCard({ d, st }: { d: Debate; st: DebateState }) {
  const act = useLifeMutation(debateAction, "C'est envoyé");
  const [body, setBody] = useState("");
  const me = st.me;
  const names: Record<string, string> = { [d.challenger.id]: d.challenger.name, [d.opponent.id]: d.opponent.name };
  const wroteThisRound = d.turns.some(t => t.round === d.round && t.character_id === me);
  return <article className="space-y-3 rounded-xl border border-border bg-card p-4">
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-primary">{STATUS[d.status]}{d.status === "running" && ` · manche ${d.round}/${st.settings.rounds} (${ROUND[d.round - 1] ?? ""})`}</p>
      <h3 className="font-heading text-lg font-bold leading-tight">« {d.topic} »</h3>
      <p className="flex items-center gap-2 text-sm"><Swords className="h-4 w-4 text-primary" />{d.challenger.name} contre {d.opponent.name}</p>
    </div>

    {d.turns.length > 0 && <div className="space-y-2">{d.turns.map(t =>
      <div key={`${t.round}-${t.character_id}`} className={`rounded-lg p-3 text-sm ${t.character_id === d.challenger.id ? "bg-muted" : "border border-border"}`}>
        <p className="text-xs font-semibold text-primary">{ROUND[t.round - 1]} · {names[t.character_id]}</p>
        <p className="whitespace-pre-line">{t.body}</p>
      </div>)}</div>}

    {d.status === "invited" && d.role === "opponent" && <div className="grid grid-cols-2 gap-2">
      <Button className="h-12" disabled={act.isPending} onClick={() => act.mutate({ command: "respond", debate_id: d.id, accept: true })}>Accepter</Button>
      <Button variant="outline" className="h-12" disabled={act.isPending} onClick={() => act.mutate({ command: "respond", debate_id: d.id, accept: false })}>Refuser</Button>
    </div>}
    {d.status === "invited" && d.role === "challenger" && <p className="text-sm text-muted-foreground">En attente de réponse jusqu'au {fmt(d.invite_ends_at)}.</p>}

    {d.status === "running" && d.role !== "public" && (wroteThisRound
      ? <p className="text-sm text-muted-foreground">Argument envoyé. L'argument adverse s'affichera quand les deux auront écrit.</p>
      : <div className="space-y-2">
          <p className="text-sm font-semibold">Votre {ROUND[d.round - 1]?.toLowerCase()} — avant le {d.turn_ends_at && fmt(d.turn_ends_at)}</p>
          <Textarea rows={5} value={body} onChange={e => setBody(e.target.value)} maxLength={st.settings.turn_max} placeholder="Votre argument (30 caractères minimum)" />
          <WritingHelper kind="debat" max={st.settings.turn_max} onUse={setBody} />
          <Button className="h-12 w-full" disabled={act.isPending || body.trim().length < 30} onClick={() => act.mutate({ command: "turn", debate_id: d.id, body }, { onSuccess: () => setBody("") })}><Mic />Envoyer</Button>
          <p className="text-xs text-muted-foreground">Sans argument à temps, vous perdez par forfait.</p>
        </div>)}
    {d.status === "running" && d.role === "public" && <p className="text-sm text-muted-foreground">Les arguments de la manche en cours restent cachés jusqu'à ce que les deux aient écrit.</p>}

    {d.status === "voting" && <div className="space-y-2">
      <p className="text-sm">Vote ouvert jusqu'au {d.voting_ends_at && fmt(d.voting_ends_at)}.</p>
      {d.role !== "public" ? <p className="text-sm text-muted-foreground">Les débatteurs ne votent pas.</p>
        : d.my_vote ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" />Vous avez voté pour {names[d.my_vote]}.</p>
        : <div className="grid grid-cols-2 gap-2">{[d.challenger, d.opponent].map(p =>
            <Button key={p.id} variant="outline" className="h-12" disabled={act.isPending} onClick={() => act.mutate({ command: "vote", debate_id: d.id, for_id: p.id })}><span className="truncate">{p.name}</span></Button>)}</div>}
    </div>}

    {d.status === "done" && <p className="flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-primary" />
      {d.winner_id ? `${names[d.winner_id]} l'emporte` : "Aucun vainqueur"}
      {d.forfeit ? " (forfait)" : d.votes_challenger !== null && ` · ${d.votes_challenger} contre ${d.votes_opponent}`}</p>}
  </article>;
}

function NewDebate({ st }: { st: DebateState }) {
  const [q, setQ] = useState(""); const [target, setTarget] = useState<PlayerCard | null>(null);
  const [topic, setTopic] = useState(""); const [rid, setRid] = useState(() => crypto.randomUUID());
  const { data: dir } = useQuery({ ...playerDirectoryQuery(q), enabled: q.trim().length >= 2 && !target });
  const act = useLifeMutation(async (i: Parameters<typeof debateAction>[0]) => { await debateAction(i); setTarget(null); setTopic(""); setQ(""); setRid(crypto.randomUUID()); }, "Défi envoyé");
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">Défier un joueur</h2>
    <p className="text-xs text-muted-foreground">{st.settings.rounds} manches écrites, puis le public vote. Le vainqueur gagne {st.settings.win_reputation} points de réputation politique, et +{st.settings.campaign_support} de soutien s'il est candidat à une élection municipale en cours.</p>
    {target
      ? <div className="flex items-center justify-between rounded-lg border border-primary/40 p-3"><span className="font-semibold">{target.name} · {target.city}</span>
          <Button variant="ghost" onClick={() => setTarget(null)}>Changer</Button></div>
      : <div className="space-y-2">
          <div className="relative"><Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input className="h-12 pl-10" value={q} onChange={e => setQ(e.target.value)} placeholder="Nom du joueur à défier" /></div>
          {dir?.players.filter(p => p.id !== st.me).slice(0, 6).map(p =>
            <Button key={p.id} variant="outline" className="h-12 w-full justify-start" onClick={() => setTarget(p)}>{p.name} · {p.city}</Button>)}
        </div>}
    <Input className="h-12" value={topic} onChange={e => setTopic(e.target.value)} maxLength={st.settings.topic_max} placeholder="Sujet du débat (10 caractères minimum)" />
    <Button className="h-12 w-full" disabled={!target || topic.trim().length < 10 || act.isPending}
      onClick={() => target && act.mutate({ command: "challenge", request_id: rid, opponent_id: target.id, topic })}>{act.isPending && <LoaderCircle className="animate-spin" />}<Swords />Lancer le défi</Button>
  </section>;
}

function DebatesPage() {
  const { data: st, isError, isLoading } = useQuery(debateQuery);
  const [tab, setTab] = useState<"mine" | "public">("mine");
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Swords className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Débats</h1><p className="text-sm text-muted-foreground">Argumentez, convainquez, gagnez le public.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Débats entre joueurs : Disponible dans une prochaine étape.</p>}
    {st && <>
      <NewDebate st={st} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant={tab === "mine" ? "default" : "outline"} className="h-12" onClick={() => setTab("mine")}>Mes débats ({st.mine.length})</Button>
        <Button variant={tab === "public" ? "default" : "outline"} className="h-12" onClick={() => setTab("public")}>À suivre ({st.public.length})</Button>
      </div>
      {st[tab].map(d => <DebateCard key={d.id} d={d} st={st} />)}
      {st[tab].length === 0 && <p className="text-center text-sm text-muted-foreground">{tab === "mine" ? "Aucun débat pour l'instant. Lancez un défi !" : "Aucun débat public en ce moment."}</p>}
    </>}
  </div>;
}
