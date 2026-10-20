import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { draftPresidentialSpeech } from "@/lib/speech-draft.functions";
import { GOALS_MAX, GOALS_MIN } from "@/game/speech-draft";

export function SpeechDraftHelper({ onDraft }: { onDraft: (text: string) => void }) {
  const [goals, setGoals] = useState("");
  const run = useServerFn(draftPresidentialSpeech);
  const m = useMutation({ mutationFn: (g: string) => run({ data: { goals: g } }), onSuccess: (d) => onDraft(d.text) });
  return (
    <div className="space-y-2 rounded-lg bg-muted p-3">
      <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" />Rédiger avec l’IA</p>
      <textarea value={goals} maxLength={GOALS_MAX} onChange={(e) => setGoals(e.target.value)} rows={3} aria-label="Vos objectifs politiques"
        className="w-full rounded-md border border-input bg-background p-3 text-base" placeholder="Vos objectifs : pouvoir d’achat, sécurité, apaiser après la dissolution…" />
      <Button className="min-h-12 w-full" variant="outline" disabled={m.isPending || goals.trim().length < GOALS_MIN} onClick={() => m.mutate(goals)}>
        {m.isPending ? <><Loader2 className="animate-spin" />Rédaction en cours…</> : "Proposer une allocution"}
      </Button>
      {m.isPending && <p className="text-xs text-muted-foreground">Cela peut prendre une à deux minutes.</p>}
      {m.error && <p role="alert" className="text-sm text-destructive">{m.error.message}</p>}
      {m.isSuccess && <p className="text-xs text-muted-foreground">Brouillon placé ci-dessous : relisez-le et modifiez-le. Rien n’est diffusé tant que vous n’appuyez pas sur « Diffuser ».</p>}
      <p className="text-xs text-muted-foreground">L’IA tient compte des lois en attente, du référendum et des dernières actualités, sans rien inventer.</p>
    </div>
  );
}
