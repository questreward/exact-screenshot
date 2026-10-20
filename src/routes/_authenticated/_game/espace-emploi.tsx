import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Briefcase, CalendarCheck, Check, ChevronRight, FileText, Home, MessageCircle, Search, User } from 'lucide-react';
import { applyJob, formatMoney, lifeQuery } from '@/services/game';
import { gameMeta } from '@/game/metadata';

export const Route = createFileRoute('/_authenticated/_game/espace-emploi')({
  head: () => ({ meta: gameMeta('Emploi CIVITAS — Mon espace', 'Espace candidat CIVITAS inspiré de France Travail : offres, candidatures, conseiller et actualisation.') }),
  loader: async ({ context: { queryClient: q } }) => { await q.ensureQueryData(lifeQuery); },
  component: JobSpace,
});

type Tab = 'accueil' | 'offres' | 'candidatures' | 'conseiller' | 'actualisation';
const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'accueil', label: 'Accueil', icon: Home }, { id: 'offres', label: 'Offres d’emploi', icon: Search },
  { id: 'candidatures', label: 'Mes candidatures', icon: FileText }, { id: 'conseiller', label: 'Mon conseiller', icon: MessageCircle },
  { id: 'actualisation', label: 'M’actualiser', icon: CalendarCheck },
];
const STATUS: Record<string, string> = { pending: 'En attente de réponse', accepted: 'Acceptée', rejected: 'Refusée' };
const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

function JobSpace() {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const [tab, setTab] = useState<Tab>('accueil');
  const [q, setQ] = useState('');
  const qc = useQueryClient();
  const apply = useMutation({ mutationFn: applyJob, onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['daily-life'] }); toast.success('Candidature envoyée'); }, onError: (e: Error) => toast.error(e.message) });
  const c = life.character;
  const id = c.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const offers = useMemo(() => life.offers.filter(o => !q || `${o.title} ${o.employer} ${o.location.name}`.toLowerCase().includes(q.toLowerCase())), [life.offers, q]);
  const lastApp = (jobId: string) => life.applications.filter(a => a.job_id === jobId).sort((x, y) => y.applied_at.localeCompare(x.applied_at))[0];
  const tooYoung = life.offers.filter(o => o.min_age > c.age).length;
  return <div className="-mx-4 -mt-4 min-h-screen pb-24 sm:mx-0 sm:mt-0">
    <header className="border-b-4 border-primary bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-primary font-heading font-bold text-primary-foreground">EC</span>
          <div><p className="font-heading text-lg font-bold leading-tight">Emploi CIVITAS</p><p className="text-xs opacity-80">Mon espace candidat · FICTIF</p></div></div>
        <div className="text-right text-xs"><p className="flex items-center justify-end gap-1 font-semibold"><User className="h-3.5 w-3.5" />{c.first_name} {c.last_name}</p><p className="opacity-80">Identifiant {id}</p></div>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2" aria-label="Menu espace candidat">
        {TABS.map(t => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm ${tab === t.id ? 'bg-background font-semibold text-foreground' : 'opacity-85 hover:bg-background/20'}`}><t.icon className="h-4 w-4" />{t.label}</button>)}
      </nav>
    </header>
    <p className="mx-auto max-w-3xl px-4 pt-3 text-xs text-muted-foreground">Simulation CIVITAS inspirée de l’espace France Travail — pas un vrai service public.</p>
    <main className="mx-auto max-w-3xl space-y-4 px-4 pt-3">
      {tab === 'accueil' && <>
        <h1 className="font-heading text-2xl font-bold">Bonjour {c.first_name}</h1>
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ma situation</p>
          {life.employment ? <><p className="mt-1 font-semibold">En poste : {life.employment.job.title}</p><p className="text-sm text-muted-foreground">{formatMoney(life.employment.job.salary + life.employment.salary_bonus)} par mois</p></>
            : <><p className="mt-1 font-semibold">À la recherche d’un emploi</p><p className="text-sm text-muted-foreground">{life.offers.length} offres disponibles dans votre ville</p></>}
        </section>
        <section className="grid grid-cols-2 gap-2">
          <Tile onClick={() => setTab('offres')} icon={Search} label="Rechercher une offre" />
          <Tile onClick={() => setTab('candidatures')} icon={FileText} label={`Mes candidatures (${life.applications.length})`} />
          <Tile onClick={() => setTab('conseiller')} icon={MessageCircle} label="Contacter mon conseiller" />
          <Tile onClick={() => setTab('actualisation')} icon={CalendarCheck} label="M’actualiser" />
        </section>
        <Link to="/carriere" className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:border-primary">Préparer un entretien d’embauche<ChevronRight className="h-4 w-4 text-primary" /></Link>
      </>}
      {tab === 'offres' && <section className="space-y-3">
        <label className="relative block"><Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Métier, employeur, lieu…" className="h-12 w-full rounded-md border border-input bg-background pl-10 pr-3" /></label>
        <p className="text-sm text-muted-foreground">{offers.length} offre(s)</p>
        {offers.map(o => { const a = lastApp(o.id); const young = o.min_age > c.age; return <article key={o.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">{o.title}</h2><p className="text-sm text-muted-foreground">{o.employer} · {o.location.name}</p>
          <p className="text-sm">{o.description}</p>
          <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-muted px-2 py-1">{formatMoney(o.salary)} / mois</span>{o.min_age > 16 && <span className="rounded-full bg-muted px-2 py-1">Dès {o.min_age} ans</span>}{o.skill_min > 0 && <span className="rounded-full bg-muted px-2 py-1">{o.required_skill} {o.skill_min}</span>}</div>
          <button type="button" disabled={!!a || young || apply.isPending} onClick={() => apply.mutate(o.id)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground disabled:opacity-50">{a ? <><Check className="h-4 w-4" />{STATUS[a.status] ?? a.status}</> : young ? `Âge minimum ${o.min_age} ans` : <><Briefcase className="h-4 w-4" />Postuler</>}</button>
        </article>; })}
      </section>}
      {tab === 'candidatures' && <section className="rounded-xl border border-border bg-card p-4"><h1 className="mb-3 font-heading text-xl font-bold">Mes candidatures</h1>
        {life.applications.length ? <ul>{[...life.applications].sort((x, y) => y.applied_at.localeCompare(x.applied_at)).map(a => <li key={a.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0"><span><span className="block font-medium">{a.job_title}</span><span className="text-xs text-muted-foreground">Envoyée le {fmt(a.applied_at)}</span></span><span className="text-xs text-primary">{STATUS[a.status] ?? a.status}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune candidature pour le moment.</p>}
      </section>}
      {tab === 'conseiller' && <section className="space-y-3 rounded-xl border border-border bg-card p-4"><h1 className="font-heading text-xl font-bold">Mon conseiller</h1>
        <p className="text-sm">Bonjour {c.first_name}, voici mes conseils selon votre situation :</p>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {life.employment && <li>Vous avez un emploi : pensez à préparer votre prochaine promotion dans « Ma carrière ».</li>}
          {!life.employment && life.applications.length === 0 && <li>Commencez par postuler à 2 ou 3 offres proches de vos compétences.</li>}
          {life.applications.some(a => a.status === 'rejected') && <li>Une candidature refusée n’est pas un échec : entraînez-vous aux entretiens pour mieux réussir.</li>}
          {tooYoung > 0 && <li>{tooYoung} offre(s) demandent d’être plus âgé : les études sont une bonne option en attendant.</li>}
          {!life.enrollment && <li>Une formation augmente vos compétences et ouvre de meilleurs postes.</li>}
        </ul>
        <p className="text-xs text-muted-foreground">Conseiller fictif. Rendez-vous avec un conseiller : Disponible dans une prochaine étape.</p>
      </section>}
      {tab === 'actualisation' && <section className="space-y-2 rounded-xl border border-border bg-card p-4"><h1 className="font-heading text-xl font-bold">M’actualiser</h1>
        <p className="text-sm">En vrai, chaque mois, un demandeur d’emploi déclare s’il a travaillé, combien d’heures, et s’il est toujours à la recherche d’un emploi. Sans actualisation, il est radié.</p>
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">Actualisation mensuelle et allocation chômage : Disponible dans une prochaine étape</p>
      </section>}
    </main>
  </div>;
}

function Tile({ onClick, icon: Icon, label }: { onClick: () => void; icon: typeof Home; label: string }) { return <button type="button" onClick={onClick} className="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-card p-3 text-left hover:border-primary"><Icon className="h-6 w-6 text-primary" /><span className="text-sm font-semibold">{label}</span></button>; }
