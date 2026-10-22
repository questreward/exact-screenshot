import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { lifeQuery, startLifeActivity, formatMoney } from "@/services/game";
import { workProfile, remaining } from "@/game/workday";
import { daylight } from "@/game/daylight";
import { toast } from "sonner";
import { useWorldClock } from "./WorldClock";
import { currentWork } from "@/game/work-experience";
import { WorkBackdrop } from "./WorkBackdrop";

const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

// Presentation over the existing work activity: shift start → preparation → day timeline → end-of-shift summary.
export function WorkDay() {
  const { data: life } = useQuery(lifeQuery);
  const { time } = useWorldClock();
  const qc = useQueryClient();
  const action = useMutation({ mutationFn: startLifeActivity, onSuccess: async () => { await Promise.all(["daily-life", "character", "bank", "career", "job-missions", "notifications"].map(key => qc.invalidateQueries({ queryKey: [key] }))); toast.success("Service commencé"); }, onError: (e: Error) => toast.error(e.message) });
  const [preparation, setPreparation] = useState(false);
  const [ack, setAck] = useState<string | null>(() => qc.getQueryData<string>(["work-summary-ack"]) ?? null);
  const day = time.toISOString().slice(0, 10);
  if (!life?.employment) return null;
  const job = life.employment.job;
  const p = workProfile(job.title);
  const light = daylight(time.getUTCHours());
  const { running, finished, planned } = currentWork(life.activities, day);
  const acknowledge = () => { if (finished) { setAck(finished.id); qc.setQueryData(["work-summary-ack"], finished.id); } };
  const here = life.position.location_id === life.employment.location.id;
  const rule = life.rules.find(r => r.id === "work");
  const busy = life.activities.some(a => a.status === "running");

  if (running) {
    const now = time.getTime();
    return <section className="experience-section">
      <WorkBackdrop job={job.title} title={life.employment.location.name} />
      <p className="text-xs text-primary">{light.emoji} {hm(time)} · {life.employment.location.name}</p>
      <h2 className="font-heading text-xl font-bold">En service · {job.title}</h2>
      <p className="text-xs text-muted-foreground">{hm(time)} / {hm(new Date(running.end_time))} · {remaining(now, running.end_time)}</p>
      <p className="mt-3 text-sm">{running.title}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 border-y border-border py-3 text-sm"><dt>Début enregistré</dt><dd>{hm(new Date(running.start_time))}</dd><dt>Fin prévue</dt><dd>{hm(new Date(running.end_time))}</dd></dl>
      <Button asChild className="mt-4 min-h-14 w-full"><a href="#mission-professionnelle">Reprendre ma mission</a></Button>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Button asChild variant="outline" className="min-h-12"><Link to="/telephone">📱 Téléphone</Link></Button>
        <Button asChild variant="outline" className="min-h-12"><Link to="/agenda">📅 Agenda</Link></Button>
        <Button asChild variant="outline" className="min-h-12"><Link to="/actualites">📰 Infos</Link></Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">La fin du service sera confirmée à l’actualisation. Votre mission conserve ses décisions enregistrées.</p>
    </section>;
  }

  if (finished && ack !== finished.id) {
    return <section className="experience-section text-center animate-page">
      <p className="text-xs text-muted-foreground">{hm(new Date(finished.end_time))} — Fin de service</p>
      <h2 className="font-heading text-xl font-bold">Ma journée de travail est terminée</h2>
      <p className="text-sm">{job.title} · {hm(new Date(finished.start_time))} → {hm(new Date(finished.end_time))}</p>
      {finished.reward > 0 && <div className="my-3 rounded-xl bg-success/15 p-3"><p className="text-sm">💶 Salaire reçu</p><p className="font-display text-3xl font-bold">+ {formatMoney(finished.reward)}</p></div>}
      <ul className="mb-3 space-y-1 text-sm">
        {finished.progression_gain > 0 && <li>📈 Progression +{finished.progression_gain}</li>}
        <li>⚡ Énergie restante : {life.character.energy}</li>
      </ul>
      <div className="mb-3 rounded-xl bg-muted p-3 text-left text-sm">
        <p className="font-semibold">📋 Service enregistré</p>
        <p className="mt-2">{finished.title}</p>
        <p className="mt-1">Durée : {Math.round((Date.parse(finished.end_time) - Date.parse(finished.start_time)) / 60000)} minutes du jeu</p>
      </div>
      <div className="grid gap-2">
        <Button asChild className="min-h-12"><Link to="/banque">Voir ma banque</Link></Button>
        <Button asChild variant="outline" className="min-h-12"><Link to="/chez-moi" onClick={acknowledge}>🏠 Voir mon logement</Link></Button>
        <Button variant="ghost" className="min-h-12" onClick={acknowledge}>Continuer ma journée</Button>
      </div>
    </section>;
  }
  if (finished) return null;

  const start = () => action.mutate(planned ? { activityId: planned.id } : { type: "work" });
  return <section className="experience-section">
    <WorkBackdrop job={job.title} title={life.employment.location.name} />
      <p className="text-xs text-primary">{light.emoji} {hm(time)} · {light.label}</p>
      <h2 className="font-heading text-lg font-bold">{p.start}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Lieu</dt><dd>{life.employment.location.name}</dd>
        <dt className="text-muted-foreground">Poste</dt><dd>{job.title}</dd>
        <dt className="text-muted-foreground">Planning</dt><dd>{planned ? `${hm(new Date(planned.start_time))} → ${hm(new Date(planned.end_time))}` : rule ? `${Math.round(rule.duration_minutes / 60)} h de service` : "—"}</dd>
      </dl>
      <div className={`mt-3 flex items-center justify-between gap-2 rounded-lg p-3 text-sm ${here ? "bg-success/15" : "bg-accent/60"}`}>
        <span>{here ? "📍 Tu es sur ton lieu de travail." : `💼 Rends-toi à ${life.employment.location.name}.`}</span>
        {!here && <Link to="/carte" search={{ city: life.employment.location.city_id, district: life.employment.location.district_id ?? undefined, location: life.employment.location.id }} className="shrink-0 font-semibold text-primary">Carte</Link>}
      </div>
      <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
        <p className="font-semibold">📋 Briefing du jour</p>
        <ul className="mt-1 space-y-1">
          <li>🎯 {p.objective}</li>
          <li>Poste : {job.title}</li>
        </ul>
      </div>
      <Button variant="outline" className="mt-3 min-h-12 w-full" aria-expanded={preparation} onClick={() => setPreparation(value => !value)}>Consignes de préparation</Button>
      {preparation && <ul className="mt-3 space-y-3 text-sm">{p.prep.map(x => <li key={x.id}>{x.emoji} {x.label}</li>)}</ul>}
      {!here ? <Button asChild className="mt-3 min-h-14 w-full"><Link to="/carte" search={{ city: life.employment.location.city_id, district: life.employment.location.district_id ?? undefined, location: life.employment.location.id }}>Aller sur mon lieu de travail</Link></Button>
        : <Button className="mt-3 min-h-14 w-full text-base" disabled={busy || action.isPending} onClick={start}>
          {action.isPending ? "Prise de service…" : "Prendre mon service"}</Button>}
  </section>;
}
