import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Car, LoaderCircle, BookOpen, Award } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { drivingQuery, realismAction, type DrivingState } from "@/services/game";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/permis")({
  head: () => ({ meta: gameMeta("Permis de conduire", "Code de la route, leçons de conduite et examen du permis B, dès 17 ans.") }),
  component: DrivingPage,
});

const day = (s: string) => new Date(s).toLocaleDateString("fr-FR", { timeZone: "UTC" });

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children?: React.ReactNode }) {
  return <section className={`rounded-xl border bg-card p-4 ${done ? "border-primary/40" : "border-border"}`}>
    <h2 className="mb-2 font-heading text-base font-bold">{done ? "✓" : `${n}.`} {title}</h2>{children}
  </section>;
}

function DrivingPage() {
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery(drivingQuery);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const act = useMutation({
    mutationFn: (v: { fn: "driving_register" | "driving_code" | "driving_lesson" | "driving_exam"; args?: object }) => realismAction<DrivingState>(v.fn, v.args),
    onSuccess: (r, v) => {
      qc.setQueryData(drivingQuery.queryKey, r); qc.invalidateQueries({ queryKey: ["bank"] }); qc.invalidateQueries({ queryKey: ["character"] });
      const last = r.history[0];
      if (v.fn === "driving_code") { setAnswers({}); r.license?.code_passed_at ? toast.success(`Code obtenu (${last?.result}) !`) : toast.error(`Code non obtenu (${last?.result}). Réessaie demain.`); }
      if (v.fn === "driving_exam") r.license?.license_at ? toast.success("Permis obtenu, félicitations !") : toast.error("Examen non réussi. Prends encore quelques leçons.");
      if (v.fn === "driving_lesson") toast.success("Leçon terminée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rid = () => crypto.randomUUID();

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Car className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Permis de conduire</h1><p className="text-sm text-muted-foreground">Code, conduite, examen. Obligatoire pour acheter une voiture ou devenir ambulancier.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {!isLoading && !s && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Disponible dans une prochaine étape.</p>}
    {s && (() => {
      const l = s.license, st = s.settings;
      if (l?.license_at) return <section className="rounded-xl border-2 border-primary bg-card p-5 text-center">
        <Award className="mx-auto h-10 w-10 text-primary" /><p className="mt-2 font-heading text-xl font-bold">Permis B obtenu</p>
        <p className="text-sm">Depuis le {day(l.license_at)} · 6 points (jeune conducteur) · FICTIF</p></section>;
      const chance = l ? Math.min(st.exam_max_pct, st.exam_base_pct + st.exam_pct_per_lesson * (l.lessons - st.min_lessons)) : 0;
      return <>
        <Step n={1} title={`Inscription (${st.code_fee} €)`} done={!!l}>
          {!l && <>{s.age < st.min_age ? <p className="text-sm">Possible dès {st.min_age} ans.</p>
            : <Button className="min-h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ fn: "driving_register", args: { _request: rid() } })}>M'inscrire au code</Button>}</>}
        </Step>
        {l && <Step n={2} title="Code de la route" done={!!l.code_passed_at}>
          {!l.code_passed_at && <>
            <p className="mb-3 text-sm text-muted-foreground">{st.code_questions} questions, il faut {st.code_pass} bonnes réponses. Un essai par jour.</p>
            <div className="space-y-4">{s.questions.map((q, i) => <div key={q.id}>
              <p className="mb-2 text-sm font-semibold"><BookOpen className="mr-1 inline h-4 w-4 text-primary" />{i + 1}. {q.question}</p>
              <div className="grid gap-2">{q.choices.map((c, ci) => <button key={ci} type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: ci }))}
                className={`min-h-12 rounded-lg border p-3 text-left text-sm ${answers[q.id] === ci ? "border-primary bg-primary/10" : "border-border"}`}>{c}</button>)}</div>
            </div>)}</div>
            <Button className="mt-4 min-h-12 w-full" disabled={act.isPending || Object.keys(answers).length < s.questions.length}
              onClick={() => act.mutate({ fn: "driving_code", args: { _answers: answers, _request: rid() } })}>Valider mes réponses</Button>
          </>}
        </Step>}
        {l?.code_passed_at && <Step n={3} title="Leçons de conduite" done={l.lessons >= st.min_lessons}>
          <p className="text-sm">{l.lessons} / {st.min_lessons} leçons minimum · {st.lesson_price} € et {st.lesson_energy} d'énergie par leçon · {st.lessons_per_day} par jour au plus.</p>
          <Button className="mt-3 min-h-12 w-full" disabled={act.isPending || s.lessons_today >= st.lessons_per_day}
            onClick={() => act.mutate({ fn: "driving_lesson", args: { _request: rid() } })}>{s.lessons_today >= st.lessons_per_day ? "Reviens demain" : "Prendre une leçon"}</Button>
        </Step>}
        {l?.code_passed_at && <Step n={4} title="Examen de conduite" done={false}>
          {l.lessons < st.min_lessons ? <p className="text-sm">Disponible après {st.min_lessons} leçons.</p> : <>
            <p className="text-sm">Chances de réussite estimées : {chance} %. Chaque leçon en plus aide. En cas d'échec, {st.exam_retry_days} jours d'attente.</p>
            <Button className="mt-3 min-h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ fn: "driving_exam", args: { _request: rid() } })}>Passer l'examen</Button>
          </>}
        </Step>}
        {s.history.length > 0 && <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-heading text-base font-bold">Historique</h2>
          <ul className="space-y-1">{s.history.map((h, i) => <li key={i}>{day(h.created_at)} · {h.kind === "code" ? `Code : ${h.result}` : h.kind === "examen" ? `Examen : ${h.result === "reussi" ? "réussi" : "échec"}` : `Inscription (${h.amount} €)`}</li>)}</ul>
        </section>}
      </>;
    })()}
  </div>;
}
