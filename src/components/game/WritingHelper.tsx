import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { draftWriting } from "@/lib/writing-help.functions";
import { MAX_IDEAS, WRITING_TONES, type WritingKind, type WritingTone } from "@/game/writing-help";

export function WritingHelper({ kind, max, onUse }: { kind: WritingKind; max: number; onUse: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [ideas, setIdeas] = useState("");
  const [tone, setTone] = useState<WritingTone>("serieux");
  const fn = useServerFn(draftWriting);
  const gen = useMutation({ mutationFn: () => fn({ data: { kind, tone, ideas, max } }) });
  if (!open) return <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(true)}><PenLine />Aide à l'écriture</Button>;
  return <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
    <p className="text-xs text-muted-foreground">L'IA de CIVITAS propose un brouillon. Tu le relis et le modifies : rien n'est publié sans toi.</p>
    <Textarea aria-label="Sujet et idées" value={ideas} maxLength={MAX_IDEAS} rows={2} onChange={e => setIdeas(e.target.value)} placeholder="Ton sujet et quelques idées…" className="text-base" />
    <div className="flex flex-wrap gap-2">{(Object.keys(WRITING_TONES) as WritingTone[]).map(t =>
      <Button key={t} type="button" variant={tone === t ? "default" : "outline"} aria-pressed={tone === t} className="min-h-11" onClick={() => setTone(t)}>{WRITING_TONES[t]}</Button>)}</div>
    <div className="flex gap-2">
      <Button type="button" className="min-h-12 flex-1" disabled={ideas.trim().length < 5 || gen.isPending} onClick={() => gen.mutate()}>{gen.isPending ? "Rédaction…" : "Proposer un brouillon"}</Button>
      <Button type="button" variant="ghost" className="min-h-12" onClick={() => setOpen(false)}>Fermer</Button>
    </div>
    {gen.isError && <p className="text-sm text-destructive">{(gen.error as Error).message}</p>}
    {gen.data && <div className="space-y-2"><p className="whitespace-pre-line rounded-lg border border-border bg-card p-3 text-sm">{gen.data.draft}</p>
      <Button type="button" variant="secondary" className="min-h-12 w-full" onClick={() => { onUse(gen.data.draft); setOpen(false); }}>Utiliser ce brouillon</Button></div>}
  </div>;
}
