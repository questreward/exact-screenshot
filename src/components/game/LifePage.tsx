import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from 'sonner';
import { Briefcase, GraduationCap, Home, CalendarDays, LoaderCircle, Check, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { lifeQuery, economyQuery, citiesQuery, districtsQuery, enrollStudies, applyJob, payHousing, formatMoney } from "@/services/game";
import { isRentPaid } from '@/game/rent';
import { academicLevel, gameHour } from "@/game/life";
import { WorldClock } from "./WorldClock";
import { DailyActions, LocationLink, useLifeMutation } from "./LifeControls";

export function LifePage() {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { data: cities } = useSuspenseQuery(citiesQuery);
  const { data: districts } = useSuspenseQuery(districtsQuery(life.character.city_id));
  const enroll = useLifeMutation(enrollStudies, "Inscription enregistrée");
  const apply = useLifeMutation(applyJob, "Candidature envoyée");
  const { data: economy } = useSuspenseQuery(economyQuery);
  const q = useQueryClient();
  const rent = useMutation({ mutationFn: payHousing,
    onSuccess: () => toast.success('Dépense de logement enregistrée'),
    onError: (error: Error) => toast.error(error.message),
    onSettled: async () => { await Promise.all(['economy', 'daily-life', 'bank'].map(key => q.invalidateQueries({ queryKey: [key] }))); },
  });
  const paidToday = isRentPaid(life.world_now.slice(0,10), life.housing?.last_paid_date ?? null, economy.operations);
  const student = life.character.path_id === "student" && !(typeof life.character.progression === 'object' && life.character.progression !== null && !Array.isArray(life.character.progression) && life.character.progression['career_active'] === true);
  return <div className="space-y-6 animate-rise">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-xs uppercase tracking-wider text-primary">CIVITAS · Vie quotidienne</p><h1 className="text-3xl font-bold">{student ? "Mes études" : "Ma vie professionnelle"}</h1></div><Button asChild variant="outline"><Link to="/agenda"><CalendarDays /> Agenda</Link></Button></div>
    <WorldClock />
    <Button asChild variant="outline"><Link to="/patrimoine"><Wallet/>Épargne, biens et projets de vie</Link></Button>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-4"><p className="font-semibold">{life.character.situation}</p><p className="text-primary">Énergie {life.character.energy} / {life.settings.max_energy}</p></div>
    {student ? life.enrollment ? <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><GraduationCap className="text-primary" />{life.enrollment.field_name} — Niveau {academicLevel(life.enrollment.progress)}</h2>
      <p className="text-sm text-muted-foreground">{life.enrollment.location.name} · Semestre {life.enrollment.semester}</p>
      <div className="flex items-center gap-4"><Progress className="h-3 flex-1" value={life.enrollment.progress % 100} aria-label="Progression académique" /><span className="text-sm">{life.enrollment.progress % 100} %</span></div>
      <dl className="grid grid-cols-2 gap-3">{Object.entries(life.enrollment.skills ?? {}).map(([key,value]) => <div key={key} className="border-l-2 border-primary pl-3"><dt className="text-sm text-muted-foreground">{key}</dt><dd className="font-semibold">{String(value)} points</dd></div>)}</dl>
      <p className="text-sm text-muted-foreground">Programme : cours du lundi au vendredi, à {String(life.settings.course_start).padStart(2,"0")}:00.</p>
      <LocationLink location={life.enrollment.location} label="Voir l’université" />
    </section> : <section><h2 className="mb-4 text-xl font-semibold">Choisir ma filière</h2><div className="grid gap-3 sm:grid-cols-2">{life.fields.map(f => <article key={f.id} className="rounded-lg border border-border bg-card p-4"><h3 className="font-semibold">{f.name}</h3><p className="my-3 text-sm text-muted-foreground">{f.description}</p><Button className="w-full" disabled={enroll.isPending} onClick={() => enroll.mutate(f.id)}>{enroll.isPending && enroll.variables === f.id ? <LoaderCircle className="animate-spin" /> : <GraduationCap />} S’inscrire</Button></article>)}</div></section>
    : life.employment ? <section className="space-y-4"><h2 className="flex items-center gap-2 text-xl font-semibold"><Briefcase className="text-primary" />{life.employment.job.title}</h2><p className="text-sm text-muted-foreground">{life.employment.location.name}</p>
      <dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground">Salaire de référence</dt><dd className="font-semibold">{formatMoney(life.employment.job.salary + life.employment.salary_bonus)} / mois</dd></div><div><dt className="text-sm text-muted-foreground">Vacation rémunérée</dt><dd className="font-semibold">{formatMoney(Math.floor((life.employment.job.salary+life.employment.salary_bonus)/life.settings.paid_shifts_month))} / vacation</dd></div><div><dt className="text-sm text-muted-foreground">Progression professionnelle</dt><dd className="font-semibold">{life.employment.progress} points</dd></div></dl>
      <p className="text-sm text-muted-foreground">Lundi–vendredi · {life.settings.work_start}:00–{life.settings.work_end}:00 · Une vacation par jour.</p><LocationLink location={life.employment.location} label="Voir mon lieu de travail" />
      <p className="text-sm text-muted-foreground">Le salaire est crédité après la fin de la vacation, à votre prochaine consultation, même après reconnexion. Chaque vacation est payée une seule fois ; le versement apparaît dans Banque.</p>
    </section> : <section className="space-y-4"><h2 className="text-xl font-semibold">Offres d’emploi</h2><p className="text-sm text-muted-foreground">Réponse après {life.settings.response_minutes} minute du monde. Les postes spécialisés tiennent compte de votre parcours.</p>
      <div className="grid gap-3 sm:grid-cols-2">{life.offers.map(o => { const application = life.applications.filter(a => a.job_id===o.id).sort((x,y) => y.applied_at.localeCompare(x.applied_at))[0]; return <article key={o.id} className="space-y-3 rounded-lg border border-border bg-card p-4"><h3 className="font-semibold">{o.title}</h3><p className="text-sm text-muted-foreground">{o.employer} · {o.location.name}</p><p className="text-sm">{o.description}</p><p className="font-semibold text-primary">{formatMoney(o.salary)} / mois</p>{o.skill_min>0 && <p className="text-xs text-muted-foreground">{o.required_skill} : {o.skill_min} points ou parcours Début de carrière</p>}
        {o.economy_skill && <p className="text-sm text-primary">{o.economy_skill} niveau {o.economy_level} requis</p>}
        {application?.status === "rejected" && <p role="status" className="text-sm text-muted-foreground">Candidature refusée. Aucun emploi ni salaire attribué pour cette offre. Vous pouvez postuler à une autre offre.</p>}
        <div className="flex flex-wrap gap-2"><LocationLink location={o.location} /><Button disabled={!!application || apply.isPending} onClick={() => apply.mutate(o.id)}>{application?.status === "rejected" ? <X /> : application ? <Check /> : <Briefcase />}{application ? application.status==='pending' ? `Réponse à ${gameHour(application.response_at)}` : application.status==='accepted' ? "Acceptée" : "Refusée" : "Postuler"}</Button></div>
      </article>; })}</div>
    </section>}
    <section className="space-y-4 border-t border-border pt-5"><h2 className="text-xl font-semibold">Actions quotidiennes</h2><DailyActions /></section>
    {life.housing && <section className="space-y-4 border-t border-border pt-5"><h2 className="flex items-center gap-2 text-xl font-semibold"><Home className="text-primary" />Mon logement</h2><dl className="grid gap-3 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground">Type</dt><dd className="font-semibold">{life.housing.name}</dd></div><div><dt className="text-sm text-muted-foreground">Logement actuel</dt><dd>{life.housing.location.name}</dd></div><div><dt className="text-sm text-muted-foreground">Localisation</dt><dd>{districts.find(d => d.id === life.housing?.location.district_id)?.name} · {cities.find(c => c.id === life.housing?.location.city_id)?.name}</dd></div></dl><p className="text-sm text-muted-foreground">{formatMoney(life.housing.daily_cost)} / jour · Paiement manuel, sans dette automatique.</p><div className="flex flex-wrap gap-2"><LocationLink location={life.housing.location} label="Rentrer chez moi" /><Button variant="outline" disabled={rent.isPending || paidToday} onClick={() => rent.mutate(undefined)}><Wallet />{paidToday ? "Payé aujourd’hui" : "Payer le logement"}</Button></div></section>}
  </div>;
}