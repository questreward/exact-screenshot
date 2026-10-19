import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLifeMutation } from "@/components/game/LifeControls";
import { orientationAction, orientationQuery, type OrientationState } from "@/services/game";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/orientation")({
  head: () => ({ meta: gameMeta("Mon orientation politique", "Parti soutenu ou indépendant, positionnement sur les grands sujets et historique.") }),
  component: OrientationPage,
});

const FAMILIES: Record<string, string> = { gauche: "Gauche", centre: "Centre", droite: "Droite", autre: "Autres" };

function PartyPicker({ st }: { st: OrientationState }) {
  const [open, setOpen] = useState(false);
  const act = useLifeMutation((code: string | null) => orientationAction("party", { party_code: code ?? "" }), "Orientation enregistrée");
  const current = st.parties.find(p => p.code === st.party_code);
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">Parti soutenu</h2>
    <p className="text-2xl font-bold text-primary">{current ? current.label : "Indépendant / sans parti"}</p>
    <p className="rounded-lg bg-muted p-3 text-sm">Ce choix représente ton positionnement politique dans CIVITAS. Il ne constitue pas une adhésion réelle à ce parti.</p>
    {!open ? <Button variant="outline" className="h-12 w-full" onClick={() => setOpen(true)}>Changer</Button> : <div className="space-y-3">
      <Button variant={st.party_code === null ? "default" : "outline"} className="h-12 w-full" disabled={act.isPending} onClick={() => { act.mutate(null); setOpen(false); }}>Indépendant / sans parti</Button>
      {Object.entries(FAMILIES).map(([f, label]) => {
        const list = st.parties.filter(p => p.family === f);
        return list.length > 0 && <div key={f}><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <div className="grid grid-cols-2 gap-2">{list.map(p => <Button key={p.code} variant={st.party_code === p.code ? "default" : "outline"}
            className="h-auto min-h-12 whitespace-normal py-2 text-sm" disabled={act.isPending} onClick={() => { act.mutate(p.code); setOpen(false); }}>{p.label}</Button>)}</div></div>;
      })}
      <Button variant="ghost" className="h-12 w-full" onClick={() => setOpen(false)}>Annuler</Button>
    </div>}
    <div className="rounded-lg border border-border p-3 text-sm">
      <p className="font-semibold">Partis CIVITAS (créés par les joueurs)</p>
      {st.civitas_orgs.length > 0 ? <p>{st.civitas_orgs.map(o => o.name).join(" · ")}</p> : <p className="text-muted-foreground">Vous n'êtes membre d'aucun parti ou mouvement du jeu.</p>}
      <Button asChild variant="link" className="h-10 px-0"><Link to="/politique">Rejoindre ou créer un parti CIVITAS</Link></Button>
    </div>
  </section>;
}

function AxesEditor({ st }: { st: OrientationState }) {
  const [axes, setAxes] = useState<Record<string, number>>(() => Object.fromEntries(st.axis_defs.map(a => [a.id, st.axes[a.id] ?? 50])));
  const save = useLifeMutation(() => orientationAction("axes", { axes }), "Positionnement enregistré");
  return <section className="space-y-4 rounded-xl border border-border bg-card p-4">
    <div><h2 className="font-heading text-lg font-bold">Mon positionnement</h2>
      <p className="text-xs text-muted-foreground">Aucune réponse imposée. Votre parcours peut ajouter une tendance, mais jamais changer votre parti.</p></div>
    {st.axis_defs.map(a => {
      const drift = st.drift[a.id] ?? 0;
      return <div key={a.id}>
        <div className="flex justify-between text-sm"><span className="font-semibold">{a.label}</span><span className="text-muted-foreground">{axes[a.id]}</span></div>
        <input type="range" min={0} max={100} step={5} value={axes[a.id]} onChange={e => setAxes({ ...axes, [a.id]: Number(e.target.value) })} className="h-10 w-full accent-primary" aria-label={a.label} />
        <div className="flex justify-between text-xs text-muted-foreground"><span>← {a.low_label}</span><span>{a.high_label} →</span></div>
        {drift !== 0 && <p className="text-xs text-primary">Votre parcours vous pousse {drift > 0 ? "vers" : "à l'opposé de"} « {a.high_label} » ({drift > 0 ? "+" : ""}{drift}).</p>}
      </div>;
    })}
    <Button className="h-12 w-full" disabled={save.isPending} onClick={() => save.mutate(undefined)}>Enregistrer</Button>
  </section>;
}

function OrientationPage() {
  const { data: st, isLoading, isError } = useQuery(orientationQuery);
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Compass className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Mon orientation politique</h1><p className="text-sm text-muted-foreground">Vos idées, vos choix, votre parcours.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Mon orientation : Disponible dans une prochaine étape.</p>}
    {st && <>
      <PartyPicker st={st} />
      <AxesEditor st={st} />
      <section className="rounded-xl border border-border bg-card p-4"><h2 className="font-heading text-lg font-bold">Historique</h2>
        {st.history.length === 0 ? <p className="text-sm text-muted-foreground">Indépendant depuis le début.</p>
          : <ol className="mt-2 space-y-1 border-l-2 border-border pl-3">{st.history.map((h, i) => <li key={i} className="text-sm"><b>{new Date(h.at).getFullYear()}</b> — {h.label}</li>)}</ol>}
      </section>
    </>}
  </div>;
}
