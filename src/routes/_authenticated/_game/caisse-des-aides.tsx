import { useState } from 'react';
import { DeskScene } from "@/components/game/DeskScene";
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient, useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { Bell, Calculator, CalendarDays, ListChecks, ChevronRight, FileCheck2, FileText, Home, Mail, User, Wallet } from 'lucide-react';
import { adminQuery, characterQuery, formatMoney, rsaQuery, rsaApply, rsaDeclare } from '@/services/game';
import { gameMeta } from '@/game/metadata';
import { aidPayments, aidRights, type AidRight } from '@/game/aid-portal';
import { housingAid, PROCEDURE_STATUS } from '@/game/admin';
import { aidRequestSteps } from '@/game/aid-portal';
import { COMING_SOON } from '@/game/navigation';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/_game/caisse-des-aides')({
  head: () => ({ meta: gameMeta('Caisse des aides — Mon compte', 'Espace allocataire CIVITAS : paiements, droits, messages, attestations et simulation d’aide au logement.') }),
  loader: async ({ context: { queryClient: q } }) => { await Promise.all([q.ensureQueryData(adminQuery), q.ensureQueryData(characterQuery), q.ensureQueryData(rsaQuery)]); },
  component: AidSpace,
});

type Tab = 'accueil' | 'demandes' | 'paiements' | 'droits' | 'messages' | 'attestations' | 'rdv' | 'simulation';
const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'accueil', label: 'Accueil', icon: Home }, { id: 'demandes', label: 'Mes demandes', icon: ListChecks }, { id: 'paiements', label: 'Mes paiements', icon: Wallet },
  { id: 'droits', label: 'Mes droits', icon: FileCheck2 }, { id: 'messages', label: 'Ma messagerie', icon: Mail },
  { id: 'attestations', label: 'Mes documents', icon: FileText }, { id: 'rdv', label: 'Mes rendez-vous', icon: CalendarDays }, { id: 'simulation', label: 'Faire une simulation', icon: Calculator },
];
const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—';
const STATUS: Record<AidRight['status'], string> = { ouvert: 'Droit ouvert', en_cours: 'Demande en cours', termine: 'Droit terminé', refuse: 'Demande refusée' };

function AidSpace() {
  const { data: s } = useSuspenseQuery(adminQuery);
  const { data: c } = useSuspenseQuery(characterQuery);
  const [tab, setTab] = useState<Tab>('accueil');
  const payments = aidPayments(s); const rights = aidRights(s, s.world_now);
  const allocataire = c ? `${c.first_name} ${c.last_name}` : 'Allocataire';
  const number = c ? c.id.replace(/-/g, '').slice(0, 7).toUpperCase() : '—';
  return <div className="-mx-4 -mt-4 min-h-screen bg-background pb-24 sm:mx-0 sm:mt-0">
    <DeskScene service="caf" flush />
    <header className="border-b-4 border-primary bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-3xl gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary font-heading text-lg font-bold text-primary-foreground">CA</span>
          <div className="min-w-0"><p className="font-heading text-lg font-bold leading-tight">Caisse des aides</p><p className="text-xs opacity-80">Mon Compte allocataire · FICTIF</p></div></div>
        <div className="min-w-0 break-words text-xs sm:text-right"><p className="flex items-start gap-1 font-semibold sm:justify-end"><User className="h-3.5 w-3.5 shrink-0" />{allocataire}</p><p className="opacity-80">N° allocataire {number}</p></div>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2" aria-label="Menu Mon Compte">
        {TABS.map(t => <Button key={t.id} variant="ghost" type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)} className={`min-h-11 shrink-0 gap-1.5 rounded-md px-3 text-sm ${tab === t.id ? 'bg-background font-semibold text-foreground' : 'opacity-85 hover:bg-background/20'}`}><t.icon className="h-4 w-4" />{t.label}</Button>)}
      </nav>
    </header>
    <p className="mx-auto max-w-3xl px-4 pt-3 text-xs text-muted-foreground">Simulation CIVITAS inspirée de l’espace CAF — pas un vrai service public, montants du jeu.</p>
    <main className="mx-auto max-w-3xl space-y-4 px-4 pt-3">
      {tab === 'accueil' && <>
        <h1 className="font-heading text-2xl font-bold">Bonjour {c?.first_name ?? ''}</h1>
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Mon dernier paiement</p>
          {payments[0] ? <><p className="mt-1 font-heading text-3xl font-bold text-primary">{formatMoney(payments[0].amount ?? 0)}</p><p className="text-sm">{payments[0].label} · versé le {fmt(payments[0].occurred_at)}</p></>
            : <p className="mt-1 text-sm">Aucun paiement pour le moment.</p>}
        </section>
        <section className="grid grid-cols-2 gap-2">
          <Tile to="/demarches" icon={FileText} label="Déclarer mes ressources" hint="Mes démarches" />
          <TileBtn onClick={() => setTab('paiements')} icon={Wallet} label="Mes paiements" />
          <TileBtn onClick={() => setTab('attestations')} icon={FileCheck2} label="Mes attestations" />
          <TileBtn onClick={() => setTab('simulation')} icon={Calculator} label="Simuler une aide" />
        </section>
        <section className="rounded-xl border border-border bg-card p-4"><h2 className="mb-2 flex items-center gap-2 font-semibold"><Bell className="h-4 w-4 text-primary" />À faire</h2>
          {s.procedures.filter(p => ['a_faire', 'a_completer'].includes(p.status)).slice(0, 4).map(p => <Link key={p.id} to="/demarches" className="flex min-h-12 items-center justify-between border-t border-border text-sm">{p.title}<ChevronRight className="h-4 w-4 text-primary" /></Link>)}
          {!s.procedures.some(p => ['a_faire', 'a_completer'].includes(p.status)) && <p className="text-sm text-muted-foreground">Rien à faire pour le moment.</p>}
        </section>
        <TileBtn onClick={() => setTab('droits')} icon={FileText} label="RSA · Déclarer mes ressources trimestrielles" />
      </>}
      {tab === 'paiements' && <Card title="Mes paiements">{payments.length ? <ul>{payments.map(p => <li key={p.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0"><span><span className="block font-medium">{p.label}</span><span className="text-xs text-muted-foreground">{fmt(p.occurred_at)}</span></span><strong className="text-primary">+{formatMoney(p.amount ?? 0)}</strong></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun paiement.</p>}</Card>}
      {tab === 'droits' && <RsaPanel />}
      {tab === 'droits' && <Card title="Mes droits">{rights.length ? <ul>{rights.map(r => <li key={r.id} className="border-t border-border py-3 text-sm first:border-t-0"><p className="font-medium">{r.label}</p><p className="text-xs text-primary">{STATUS[r.status]}</p>{r.amount !== null && <p>{formatMoney(r.amount)} par mois{r.until ? ` · jusqu’au ${fmt(r.until)}` : ''}</p>}</li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune aide demandée. Faites une demande depuis <Link to="/demarches" className="text-primary underline">Mes démarches</Link>.</p>}</Card>}
      {tab === 'messages' && <Card title="Ma messagerie">{s.events.length ? <ul>{[...s.events].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)).slice(0, 30).map(e => <li key={e.id} className="flex min-h-14 items-start gap-3 border-t border-border py-2 text-sm first:border-t-0"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><span className="block">{e.label}</span><span className="text-xs text-muted-foreground">{fmt(e.occurred_at)}</span></span></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun message.</p>}</Card>}
      {tab === 'attestations' && <RsaPanel attestation name={allocataire} />}
      {tab === 'attestations' && <Card title="Mes attestations">{s.documents.filter(d => d.status === 'valide').length ? <ul>{s.documents.filter(d => d.status === 'valide').map(d => <li key={d.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0"><span><span className="block font-medium">{s.document_types.find(t => t.id === d.type_id)?.name ?? d.type_id}</span><span className="text-xs text-muted-foreground">Valable jusqu’au {fmt(d.valid_until)}</span></span><Link to="/mes-documents" className="text-primary underline">Voir</Link></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune attestation valide.</p>}</Card>}
      {tab === 'demandes' && <Card title="Suivi de mes demandes">{s.procedures.filter(p => ['Aides', 'Logement'].includes(p.category)).length ? <ul className="space-y-3">{s.procedures.filter(p => ['Aides', 'Logement'].includes(p.category)).map(p => { const steps = aidRequestSteps(p.status); return <li key={p.id} className="rounded-lg border border-border p-3 text-sm"><div className="flex items-start justify-between gap-2"><span className="font-medium">{p.title}</span><span className="shrink-0 text-xs font-semibold text-primary">{PROCEDURE_STATUS[p.status]}</span></div><p className="text-xs text-muted-foreground">Commencée le {fmt(p.started_at)}{p.response_at ? ` · réponse le ${fmt(p.response_at)}` : ''}</p><ol className="mt-2 grid grid-cols-4 gap-1">{steps.map(st => <li key={st.label} className="text-center text-[11px]"><span className={`mx-auto block h-2 rounded-full ${st.done ? 'bg-primary' : 'bg-muted'}`} /><span className="mt-1 block">{st.label}</span></li>)}</ol>{['a_faire', 'a_completer'].includes(p.status) && <Link to="/demarches" className="mt-2 flex min-h-11 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground">Continuer ma demande</Link>}</li>; })}</ul> : <p className="text-sm text-muted-foreground">Aucune demande d'aide. Faites-en une depuis <Link to="/demarches" className="text-primary underline">Mes démarches</Link>.</p>}</Card>}
      {tab === 'rdv' && <Card title="Mes rendez-vous"><p className="text-sm text-muted-foreground">{COMING_SOON}. La prise de rendez-vous avec un conseiller arrivera bientôt.</p></Card>}
      {tab === 'simulation' && <Simulation />}
    </main>
  </div>;
}

function Simulation() {
  const { data: s } = useSuspenseQuery(adminQuery);
  const [rent, setRent] = useState(s.situation.housing_monthly || 500);
  const [income, setIncome] = useState(s.situation.monthly_income || 0);
  const r = housingAid({ age: s.situation.age, housing_type: s.situation.housing_type ?? 'simulation', housing_monthly: rent, monthly_income: income }, s.settings);
  return <Card title="Simuler mon aide au logement">
    <label className="block text-sm">Loyer mensuel (€)<input type="number" inputMode="numeric" min={0} value={rent} onChange={e => setRent(Math.max(0, Number(e.target.value) || 0))} className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3" /></label>
    <label className="mt-3 block text-sm">Revenus mensuels (€)<input type="number" inputMode="numeric" min={0} value={income} onChange={e => setIncome(Math.max(0, Number(e.target.value) || 0))} className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3" /></label>
    <div className="mt-4 rounded-lg bg-muted p-3 text-sm">{r.eligible ? <>Estimation : <strong className="text-primary">{formatMoney(r.amount ?? 0)} par mois</strong></> : r.reason}</div>
    <p className="mt-2 text-xs text-muted-foreground">Estimation indicative. Le montant réel est calculé lors de votre demande.</p>
  </Card>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-card p-4"><h1 className="mb-3 font-heading text-xl font-bold">{title}</h1>{children}</section>; }
function Tile({ to, icon: Icon, label, hint }: { to: '/demarches'; icon: typeof Home; label: string; hint: string }) { return <Link to={to} className="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-card p-3 hover:border-primary"><Icon className="h-6 w-6 text-primary" /><span className="text-sm font-semibold">{label}<span className="block text-xs font-normal text-muted-foreground">{hint}</span></span></Link>; }
function TileBtn({ onClick, icon: Icon, label }: { onClick: () => void; icon: typeof Home; label: string }) { return <button type="button" onClick={onClick} className="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-card p-3 text-left hover:border-primary"><Icon className="h-6 w-6 text-primary" /><span className="text-sm font-semibold">{label}</span></button>; }


function RsaPanel({ attestation = false, name = '' }: { attestation?: boolean; name?: string }) {
  const { data: rsa } = useSuspenseQuery(rsaQuery);
  const q = useQueryClient();
  const [salary, setSalary] = useState('0');
  const [unemployment, setUnemployment] = useState('0');
  const [pension, setPension] = useState('0');
  const [freeHousing, setFreeHousing] = useState(false);
  const mutation = useMutation({ mutationFn: (action: 'apply' | 'declare') => action === 'apply' ? rsaApply() : rsaDeclare({ quarter: rsa.calculation.quarter, salary: Number(salary), unemployment: Number(unemployment), pension: Number(pension), freeHousing }),
    onSuccess: async () => { await Promise.all([q.invalidateQueries({ queryKey: ['rsa'] }), q.invalidateQueries({ queryKey: ['character'] }), q.invalidateQueries({ queryKey: ['economy'] })]); } });
  const c = rsa.calculation;
  if (attestation) return <Card title="Attestation RSA · CIVITAS">
    <p className="text-sm">Document fictif · {name} · Édité le {fmt(rsa.world_now)}</p>
    <p className="mt-2 text-sm">{!rsa.requested ? 'Aucun droit demandé.' : !c.eligible ? c.reason : !c.declared ? 'Versement suspendu : déclaration trimestrielle attendue, sans pénalité.' : `Montant mensuel calculé : ${formatMoney(c.amount)}.`}</p>
    <ul className="my-3 space-y-2 text-sm">{rsa.payments.map(p => <li key={p.month}>Mois du {fmt(p.month)} : {formatMoney(p.amount)} · enregistré le {fmt(p.paid_at)}</li>)}</ul>
    <Button className="min-h-11 print:hidden" onClick={() => window.print()}>Imprimer l’attestation</Button>
  </Card>;
  return <Card title="Revenu de solidarité active (RSA)">
    <p className="text-sm text-muted-foreground">Montants fictifs proches du réel. Inscription à Espace Emploi obligatoire ; étudiants exclus. Les ressources déclarées sont les totaux du trimestre précédent, divisés par trois.</p>
    <p className="my-3 font-semibold" role="status">{!c.eligible ? c.reason : !rsa.requested ? 'Vous pouvez demander le RSA.' : !c.declared ? 'Suspendu : déclaration attendue, sans pénalité.' : c.amount > 0 ? 'Droit ouvert' : 'Montant nul après déductions.'}</p>
    {!rsa.requested && <Button className="min-h-11" disabled={!c.eligible || mutation.isPending} onClick={() => mutation.mutate('apply')}>Demander le RSA</Button>}
    <dl className="my-4 grid grid-cols-2 gap-2 text-sm">
      <dt>Base revalorisée</dt><dd>{formatMoney(c.base)}</dd>
      <dt>Composition</dt><dd>{c.couple ? 'En couple' : 'Personne seule'} · {c.children} enfant(s)</dd>
      <dt>Forfait majoré</dt><dd>{formatMoney(c.gross)}</dd>
      <dt>Ressources mensuelles moyennes</dt><dd>− {formatMoney(c.resources)}</dd>
      <dt>Forfait logement</dt><dd>− {formatMoney(c.housing)}</dd>
      <dt>RSA mensuel calculé</dt><dd className="font-bold text-primary">{formatMoney(c.amount)}</dd>
    </dl>
    {rsa.requested && !c.declared && <form className="space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate('declare'); }}>
      <h3 className="font-semibold">Déclaration trimestrielle de ressources</h3>
      <p className="text-sm">Ressources perçues du {fmt(c.resource_start)} au {fmt(c.resource_end)}. La déclaration est définitive et valable pour le trimestre débutant le {fmt(c.quarter)}. Le versement reprend après déclaration, sans rappel des mois suspendus.</p>
      {([{ id: 'rsa-salary', label: 'Total des salaires (€)', value: salary, set: setSalary }, { id: 'rsa-unemployment', label: 'Total des allocations chômage (€)', value: unemployment, set: setUnemployment }, { id: 'rsa-pension', label: 'Total des pensions (€)', value: pension, set: setPension }]).map(f => <label key={f.id} htmlFor={f.id} className="block text-sm">{f.label}<input id={f.id} required type="number" inputMode="decimal" min="0" max="100000000" step="0.01" value={f.value} onChange={e => f.set(e.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3" /></label>)}
      <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={freeHousing} onChange={e => setFreeHousing(e.target.checked)} className="h-5 w-5" />Je suis hébergé gratuitement (l’aide au logement est détectée automatiquement).</label>
      <Button type="submit" className="min-h-11" disabled={mutation.isPending}>Certifier et envoyer ma déclaration</Button>
    </form>}
    {c.declared && <p className="text-sm">Déclaration enregistrée pour ce trimestre. Le paiement du mois est réglé une seule fois à la lecture de cet espace.</p>}
    {mutation.error && <p role="alert" className="mt-3 text-sm text-destructive">{mutation.error.message}</p>}
  </Card>;
}
