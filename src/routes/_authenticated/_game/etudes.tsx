import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LoaderCircle, Home, Award } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { studentAction, studentQuery, type StudentState } from "@/services/game";
import { euros } from "@/game/income-tax";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/etudes")({
  head: () => ({ meta: gameMeta("Études supérieures", "Vœux, bourse sur critères sociaux, partiels, rattrapage, diplômes et résidence universitaire (fictif).") }),
  component: StudiesPage,
});

const ANSWER: Record<StudentState["wishes"][number]["answer"], string> = {
  attente_reponse: "Réponse en cours…", oui: "Oui", en_attente: "En liste d'attente", non: "Non", acceptee: "Acceptée", renoncee: "Renoncé",
};
const day = (s: string) => new Date(s).toLocaleDateString("fr-FR", { timeZone: "UTC" });

function StudiesPage() {
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery(studentQuery);
  const act = useMutation({
    mutationFn: (v: { fn: "student_wish" | "student_accept" | "student_retake" | "student_room_request"; args?: object; ok: string }) => studentAction(v.fn, v.args),
    onSuccess: (r, v) => { qc.setQueryData(studentQuery.queryKey, r); qc.invalidateQueries({ queryKey: ["daily-life"] }); qc.invalidateQueries({ queryKey: ["bank"] }); toast.success(v.ok); },
    onError: (e: Error) => toast.error(e.message),
  });

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><GraduationCap className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Études supérieures</h1><p className="text-sm text-muted-foreground">Vœux, bourse, examens · FICTIF</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {!isLoading && !s && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Disponible dans une prochaine étape.</p>}
    {s && s.profile && (() => {
      const p = s.profile!, st = s.settings;
      const prog = s.programs.find(x => x.id === p.program_id);
      const wished = new Set(s.wishes.map(w => w.program_id));
      const diplomas = s.ledger.filter(l => l.kind === "diplome");
      const grades = s.ledger.filter(l => ["partiel", "rattrapage", "annee"].includes(l.kind));
      const money = s.ledger.filter(l => ["bourse", "loyer", "loyer_impaye"].includes(l.kind));
      return <>
        <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-heading text-base font-bold">Mon dossier</h2>
          <p>Moyenne de lycée : <b>{p.hs_average}/20</b></p>
          <p>Revenus de ma famille : {euros(p.family_income)} par an</p>
          <p>Bourse : {p.scholarship_level > 0 ? <b>échelon {p.scholarship_level} · {euros(st.scholarship[p.scholarship_level - 1] ?? 0)}/mois, de septembre à juin</b> : "non boursier"}</p>
          {diplomas.map(d => <p key={d.key} className="mt-2 flex items-center gap-2 font-semibold text-primary"><Award className="h-4 w-4" />{d.label}</p>)}
        </section>

        {prog ? <section className="rounded-xl border-2 border-primary bg-card p-4 text-sm">
          <h2 className="mb-1 font-heading text-base font-bold">{prog.name}</h2>
          <p>Année {p.year} sur {prog.years} · entrée le {p.year_started_at && day(p.year_started_at)}</p>
          <p className="mt-2 text-muted-foreground">Partiels mi-janvier et mi-mai. Il faut {st.pass_grade}/20 de moyenne. Plus tu vas en cours et révises, meilleures sont tes notes.</p>
          {p.retake_open && <Button className="mt-3 min-h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ fn: "student_retake", ok: "Rattrapage passé." })}>Passer le rattrapage (juin)</Button>}
        </section> : <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-heading text-base font-bold">Mes vœux ({s.wishes.filter(w => !["non", "renoncee"].includes(w.answer)).length}/{st.max_wishes})</h2>
          {s.path !== "student" ? <p className="text-sm text-muted-foreground">Réservé au parcours Étudiant.</p>
            : s.age < st.min_age ? <p className="text-sm text-muted-foreground">Vœux possibles dès {st.min_age} ans.</p> : <>
            <p className="mb-3 text-sm text-muted-foreground">Réponse sous {st.answer_days} jours. En liste d'attente, une place peut se libérer une semaine plus tard.</p>
            <ul className="mb-3 space-y-2">{s.wishes.map(w => { const x = s.programs.find(pp => pp.id === w.program_id); return <li key={w.program_id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
              <span>{x?.name}<br /><span className={`text-xs ${w.answer === "oui" ? "font-bold text-primary" : w.answer === "non" ? "text-destructive" : "text-muted-foreground"}`}>{ANSWER[w.answer]}</span></span>
              {w.answer === "oui" && <Button className="min-h-11" disabled={act.isPending} onClick={() => act.mutate({ fn: "student_accept", args: { _program: w.program_id }, ok: "Inscription confirmée !" })}>Accepter</Button>}
            </li>; })}</ul>
            <div className="space-y-2">{s.programs.filter(x => !wished.has(x.id)).map(x => <div key={x.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
              <span><span className="text-xs font-semibold text-primary">{x.kind} · {x.years} ans</span><br />{x.name}<br /><span className="text-xs text-muted-foreground">Moyenne conseillée : {x.min_grade}/20</span></span>
              <Button variant="outline" className="min-h-11 shrink-0" disabled={act.isPending} onClick={() => act.mutate({ fn: "student_wish", args: { _program: x.id }, ok: "Vœu envoyé." })}>Ajouter</Button></div>)}</div>
          </>}
        </section>}

        {prog && <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 flex items-center gap-2 font-heading text-base font-bold"><Home className="h-5 w-5 text-primary" />Résidence universitaire</h2>
          {s.room ? <p>{s.room.status === "attribuee" ? `✓ Chambre attribuée : ${s.room.residence} · ${euros(st.room_rent)}/mois` : "Demande refusée : plus de place (les boursiers sont prioritaires)."}</p>
            : <Button className="min-h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ fn: "student_room_request", ok: "Demande traitée." })}>Demander une chambre ({euros(st.room_rent)}/mois)</Button>}
          <p className="mt-2 text-xs text-muted-foreground">Le loyer est prélevé chaque mois. Ta position sur la carte ne change pas.</p>
        </section>}

        {grades.length > 0 && <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-heading text-base font-bold">Mes notes</h2>
          <ul className="divide-y divide-border text-sm">{grades.map(g => <li key={g.key} className="flex justify-between py-2"><span>{g.label}</span><b className={(g.grade ?? 0) < st.pass_grade ? "text-destructive" : ""}>{g.grade}/20</b></li>)}</ul>
        </section>}

        {money.length > 0 && <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-heading text-base font-bold">Bourse et loyers</h2>
          <ul className="divide-y divide-border text-sm">{money.map(m => <li key={m.key} className="flex justify-between py-2"><span>{m.label}</span><b className={m.kind === "loyer_impaye" ? "text-destructive" : m.kind === "bourse" ? "text-primary" : ""}>{m.kind === "bourse" ? "+" : "−"} {euros(m.amount)}</b></li>)}</ul>
        </section>}
      </>;
    })()}
  </div>;
}
