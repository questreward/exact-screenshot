import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gavel, LoaderCircle, Scale, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { justiceAction, justiceQuery, playerDirectoryQuery, type JusticeCase, type JusticeCategory, type PlayerCard } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { JUSTICE_CATEGORIES } from "@/game/society";

export const Route = createFileRoute("/_authenticated/_game/justice")({
  head: () => ({ meta: gameMeta("Justice", "Portez plainte contre un joueur, défendez-vous, le tribunal tranche.") }),
  component: JusticePage,
});

const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function CaseCard({ k }: { k: JusticeCase }) {
  const [txt, setTxt] = useState("");
  const act = useLifeMutation(justiceAction, "Défense déposée");
  return <div className="space-y-2 rounded-xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm"><b>{k.role === "plaignant" ? `Vous contre ${k.other.name}` : `${k.other.name} contre vous`}</b><br />
        <span className="text-muted-foreground">{JUSTICE_CATEGORIES[k.category]} · {k.judge}</span></p>
      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${k.status === "jugee" ? (k.verdict === "coupable" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary") : "bg-muted"}`}>
        {k.status === "instruction" ? "En cours" : k.verdict === "coupable" ? "Coupable" : "Relaxe"}</span>
    </div>
    <p className="rounded-lg bg-muted p-3 text-sm"><b>Faits :</b> {k.facts}</p>
    {k.defense && <p className="rounded-lg bg-muted p-3 text-sm"><b>Défense :</b> {k.defense}</p>}
    {k.status === "instruction" && <p className="text-xs text-muted-foreground">Jugement prévu au plus tard : {fmt(k.deadline)}</p>}
    {k.status === "instruction" && k.role === "accuse" && !k.defense && <>
      <Textarea value={txt} onChange={e => setTxt(e.target.value)} maxLength={1000} placeholder="Votre défense (20 caractères minimum)" className="min-h-24" />
      <Button className="h-12 w-full" disabled={txt.trim().length < 20 || act.isPending} onClick={() => act.mutate({ command: "defend", case_id: k.id, text: txt })}>Déposer ma défense</Button>
    </>}
    {k.verdict === "coupable" && <p className="text-sm">{k.role === "accuse" ? `Amende de ${k.fine} crédits ${k.fine_paid ? "payée" : "en attente (prélevée dès que votre solde suffit)"}.` : `Amende de ${k.fine} crédits ${k.fine_paid ? "versée sur votre compte" : "en attente de paiement"}.`}</p>}
  </div>;
}

function FileForm({ fee }: { fee: number }) {
  const [q, setQ] = useState(""); const [target, setTarget] = useState<PlayerCard | null>(null);
  const [cat, setCat] = useState<JusticeCategory>("diffamation"); const [txt, setTxt] = useState("");
  const [rid, setRid] = useState(() => crypto.randomUUID());
  const { data: dir } = useQuery({ ...playerDirectoryQuery(q), enabled: q.trim().length >= 2 && !target });
  const act = useLifeMutation(async (i: Parameters<typeof justiceAction>[0]) => { await justiceAction(i); setTxt(""); setTarget(null); setQ(""); setRid(crypto.randomUUID()); }, "Plainte déposée");
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="flex items-center gap-2 font-heading text-lg font-bold"><Gavel className="h-5 w-5 text-primary" />Porter plainte</h2>
    {target ? <div className="flex items-center justify-between rounded-lg bg-muted p-3"><span className="text-sm">Contre <b>{target.name}</b></span><Button variant="ghost" className="h-10" onClick={() => setTarget(null)}>Changer</Button></div>
      : <><div className="relative"><Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input className="h-12 pl-10" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher le joueur concerné" /></div>
        {dir?.players.slice(0, 5).map((p: PlayerCard) => <Button key={p.id} variant="outline" className="h-12 w-full justify-start" onClick={() => setTarget(p)}>{p.name} · {p.city}</Button>)}</>}
    <div className="grid grid-cols-2 gap-2">{(Object.keys(JUSTICE_CATEGORIES) as JusticeCategory[]).map(c =>
      <Button key={c} variant={cat === c ? "default" : "outline"} className="h-12" onClick={() => setCat(c)}>{JUSTICE_CATEGORIES[c]}</Button>)}</div>
    <Textarea value={txt} onChange={e => setTxt(e.target.value)} maxLength={1000} placeholder="Décrivez les faits (20 caractères minimum)" className="min-h-24" />
    <Button className="h-12 w-full" disabled={!target || txt.trim().length < 20 || act.isPending} onClick={() => target && act.mutate({ command: "file", request_id: rid, character_id: target.id, category: cat, text: txt })}>
      {act.isPending && <LoaderCircle className="animate-spin" />}Déposer la plainte ({fee} crédits)</Button>
  </section>;
}

function JusticePage() {
  const { data: st, isError, isLoading } = useQuery(justiceQuery);
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Scale className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Justice</h1><p className="text-sm text-muted-foreground">Tribunal fictif. Seules les deux parties voient le dossier.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Justice et tribunaux : Disponible dans une prochaine étape.</p>}
    {st && <>
      <FileForm fee={st.settings.filing_fee} />
      <p className="text-xs text-muted-foreground">L'accusé a {st.settings.defense_hours} h pour se défendre. Le juge tranche ensuite (ou {st.settings.after_defense_hours} h après la défense). Se défendre réduit fortement le risque d'être condamné. Coupable : −{st.settings.reputation_loss} réputation et {st.settings.fine} crédits d'amende versés au plaignant. {st.settings.max_open} plaintes en cours maximum.</p>
      <h2 className="font-heading text-lg font-bold">Mes dossiers</h2>
      {st.cases.length === 0 && <p className="text-sm text-muted-foreground">Aucun dossier.</p>}
      {st.cases.map(k => <CaseCard key={k.id} k={k} />)}
    </>}
  </div>;
}
