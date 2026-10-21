import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { lifeQuery, startLifeActivity, formatMoney } from "@/services/game";
import { workProfile, workTimeline, workMood, remaining, workLevel, shiftHighlights } from "@/game/workday";
import { daylight } from "@/game/daylight";
import { useLifeMutation } from "./LifeControls";
import { useWorldClock } from "./WorldClock";

const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

// Presentation over the existing work activity: shift start → preparation → day timeline → end-of-shift summary.
export function WorkDay() {
  const { data: life } = useQuery(lifeQuery);
  const { time } = useWorldClock();
  const action = useLifeMutation(startLifeActivity, "Service commencé");
  const [phase, setPhase] = useState<"intro" | "prep">("intro");
  const [done, setDone] = useState<string[]>([]);
  const [ack, setAck] = useState<string | null>(null);
  const day = time.toISOString().slice(0, 10);
  useEffect(() => { setAck(localStorage.getItem("civitas-workday-ack")); }, []);
  if (!life?.employment) return null;
  const job = life.employment.job;
  const p = workProfile(job.title);
  const light = daylight(time.getUTCHours());
  const works = life.activities.filter(a => a.type === "work" && a.start_time.slice(0, 10) === day);
  const running = works.find(a => a.status === "running");
  const finished = works.filter(a => a.status === "completed").sort((a, b) => b.end_time.localeCompare(a.end_time))[0];
  const level = workLevel(life.activities.filter(a => a.type === "work" && a.status === "completed").length);
  const planned = works.find(a => a.status === "planned");
  const here = life.position.location_id === life.employment.location.id;
  const rule = life.rules.find(r => r.id === "work");
  const busy = life.activities.some(a => a.status === "running");

  if (running) {
    const steps = workTimeline(running.start_time, running.end_time);
    const now = time.getTime();
    const cur = [...steps].reverse().find(s => s.at.getTime() <= now) ?? steps[0]!;
    return <section className="rounded-2xl border-2 border-primary bg-card p-4">
      <p className="text-xs text-primary">{light.emoji} {hm(time)} · {p.place}</p>
      <h2 className="font-heading text-lg font-bold">En service : {cur.label}</h2>
      <p className="text-xs">{level.emoji} {level.label}</p>
      <p className="text-xs text-muted-foreground">{hm(time)} / {hm(new Date(running.end_time))} · {remaining(now, running.end_time)}</p>
      <p className="mt-2 rounded-lg bg-muted p-2 text-sm">📌 Aujourd'hui : {workMood(day, p.key).mood}</p>
      <p className="mt-1 text-sm">👥 Un collègue : {workMood(day, p.key).colleague}</p>
      <ol className="mt-3 space-y-1">{steps.map(s => <li key={s.label} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm ${s === cur ? "bg-primary/15 font-semibold" : s.at.getTime() < now ? "text-muted-foreground line-through" : ""}`}>
        <span className="w-12 font-mono text-xs">{hm(s.at)}</span>{s.label}</li>)}</ol>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Button asChild variant="outline" className="min-h-12"><Link to="/telephone">📱 Téléphone</Link></Button>
        <Button asChild variant="outline" className="min-h-12"><Link to="/agenda">📅 Agenda</Link></Button>
        <Button asChild variant="outline" className="min-h-12"><Link to="/actualites">📰 Infos</Link></Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Le service continue pendant que tu regardes ailleurs.</p>
    </section>;
  }

  if (finished && ack !== finished.id) {
    return <section className="rounded-2xl border-2 border-success bg-card p-4 text-center animate-page">
      <p className="text-xs text-muted-foreground">{hm(new Date(finished.end_time))} — Fin de service</p>
      <h2 className="font-heading text-xl font-bold">Ma journée de travail est terminée</h2>
      <p className="text-sm">{job.title} · {hm(new Date(finished.start_time))} → {hm(new Date(finished.end_time))}</p>
      {finished.reward > 0 && <div className="my-3 rounded-xl bg-success/15 p-3"><p className="text-sm">💶 Salaire reçu</p><p className="font-display text-3xl font-bold">+ {formatMoney(finished.reward)}</p></div>}
      <ul className="mb-3 space-y-1 text-sm">
        {finished.progression_gain > 0 && <li>📈 Progression +{finished.progression_gain}</li>}
        <li>⚡ Énergie restante : {life.character.energy}</li>
      </ul>
      <div className="mb-3 rounded-xl bg-muted p-3 text-left text-sm">
        <p className="font-semibold">📋 Bilan du service</p>
        <ul className="mt-1 space-y-1">{shiftHighlights(p.key).map(t => <li key={t}>✅ {t}</li>)}</ul>
        <p className="mt-2">📌 {workMood(day, p.key).mood}</p>
      </div>
      <div className="mb-3 rounded-xl border p-3 text-sm">
        <p className="font-semibold">{level.emoji} Niveau : {level.label}</p>
        <p className="text-xs text-muted-foreground">{level.shifts} service(s) terminé(s){level.next ? ` · ${level.next - level.shifts} avant le niveau suivant` : " · niveau maximum"}</p>
        <p className="text-xs text-muted-foreground">Le niveau ne change pas ton salaire.</p>
      </div>
      <div className="grid gap-2">
        <Button asChild className="min-h-12"><Link to="/banque">Voir ma banque</Link></Button>
        <Button asChild variant="outline" className="min-h-12"><Link to="/chez-moi" onClick={() => { localStorage.setItem("civitas-workday-ack", finished.id); }}>🏠 Rentrer chez moi</Link></Button>
        <Button variant="ghost" className="min-h-12" onClick={() => { localStorage.setItem("civitas-workday-ack", finished.id); setAck(finished.id); }}>Continuer ma journée</Button>
      </div>
    </section>;
  }
  if (finished) return null;

  const start = () => action.mutate(planned ? { activityId: planned.id } : { type: "work" });
  return <section className="rounded-2xl border border-border bg-card p-4">
    {phase === "intro" ? <>
      <p className="text-xs text-primary">{light.emoji} {hm(time)} · {light.label}</p>
      <h2 className="font-heading text-lg font-bold">{p.start}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Lieu</dt><dd>{p.place}</dd>
        <dt className="text-muted-foreground">Poste</dt><dd>{job.title}</dd>
        <dt className="text-muted-foreground">Équipe</dt><dd>{p.team}</dd>
        {p.vehicle && <><dt className="text-muted-foreground">Véhicule</dt><dd>{p.vehicle}</dd></>}
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
          <li>📌 {workMood(day, p.key).mood}</li>
          <li>👥 Avec toi : {workMood(day, p.key).colleague}</li>
        </ul>
      </div>
      <details className="mt-3 rounded-lg border border-border p-3 text-sm">
        <summary className="min-h-8 cursor-pointer font-semibold">❓ Comment ça marche ?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Se rendre au travail (marque 💼 sur la carte).</li>
          <li>Prendre son service et faire les vérifications.</li>
          <li>Réaliser les missions de la journée.</li>
          <li>Terminer son service : le bilan s'affiche.</li>
          <li>Recevoir sa rémunération sur son compte.</li>
        </ol>
      </details>
      <Button className="mt-3 min-h-14 w-full text-base" onClick={() => setPhase("prep")}>Prendre mon service</Button>
    </> : <>
      <h2 className="font-heading text-lg font-bold">Préparation</h2>
      <div className="mt-3 grid gap-2">{p.prep.map(x => { const ok = done.includes(x.id); return <Button key={x.id} variant={ok ? "secondary" : "outline"} className="min-h-14 justify-between"
        onClick={() => setDone(d => ok ? d : [...d, x.id])}><span>{x.emoji} {x.label}</span><span>{ok ? "✅" : "Vérifier"}</span></Button>; })}</div>
      {!here ? <Button asChild className="mt-3 min-h-14 w-full"><Link to="/carte" search={{ city: life.employment.location.city_id, district: life.employment.location.district_id ?? undefined, location: life.employment.location.id }}>Aller sur mon lieu de travail</Link></Button>
        : <Button className="mt-3 min-h-14 w-full text-base" disabled={done.length < p.prep.length || busy || action.isPending} onClick={start}>
          {done.length < p.prep.length ? `Encore ${p.prep.length - done.length} vérification(s)` : "C'est parti : au travail"}</Button>}
    </>}
  </section>;
}
