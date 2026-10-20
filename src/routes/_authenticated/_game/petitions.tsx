import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileSignature, Landmark, LoaderCircle, ThumbsDown, ThumbsUp, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { petitionAction, petitionQuery, type Petition, type PetitionState } from "@/services/game";
import { WritingHelper } from "@/components/game/WritingHelper";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/petitions")({
  head: () => ({ meta: gameMeta("Pétitions et référendums", "Lancez une pétition, faites signer votre ville et déclenchez un référendum.") }),
  component: PetitionsPage,
});

const STATUS: Record<Petition["status"], string> = {
  open: "Signatures en cours", expired: "Seuil non atteint", referendum: "Référendum en cours", rejected: "Le non l'emporte",
  council: "Le oui l'emporte · réponse de la mairie attendue", accepted: "Acceptée par la mairie", refused: "Refusée par la mairie",
  assembly: "Inscrite à l'ordre du jour de l'Assemblée",
};
const fmt = (s: string) => new Date(s).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const n = (v: number) => v.toLocaleString("fr-FR");

function Card({ p, st }: { p: Petition; st: PetitionState }) {
  const sign = useLifeMutation(petitionAction, "Pétition signée");
  const vote = useLifeMutation(petitionAction, "A voté !");
  const council = useLifeMutation(petitionAction, "Réponse envoyée");
  const [note, setNote] = useState("");
  const pct = Math.min(100, Math.round(p.signatures * 100 / p.threshold));
  return <article className="space-y-3 rounded-xl border border-border bg-card p-4">
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-primary">{STATUS[p.status]}</p>
      <h3 className="font-heading text-lg font-bold leading-tight">{p.title}</h3>
      <p className="text-xs text-muted-foreground">Par {p.mine ? "vous" : p.author}</p>
    </div>
    <p className="whitespace-pre-line text-sm">{p.body}</p>
    <div className="space-y-1">
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
      <p className="text-xs text-muted-foreground">{n(p.signatures)} / {n(p.threshold)} signatures{p.status === "open" && ` · jusqu'au ${fmt(p.ends_at)}`}</p>
    </div>
    {p.status === "open" && (p.signed
      ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" />Vous avez signé.</p>
      : <Button className="h-12 w-full" disabled={sign.isPending} onClick={() => sign.mutate({ command: "sign", petition_id: p.id })}><FileSignature />Signer</Button>)}
    {p.status === "referendum" && <div className="space-y-2">
      <p className="text-sm">Bureaux ouverts jusqu'au {p.referendum_ends_at && fmt(p.referendum_ends_at)}.</p>
      {p.voted !== null
        ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" />Vous avez voté {p.voted ? "oui" : "non"}.</p>
        : <div className="grid grid-cols-2 gap-2">
            <Button className="h-12" disabled={vote.isPending} onClick={() => vote.mutate({ command: "vote", petition_id: p.id, yes: true })}><ThumbsUp />Oui</Button>
            <Button variant="outline" className="h-12" disabled={vote.isPending} onClick={() => vote.mutate({ command: "vote", petition_id: p.id, yes: false })}><ThumbsDown />Non</Button>
          </div>}
    </div>}
    {p.yes_pct !== null && <p className="text-sm font-semibold">Résultat : {String(p.yes_pct).replace(".", ",")} % de oui</p>}
    {p.council_note && <p className="rounded-md bg-muted p-2 text-sm">Mairie : {p.council_note}</p>}
    {p.status === "council" && st.mayor && <div className="space-y-2 rounded-lg border border-primary/40 p-3">
      <p className="text-sm font-semibold">En tant que maire, vous devez répondre avant le {p.council_ends_at && fmt(p.council_ends_at)}.</p>
      <Textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Votre réponse aux habitants (facultatif)" />
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-12" disabled={council.isPending} onClick={() => council.mutate({ command: "council", petition_id: p.id, accept: true, note })}>Accepter</Button>
        <Button variant="outline" className="h-12" disabled={council.isPending} onClick={() => council.mutate({ command: "council", petition_id: p.id, accept: false, note })}>Refuser</Button>
      </div>
      <p className="text-xs text-muted-foreground">Refuser ou ne pas répondre fait perdre de la réputation politique.</p>
    </div>}
  </article>;
}

function NewPetition({ st }: { st: PetitionState }) {
  const [scope, setScope] = useState<"city" | "national">("city");
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const [rid, setRid] = useState(() => crypto.randomUUID());
  const create = useLifeMutation(async (i: Parameters<typeof petitionAction>[0]) => { await petitionAction(i); setTitle(""); setBody(""); setRid(crypto.randomUUID()); }, "Pétition lancée");
  if (!st.can_create) return <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Vous avez déjà une pétition en cours : une seule à la fois.</p>;
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">Lancer une pétition</h2>
    <div className="grid grid-cols-2 gap-2">
      <Button variant={scope === "city" ? "default" : "outline"} className="h-12" onClick={() => setScope("city")}><Landmark />{st.city_name}</Button>
      <Button variant={scope === "national" ? "default" : "outline"} className="h-12" onClick={() => setScope("national")}><Vote />France</Button>
    </div>
    <p className="text-xs text-muted-foreground">{scope === "city"
      ? `Seuil : ${String(st.settings.city_pct).replace(".", ",")} % des habitants en ${st.settings.signing_days} jours. Ensuite, la ville vote pendant ${st.settings.referendum_days} jours ; si le oui gagne, la mairie doit répondre.`
      : `Seuil : ${String(st.settings.national_pct).replace(".", ",")} % des Français en ${st.settings.signing_days} jours. Si elle réussit, elle est inscrite à l'ordre du jour de l'Assemblée.`}</p>
    <Input className="h-12" value={title} onChange={e => setTitle(e.target.value)} maxLength={st.settings.title_max} placeholder="Titre (10 caractères minimum)" />
    <Textarea rows={4} value={body} onChange={e => setBody(e.target.value)} maxLength={st.settings.body_max} placeholder="Ce que vous demandez et pourquoi (30 caractères minimum)" />
    <WritingHelper kind="petition" max={st.settings.body_max} onUse={setBody} />
    <Button className="h-12 w-full" disabled={create.isPending || title.trim().length < 10 || body.trim().length < 30}
      onClick={() => create.mutate({ command: "create", request_id: rid, scope, title, body })}>{create.isPending && <LoaderCircle className="animate-spin" />}Lancer la pétition</Button>
  </section>;
}

function PetitionsPage() {
  const { data: st, isError, isLoading } = useQuery(petitionQuery);
  const [tab, setTab] = useState<"city" | "national">("city");
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><FileSignature className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Pétitions</h1><p className="text-sm text-muted-foreground">Faites entendre votre voix, jusqu'au référendum.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Pétitions et référendums : Disponible dans une prochaine étape.</p>}
    {st && <>
      <NewPetition st={st} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant={tab === "city" ? "default" : "outline"} className="h-12" onClick={() => setTab("city")}>{st.city_name} ({st.city.length})</Button>
        <Button variant={tab === "national" ? "default" : "outline"} className="h-12" onClick={() => setTab("national")}>France ({st.national.length})</Button>
      </div>
      {(tab === "city" ? st.city : st.national).map(p => <Card key={p.id} p={p} st={st} />)}
      {(tab === "city" ? st.city : st.national).length === 0 && <p className="text-center text-sm text-muted-foreground">Aucune pétition pour l'instant. Lancez la première !</p>}
    </>}
  </div>;
}
