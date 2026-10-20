import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, FileText, HeartPulse, Home, Shield, Stethoscope, User, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { characterQuery, formatMoney, healthAction, healthQuery, insuranceQuery, medicalQuery, realismAction, type MedicalState } from '@/services/game';
import { gameMeta } from '@/game/metadata';

export const Route = createFileRoute('/_authenticated/_game/espace-sante')({
  head: () => ({ meta: gameMeta('Santé CIVITAS — Mon compte assuré', 'Espace assuré CIVITAS : état de santé, arrêts maladie, rendez-vous médecin, mutuelle, remboursements et attestation de droits.') }),
  component: HealthSpace,
});

type Tab = 'accueil' | 'medecin' | 'rdv' | 'remboursements' | 'mutuelle' | 'attestations';
const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'accueil', label: 'Accueil', icon: Home }, { id: 'medecin', label: 'Mon médecin traitant', icon: Stethoscope }, { id: 'rdv', label: 'Consulter un médecin', icon: CalendarCheck },
  { id: 'remboursements', label: 'Mes remboursements', icon: Wallet }, { id: 'mutuelle', label: 'Ma complémentaire', icon: Shield },
  { id: 'attestations', label: 'Mes attestations', icon: FileText },
];
const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—';
const HEALTH_WORDS = /sant|médic|medic|hospital|soin|maladie/i;

function Box({ children }: { children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-card p-4">{children}</section>; }

function HealthSpace() {
  const qc = useQueryClient();
  const { data: c } = useQuery(characterQuery);
  const { data: h, isError } = useQuery(healthQuery);
  const { data: ins } = useQuery({ ...insuranceQuery, retry: false });
  const { data: med } = useQuery(medicalQuery);
  const [tab, setTab] = useState<Tab>('accueil');
  const choose = useMutation({
    mutationFn: (id: string) => realismAction<MedicalState>('medical_choose_doctor', { _doctor: id }),
    onSuccess: r => { qc.setQueryData(medicalQuery.queryKey, r); toast.success('Médecin traitant déclaré.'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const doctor = useMutation({
    mutationFn: () => healthAction('medecin'),
    onSuccess: () => { toast.success('Consultation effectuée.'); qc.invalidateQueries({ queryKey: ['health'] }); qc.invalidateQueries({ queryKey: ['medical'] }); qc.invalidateQueries({ queryKey: ['character'] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const name = c ? `${c.first_name} ${c.last_name}` : 'Assuré';
  const number = c ? `${c.age < 18 ? 2 : 1} ${c.id.replace(/\D/g, '').padEnd(12, '0').slice(0, 12).replace(/(\d{2})(\d{2})(\d{2})(\d{3})(\d{3})/, '$1 $2 $3 $4 $5')}` : '—';
  const healthContracts = (ins?.contracts ?? []).filter(k => k.covers.some(x => HEALTH_WORDS.test(x)) || HEALTH_WORDS.test(k.name));
  const healthIncidents = (ins?.incidents ?? []).filter(i => HEALTH_WORDS.test(i.type_label) || HEALTH_WORDS.test(i.label));
  const ill = h?.illness && h.ill_until && new Date(h.ill_until) > new Date(h.now);

  return <div className="-mx-4 -mt-4 min-h-screen bg-background pb-24 sm:mx-0 sm:mt-0">
    <header className="border-b-4 border-primary bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-md bg-primary font-heading text-lg font-bold text-primary-foreground">SC</span>
          <div><p className="font-heading text-lg font-bold leading-tight">Santé CIVITAS</p><p className="text-xs opacity-80">Mon compte assuré · FICTIF</p></div></div>
        <div className="text-right text-xs"><p className="flex items-center justify-end gap-1 font-semibold"><User className="h-3.5 w-3.5" />{name}</p><p className="opacity-80">N° {number}</p></div>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2" aria-label="Menu Mon compte assuré">
        {TABS.map(t => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm ${tab === t.id ? 'bg-background font-semibold text-foreground' : 'opacity-85 hover:bg-background/20'}`}><t.icon className="h-4 w-4" />{t.label}</button>)}
      </nav>
    </header>
    <p className="mx-auto max-w-3xl px-4 pt-3 text-xs text-muted-foreground">Simulation CIVITAS inspirée de l’espace ameli — pas un vrai service public, montants du jeu.</p>
    <main className="mx-auto max-w-3xl space-y-4 px-4 pt-3">
      {isError && <Box><p className="text-sm">Ma santé : Disponible dans une prochaine étape.</p></Box>}

      {tab === 'accueil' && h && <>
        <h1 className="font-heading text-2xl font-bold">Bonjour {c?.first_name ?? ''}</h1>
        <Box>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Mon état de santé</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div><p className="font-heading text-3xl font-bold text-primary">{h.health}<span className="text-base text-muted-foreground"> / 100</span></p><p className="text-sm">Santé</p></div>
            <div><p className="font-heading text-3xl font-bold text-primary">{h.morale}<span className="text-base text-muted-foreground"> / 100</span></p><p className="text-sm">Moral</p></div>
          </div>
        </Box>
        <Box>
          <p className="font-semibold"><HeartPulse className="mr-1 inline h-4 w-4 text-primary" />Arrêt de travail</p>
          {ill ? <p className="mt-1 text-sm">{h.illness} — jusqu’au {fmt(h.ill_until)}. Repose-toi ou consulte un médecin.</p> : <p className="mt-1 text-sm text-muted-foreground">Aucun arrêt en cours.</p>}
        </Box>
        <Box>
          <p className="mb-2 font-semibold">Mes démarches</p>
          <div className="grid gap-2">
            <Button variant="outline" className="min-h-12 justify-start" onClick={() => setTab('rdv')}>Consulter un médecin</Button>
            <Button variant="outline" className="min-h-12 justify-start" onClick={() => setTab('attestations')}>Télécharger mon attestation de droits</Button>
            <Button variant="outline" className="min-h-12 justify-start" asChild><Link to="/sante">Prendre soin de moi (sport, détente)</Link></Button>
          </div>
          <Button variant="outline" className="mt-2 min-h-12 w-full justify-start" onClick={() => setTab('medecin')}>{med?.doctor ? `Mon médecin traitant : ${med.doctor.name}` : 'Déclarer mon médecin traitant'}</Button>
        </Box>
      </>}

      {tab === 'medecin' && <Box>
        <h1 className="font-heading text-xl font-bold">Mon médecin traitant</h1>
        {!med ? <p className="mt-2 text-sm">Disponible dans une prochaine étape.</p> : <>
          <p className="mt-1 text-sm">Avec un médecin traitant, tes consultations sont remboursées à {Math.round(med.settings.refund_with_doctor * 100)} %. Sans, à {Math.round(med.settings.refund_without_doctor * 100)} %. Changement possible tous les {med.settings.change_days} jours.</p>
          {med.doctor && <p className="mt-3 rounded-lg bg-muted p-3 text-sm"><b>{med.doctor.name}</b> · {med.doctor.address} · déclaré le {fmt(med.doctor.chosen_at)}</p>}
          <div className="mt-3 grid gap-2">{med.doctors.filter(d => d.id !== med.doctor?.id).map(d => <Button key={d.id} variant="outline" className="h-auto min-h-12 justify-start whitespace-normal text-left" disabled={choose.isPending}
            onClick={() => choose.mutate(d.id)}><span><b>{d.name}</b><br /><span className="text-xs text-muted-foreground">{d.address}</span></span></Button>)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Médecins fictifs.</p>
        </>}
      </Box>}

      {tab === 'rdv' && h && <Box>
        <h1 className="font-heading text-xl font-bold">Consulter un médecin</h1>
        <p className="mt-1 text-sm">Consultation de médecine générale : {formatMoney(h.settings.doctor_cost)}. Elle soigne une maladie en cours et rend {h.settings.doctor_health} points de santé.</p>
        <p className="mt-1 text-sm text-muted-foreground">Possible si tu es malade ou si ta santé est sous 70. Une consultation par jour.</p>
        <Button className="mt-3 min-h-12 w-full" disabled={doctor.isPending || h.done_today.includes('medecin')} onClick={() => doctor.mutate()}>
          {h.done_today.includes('medecin') ? 'Déjà consulté aujourd’hui' : 'Consulter maintenant'}</Button>
      </Box>}

      {tab === 'remboursements' && <Box>
        <h1 className="font-heading text-xl font-bold">Mes remboursements</h1>
        {healthIncidents.length ? <ul className="mt-2 divide-y divide-border text-sm">{healthIncidents.map(i => <li key={i.id} className="py-2">
          <p className="font-semibold">{i.label} · {fmt(i.occurred_at)}</p>
          <p className="text-muted-foreground">Coût {formatMoney(i.cost)} · pris en charge {formatMoney(i.insurer_paid)} · reste à ma charge {formatMoney(i.player_paid + i.unpaid)}</p></li>)}</ul>
          : <p className="mt-2 text-sm text-muted-foreground">Aucun remboursement pour le moment.</p>}
        {med && <div className="mt-4 border-t border-border pt-3">
          <p className="font-semibold">Consultations remboursées par Santé CIVITAS</p>
          {med.pending.length > 0 && <p className="mt-1 text-sm">En cours de traitement : {med.pending.length} consultation(s), remboursement sous {med.settings.refund_delay_days} jours.</p>}
          {med.refunds.length ? <ul className="mt-2 divide-y divide-border text-sm">{med.refunds.map(r => <li key={r.consult_day} className="py-2">
            <p className="font-semibold">Consultation du {fmt(r.consult_day)}</p>
            <p className="text-muted-foreground">Payé {formatMoney(r.cost)} · remboursé {formatMoney(r.amount)} ({Math.round(r.rate * 100)} %{r.with_doctor ? ', médecin traitant' : ', sans médecin traitant'})</p></li>)}</ul>
            : <p className="mt-1 text-sm text-muted-foreground">Aucune consultation remboursée pour le moment.</p>}
        </div>}
      </Box>}

      {tab === 'mutuelle' && <Box>
        <h1 className="font-heading text-xl font-bold">Ma complémentaire santé</h1>
        {healthContracts.length ? <ul className="mt-2 space-y-2 text-sm">{healthContracts.map(k => <li key={k.id} className="rounded-lg bg-muted p-3">
          <p className="font-semibold">{k.name}{k.insurer ? ` · ${k.insurer}` : ''}</p>
          <p>{formatMoney(k.monthly_price)} par mois · {k.status === 'active' ? 'Active' : 'Suspendue'} · couvert depuis le {fmt(k.covered_from)}</p></li>)}</ul>
          : <p className="mt-2 text-sm text-muted-foreground">Aucune complémentaire santé déclarée.</p>}
        <Button variant="outline" className="mt-3 min-h-12 w-full" asChild><Link to="/assurances">Voir les assurances</Link></Button>
      </Box>}

      {tab === 'attestations' && <Box>
        <h1 className="font-heading text-xl font-bold">Attestation de droits</h1>
        <div className="mt-3 rounded-lg border-2 border-dashed border-border p-4 text-sm">
          <p className="font-heading font-bold">Santé CIVITAS — Attestation de droits · FICTIF</p>
          <p className="mt-2">Assuré : {name}</p><p>N° : {number}</p>
          <p>Droits ouverts à l’assurance maladie à la date du {fmt(h?.now)}</p>
          <p>Médecin traitant : {med?.doctor?.name ?? 'non déclaré'}</p>
          <p>Complémentaire santé : {healthContracts.length ? healthContracts.map(k => k.name).join(', ') : 'aucune'}</p>
        </div>
        <Button className="mt-3 min-h-12 w-full" onClick={() => window.print()}>Imprimer</Button>
      </Box>}
    </main>
  </div>;
}
