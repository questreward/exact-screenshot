import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Bell, Calculator, ChevronRight, FileCheck2, FileText, Home, Mail, User, Wallet } from 'lucide-react';
import { adminQuery, characterQuery, formatMoney } from '@/services/game';
import { gameMeta } from '@/game/metadata';
import { aidPayments, aidRights, type AidRight } from '@/game/aid-portal';
import { housingAid } from '@/game/admin';

export const Route = createFileRoute('/_authenticated/_game/caisse-des-aides')({
  head: () => ({ meta: gameMeta('Caisse des aides — Mon compte', 'Espace allocataire CIVITAS : paiements, droits, messages, attestations et simulation d’aide au logement.') }),
  loader: async ({ context: { queryClient: q } }) => { await Promise.all([q.ensureQueryData(adminQuery), q.ensureQueryData(characterQuery)]); },
  component: AidSpace,
});

type Tab = 'accueil' | 'paiements' | 'droits' | 'messages' | 'attestations' | 'simulation';
const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'accueil', label: 'Accueil', icon: Home }, { id: 'paiements', label: 'Mes paiements', icon: Wallet },
  { id: 'droits', label: 'Mes droits', icon: FileCheck2 }, { id: 'messages', label: 'Ma messagerie', icon: Mail },
  { id: 'attestations', label: 'Mes attestations', icon: FileText }, { id: 'simulation', label: 'Faire une simulation', icon: Calculator },
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
    <header className="border-b-4 border-primary bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-md bg-primary font-heading text-lg font-bold text-primary-foreground">CA</span>
          <div><p className="font-heading text-lg font-bold leading-tight">Caisse des aides</p><p className="text-xs opacity-80">Mon Compte allocataire · FICTIF</p></div></div>
        <div className="text-right text-xs"><p className="flex items-center justify-end gap-1 font-semibold"><User className="h-3.5 w-3.5" />{allocataire}</p><p className="opacity-80">N° allocataire {number}</p></div>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2" aria-label="Menu Mon Compte">
        {TABS.map(t => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm ${tab === t.id ? 'bg-background font-semibold text-foreground' : 'opacity-85 hover:bg-background/20'}`}><t.icon className="h-4 w-4" />{t.label}</button>)}
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
        <section className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Déclaration trimestrielle de ressources : Disponible dans une prochaine étape</section>
      </>}
      {tab === 'paiements' && <Card title="Mes paiements">{payments.length ? <ul>{payments.map(p => <li key={p.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0"><span><span className="block font-medium">{p.label}</span><span className="text-xs text-muted-foreground">{fmt(p.occurred_at)}</span></span><strong className="text-primary">+{formatMoney(p.amount ?? 0)}</strong></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun paiement.</p>}</Card>}
      {tab === 'droits' && <Card title="Mes droits">{rights.length ? <ul>{rights.map(r => <li key={r.id} className="border-t border-border py-3 text-sm first:border-t-0"><p className="font-medium">{r.label}</p><p className="text-xs text-primary">{STATUS[r.status]}</p>{r.amount !== null && <p>{formatMoney(r.amount)} par mois{r.until ? ` · jusqu’au ${fmt(r.until)}` : ''}</p>}</li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune aide demandée. Faites une demande depuis <Link to="/demarches" className="text-primary underline">Mes démarches</Link>.</p>}</Card>}
      {tab === 'messages' && <Card title="Ma messagerie">{s.events.length ? <ul>{[...s.events].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)).slice(0, 30).map(e => <li key={e.id} className="flex min-h-14 items-start gap-3 border-t border-border py-2 text-sm first:border-t-0"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><span className="block">{e.label}</span><span className="text-xs text-muted-foreground">{fmt(e.occurred_at)}</span></span></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun message.</p>}</Card>}
      {tab === 'attestations' && <Card title="Mes attestations">{s.documents.filter(d => d.status === 'valide').length ? <ul>{s.documents.filter(d => d.status === 'valide').map(d => <li key={d.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0"><span><span className="block font-medium">{s.document_types.find(t => t.id === d.type_id)?.name ?? d.type_id}</span><span className="text-xs text-muted-foreground">Valable jusqu’au {fmt(d.valid_until)}</span></span><Link to="/mes-documents" className="text-primary underline">Voir</Link></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune attestation valide.</p>}</Card>}
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
