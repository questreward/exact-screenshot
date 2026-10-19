import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Briefcase, LoaderCircle, TrendingUp, MessagesSquare, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { careerAction, careerQuery, type CareerProfile } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { HISTORY_LABELS, housingShare, interviewOutlook } from "@/game/career";

export const Route = createFileRoute("/_authenticated/_game/carriere")({
  head: () => ({ meta: gameMeta("Ma carrière", "Entretiens d'embauche, promotions, changement d'entreprise, chômage et évolution du salaire.") }),
  component: CareerPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const day = (s: string) => new Date(s).toLocaleDateString("fr-FR");
const OUTLOOK = { facile: "Bien placé", jouable: "Jouable", difficile: "Difficile" } as const;

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Briefcase; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4">
    <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold"><Icon className="h-5 w-5 text-primary" />{title}</h2>{children}
  </section>;
}

function Breakdown({ p }: { p: CareerProfile }) {
  const rows: [string, number | undefined, number][] = [["Réponses", p.reponses, 36], ["Compétence du poste", p.competence, 20], ["Expérience", p.experience, 20], ["Études et formations", p.etudes, 15], ["Situation", p.situation, 9]];
  return <ul className="space-y-1 text-sm">{rows.filter(r => r[1] !== undefined).map(([l, v, m]) =>
    <li key={l} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{v} / {m}</span></li>)}</ul>;
}

function CareerPage() {
  const qc = useQueryClient();
  const { data: s, isLoading, isError, error } = useQuery(careerQuery);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const refresh = () => { qc.invalidateQueries({ queryKey: ["career"] }); qc.invalidateQueries({ queryKey: ["character"] }); };
  const act = useMutation({
    mutationFn: (v: { cmd: "interview_start" | "interview_answer" | "promote"; input?: Record<string, unknown> }) => careerAction(v.cmd, v.input),
    onSuccess: (r, v) => {
      if (v.cmd === "interview_answer") {
        setAnswers({});
        if (r.status === "réussi") toast.success(r.changement ? `Embauché ! Tu changes d'entreprise (score ${r.score}).` : `Embauché ! Score ${r.score}.`);
        else toast.error(`Pas retenu (score ${r.score}). ${r.motif ?? ""}`);
      } else if (v.cmd === "promote") toast.success(`Promotion niveau ${r.level} : ${eur(r.salary ?? 0)} par mois.`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Briefcase className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Ma carrière</h1><p className="text-sm text-muted-foreground">Entretiens, promotions, changement d'entreprise et chômage.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Ma carrière : Disponible dans une prochaine étape. {String((error as Error)?.message ?? "")}</p>}
    {s && <>
      {s.open_interview ? <Card title={`Entretien : ${s.open_interview.job}`} icon={MessagesSquare}>
        <p className="mb-3 text-sm text-muted-foreground">Choisis la réponse qui te ressemble le plus. Le recruteur tient aussi compte de ton expérience, de tes études et de tes compétences.</p>
        <div className="space-y-4">{s.open_interview.questions.map((q, qi) => <div key={q.id}>
          <p className="mb-2 font-semibold">{qi + 1}. {q.question}</p>
          <div className="grid gap-2">{q.answers.map((a, ai) =>
            <button key={ai} type="button" onClick={() => setAnswers({ ...answers, [q.id]: ai })}
              className={`min-h-12 rounded-lg border p-3 text-left text-sm ${answers[q.id] === ai ? "border-primary bg-primary/10 font-semibold" : "border-border bg-background"}`}>{a}</button>)}</div>
        </div>)}</div>
        <Button className="mt-4 h-12 w-full" disabled={act.isPending || s.open_interview.questions.some(q => answers[q.id] === undefined)}
          onClick={() => act.mutate({ cmd: "interview_answer", input: { interview_id: s.open_interview!.id, answers: s.open_interview!.questions.map(q => answers[q.id]) } })}>Terminer l'entretien</Button>
      </Card> : null}

      <Card title="Mon emploi" icon={Briefcase}>
        {s.job ? <div className="space-y-2 text-sm">
          <p className="font-heading text-lg font-bold">{s.job.title} <span className="text-sm font-normal text-muted-foreground">· niveau {s.job.level}/{s.job.max_level}</span></p>
          <p>Salaire : <b>{eur(s.job.salary)}</b> par mois {s.job.salary > s.job.base && <span className="text-muted-foreground">(base {eur(s.job.base)})</span>}</p>
          <p className="text-muted-foreground">Depuis le {day(s.job.started_at)} · expérience {s.job.progress} pts</p>
          {housingShare(s.housing_monthly, s.job.salary) !== null && s.housing_monthly > 0 && <p className="text-muted-foreground">Ton logement prend {housingShare(s.housing_monthly, s.job.salary)} % de ton salaire.</p>}
          <p className="rounded-lg bg-muted p-2 text-xs">Sans vacation pendant {s.job.layoff_days} jours, tu risques le licenciement.{s.job.last_shift ? ` Dernière vacation : ${day(s.job.last_shift)}.` : ""}</p>
          {s.job.next && (s.job.next.first
            ? <p className="text-xs text-muted-foreground">Première promotion : à demander dans Patrimoine.</p>
            : <div className="rounded-lg border border-border p-3">
                <p className="font-semibold">Prochaine promotion (+{eur(s.job.next.raise)})</p>
                <p className="text-xs text-muted-foreground">Expérience {s.job.progress}/{s.job.next.progress} · {s.job.next.skill} {s.job.next.current_skill}/{s.job.next.skill_level}</p>
                <Button className="mt-2 h-11 w-full" variant="secondary" disabled={act.isPending} onClick={() => act.mutate({ cmd: "promote" })}><TrendingUp className="mr-2 h-4 w-4" />Demander la promotion</Button>
              </div>)}
        </div> : s.unemployment ? <div className="space-y-1 text-sm">
          <p className="font-semibold">Au chômage depuis le {day(s.unemployment.since)}</p>
          <p>Ancien poste : {s.unemployment.previous}</p>
          <p>Allocation : <b>{eur(s.unemployment.weekly)}</b> par semaine · {s.unemployment.paid_weeks}/{s.unemployment.max_weeks} semaines versées</p>
        </div> : <p className="text-sm text-muted-foreground">Pas d'emploi pour l'instant. Passe un entretien ci-dessous.</p>}
      </Card>

      <Card title="Offres et entretiens" icon={MessagesSquare}>
        {!s.eligible_path ? <p className="text-sm text-muted-foreground">Réservé aux parcours professionnels. Termine tes études pour accéder au travail.</p> :
          <ul className="space-y-2">{s.offers.map(o => { const out = interviewOutlook(o.profile.total, s.pass_score); return <li key={o.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{o.title}</p>
              <p className="text-xs text-muted-foreground">{eur(o.salary)} / mois{o.skill ? ` · ${o.skill} niv. ${o.skill_min}` : ""}</p></div>
              {!o.current && !o.blocked && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{OUTLOOK[out]}</span>}</div>
            {o.current ? <p className="mt-1 text-xs text-primary">Ton emploi actuel</p>
              : o.blocked ? <p className="mt-1 text-xs text-muted-foreground">{o.blocked}</p>
              : <Button className="mt-2 h-11 w-full" variant="outline" disabled={act.isPending || !!s.open_interview} onClick={() => act.mutate({ cmd: "interview_start", input: { job_id: o.id } })}>
                  {s.job ? "Passer l'entretien (changer d'entreprise)" : "Passer l'entretien"}</Button>}
          </li>; })}</ul>}
      </Card>

      {s.interviews.length > 0 && <Card title="Mes derniers entretiens" icon={History}>
        <ul className="space-y-3">{s.interviews.map((i, k) => <li key={k} className="rounded-lg border border-border p-3">
          <p className="font-semibold">{i.job} · <span className={i.status === "réussi" ? "text-primary" : "text-muted-foreground"}>{i.status}</span> · {i.score}/100</p>
          <p className="mb-2 text-xs text-muted-foreground">{day(i.at)} · seuil {s.pass_score}{i.details.motif ? ` · ${i.details.motif}` : ""}</p>
          {i.details.total !== undefined && <Breakdown p={i.details} />}
        </li>)}</ul>
      </Card>}

      {s.salary_months.length > 0 && <Card title="Évolution du salaire" icon={TrendingUp}>
        <ul className="space-y-1 text-sm">{s.salary_months.map(m => <li key={m.month} className="flex justify-between"><span className="text-muted-foreground">{m.month}</span><span className="font-semibold">{eur(m.total)}</span></li>)}</ul>
      </Card>}

      <Card title="Mon parcours professionnel" icon={History}>
        {s.history.length ? <ul className="space-y-1 text-sm">{s.history.map((h, k) => <li key={k}><b>{HISTORY_LABELS[h.kind] ?? h.kind}</b> · {h.label} <span className="text-xs text-muted-foreground">· {day(h.at)}</span></li>)}</ul>
          : <p className="text-sm text-muted-foreground">Rien pour l'instant.</p>}
        <p className="mt-3 text-xs text-muted-foreground">Formations et reconversion : depuis Patrimoine (formations) et Vie (fin d'études).</p>
      </Card>
    </>}
  </div>;
}
