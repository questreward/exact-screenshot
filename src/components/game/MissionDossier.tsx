import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { missionResult, missionStepLabel } from '@/game/job-missions';
import type { JobMissionState } from '@/services/game';

export function MissionDossier({ mission: m }: { mission: NonNullable<JobMissionState['mission']> }) {
  return <Dialog><DialogTrigger asChild><Button variant="outline" className="min-h-12"><FileText />Dossier de mission</Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader>
      <DialogTitle className="pr-8">Dossier de mission</DialogTitle>
      <DialogDescription>DOCUMENT FICTIF — CIVITAS · aucune valeur officielle</DialogDescription>
    </DialogHeader><article className="space-y-4 break-words">
      <h3 className="font-heading text-lg font-semibold">{m.title}</h3>
      <dl className="space-y-3 text-sm">
        <div><dt className="text-muted-foreground">Journée de jeu</dt><dd>{m.day}</dd></div>
        <div><dt className="text-muted-foreground">État du dossier</dt><dd>{m.status === 'active' ? 'En cours' : missionResult(m.status)}</dd></div>
        <div><dt className="text-muted-foreground">Avancement enregistré</dt><dd>{m.status === 'active' ? missionStepLabel(m.step_index, m.step_count) : m.status === 'expired' ? 'Mission expirée' : `${m.step_count} étapes terminées`}</dd></div>
      </dl>
      {m.step && m.status === 'active' && <section className="border-t border-border pt-3"><h4 className="font-semibold">Situation actuelle</h4><p className="mt-1 text-sm">{m.step.text}</p></section>}
      {m.reputation_delta !== null && <p className="border-t border-border pt-3 text-sm">Bilan enregistré : réputation {m.reputation_delta > 0 ? '+' : ''}{m.reputation_delta} · énergie −{m.energy_cost ?? 0}.</p>}
    </article></DialogContent>
  </Dialog>;
}