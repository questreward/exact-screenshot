import { GameSelect } from "@/components/game/GameSelect";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, LoaderCircle, SearchCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { factCheckQuery, runFactCheck, type FactCheck } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { INDICATOR_LABELS } from "@/game/society";
import { VERDICTS } from "@/game/factcheck";

export const Route = createFileRoute("/_authenticated/_game/verification")({
  head: () => ({ meta: gameMeta("Vérification des faits", "Vérifiez une affirmation politique avec les vraies données de votre ville.") }),
  component: FactCheckPage,
});

const DATA_LABELS: Record<string, string> = { il_y_a: "Valeur au début", actuel: "Valeur actuelle", evolution_reelle: "Évolution réelle", seuil: "Seuil annoncé", solde: "Caisse de la ville" };
const pretty = (s: string) => s.replace(/« ([a-z_]+) »/g, (_, k: string) => `« ${INDICATOR_LABELS[k] ?? k} »`);

function Result({ c }: { c: FactCheck }) {
  const v = VERDICTS[c.verdict] ?? { label: c.verdict, tone: "bg-muted" };
  return <article className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
    {c.author && <p className="text-xs text-muted-foreground">Demandée par {c.mine ? "vous" : c.author}{c.created_at ? ` · ${new Date(c.created_at).toLocaleDateString("fr-FR")}` : ""}</p>}
    <p className="text-xs font-bold uppercase text-muted-foreground">Affirmation</p><p className="font-semibold">{pretty(c.claim)}</p>
    <ArrowDown className="h-4 w-4 text-muted-foreground" />
    <p className="text-xs font-bold uppercase text-muted-foreground">Données</p>
    {Object.keys(c.data).length === 0 ? <p>Aucune donnée disponible.</p> : <ul>{Object.entries(c.data).map(([k, val]) => <li key={k} className="flex justify-between"><span>{DATA_LABELS[k] ?? k}</span><b>{Number(val).toLocaleString("fr-FR")}</b></li>)}</ul>}
    <ArrowDown className="h-4 w-4 text-muted-foreground" />
    <p className="text-xs font-bold uppercase text-muted-foreground">Calcul</p><p>{c.calculation}</p>
    <ArrowDown className="h-4 w-4 text-muted-foreground" />
    <p className="text-xs font-bold uppercase text-muted-foreground">Conclusion</p>
    <span className={`inline-block rounded-full px-3 py-1 font-bold ${v.tone}`}>{v.label}</span>
  </article>;
}

function FactCheckPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery(factCheckQuery);
  const [kind, setKind] = useState<"evolution" | "niveau" | "budget">("evolution");
  const [indicator, setIndicator] = useState("");
  const [direction, setDirection] = useState("hausse");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("30");
  const [last, setLast] = useState<FactCheck | null>(null);
  const dirs = kind === "evolution" ? [["hausse", "a augmenté de"], ["baisse", "a baissé de"]] : [["au_dessus", "est au-dessus de"], ["en_dessous", "est en dessous de"]];
  const pickKind = (k: typeof kind) => { setKind(k); setDirection(k === "evolution" ? "hausse" : "au_dessus"); };
  const check = async () => {
    try { setLast(await runFactCheck({ kind, indicator, direction, amount: Number(amount), days: Number(days) })); await qc.invalidateQueries({ queryKey: ["fact-checks"] }); }
    catch (e) { toast.error((e as Error).message); }
  };
  const ind = indicator || data?.indicators[0] || "";
  if (!indicator && ind) setIndicator(ind);
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><SearchCheck className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Vérification des faits</h1><p className="text-sm text-muted-foreground">Le jeu compare l'affirmation à ses propres données. Aucune IA ne décide.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Vérification des faits : Disponible dans une prochaine étape.</p>}
    {data && <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <p className="font-semibold">Quelle affirmation veux-tu vérifier ?</p>
      <div className="grid grid-cols-3 gap-2">{([["evolution", "Une évolution"], ["niveau", "Un niveau"], ["budget", "Le budget"]] as const).map(([k, l]) =>
        <Button key={k} className="h-11" variant={kind === k ? "default" : "outline"} onClick={() => pickKind(k)}>{l}</Button>)}</div>
      {kind !== "budget" ? <GameSelect className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={ind} onChange={e => setIndicator(e.target.value)}>
        {data.indicators.map(i => <option key={i} value={i}>{INDICATOR_LABELS[i] ?? i}</option>)}</GameSelect>
        : <p className="text-sm">La caisse de la ville…</p>}
      <div className="grid grid-cols-2 gap-2">{dirs.map(([k, l]) => <Button key={k} className="h-11" variant={direction === k ? "default" : "outline"} onClick={() => setDirection(k!)}>{l}</Button>)}</div>
      <Input className="h-11 text-base" type="number" inputMode="numeric" min={0} placeholder={kind === "budget" ? "Montant en €" : "Nombre de points (0 à 100)"} value={amount} onChange={e => setAmount(e.target.value)} />
      {kind === "evolution" && <label className="flex items-center gap-2 text-sm">en <Input className="h-11 w-24 text-base" type="number" min={1} max={365} value={days} onChange={e => setDays(e.target.value)} /> jours</label>}
      <Button className="h-12 w-full" disabled={amount === ""} onClick={check}>Vérifier</Button>
    </div>}
    {last && <Result c={last} />}
    {data && data.checks.length > 0 && <><h2 className="font-heading text-lg font-bold">Vérifications de la ville</h2>{data.checks.map(c => <Result key={c.id} c={c} />)}</>}
  </div>;
}
