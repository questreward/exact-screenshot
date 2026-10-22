import { ExperienceState } from "./ExperienceState";
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
import { useRef, useState } from 'react';
import { recordedObjectives } from '@/game/work-experience';
import { Link } from '@tanstack/react-router';

export function JobMissionCard() {
  const query = useQuery(jobMissionsQuery);
  const client = useQueryClient();
  const locked = useRef(false);
  const [scene, setScene] = useState(false);
  const mutation = useMutation({
    mutationFn: ({ day, step, choice }: { day: string; step: number; choice: number }) => chooseJobMission(day, step, choice),
    onSuccess: async data => {
      client.setQueryData(jobMissionsQuery.queryKey, data);
      await Promise.all([client.invalidateQueries({ queryKey: ['career'] }), client.invalidateQueries({ queryKey: ['security-careers'] }), client.invalidateQueries({ queryKey: ['daily-life'] })]);
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => { locked.current = false; },
  });
  const choose = (day: string, step: number, choice: number) => {
    if (locked.current) return;
    locked.current = true;
    mutation.mutate({ day, step, choice });
  };
  const m = query.data?.mission;
  const next = nextMissionThreshold(query.data?.progress?.successes ?? 0);
  return <section id="mission-professionnelle" className="experience-section scroll-mt-24" aria-label="Mission professionnelle">
    <div className="flex items-center gap-3"><Bonhomme seed={m?.job ?? 'mission'} /><div><h2 className="font-heading font-bold">{m ? missionResult(m.status) : 'Mission professionnelle'}</h2><p className="text-sm text-muted-foreground">Une mission par journée travaillée · aucun gain monétaire</p></div></div>
    {query.isPending ? <ExperienceState kind="loading" title="Préparation du dossier de mission…" /> : query.isError ? <ExperienceState kind="error" title="Le dossier de mission n’a pas pu être chargé" onRetry={() => void query.refetch()} /> : !m ? <ExperienceState kind="empty" title="Aucune mission en cours" description="Commencez une vacation pour recevoir votre mission du jour." /> : <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="min-w-0 break-words font-semibold">{m.title}</h3><MissionDossier mission={m} /></div>
      <p className="text-xs text-muted-foreground">Dossier du {m.day} · {m.status === 'active' ? 'Reprise de l’étape enregistrée' : 'Bilan enregistré'}</p>
      <ol className="grid gap-2" aria-label="Objectifs enregistrés">{recordedObjectives(m).map(o => <li key={o.index} className={`flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm ${o.state === 'current' ? 'border-primary font-semibold' : 'border-border text-muted-foreground'}`}><span aria-hidden>{o.state === 'recorded' ? '✓' : o.state === 'current' ? '→' : '○'}</span>{o.state === 'recorded' ? `Décision ${o.index + 1} enregistrée` : o.state === 'current' ? `Objectif ${o.index + 1} · ${m.step?.text ?? 'En cours'}` : `Objectif ${o.index + 1} · à venir`}</li>)}</ol>
      {m.status === 'active' && m.step ? <>
        <p className="text-xs text-muted-foreground">{missionStepLabel(m.step_index, m.step_count)} · expire en fin de journée (UTC), sans pénalité</p>
        <p className="mission-step-enter border-l-2 border-primary pl-3" key={m.step_index} aria-live="polite">{m.step.text}</p>
        <div className="grid gap-2">{m.step.choices.map((choice, i) => <Button key={`${m.step_index}-${i}`} variant="outline" className="min-h-14 h-auto whitespace-normal justify-start p-3 text-left" disabled={mutation.isPending} onClick={() => choose(m.day, m.step_index, i)}>{choice.label}</Button>)}</div>
        {mutation.isPending && <p role="status" className="text-sm text-muted-foreground">Enregistrement de la décision…</p>}
        {mutation.isError && <ExperienceState kind="error" title="Décision non confirmée" description="Votre dossier reste disponible. Actualisez son état avant de décider à nouveau." onRetry={() => { mutation.reset(); void query.refetch(); }} />}
        <p className="text-xs text-muted-foreground">Bilan final : réputation +1 à +3 ou −1 à −2 ; énergie −5 à −15. Les choix et les circonstances déterminent le résultat.</p>
      </> : m.reputation_delta !== null && <p role="status">Réputation {m.reputation_delta > 0 ? '+' : ''}{m.reputation_delta} · Énergie −{m.energy_cost}</p>}
      <p className="text-sm text-muted-foreground">{query.data?.progress?.successes ?? 0} réussites · {next ? `prochain palier : ${next}` : 'dernier palier atteint'}</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-12" aria-expanded={scene} onClick={() => setScene(v => !v)}>{scene ? 'Fermer la scène' : 'Scène et matériel'}</Button><Button asChild variant="outline" className="min-h-12"><Link to="/telephone" search={{ app: 'travail' }}>Téléphone professionnel</Link></Button></div>
      {scene && <><JobStage key={`stage-${m.day}`} job={m.job} title={m.title} active={m.status === 'active'} /><MissionScene key={`${m.day}-${m.step_index}-${m.status}`} job={m.job} title={m.title} step={m.step_index} count={m.step_count} active={m.status === 'active'} /><MissionVehiclePanel key={`${m.day}-${m.job}`} job={m.job} title={m.title} /></>}
    </div>}
  </section>;
}
