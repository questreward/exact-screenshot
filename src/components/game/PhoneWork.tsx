import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { lifeQuery, jobMissionsQuery, type JobMissionState } from "@/services/game";
import { Button } from "@/components/ui/button";
import { ExperienceState } from "./ExperienceState";
import { useWorldClock } from "./WorldClock";

export function PhoneWork() {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { time } = useWorldClock();
  const client = useQueryClient();
  const dossier = client.getQueryData<JobMissionState>(jobMissionsQuery.queryKey)?.mission;
  const employment = life.employment;
  const upcoming = life.activities.filter(a => !["cancelled", "completed"].includes(a.status) && Date.parse(a.end_time) > time.getTime()).sort((a, b) => a.start_time.localeCompare(b.start_time));
  return <div className="space-y-5">
    {dossier && <section className="space-y-3 border-b border-border pb-4"><h2 className="font-semibold">{dossier.title}</h2><p className="text-sm text-muted-foreground">{dossier.status === 'active' ? `Étape ${dossier.step_index + 1} / ${dossier.step_count} · dossier consulté` : 'Bilan du dossier consulté'}</p>{dossier.step && <p className="text-sm">{dossier.step.text}</p>}<Button asChild className="min-h-12 w-full"><Link to="/carriere">{dossier.status === 'active' ? 'Reprendre ma mission' : 'Voir le bilan'}</Link></Button></section>}
    {employment ? <section className="space-y-3 border-b border-border pb-4"><Briefcase className="h-8 w-8 text-primary" /><h2 className="text-xl font-semibold">{employment.job.title}</h2><p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{employment.location.name}</p><Button asChild variant="outline" className="w-full"><Link to="/carriere">Carrière et salaire<ArrowRight /></Link></Button></section> : <ExperienceState kind="empty" title="Aucun emploi en cours"><Button asChild><Link to="/carriere">Consulter ma carrière</Link></Button></ExperienceState>}
    <section><h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-primary" />Mes prochaines activités</h2>{upcoming.length ? <ul className="divide-y divide-border">{upcoming.slice(0, 5).map(a => <li key={a.id} className="py-3"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{new Date(a.start_time).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} · {a.location?.name}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune activité prévue.</p>}</section>
    {employment && <Button asChild variant="outline" className="min-h-12 w-full"><Link to="/carte" search={{ city: employment.location.city_id, district: employment.location.district_id ?? undefined, location: employment.location.id }}>Rejoindre mon lieu de travail<MapPin /></Link></Button>}
    <div className="grid grid-cols-2 gap-2"><Button asChild variant="outline" className="min-h-12"><Link to="/agenda">Agenda</Link></Button><Button asChild variant="outline" className="min-h-12"><Link to="/secours">Missions de secours</Link></Button></div>
  </div>;
}