import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Compass, LoaderCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { gameMeta } from "@/game/metadata";
import { planActivities, type PlanStep } from "@/lib/activity-planner.functions";

export const Route = createFileRoute("/_authenticated/_game/guide")({
  head: () => ({ meta: gameMeta("Guide de la ville", "Décris ton envie : le guide te propose des activités et un itinéraire parmi les lieux de ta ville.") }),
  component: GuidePage,
});

const IDEAS = ["Une journée calme au soleil", "Rencontrer du monde ce soir", "M'occuper de mes papiers", "M'engager pour mon quartier"];

function GuidePage() {
  const plan = useServerFn(planActivities);
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<{ intro: string; steps: PlanStep[] } | null>(null);
  async function go() {
    setBusy(true); setErr(""); setRes(null);
    try { setRes(await plan({ data: { wish } })); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Compass className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Guide de la ville</h1>
        <p className="text-sm text-muted-foreground">Dis ce que tu as envie de faire, le guide te propose un parcours.</p></div></header>
    <div className="flex flex-wrap gap-2">{IDEAS.map((i) => <Button key={i} variant="outline" className="min-h-11" onClick={() => setWish(i)}>{i}</Button>)}</div>
    <Textarea value={wish} maxLength={400} onChange={(e) => setWish(e.target.value)} placeholder="Ex. : je veux me détendre puis voir des amis" className="min-h-28 text-base" />
    <Button className="min-h-12 w-full" disabled={busy || wish.trim().length < 3} onClick={go}>
      {busy && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{busy ? "Le guide réfléchit…" : "Proposer un itinéraire"}</Button>
    {err && <p className="rounded-xl border border-border bg-card p-4 text-sm">{err}</p>}
    {res && <section className="space-y-3">
      <p className="text-sm">{res.intro}</p>
      <ol className="space-y-2">{res.steps.map((s, n) => <li key={s.locationId} className="flex gap-3 rounded-xl border border-border bg-card p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{n + 1}</span>
        <div><p className="font-heading font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{s.kind}{s.district ? ` · ${s.district}` : ""}</p><p className="mt-1 text-sm">{s.activity}</p><Link to="/carte" search={{ location: s.locationId }} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Voir ce lieu sur la carte</Link></div>
      </li>)}</ol>
      <p className="text-xs text-muted-foreground">Ce sont des idées : rien n'est fait automatiquement. Va sur la carte pour te rendre à chaque lieu.</p>
      <Button asChild className="min-h-12 w-full"><Link to="/carte"><MapPin className="mr-2 h-4 w-4" />Ouvrir la carte</Link></Button>
    </section>}
  </div>;
}
