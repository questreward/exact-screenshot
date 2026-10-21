import { GameSelect } from "@/components/game/GameSelect";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { partyLifeAction, partyLifeQuery, type OrgVote, type PartyLifeState } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { COALITION_STATUS, VOTE_KINDS, coalitionMajority } from "@/game/factcheck";

export const Route = createFileRoute("/_authenticated/_game/vie-des-partis")({
  head: () => ({ meta: gameMeta("Vie des partis", "Coalitions après les élections, votes internes, présidence et programme des partis.") }),
  component: PartyLifePage,
});

function useAct() {
  const qc = useQueryClient();
  return async (cmd: Parameters<typeof partyLifeAction>[0], input: Record<string, unknown>, ok?: string) => {
    try { await partyLifeAction(cmd, input); await qc.invalidateQueries({ queryKey: ["party-life"] }); if (ok) toast.success(ok); return true; }
    catch (e) { toast.error((e as Error).message); return false; }
  };
}

function PartyLifePage() {
  const { data, isLoading, isError } = useQuery(partyLifeQuery);
  const [tab, setTab] = useState<"coalitions" | "interne">("coalitions");
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Handshake className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Vie des partis</h1><p className="text-sm text-muted-foreground">Négocier, voter, choisir son président.</p></div></header>
    <div className="grid grid-cols-2 gap-2">
      <Button className="h-12" variant={tab === "coalitions" ? "default" : "outline"} onClick={() => setTab("coalitions")}>Coalitions</Button>
      <Button className="h-12" variant={tab === "interne" ? "default" : "outline"} onClick={() => setTab("interne")}>Vie interne</Button>
    </div>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Vie des partis : Disponible dans une prochaine étape.</p>}
    {data && tab === "coalitions" && <Coalitions s={data} />}
    {data && tab === "interne" && <Internal s={data} />}
  </div>;
}

function Coalitions({ s }: { s: PartyLifeState }) {
  const act = useAct();
  const total = s.council.reduce((a, g) => a + g.seats, 0);
  const seats = (id: string) => s.parties.find(p => p.id === id)?.seats ?? 0;
  const [form, setForm] = useState(false);
  const [org, setOrg] = useState(s.led[0] ?? "");
  const [partner, setPartner] = useState("");
  const [concessions, setConcessions] = useState("");
  const [resp, setResp] = useState("");
  const [budget, setBudget] = useState(false);
  const propose = async () => { if (await act("propose", { org_id: org, partner_id: partner, concessions, responsibilities: resp, budget_support: budget }, "Proposition envoyée")) setForm(false); };
  return <div className="space-y-3">
    {s.council.length > 0 && <section className="rounded-xl border border-border bg-card p-4">
      <p className="font-semibold">Conseil municipal · {total} sièges · majorité à {Math.floor(total / 2) + 1}</p>
      {s.council.map((g, i) => <div key={i} className="mt-2"><div className="flex justify-between text-sm"><span>{g.name}{g.majority ? " · majorité" : ""}</span><span>{g.seats}</span></div>
        <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${total ? (100 * g.seats) / total : 0}%` }} /></div></div>)}
    </section>}
    {s.led.length > 0 ? (form ? <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <p className="font-semibold">Proposer un accord</p>
      <GameSelect className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={org} onChange={e => setOrg(e.target.value)}>
        {s.parties.filter(p => s.led.includes(p.id)).map(p => <option key={p.id} value={p.id}>De : {p.name}</option>)}</GameSelect>
      <GameSelect className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={partner} onChange={e => setPartner(e.target.value)}>
        <option value="">À : choisir un partenaire…</option>{s.parties.filter(p => p.id !== org).map(p => <option key={p.id} value={p.id}>{p.name}{p.seats ? ` · ${p.seats} sièges` : ""}</option>)}</GameSelect>
      {partner && total > 0 && (() => { const m = coalitionMajority(seats(org), seats(partner), total); return <p className="text-sm">{m.seats} sièges ensemble · {m.majority ? "majorité atteinte" : "pas de majorité"}</p>; })()}
      <Textarea maxLength={600} placeholder="Propositions et concessions (ex. : maintien du tramway, pas de hausse d'impôt)" value={concessions} onChange={e => setConcessions(e.target.value)} />
      <Input className="h-11 text-base" maxLength={400} placeholder="Répartition des responsabilités (ex. : adjoint aux transports)" value={resp} onChange={e => setResp(e.target.value)} />
      <label className="flex items-center justify-between text-sm">Soutien au budget municipal<Switch checked={budget} onCheckedChange={setBudget} /></label>
      <Button className="h-12 w-full" disabled={!partner || concessions.trim().length < 10 || resp.trim().length < 5} onClick={propose}>Envoyer la proposition</Button>
    </div> : <Button className="h-12 w-full" onClick={() => setForm(true)}><Plus /> Proposer un accord</Button>)
      : <p className="text-xs text-muted-foreground">Seuls les dirigeants d'un parti ou d'un mouvement peuvent négocier un accord.</p>}
    <p className="text-xs text-muted-foreground">Un accord respecté {s.settings.respect_days} jours rapporte +{s.settings.respect_bonus} de réputation aux deux partis. Le parti qui le rompt perd {s.settings.break_penalty} points de réputation, et la rupture reste visible de tous.</p>
    {s.coalitions.length === 0 ? <p className="text-sm text-muted-foreground">Aucun accord dans la ville.</p> : s.coalitions.map(c => <article key={c.id} className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
      <p className="flex items-center justify-between gap-2"><b>{c.proposer.name} + {c.partner.name}</b><span className="rounded-full bg-muted px-2 text-xs">{COALITION_STATUS[c.status] ?? c.status}</span></p>
      <p><span className="text-muted-foreground">Concessions : </span>{c.concessions}</p>
      <p><span className="text-muted-foreground">Responsabilités : </span>{c.responsibilities}</p>
      <p><span className="text-muted-foreground">Budget : </span>{c.budget_support ? "soutien au budget" : "pas d'engagement"}</p>
      {c.status === "rompue" && c.broken_by && <p className="text-destructive">Rompu par {c.broken_by}</p>}
      {c.status === "proposee" && s.led.includes(c.partner.id) && <div className="grid grid-cols-2 gap-2">
        <Button className="h-11" onClick={() => act("accept", { coalition_id: c.id }, "Accord conclu")}>Accepter</Button>
        <Button className="h-11" variant="outline" onClick={() => act("refuse", { coalition_id: c.id }, "Proposition refusée")}>Refuser</Button></div>}
      {c.status === "active" && (s.led.includes(c.partner.id) || s.led.includes(c.proposer.id)) &&
        <Button className="h-11 w-full" variant="outline" onClick={() => { if (confirm("Rompre l'accord ? Ton parti perdra de la réputation.")) act("break", { coalition_id: c.id }, "Accord rompu"); }}>Rompre l'accord</Button>}
    </article>)}
  </div>;
}

function VoteCard({ v, members }: { v: OrgVote; members: { id: string; name: string }[] }) {
  const act = useAct();
  const name = (id: string) => v.candidates?.find(c => c.id === id)?.name ?? members.find(m => m.id === id)?.name ?? id;
  const open = v.status === "ouvert";
  const choices: [string, string][] = v.kind === "president" ? (v.candidates ?? []).map(c => [c.id, c.name]) : [["pour", "Pour"], ["contre", "Contre"], ["abstention", "Abstention"]];
  const STATUS: Record<string, string> = { ouvert: "Ouvert", adopte: "Adopté", rejete: "Rejeté", elu: "Élu", sans_resultat: "Sans résultat (égalité ou aucun vote)" };
  return <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
    <p className="text-xs text-muted-foreground">{VOTE_KINDS[v.kind]} · {STATUS[v.status]}{open ? ` · jusqu'au ${new Date(v.closes_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>
    <p className="font-semibold">{v.title}</p>{v.body && <p className="whitespace-pre-wrap">{v.body}</p>}
    {open && !v.voted && <div className="grid grid-cols-2 gap-2">{choices.map(([k, l]) => <Button key={k} className="h-11" variant="outline" onClick={() => act("ballot", { vote_id: v.id, choice: k }, "Vote enregistré (secret)")}>{l}</Button>)}</div>}
    {open && v.voted && <p className="text-muted-foreground">Tu as voté · {v.ballots} bulletin(s) pour l'instant</p>}
    {v.result && <div>{Object.entries(v.result.tally).map(([k, n]) => <p key={k} className="flex justify-between"><span>{v.kind === "president" ? name(k) : k}</span><b>{n}</b></p>)}
      {v.result.winner && <p className="font-semibold text-primary">Président élu : {name(v.result.winner)}</p>}</div>}
  </div>;
}

function Internal({ s }: { s: PartyLifeState }) {
  const act = useAct();
  const [orgId, setOrgId] = useState(s.my_orgs[0]?.id ?? "");
  const [kind, setKind] = useState("motion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cands, setCands] = useState<string[]>([]);
  const [coal, setCoal] = useState("");
  const o = s.my_orgs.find(x => x.id === orgId);
  if (!s.my_orgs.length) return <p className="text-sm text-muted-foreground">Rejoins un parti ou un mouvement pour participer à sa vie interne.</p>;
  const leader = o ? s.led.includes(o.id) : false;
  const coalitions = s.coalitions.filter(c => o && (c.proposer.id === o.id || c.partner.id === o.id));
  const open = async () => { if (await act("open_vote", { org_id: orgId, kind, title, body, candidates: cands, coalition_id: coal || null }, "Vote ouvert aux membres")) { setTitle(""); setBody(""); setCands([]); } };
  return <div className="space-y-3">
    {s.my_orgs.length > 1 && <GameSelect className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={orgId} onChange={e => setOrgId(e.target.value)}>
      {s.my_orgs.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</GameSelect>}
    {o && <>
      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <p className="font-heading text-lg font-bold">{o.name}</p>
        <p>Président : <b>{o.president ?? "pas encore élu"}</b> · {o.members?.length ?? 0} membre(s)</p>
        {o.program && <p className="mt-2 whitespace-pre-wrap"><span className="text-muted-foreground">Programme adopté : </span>{o.program}</p>}
      </section>
      {leader && <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <p className="font-semibold">Organiser un vote</p>
        <div className="grid grid-cols-2 gap-2">{Object.entries(VOTE_KINDS).map(([k, l]) => <Button key={k} className="h-11 text-xs" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>{l}</Button>)}</div>
        <Input className="h-11 text-base" maxLength={140} placeholder="Titre du vote" value={title} onChange={e => setTitle(e.target.value)} />
        {kind !== "president" && <Textarea maxLength={1200} placeholder={kind === "programme" ? "Nouveau programme (20 caractères minimum)" : "Texte soumis au vote"} value={body} onChange={e => setBody(e.target.value)} />}
        {kind === "president" && <div className="space-y-1"><p className="text-sm">Candidats (membres) :</p>{(o.members ?? []).map(m => <label key={m.id} className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={cands.includes(m.id)} onChange={e => setCands(e.target.checked ? [...cands, m.id] : cands.filter(x => x !== m.id))} />{m.name}</label>)}</div>}
        {kind === "alliance" && <GameSelect className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={coal} onChange={e => setCoal(e.target.value)}>
          <option value="">Choisir l'accord concerné…</option>{coalitions.map(c => <option key={c.id} value={c.id}>{c.proposer.name} + {c.partner.name} · {COALITION_STATUS[c.status]}</option>)}</GameSelect>}
        <Button className="h-12 w-full" disabled={title.trim().length < 5 || (kind === "president" && !cands.length) || (kind === "alliance" && !coal)} onClick={open}>Ouvrir le vote ({s.settings.vote_hours} h)</Button>
      </section>}
      {(o.votes ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Aucun vote pour l'instant.</p> : o.votes!.map(v => <VoteCard key={v.id} v={v} members={o.members ?? []} />)}
    </>}
  </div>;
}
