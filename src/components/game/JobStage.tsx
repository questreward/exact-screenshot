import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Check, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decorForJob, hasTruckKit, type JobDecor } from "@/game/job-decor";
import { CAB_HOTSPOTS } from "@/game/v2-scenes";
import { MAX_ACTION } from "@/game/intervention";
import { narrateIntervention } from "@/lib/intervention.functions";
import pompiers from "@/assets/v2/cab-pompiers.webp";
import police from "@/assets/v2/cab-police.webp";
import gendarmerie from "@/assets/v2/cab-gendarmerie.webp";
import samu from "@/assets/v2/cab-samu.webp";
import protection_civile from "@/assets/v2/cab-protection-civile.webp";
import bureau from "@/assets/v2/job-bureau.webp";
import commerce from "@/assets/v2/job-commerce.webp";
import chantier from "@/assets/v2/job-chantier.webp";
import hopital from "@/assets/v2/job-hopital.webp";
import ecole from "@/assets/v2/job-ecole.webp";
import rue from "@/assets/v2/job-rue.webp";

const IMG: Record<JobDecor, string> = { pompiers, police, gendarmerie, samu, protection_civile, bureau, commerce, chantier, hopital, ecole, rue };

/** Décor du métier + matériel du véhicule + récit de l'IA locale. Rien ici ne change le résultat de la mission. */
export function JobStage({ job, title, active }: { job: string; title: string; active: boolean }) {
  const decor = decorForJob(job);
  const cab = hasTruckKit(job);
  const [kit, setKit] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const narrate = useServerFn(narrateIntervention);
  const story = useMutation({ mutationFn: () => narrate({ data: { action, kit } }) });
  const toggle = (id: string) => setKit((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));
  return (
    <div className="space-y-3">
      <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-2xl">
        <img src={IMG[decor]} alt={`Lieu de travail · ${title}`} width={1024} height={576} className="h-44 w-full object-cover sm:h-56" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        {cab && active && <span className="absolute left-3 top-3 h-3 w-3 animate-pulse rounded-full bg-primary shadow-elegant" aria-hidden />}
      </div>

      {cab && active && (
        <div>
          <p className="mb-2 text-sm font-semibold">Matériel du récit</p>
          <div className="flex flex-wrap gap-2">
            {CAB_HOTSPOTS[cab].map((h) => {
              const on = kit.includes(h.id);
              return <Button key={h.id} type="button" variant={on ? "default" : "outline"} onClick={() => toggle(h.id)} aria-pressed={on} className="min-h-12 h-auto whitespace-normal">
                {on && <Check className="h-4 w-4" />}{h.label}</Button>;
            })}
          </div>
          {kit.length > 0 && <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {CAB_HOTSPOTS[cab].filter((h) => kit.includes(h.id)).map((h) => <li key={h.id}><strong className="text-foreground">{h.label} :</strong> {h.info}</li>)}
          </ul>}
        </div>
      )}

      {active && (
        <div className="space-y-2 rounded-xl border border-border bg-background p-3">
          <label htmlFor="intervention-action" className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" />Décris ce que tu fais</label>
          <Textarea id="intervention-action" value={action} maxLength={MAX_ACTION} rows={3} onChange={(e) => setAction(e.target.value)}
            placeholder="Ex. : je sécurise la zone et je demande aux témoins de reculer" className="text-base" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{action.length}/{MAX_ACTION}</span>
            <Button className="min-h-12" disabled={action.trim().length < 5 || story.isPending} onClick={() => story.mutate()}>
              {story.isPending ? <><LoaderCircle className="animate-spin" />La scène réagit…</> : "Voir la réaction"}</Button>
          </div>
          {story.isError && <p role="alert" className="text-sm text-muted-foreground">La radio narrative est indisponible. Votre mission continue : choisissez une action dans le dossier.</p>}
          {story.data && <p aria-live="polite" className="animate-rise rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-base">{story.data.reaction}</p>}
          <p className="text-xs text-muted-foreground">Récit seulement : le résultat dépend des choix ci-dessous.</p>
        </div>
      )}
    </div>
  );
}
