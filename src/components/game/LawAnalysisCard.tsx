import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { FileText, Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzeLawDraft } from "@/server/law-analysis.functions";
import { LAW_TEXT_MAX, LAW_TEXT_MIN } from "@/game/law-analysis";

export function LawAnalysisCard() {
  const [text, setText] = useState("");
  const run = useServerFn(analyzeLawDraft);
  const m = useMutation({ mutationFn: (t: string) => run({ data: { text: t } }) });
  const a = m.data;
  return <section className="space-y-4 rounded-2xl border bg-card p-4">
    <header className="space-y-1"><h2 className="flex items-center gap-2 text-xl font-semibold"><FileText className="text-primary" />Analyser un projet de loi</h2>
      <p className="text-sm text-muted-foreground">Réservé aux députés. L'analyse est un avis indicatif : elle ne change rien dans la partie.</p></header>
    <Textarea value={text} onChange={e => setText(e.target.value)} maxLength={LAW_TEXT_MAX} rows={8} placeholder="Collez ou écrivez le texte de votre projet de loi…" className="text-base" />
    <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{text.trim().length}/{LAW_TEXT_MAX}</span>
      <Button className="min-h-12" disabled={m.isPending || text.trim().length < LAW_TEXT_MIN} onClick={() => m.mutate(text)}>{m.isPending ? <><Loader2 className="animate-spin" />Analyse en cours…</> : "Lancer l'analyse"}</Button></div>
    {m.isPending && <p className="text-sm text-muted-foreground">Cela peut prendre une à deux minutes.</p>}
    {m.error && <p role="alert" className="text-sm text-destructive">{m.error.message}</p>}
    {a && <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-primary">Analyse IA · avis indicatif</p>
      <h3 className="text-lg font-semibold">{a.title}</h3>
      <p className="text-sm">{a.overview}</p>
      {a.cities.map(c => <div key={c.city} className="rounded-xl bg-muted/50 p-3"><p className="font-semibold">{c.city}</p><p className="text-sm text-muted-foreground">{c.summary}</p>
        <div className="mt-2 flex flex-wrap gap-2">{c.effects.map(e => <span key={e.indicator} className="flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs">{e.trend === "hausse" ? <TrendingUp className="size-3 text-primary" /> : e.trend === "baisse" ? <TrendingDown className="size-3 text-destructive" /> : <Minus className="size-3" />}{e.indicator}</span>)}</div></div>)}
      {a.risks.length > 0 && <div><p className="font-semibold">Points de vigilance</p><ul className="list-disc pl-5 text-sm">{a.risks.map(r => <li key={r}>{r}</li>)}</ul></div>}
    </div>}
  </section>;
}
