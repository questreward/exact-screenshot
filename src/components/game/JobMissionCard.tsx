import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bonhomme } from './Bonhomme';
import { Button } from '@/components/ui/button';
import { chooseJobMission, jobMissionsQuery } from '@/services/game';
import { missionResult, missionStepLabel, nextMissionThreshold } from '@/game/job-missions';
import { MissionScene } from './MissionScene';
import { MissionDossier } from './MissionDossier';
import { MissionVehiclePanel } from './MissionVehiclePanel';
import { JobStage } from './JobStage';

export function JobMissionCard() {
  const query = useQuery(jobMissionsQuery);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ day, step, choice }: { day: string; step: number; choice: number }) => chooseJobMission(day, step, choice),
    onSuccess: async data => {
      client.setQueryData(jobMissionsQuery.queryKey, data);
      await Promise.all([client.invalidateQueries({ queryKey: ['career'] }), client.invalidateQueries({ queryKey: ['security-careers'] }), client.invalidateQueries({ queryKey: ['daily-life'] })]);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const m = query.data?.mission;
  const next = nextMissionThreshold(query.data?.progress?.successes ?? 0);
  return <section className="rounded-xl border border-border bg-card p-4" aria-label="Mission professionnelle">
    <div className="flex items-center gap-3"><Bonhomme seed={m?.job ?? 'mission'} /><div><h2 className="font-heading font-bold">{m ? missionResult(m.status) : 'Mission professionnelle'}</h2><p className="text-sm text-muted-foreground">Une mission par journée travaillée · aucun gain monétaire</p></div></div>
    {query.isPending ? <p role="status">Chargement…</p> : query.isError ? <div role="alert"><p>Impossible de charger la mission.</p><Button variant="outline" onClick={() => void query.refetch()}>Réessayer</Button></div> : !m ? <p className="mt-3 text-sm text-muted-foreground">Commencez une vacation pour recevoir votre mission du jour.</p> : <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="min-w-0 break-words font-semibold">{m.title}</h3><MissionDossier mission={m} /></div>
      <JobStage key={`stage-${m.day}`} job={m.job} title={m.title} active={m.status === 'active'} />
      <MissionScene key={`${m.day}-${m.step_index}-${m.status}`} job={m.job} title={m.title} step={m.step_index} count={m.step_count} active={m.status === 'active'} />
      <MissionVehiclePanel key={`${m.day}-${m.job}`} job={m.job} title={m.title} />
      {m.status === 'active' && m.step ? <>
        <p className="text-xs text-muted-foreground">{missionStepLabel(m.step_index, m.step_count)} · expire en fin de journée (UTC), sans pénalité</p>
        <progress className="h-2 w-full accent-primary" max={m.step_count} value={m.step_index} aria-label="Progression de la mission" />
        <p className="mission-step-enter border-l-2 border-primary pl-3" key={m.step_index} aria-live="polite">{m.step.text}</p>
        <div className="grid gap-2">{m.step.choices.map((choice, i) => <Button key={`${m.step_index}-${i}`} variant="outline" className="min-h-14 h-auto whitespace-normal justify-start p-3 text-left" disabled={mutation.isPending} onClick={() => mutation.mutate({ day: m.day, step: m.step_index, choice: i })}>{choice.label}</Button>)}</div>
        <p className="text-xs text-muted-foreground">Bilan final : réputation +1 à +3 ou −1 à −2 ; énergie −5 à −15. Les choix et les circonstances déterminent le résultat.</p>
      </> : m.reputation_delta !== null && <p role="status">Réputation {m.reputation_delta > 0 ? '+' : ''}{m.reputation_delta} · Énergie −{m.energy_cost}</p>}
      <p className="text-sm text-muted-foreground">{query.data?.progress?.successes ?? 0} réussites · {next ? `prochain palier : ${next}` : 'dernier palier atteint'}</p>
    </div>}
  </section>;
}
