import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Baby, Heart, Home, LoaderCircle, Search, Smile, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLifeMutation } from "@/components/game/LifeControls";
import { familyAction, familyQuery, playerDirectoryQuery, type FamilyState, type PlayerCard } from "@/services/game";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/famille")({
  head: () => ({ meta: gameMeta("Famille", "Couple, PACS, mariage, logement partagé, enfants et amis proches.") }),
  component: FamilyPage,
});

const UNION = { pacs: "PACS", mariage: "Mariage" } as const;

function Box({ icon: Icon, title, children }: { icon: typeof Heart; title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="flex items-center gap-2 font-heading text-lg font-bold"><Icon className="h-5 w-5 text-primary" />{title}</h2>{children}
  </section>;
}

/** Choisir un joueur (recherche) ou un habitant proche. */
function PersonPicker({ st, npcMin, onPick, label }: { st: FamilyState; npcMin: number; onPick: (p: { character_id?: string; npc_id?: string }) => void; label: string }) {
  const [q, setQ] = useState("");
  const { data: dir } = useQuery({ ...playerDirectoryQuery(q), enabled: q.trim().length >= 2 });
  const npcs = st.close_npcs.filter(n => n.score >= npcMin);
  return <div className="space-y-2">
    <div className="relative"><Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
      <Input className="h-12 pl-10" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un joueur" /></div>
    {dir?.players.filter((p: PlayerCard) => p.id !== st.me).slice(0, 5).map((p: PlayerCard) =>
      <Button key={p.id} variant="outline" className="h-12 w-full justify-between" onClick={() => onPick({ character_id: p.id })}><span className="truncate">{p.name} · {p.city}</span><span className="text-primary">{label}</span></Button>)}
    {npcs.length > 0 && <p className="text-xs text-muted-foreground">Habitants proches de vous (relation {npcMin} ou plus) :</p>}
    {npcs.map(n => <Button key={n.id} variant="outline" className="h-12 w-full justify-between" onClick={() => onPick({ npc_id: n.id })}><span className="truncate">{n.name}, {n.age} ans · relation {n.score}</span><span className="text-primary">{label}</span></Button>)}
  </div>;
}

function CoupleBox({ st }: { st: FamilyState }) {
  const act = useLifeMutation(familyAction, "C'est fait");
  const [rid] = useState(() => crypto.randomUUID());
  const s = st.settings; const cp = st.couple;
  if (st.age < s.min_age) return <Box icon={Heart} title="Couple"><p className="text-sm text-muted-foreground">Possible à partir de {s.min_age} ans.</p></Box>;
  if (!cp) return <Box icon={Heart} title="Couple">
    {st.requests.map(r => <div key={r.id} className="space-y-2 rounded-lg border border-primary/40 p-3">
      <p className="text-sm"><b>{r.from.name}</b> souhaite former un couple avec vous.</p>
      <div className="grid grid-cols-2 gap-2"><Button className="h-12" onClick={() => act.mutate({ command: "answer", couple_id: r.id, accept: true })}>Accepter</Button>
        <Button variant="outline" className="h-12" onClick={() => act.mutate({ command: "answer", couple_id: r.id, accept: false })}>Décliner</Button></div></div>)}
    {st.sent.map(r => <p key={r.id} className="text-sm text-muted-foreground">Demande envoyée à {r.to.name}, en attente.</p>)}
    <p className="text-sm">Vous êtes célibataire. Proposez à un joueur (il devra accepter) ou à un habitant dont vous êtes très proche (relation {s.npc_couple_score}+).</p>
    <PersonPicker st={st} npcMin={s.npc_couple_score} label="Proposer" onPick={p => act.mutate({ command: "propose", request_id: rid, ...p })} />
  </Box>;
  const canUnion = new Date(st.now).getTime() >= new Date(cp.started_at).getTime() + s.union_after_days * 86400000;
  const co = cp.cohabitation;
  return <Box icon={Heart} title="Couple">
    <p className="text-sm">En couple avec <b>{cp.partner.name}</b>{cp.partner.player ? "" : " (habitant)"}{cp.union_kind && ` · ${UNION[cp.union_kind]}`}</p>
    {cp.union_pending && (cp.union_requested_by_me
      ? <p className="text-sm text-muted-foreground">Votre proposition de {UNION[cp.union_pending]} attend une réponse.</p>
      : <Button className="h-12 w-full" onClick={() => act.mutate({ command: "union", kind: cp.union_pending })}>Accepter le {UNION[cp.union_pending]}</Button>)}
    {cp.union_kind !== "mariage" && !cp.union_pending && (canUnion
      ? <div className="grid grid-cols-2 gap-2">
          {cp.union_kind !== "pacs" && <Button variant="outline" className="h-12" onClick={() => act.mutate({ command: "union", kind: "pacs" })}>Proposer un PACS</Button>}
          <Button variant="outline" className="h-12" onClick={() => act.mutate({ command: "union", kind: "mariage" })}>Demander en mariage</Button>
        </div>
      : <p className="text-xs text-muted-foreground">PACS ou mariage possible après {s.union_after_days} jours de couple.</p>)}
    {cp.partner.player && <div className="space-y-2 rounded-lg bg-muted p-3">
      <p className="flex items-center gap-2 text-sm font-semibold"><Home className="h-4 w-4 text-primary" />Logement</p>
      {!co && <><p className="text-sm">Emménagez chez votre partenaire : vous lui versez chaque jour {s.rent_share_pct} % de son loyer. Votre propre logement reste inchangé.</p>
        <Button className="h-12 w-full" onClick={() => act.mutate({ command: "move_in" })}>Proposer d'emménager chez {cp.partner.name}</Button></>}
      {co?.status === "pending" && (co.host_is_me
        ? <div className="grid grid-cols-2 gap-2"><Button className="h-12" onClick={() => act.mutate({ command: "host_answer", accept: true })}>Accueillir</Button>
            <Button variant="outline" className="h-12" onClick={() => act.mutate({ command: "host_answer", accept: false })}>Refuser</Button></div>
        : <p className="text-sm text-muted-foreground">En attente de l'accord de votre partenaire.</p>)}
      {co?.status === "active" && <><p className="text-sm">{co.host_is_me ? `Votre partenaire vit chez vous et vous verse ${co.share} crédits par jour.` : `Vous vivez chez votre partenaire et versez ${co.share} crédits par jour.`}</p>
        <Button variant="outline" className="h-12 w-full" onClick={() => act.mutate({ command: "move_out" })}>Ne plus vivre ensemble</Button></>}
    </div>}
    <Button variant="ghost" className="h-12 w-full text-destructive" onClick={() => { if (confirm("Mettre fin à votre couple ?")) act.mutate({ command: "separate" }); }}>Se séparer</Button>
  </Box>;
}

function ChildrenBox({ st }: { st: FamilyState }) {
  const act = useLifeMutation(async (i: Parameters<typeof familyAction>[0]) => { await familyAction(i); setName(""); setRid(crypto.randomUUID()); }, "C'est fait");
  const answer = useLifeMutation(familyAction, "C'est fait");
  const [name, setName] = useState(""); const [rid, setRid] = useState(() => crypto.randomUUID());
  const s = st.settings; const ok = name.trim().length >= 2;
  return <Box icon={Baby} title="Enfants">
    {st.children.map(k => <div key={k.id} className="space-y-1 rounded-lg border border-border p-3">
      <p className="font-semibold">{k.first_name}{k.age !== null && `, ${k.age} an${k.age > 1 ? "s" : ""}`} <span className="text-xs font-normal text-muted-foreground">({k.origin})</span></p>
      {k.status === "pending" && (k.requested_by_me ? <p className="text-sm text-muted-foreground">En attente de l'accord de votre partenaire.</p>
        : <div className="grid grid-cols-2 gap-2"><Button className="h-12" onClick={() => answer.mutate({ command: "child_answer", child_id: k.id, accept: true })}>Accepter</Button>
            <Button variant="outline" className="h-12" onClick={() => answer.mutate({ command: "child_answer", child_id: k.id, accept: false })}>Décliner</Button></div>)}
      {k.status === "home" && <><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${k.wellbeing}%` }} /></div>
        <p className="text-xs text-muted-foreground">Bien-être {k.wellbeing}/100{k.unpaid_weeks > 0 && ` · ${k.unpaid_weeks} semaine(s) impayée(s)`}</p></>}
      {k.status === "adult" && <p className="text-sm text-muted-foreground">Majeur, a pris son envol.</p>}
    </div>)}
    <p className="text-xs text-muted-foreground">1 an d'enfant = {s.child_days_per_year} jours de jeu. Coût : {s.child_weekly_cost} crédits par semaine, partagés entre parents joueurs. Sans argent, rien n'est débité mais le bien-être baisse. {s.child_max} enfants au foyer maximum.</p>
    <Input className="h-12" value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder="Prénom de l'enfant" />
    <div className="grid grid-cols-2 gap-2">
      <Button className="h-12" disabled={!ok || !st.couple || act.isPending} onClick={() => act.mutate({ command: "child", request_id: rid, first_name: name })}>{act.isPending && <LoaderCircle className="animate-spin" />}Avoir un enfant</Button>
      <Button variant="outline" className="h-12" disabled={!ok || st.age < s.adoption_min_age || act.isPending} onClick={() => act.mutate({ command: "adopt", request_id: rid, first_name: name })}>Adopter</Button>
    </div>
    {!st.couple && <p className="text-xs text-muted-foreground">Avoir un enfant demande d'être en couple. Adoption possible seul dès {s.adoption_min_age} ans.</p>}
  </Box>;
}

function FriendsBox({ st }: { st: FamilyState }) {
  const act = useLifeMutation(familyAction, "C'est fait");
  const hang = useLifeMutation(familyAction, `+${st.settings.friend_energy} énergie`);
  const active = st.friends.filter(f => f.status === "active").length;
  return <Box icon={Users} title="Amis proches">
    {st.friends.map(f => <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.person.name}{!f.person.player && " (habitant)"}</span>
      {f.status === "active" && <Button className="h-11" disabled={st.hangout_today || hang.isPending} onClick={() => hang.mutate({ command: "hangout", friend_id: f.id })}><Smile />Moment</Button>}
      {f.incoming && <><Button className="h-11" onClick={() => act.mutate({ command: "friend_answer", friend_id: f.id, accept: true })}>Oui</Button>
        <Button variant="outline" className="h-11" onClick={() => act.mutate({ command: "friend_answer", friend_id: f.id, accept: false })}>Non</Button></>}
      {f.status === "pending" && !f.incoming && <span className="text-xs text-muted-foreground">en attente</span>}
      {f.status === "active" && <Button variant="ghost" className="h-11" onClick={() => act.mutate({ command: "unfriend", friend_id: f.id })}>Retirer</Button>}
    </div>)}
    <p className="text-xs text-muted-foreground">Un moment entre amis par jour redonne {st.settings.friend_energy} d'énergie{st.hangout_today && " (déjà fait aujourd'hui)"}. {st.settings.friend_max} amis proches maximum.</p>
    {active < st.settings.friend_max && <PersonPicker st={st} npcMin={st.settings.npc_friend_score} label="Ajouter" onPick={p => act.mutate({ command: "friend", ...p })} />}
  </Box>;
}

function FamilyPage() {
  const { data: st, isError, isLoading } = useQuery(familyQuery);
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Heart className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Famille</h1><p className="text-sm text-muted-foreground">Votre vie privée, visible par vous seul.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Famille et vie privée : Disponible dans une prochaine étape.</p>}
    {st && <><CoupleBox st={st} /><ChildrenBox st={st} /><FriendsBox st={st} /></>}
  </div>;
}
