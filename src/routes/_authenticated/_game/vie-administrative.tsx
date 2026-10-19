import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Circle, GraduationCap, Lock, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { gameMeta } from "@/game/metadata";
import { CATEGORIES, DOCUMENTS, MISSIONS, type Mission, type Step } from "@/game/admin-life/data";
import { LEVELS, categoryScore, categoryUnlocked, globalScore, knowledgeFor, level, quizCorrect, simulateApl, simulateTax, upcomingDeadlines, type AdminLifeProgress } from "@/game/admin-life/engine";

export const Route = createFileRoute("/_authenticated/_game/vie-administrative")({
  head: () => ({ meta: gameMeta("Vie administrative", "Apprends logement, CAF, impôts et documents avec des missions simulées.") }),
  component: AdminLifePage,
});

const KEY = "civitas-vie-administrative";

function useProgress() {
  const [p, setP] = useState<AdminLifeProgress>({});
  useEffect(() => { try { setP(JSON.parse(localStorage.getItem(KEY) ?? "{}")); } catch { /* empty */ } }, []);
  const save = (id: string, score: number) => setP(prev => {
    const old = prev[id] ?? { best: 0, done: false, attempts: 0 };
    const next = { ...prev, [id]: { best: Math.max(old.best, score), done: old.done || score >= 60, attempts: old.attempts + 1 } };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  });
  return { p, save };
}

function AdminLifePage() {
  const { p, save } = useProgress();
  const [mission, setMission] = useState<{ m: Mission; training: boolean } | null>(null);
  const [tab, setTab] = useState<"missions" | "documents" | "calendrier" | "competences">("missions");

  if (mission) return <MissionPlayer mission={mission.m} training={mission.training} onExit={(score) => { if (score !== null && !mission.training) save(mission.m.id, score); setMission(null); }} />;

  const lvl = level(p);
  const g = globalScore(p);
  return (
    <div className="space-y-6 animate-rise">
      <header>
        <p className="text-sm text-primary">Simulation pédagogique</p>
        <h1 className="mt-1 text-3xl font-bold">Vie administrative</h1>
        <p className="mt-2 text-muted-foreground">Apprends les démarches de la vraie vie, à ton rythme. Les montants sont fictifs.</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold"><GraduationCap className="h-5 w-5 text-primary" />Niveau {lvl} · {LEVELS[lvl - 1]}</p>
          <span className="text-2xl font-bold text-primary">{g} %</span>
        </div>
        <Progress value={g} className="mt-3 h-2" />
      </section>

      <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1 text-sm">
        {([["missions", "Missions"], ["calendrier", "Échéances"], ["documents", "Documents"], ["competences", "Acquis"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`min-h-11 rounded-lg font-medium ${tab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>

      {tab === "missions" && <>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map(c => {
            const open = categoryUnlocked(p, c.id);
            const has = MISSIONS.some(m => m.category === c.id);
            return <div key={c.id} className={`rounded-xl border border-border p-3 ${open ? "bg-card" : "bg-muted/50 opacity-70"}`}>
              <p className="text-2xl">{c.emoji}</p>
              <p className="mt-1 text-sm font-semibold">{c.label}</p>
              {open ? has ? <><Progress value={categoryScore(p, c.id)} className="mt-2 h-1.5" /><p className="mt-1 text-xs text-muted-foreground">{categoryScore(p, c.id)} %</p></> : <p className="mt-1 text-xs text-muted-foreground">Disponible dans une prochaine étape</p>
                : <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Niveau {c.unlockLevel}</p>}
            </div>;
          })}
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Missions</h2>
          {MISSIONS.map(m => {
            const prog = p[m.id];
            return <article key={m.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-lg font-semibold">{m.emoji} {m.title}</p><p className="mt-1 text-sm text-muted-foreground">{m.intro}</p></div>
                {prog?.done && <Trophy className="h-5 w-5 shrink-0 text-primary" />}
              </div>
              <Progress value={prog?.best ?? 0} className="mt-3 h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">Progression : {prog?.best ?? 0} % · {m.steps.length} étapes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="min-h-12" onClick={() => setMission({ m, training: false })}>{prog ? "Rejouer" : "Commencer"}</Button>
                <Button className="min-h-12" variant="outline" onClick={() => setMission({ m, training: true })}>Mode entraînement</Button>
              </div>
            </article>;
          })}
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Mode « Situation réelle » (plusieurs démarches en même temps) : Disponible dans une prochaine étape.</p>
        </section>
      </>}

      {tab === "calendrier" && <section className="space-y-2">
        <h2 className="text-xl font-semibold">Prochaines échéances</h2>
        {upcomingDeadlines(new Date(), 5).map(d => <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div><p className="font-semibold">{d.emoji} {d.label}</p><p className="text-xs text-muted-foreground">{d.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p></div>
          <span className={`text-sm font-semibold ${d.days <= 7 ? "text-primary" : "text-muted-foreground"}`}>{d.days === 0 ? "Aujourd'hui" : `J-${d.days}`}</span>
        </div>)}
        <p className="text-xs text-muted-foreground">Calendrier indicatif pour s'entraîner à anticiper.</p>
      </section>}

      {tab === "documents" && <section className="space-y-2">
        <h2 className="text-xl font-semibold">Les documents importants</h2>
        {DOCUMENTS.map(d => <details key={d.name} className="rounded-xl border border-border bg-card p-4">
          <summary className="min-h-8 cursor-pointer font-semibold">📄 {d.name}</summary>
          <dl className="mt-3 space-y-2 text-sm">
            {([["À quoi sert-il ?", d.what], ["Quand en a-t-on besoin ?", d.when], ["Où le trouver ?", d.where], ["Combien de temps le garder ?", d.keep]] as const).map(([k, v]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </details>)}
      </section>}

      {tab === "competences" && <section className="space-y-4">
        <h2 className="text-xl font-semibold">Compétences administratives</h2>
        {MISSIONS.map(m => {
          const k = knowledgeFor(p[m.id]?.best ?? 0, m.knowledge);
          return <div key={m.id}><p className="font-semibold">{m.emoji} {m.title}</p>
            <ul className="mt-2 space-y-1 text-sm">{m.knowledge.map(s => <li key={s} className={`flex items-start gap-2 ${k.includes(s) ? "" : "text-muted-foreground"}`}>{k.includes(s) ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <Lock className="h-4 w-4 shrink-0" />}{s}</li>)}</ul></div>;
        })}
      </section>}
    </div>
  );
}

function MissionPlayer({ mission, training, onExit }: { mission: Mission; training: boolean; onExit: (score: number | null) => void }) {
  const [i, setI] = useState(0);
  const [points, setPoints] = useState(0);
  const graded = mission.steps.filter(s => s.kind !== "info").length;
  const finished = i >= mission.steps.length;
  const score = graded ? Math.round((points / graded) * 100) : 100;
  const next = (ok: boolean | null) => { if (ok) setPoints(x => x + 1); setI(x => x + 1); };

  return (
    <div className="space-y-5 animate-rise">
      <Button variant="ghost" className="min-h-11 px-0" onClick={() => onExit(null)}><ArrowLeft />Vie administrative</Button>
      <header>
        <p className="text-sm text-primary">{training ? "Mode entraînement · tu ne risques rien" : "Mission"}</p>
        <h1 className="mt-1 text-2xl font-bold">{mission.emoji} {mission.title}</h1>
        <Progress value={(Math.min(i, mission.steps.length) / mission.steps.length) * 100} className="mt-3 h-2" />
      </header>
      <ol className="space-y-1 text-sm">
        {mission.steps.map((s, k) => <li key={k} className={`flex items-center gap-2 ${k === i ? "font-semibold" : k < i ? "" : "text-muted-foreground"}`}>{k < i ? <Check className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}{s.title}</li>)}
      </ol>
      {finished ? <section className="space-y-3 rounded-xl border border-border bg-card p-5 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <p className="text-xl font-semibold">Mission terminée : {score} %</p>
        <p className="text-sm text-muted-foreground">{score >= 60 ? "Bravo, tu maîtrises l'essentiel !" : "Pas grave : rejoue pour revoir les explications et progresser."}</p>
        {!training && knowledgeFor(score, mission.knowledge).map(k => <p key={k} className="text-sm">✨ Nouvelle compétence : « {k} »</p>)}
        {training && <p className="text-xs text-muted-foreground">En entraînement, ta progression n'est pas enregistrée.</p>}
        <Button className="min-h-12 w-full" onClick={() => onExit(score)}>Terminer</Button>
      </section> : <StepView key={i} step={mission.steps[i]} onDone={next} />}
    </div>
  );
}

function StepView({ step, onDone }: { step: Step; onDone: (ok: boolean | null) => void }) {
  if (step.kind === "info") return <section className="space-y-4 rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">{step.title}</h2><p>{step.text}</p><Button className="min-h-12 w-full" onClick={() => onDone(null)}>J'ai compris</Button></section>;
  if (step.kind === "quiz") return <Quiz step={step} onDone={onDone} />;
  if (step.kind === "apl") return <AplForm onDone={onDone} />;
  return <TaxForm onDone={onDone} />;
}

function Quiz({ step, onDone }: { step: Extract<Step, { kind: "quiz" }>; onDone: (ok: boolean) => void }) {
  const [sel, setSel] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const ok = quizCorrect(step.choices, sel);
  const toggle = (k: number) => !checked && setSel(s => step.multi ? (s.includes(k) ? s.filter(x => x !== k) : [...s, k]) : [k]);
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5">
    <h2 className="text-lg font-semibold">{step.title}</h2>
    <p>{step.question}</p>
    {step.choices.map((c, k) => {
      const on = sel.includes(k);
      const tone = checked ? c.correct ? "border-primary bg-primary/10" : on ? "border-destructive bg-destructive/10" : "border-border" : on ? "border-primary" : "border-border";
      return <button key={k} onClick={() => toggle(k)} className={`block min-h-12 w-full rounded-lg border-2 p-3 text-left ${tone}`}>
        {c.label}{checked && (on || c.correct) && <span className="mt-1 block text-sm text-muted-foreground">{c.why}</span>}
      </button>;
    })}
    {!checked ? <Button className="min-h-12 w-full" disabled={!sel.length} onClick={() => setChecked(true)}>Valider</Button>
      : <><p className={`font-semibold ${ok ? "text-primary" : "text-destructive"}`}>{ok ? "Bonne réponse !" : "Pas tout à fait — lis l'explication."}</p><Button className="min-h-12 w-full" onClick={() => onDone(ok)}>Continuer</Button></>}
  </section>;
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return <label className="block text-sm">{label}<div className="mt-1 flex items-center gap-2"><Input inputMode="numeric" className="h-12" value={value} onChange={e => onChange(e.target.value.replace(/[^\d]/g, ""))} />{suffix && <span className="text-muted-foreground">{suffix}</span>}</div></label>;
}

function AplForm({ onDone }: { onDone: (ok: boolean) => void }) {
  const [rent, setRent] = useState(""); const [income, setIncome] = useState(""); const [people, setPeople] = useState("1"); const [student, setStudent] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5">
    <h2 className="text-lg font-semibold">Demande d'aide au logement (simulation)</h2>
    <p className="text-sm text-muted-foreground">Situation : tu loues seul un studio à 525 € charges comprises et gagnes 1 450 € net par mois.</p>
    <Field label="Loyer mensuel charges comprises" value={rent} onChange={setRent} suffix="€" />
    <Field label="Revenus nets par mois" value={income} onChange={setIncome} suffix="€" />
    <Field label="Personnes dans le foyer" value={people} onChange={setPeople} />
    <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={student} onChange={e => setStudent(e.target.checked)} />Je suis étudiant</label>
    {result === null ? <Button className="min-h-12 w-full" disabled={!rent || !income} onClick={() => setResult(simulateApl({ rent: +rent, monthlyIncome: +income, people: Math.max(1, +people || 1), student }))}>Envoyer la demande</Button> : <>
      <div className="rounded-lg bg-muted p-4"><p className="text-sm text-muted-foreground">Résultat de jeu (simulation, pas un calcul officiel)</p><p className="text-2xl font-bold">{result} € / mois</p>
        <p className="mt-2 text-sm">{result > 0 ? "Une aide est possible avec cette situation." : "Avec ces revenus, la simulation ne donne pas d'aide."} Si tes revenus montent, l'aide baisse ; s'ils baissent, elle peut augmenter.</p></div>
      {(+rent !== 525 || +income !== 1450 || student) && <p className="text-sm text-destructive">Attention : tes réponses ne correspondent pas tout à fait à la situation décrite. Une demande doit toujours être exacte.</p>}
      <Button className="min-h-12 w-full" onClick={() => onDone(+rent === 525 && +income === 1450 && !student)}>Continuer</Button></>}
  </section>;
}

function TaxForm({ onDone }: { onDone: (ok: boolean) => void }) {
  const [annual, setAnnual] = useState(""); const [other, setOther] = useState(""); const [situation, setSituation] = useState("");
  const [done, setDone] = useState(false);
  const ok = +annual === 17400 && (+other || 0) === 0 && situation === "celibataire";
  const tax = simulateTax(+annual + (+other || 0), situation === "couple" ? 2 : 1);
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5">
    <h2 className="text-lg font-semibold">Déclaration de revenus (simulation)</h2>
    <p className="text-sm text-muted-foreground">Ta fiche de paie indique 1 450 € net par mois, pendant 12 mois. Tu vis seul et n'as pas d'autre revenu.</p>
    <Field label="Revenus salariés de l'année" value={annual} onChange={setAnnual} suffix="€" />
    <Field label="Autres revenus" value={other} onChange={setOther} suffix="€" />
    <label className="block text-sm">Situation<select className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3" value={situation} onChange={e => setSituation(e.target.value)}><option value="">Choisir…</option><option value="celibataire">Célibataire</option><option value="couple">Marié / pacsé</option></select></label>
    {!done ? <Button className="min-h-12 w-full" disabled={!annual || !situation} onClick={() => setDone(true)}>Vérifier et valider</Button> : <>
      <div className="space-y-1 rounded-lg bg-muted p-4 text-sm">
        <p className="text-muted-foreground">Avis simulé (montants fictifs)</p>
        <p>Montant déclaré : <strong>{(+annual + (+other || 0)).toLocaleString("fr-FR")} €</strong></p>
        <p>Impôt calculé : <strong>{tax.toLocaleString("fr-FR")} €</strong></p>
        <p>Déjà prélevé à la source : <strong>{tax.toLocaleString("fr-FR")} €</strong></p>
        <p>Reste à payer : <strong>0 €</strong></p>
      </div>
      <p className={`text-sm ${ok ? "text-primary" : "text-destructive"}`}>{ok ? "Parfait : 1 450 € × 12 = 17 400 €, sans autre revenu, en tant que célibataire." : "Erreur à corriger : le bon montant est 1 450 € × 12 = 17 400 €, 0 € d'autres revenus, situation célibataire. Dans la vraie vie, on peut corriger sa déclaration en ligne."}</p>
      <Button className="min-h-12 w-full" onClick={() => onDone(ok)}>Continuer</Button></>}
  </section>;
}
