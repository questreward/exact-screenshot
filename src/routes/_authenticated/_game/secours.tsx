import { JobMissionCard } from "@/components/game/JobMissionCard";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { VolunteerDossier } from "@/components/game/VolunteerDossier";
import { Siren, LoaderCircle, Clock, ShieldCheck, ClipboardList, Wallet, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { securityAction, securityMissionsQuery, securityQuery, volunteerDossierQuery, type SecurityState } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { OUTCOME_LABELS, SERVICE_INTRO, TEAMS, nextRank, weeklyPay, type SecurityServiceId } from "@/game/security-careers";

export const Route = createFileRoute("/_authenticated/_game/secours")({
  head: () => ({ meta: gameMeta("Police, pompiers et secours", "Concours, formation, horaires d'équipe et missions de police, de sapeur-pompier et de protection civile.") }),
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(securityQuery), context.queryClient.ensureQueryData(securityMissionsQuery), context.queryClient.ensureQueryData(volunteerDossierQuery)]);
  },
  component: SecurityPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const when = (s: string) => new Date(s).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Siren; children: ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4">
    <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold"><Icon className="h-5 w-5 text-primary" />{title}</h2>{children}
  </section>;
}

function SecurityPage() {
  const qc = useQueryClient();
  const { data: s } = useSuspenseQuery(securityQuery);
  const { data: missions } = useSuspenseQuery(securityMissionsQuery);
  const act = useMutation({
    mutationFn: (v: { fn: Parameters<typeof securityAction>[0]; args?: object; ok?: string }) => securityAction(v.fn, v.args),
    onSuccess: (r, v) => {
      qc.setQueryData(securityQuery.queryKey, r);
      qc.invalidateQueries({ queryKey: ["character"] });
      if (v.fn === "security_apply") {
        const e = r.exams[0];
        if (r.career && r.career.status === "formation") toast.success("Admis ! Ta formation commence.");
        else if (e && !e.passed) toast.error(`Concours non réussi : ${e.written + e.sport + e.oral} / 60.`);
      } else if (v.ok) toast.success(v.ok);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <JobMissionCard />
    <header className="flex min-w-0 items-center gap-3"><Siren className="h-8 w-8 shrink-0 text-primary" />
      <div className="min-w-0 break-words"><h1 className="font-heading text-2xl font-bold">Police, pompiers, secours</h1>
        <p className="text-sm text-muted-foreground">Recrutement, formation, horaires et missions tirées de ce qui se passe dans ta ville.</p></div></header>
    {!s && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Disponible dans une prochaine étape.</p>}
    {s && (s.career && s.career.status !== "quitte"
      ? <Career s={s} missions={missions} busy={act.isPending} run={act.mutate} />
      : <Recruitment s={s} busy={act.isPending} run={act.mutate} />)}
    {s && <VolunteerDossier state={s} missions={missions}/>}
    {s && s.ledger.length > 0 && <Card title="Mon dossier" icon={Wallet}>
      <ul className="space-y-1 text-sm">{s.ledger.map(l => <li key={l.key} className="flex justify-between gap-2">
        <span>{l.label}</span>{l.amount > 0 && <span className="font-semibold">+{eur(l.amount)}</span>}</li>)}</ul>
    </Card>}
  </div>;
}

type Run = (v: { fn: Parameters<typeof securityAction>[0]; args?: object; ok?: string }) => void;

function Recruitment({ s, busy, run }: { s: SecurityState; busy: boolean; run: Run }) {
  const [pick, setPick] = useState<SecurityServiceId | null>(null);
  const [team, setTeam] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const sv = s.services.find(x => x.id === pick);
  const qs = sv ? s.questions.filter(q => q.service === sv.id) : [];
  const ready = sv && team && (!sv.exam || qs.every(q => answers[q.id] !== undefined));

  if (!sv) return <div className="space-y-3">{s.services.map(x => {
    const eligible = s.age >= x.min_age && s.age <= x.max_age;
    return <Button variant="outline" key={x.id} onClick={() => { setPick(x.id); setTeam(TEAMS[x.id][0]?.id ?? ""); setAnswers({}); }}
      className="block h-auto min-h-14 w-full whitespace-normal rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary">
      <p className="font-heading font-bold">{x.label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{SERVICE_INTRO[x.id]}</p>
      <p className="mt-2 text-sm">{x.min_age} à {x.max_age} ans · {x.exam ? "Concours" : "Sans concours"} · {
        x.hourly_pay ? `${x.hourly_pay} € de l'heure` : (x.rank_monthly[1] ?? 0) ? `${eur(x.rank_monthly[1] ?? 0)} par mois au départ` : "Bénévole"}</p>
      {!eligible && <p className="mt-1 text-sm font-semibold text-destructive">Pas accessible à ton âge ({s.age} ans).</p>}
    </Button>;
  })}</div>;

  const last = s.exams.find(e => e.service === sv.id);
  return <Card title={sv.label} icon={sv.exam ? GraduationCap : ShieldCheck}>
    <p className="mb-3 text-sm text-muted-foreground">{SERVICE_INTRO[sv.id]}</p>
    {sv.exclusive_job && s.employed && <p className="mb-3 rounded-lg bg-muted p-3 text-sm">C'est un métier à temps plein : il faut d'abord quitter ton emploi actuel.</p>}
    {last && !last.passed && <p className="mb-3 rounded-lg bg-muted p-3 text-sm">Dernier concours : écrit {last.written}/20, sport {last.sport}/20, oral {last.oral}/20. Prochaine session {s.settings.exam_retry_days} jours après.</p>}
    <p className="mb-2 font-semibold">Ton équipe et tes horaires</p>
    <div className="mb-4 grid gap-2">{TEAMS[sv.id].map(t => <Button variant="outline" aria-pressed={team === t.id} key={t.id} onClick={() => setTeam(t.id)}
      className={`h-auto min-h-12 justify-start whitespace-normal rounded-lg border p-3 text-left text-sm ${team === t.id ? "border-primary bg-primary/10" : "border-border"}`}>
      <span className="font-semibold">{t.label}</span> · {t.hours}</Button>)}</div>
    {sv.exam && <>
      <p className="mb-1 font-semibold">{sv.id === "samu_infirmier" ? "Questions de soins" : "Épreuve écrite"}</p>
      <p className="mb-3 text-sm text-muted-foreground">5 points par bonne réponse. Le sport dépend de ta santé et de ton énergie (coûte {s.settings.exam_energy} d'énergie), puis vient l'entretien oral. Il faut {s.settings.exam_pass_total} / 60.</p>
      <div className="mb-4 space-y-4">{qs.map((q, i) => <div key={q.id}>
        <p className="mb-2 text-sm font-semibold">{i + 1}. {q.question}</p>
        <div className="grid gap-2">{q.choices.map((c, ci) => <Button variant="outline" aria-pressed={answers[q.id] === ci} key={ci} onClick={() => setAnswers(a => ({ ...a, [q.id]: ci }))}
          className={`h-auto min-h-12 justify-start whitespace-normal rounded-lg border p-3 text-left text-sm ${answers[q.id] === ci ? "border-primary bg-primary/10" : "border-border"}`}>{c}</Button>)}</div>
      </div>)}</div>
    </>}
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button className="min-h-12 flex-1" disabled={!ready || busy}
        onClick={() => run({ fn: "security_apply", args: { _service: sv.id, _team: team, _answers: answers, _request: crypto.randomUUID() } })}>
        {sv.exam ? "Passer le concours" : "M'engager"}</Button>
      <Button variant="outline" className="min-h-12" onClick={() => setPick(null)}>Retour</Button>
    </div>
  </Card>;
}

function Career({ s, missions, busy, run }: { s: SecurityState; missions: { id: string; title: string; situation: string; choices: { id: string; label: string }[] }[]; busy: boolean; run: Run }) {
  const c = s.career;
  if (!c) return null;
  const sv = s.services.find(x => x.id === c.service);
  if (!sv) return null;
  const now = new Date(s.now).getTime();
  const current = s.shifts.find(x => new Date(x.ends_at).getTime() > now);
  const mission = current && missions.find(m => m.id === current.mission_id);
  const next = nextRank(sv.rank_titles, sv.rank_missions, c.rank, c.missions_ok);
  const team = TEAMS[c.service].find(t => t.id === c.team);
  const injured = c.injured_until && new Date(c.injured_until).getTime() > now;
  const monthly = c.status === "formation" ? sv.training_monthly : (sv.rank_monthly[Math.max(c.rank, 1)] ?? 0);

  return <>
    <Card title={sv.label} icon={ShieldCheck}>
      <p className="text-lg font-bold">{sv.rank_titles[c.rank]}</p>
      <ul className="mt-2 space-y-1 text-sm">
        <li>{c.status === "formation" ? `En formation jusqu'au ${when(c.trained_at)}` : "En service"}{injured && ` · en arrêt jusqu'au ${when(c.injured_until ?? s.now)}`}</li>
        <li>Missions réussies : {c.missions_ok} / {c.missions_total} · Félicitations : {c.commendations} · Plaintes : {c.complaints}</li>
        {sv.exclusive_job && <li>Traitement : {eur(monthly)} par mois ({eur(weeklyPay(monthly))} par semaine travaillée)</li>}
        {sv.hourly_pay > 0 && <li>Indemnités : {sv.hourly_pay} € par heure de service</li>}
        {sv.civic_per_shift > 0 && <li>+{sv.civic_per_shift} d'engagement citoyen par service</li>}
        {next && <li>Prochain grade : {next.title} {next.remaining > 0 ? `(encore ${next.remaining} missions réussies)` : "(bientôt)"}{c.complaints >= 3 && " — bloqué par les plaintes"}</li>}
      </ul>
    </Card>

    <Card title="Horaires" icon={Clock}>
      <p className="mb-2 text-sm">{team?.label} · {team?.hours}</p>
      {c.service === "police" && <p className="mb-2 text-sm text-muted-foreground">Cycle : 4 jours de travail, puis 2 jours de repos.</p>}
      {c.service === "gendarmerie" && <p className="mb-2 text-sm text-muted-foreground">Cycle : 5 jours de travail, puis 2 jours de repos.</p>}
      {TEAMS[c.service].length > 1 && <div className="grid gap-2">{TEAMS[c.service].filter(t => t.id !== c.team).map(t =>
        <Button key={t.id} variant="outline" className="min-h-12 justify-start" disabled={busy}
          onClick={() => run({ fn: "security_set_team", args: { _team: t.id }, ok: `Équipe changée : ${t.label}` })}>Passer en {t.label.toLowerCase()} ({t.hours})</Button>)}</div>}
    </Card>

    <Card title={current ? "Service en cours" : "Prendre mon service"} icon={Siren}>
      {current ? <>
        <p className="text-sm text-muted-foreground">Jusqu'au {when(current.ends_at)}</p>
        {mission && <div className="mt-3">
          <p className="font-semibold">{mission.title}</p>
          <p className="mb-3 text-sm">{mission.situation}</p>
          {current.choice ? <p className="rounded-lg bg-muted p-3 text-sm">Ton choix : {mission.choices.find(x => x.id === current.choice)?.label}. Le bilan arrive à la fin du service.</p>
            : <div className="grid gap-2">{mission.choices.map(ch => <Button key={ch.id} variant="outline" className="min-h-12 h-auto justify-start whitespace-normal text-left" disabled={busy}
              onClick={() => run({ fn: "security_choose", args: { _shift: current.id, _choice: ch.id }, ok: "Décision prise." })}>{ch.label}</Button>)}
              <p className="text-xs text-muted-foreground">Aucun choix n'est parfait. Sans décision, l'équipe gère la mission sans toi.</p></div>}
        </div>}
      </> : <>
        <p className="mb-3 text-sm text-muted-foreground">Un service coûte environ 30 d'énergie pour 8 heures. Tu as {s.energy} d'énergie.</p>
        <Button className="min-h-12 w-full" disabled={busy || c.status === "formation" || !!injured}
          onClick={() => run({ fn: "security_start_shift", args: { _request: crypto.randomUUID() }, ok: "Service commencé." })}>Prendre mon service</Button>
      </>}
    </Card>

    {s.shifts.some(x => x.settled) && <Card title="Mes derniers services" icon={ClipboardList}>
      <ul className="space-y-2 text-sm">{s.shifts.filter(x => x.settled).map(x => <li key={x.id} className="flex justify-between gap-2">
        <span>{missions.find(m => m.id === x.mission_id)?.title ?? "Mission"} · {when(x.starts_at)}</span>
        <span className="font-semibold">{OUTCOME_LABELS[x.outcome ?? "equipe"]}</span></li>)}</ul>
    </Card>}

    <Button variant="outline" className="min-h-12 w-full" disabled={busy}
      onClick={() => { if (confirm("Quitter ce service ? Pour revenir, il faudra repasser le recrutement.")) run({ fn: "security_quit", ok: "Tu as quitté le service." }); }}>Quitter ce service</Button>
  </>;
}
