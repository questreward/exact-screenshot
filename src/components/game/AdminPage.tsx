import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { FileText, Info, CheckSquare, Square, Send, Wallet, RotateCcw, Pencil, Plus, AlertTriangle, CalendarClock, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { adminQuery, adminAction, formatMoney } from '@/services/game';
import { PROCEDURE_STATUS, SITUATION_CHANGES, SIMULATION_NOTICE, isOpen, upcomingDeadlines, computeTax } from '@/game/admin';
import type { Procedure, AdminState } from '@/game/admin';
import { useLifeMutation } from './LifeControls';
import { WorldClock } from './WorldClock';

const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—';

function statusTone(p: Procedure): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (p.late || p.status === 'refusee') return 'destructive';
  if (p.status === 'acceptee' || p.status === 'terminee') return 'secondary';
  return p.status === 'a_completer' ? 'destructive' : 'outline';
}

export function SimulationBanner() {
  return <p role="note" className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{SIMULATION_NOTICE}</p>;
}

function Help({ title, lines }: { title: string; lines: [string, string][] }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="ghost" size="sm" className="min-h-11" onClick={() => setOpen(true)}><HelpCircle />{title}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Règle simplifiée du jeu</DialogDescription></DialogHeader>
      <dl className="space-y-3">{lines.map(([q, a]) => <div key={q}><dt className="text-sm font-semibold">{q}</dt><dd className="text-sm text-muted-foreground">{a}</dd></div>)}</dl></DialogContent></Dialog></>;
}

function progressOf(p: Procedure, required: string[]) {
  if (!isOpen(p)) return 100;
  const steps = required.length + 1;
  const done = p.attachments.filter(a => a.valid && required.includes(a.type_id)).length + (p.situation ? 1 : 0);
  return Math.round(done / steps * 100);
}

function ProcedureDialog({ p, state, onClose }: { p: Procedure; state: AdminState; onClose: () => void }) {
  const action = useLifeMutation(adminAction, 'Démarche mise à jour');
  const type = state.procedure_types.find(t => t.id === p.type_id)!;
  const [credit, setCredit] = useState(!!p.choices.training_credit);
  const run = (command: string, input: Record<string, unknown> = {}) => action.mutate({ command, requestId: crypto.randomUUID(), input: { procedure_id: p.id, ...input } });
  const docName = (id: string) => state.document_types.find(d => d.id === id)?.name ?? id;
  const s = state.situation;
  const preview = computeTax(s.year_income, s.year_training, credit, state.settings);
  const active = p.declarations.find(d => d.status === 'active');
  const canCorrect = p.type_id === 'tax_declaration' && ['acceptee', 'terminee'].includes(p.status) && !!p.closes_at && state.world_now < p.closes_at;
  const ends = typeof p.result['ends_at'] === 'string' ? p.result['ends_at'] as string : null;
  const canRenew = p.type_id === 'housing_aid' && ['acceptee', 'terminee'].includes(p.status) && !p.renewed && !!ends && new Date(ends).getTime() - state.settings.renewal_notice_days * 86400000 <= new Date(state.world_now).getTime();
  const missing = type.required_documents.filter(id => !p.attachments.some(a => a.type_id === id && a.valid));
  return <Dialog open onOpenChange={o => { if (!o) onClose(); }}><DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
    <DialogHeader><DialogTitle>{p.title}</DialogTitle><DialogDescription>{p.category} · {PROCEDURE_STATUS[p.status]}{p.late ? ' · En retard' : ''}</DialogDescription></DialogHeader>
    <div className="space-y-5">
      <SimulationBanner />
      <div className="flex flex-wrap gap-1">
        <Help title="Comprendre" lines={[['À quoi ça sert ?', type.why], ['Qu’est-ce qu’on vous demande ?', type.asked], ['Que se passe-t-il ensuite ?', type.next_step], ['Quelle est la date limite ?', p.due_at ? fmtDate(p.due_at) : 'Pas de date limite pour cette démarche.']]} />
      </div>
      {p.due_at && <p className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4 text-primary" />{isOpen(p) ? 'Date limite' : 'Paiement avant le'} : <strong>{fmtDate(p.due_at)}</strong></p>}
      {typeof p.result['reason'] === 'string' && <p className="rounded-lg border border-border p-3 text-sm">{p.result['reason'] as string}</p>}

      {p.type_id === 'tax_declaration' && <section className="space-y-2 border-y border-border py-4">
        <h3 className="font-semibold">Revenus connus par le système</h3>
        <p className="text-sm text-muted-foreground">Salaires réellement reçus cette année dans CIVITAS. Ils ne peuvent pas être modifiés.</p>
        <dl className="grid grid-cols-2 gap-2 text-sm"><dt>Revenu annuel simulé</dt><dd className="text-right font-semibold">{formatMoney(active?.income ?? s.year_income)}</dd><dt>Formations payées</dt><dd className="text-right">{formatMoney(active?.training_spent ?? s.year_training)}</dd></dl>
        <Help title="Pourquoi cette information ?" lines={[['D’où viennent ces chiffres ?', 'De votre Banque CIVITAS : seuls les salaires versés par votre emploi du jeu sont comptés.'], ['Comment est calculé le montant ?', `Règle du jeu : 0 € jusqu’à ${formatMoney(state.settings.tax_free_threshold)}, puis ${state.settings.tax_rate} % au-delà. Crédit formation : ${state.settings.training_credit_rate} % des formations payées, si vous le demandez.`]]} />
      </section>}

      {type.required_documents.length > 0 && <section className="space-y-2"><h3 className="font-semibold">Documents demandés</h3>
        <ul className="space-y-2">{type.required_documents.map(id => {
          const att = p.attachments.find(a => a.type_id === id && a.valid);
          const has = state.documents.some(d => d.type_id === id && d.status === 'valide');
          return <li key={id} className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm">{att ? <CheckSquare className="h-5 w-5 text-success" /> : <Square className="h-5 w-5 text-muted-foreground" />}{docName(id)}</span>
            {isOpen(p) && !att && <Button size="sm" variant="outline" className="min-h-11" disabled={action.isPending || !has} onClick={() => run('attach', { type_id: id })}>{has ? 'Joindre' : 'À obtenir dans Documents'}</Button>}</li>;
        })}</ul></section>}

      {isOpen(p) && <section className="space-y-3"><h3 className="font-semibold">Ma situation</h3>
        {p.situation ? <p className="text-sm text-success">Situation confirmée.</p> : <p className="text-sm text-muted-foreground">{s.age} ans · {s.job_title ?? (s.studying ? 'Étudiant' : 'Sans emploi')} · {s.housing_name ?? 'Sans logement'} · revenus du mois {formatMoney(s.monthly_income)}</p>}
        {p.type_id === 'tax_declaration' && <label className="flex items-center justify-between gap-3 text-sm"><span>Déduire mes frais de formation</span><Switch checked={credit} onCheckedChange={setCredit} /></label>}
        <Button variant="outline" className="min-h-11" disabled={action.isPending} onClick={() => run('confirm', { training_credit: credit })}>Confirmer ma situation</Button>
        {p.type_id === 'tax_declaration' && <p className="text-sm">Votre revenu annuel simulé est de <strong>{formatMoney(s.year_income)}</strong>. Montant estimé : <strong>{formatMoney(preview.net)}</strong>.</p>}
        <Button className="min-h-11 w-full" disabled={action.isPending || missing.length > 0 || !p.situation} onClick={() => run('submit')}><Send />{p.type_id === 'tax_declaration' ? 'Valider ma déclaration' : 'Envoyer le dossier'}</Button>
        {missing.length > 0 && <p className="text-xs text-muted-foreground">Complétez tous les documents avant l’envoi.</p>}
      </section>}

      {p.status === 'envoyee' && <p className="text-sm">Dossier envoyé. Réponse attendue le {fmtDate(p.response_at)}.</p>}
      {p.status === 'acceptee' && typeof p.result['amount'] === 'number' && <p className="text-sm">Montant accordé : <strong>{formatMoney(p.result['amount'] as number)}</strong>{p.type_id === 'housing_aid' ? ` par mois, jusqu’au ${fmtDate(ends)}` : ''}. Versé dans votre Banque.</p>}

      {p.declarations.length > 0 && <section className="space-y-2"><h3 className="font-semibold">Historique de la déclaration</h3>
        <ul className="divide-y divide-border text-sm">{p.declarations.map(d => <li key={d.id} className="py-2">Version {d.version} · {fmtDate(d.submitted_at)} · revenu {formatMoney(d.income)} · montant {formatMoney(d.net)} {d.status === 'remplacee' && <Badge variant="outline">Remplacée</Badge>}</li>)}</ul>
        {(p.balance ?? 0) > 0 && <Button className="min-h-11 w-full" disabled={action.isPending} onClick={() => run('pay')}><Wallet />Payer {formatMoney(p.balance ?? 0)} depuis ma Banque</Button>}
        {canCorrect ? <div className="space-y-2 border-t border-border pt-3"><label className="flex items-center justify-between gap-3 text-sm"><span>Déduire mes frais de formation</span><Switch checked={credit} onCheckedChange={setCredit} /></label>
          <Button variant="outline" className="min-h-11" disabled={action.isPending} onClick={() => run('correct', { training_credit: credit })}><Pencil />Corriger ma déclaration</Button><p className="text-xs text-muted-foreground">Possible jusqu’au {fmtDate(p.closes_at)}.</p></div>
          : p.type_id === 'tax_declaration' && !isOpen(p) && <p className="text-xs text-muted-foreground">Modification impossible pour cette période.</p>}
      </section>}
      {canRenew && <Button className="min-h-11 w-full" disabled={action.isPending} onClick={() => run('renew')}><RotateCcw />Renouveler ma demande</Button>}
    </div>
  </DialogContent></Dialog>;
}

export function AdminPage() {
  const { data: state } = useSuspenseQuery(adminQuery);
  const action = useLifeMutation(adminAction, 'Démarche mise à jour');
  const [selected, setSelected] = useState<string | null>(null);
  const [change, setChange] = useState(false);
  const current = state.procedures.find(p => p.id === selected);
  const todo = state.procedures.filter(p => isOpen(p) || p.late && p.status === 'acceptee');
  const ongoing = state.procedures.filter(p => p.status === 'envoyee' || (p.status === 'acceptee' && !p.late));
  const done = state.procedures.filter(p => p.status === 'terminee' || p.status === 'refusee');
  const deadlines = upcomingDeadlines(state);
  const run = (command: string, input: Record<string, unknown>) => action.mutate({ command, requestId: crypto.randomUUID(), input });
  const card = (p: Procedure) => {
    const req = state.procedure_types.find(t => t.id === p.type_id)?.required_documents ?? [];
    return <Button variant="ghost" key={p.id} onClick={() => setSelected(p.id)} className="flex h-auto min-h-11 items-stretch justify-start w-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary">
      <span className="flex w-full flex-wrap items-start justify-between gap-2"><span className="font-semibold">{p.title}</span><Badge variant={statusTone(p)}>{p.late ? 'En retard' : PROCEDURE_STATUS[p.status]}</Badge></span>
      <span className="text-sm text-muted-foreground">{p.category}{p.due_at ? ` · ${isOpen(p) ? 'avant le' : 'paiement avant le'} ${fmtDate(p.due_at)}` : ''}</span>
      {isOpen(p) && <Progress value={progressOf(p, req)} aria-label={`Progression ${p.title}`} />}
    </Button>;
  };
  const startable = state.procedure_types.filter(t => ['housing_aid', 'student_aid'].includes(t.id));
  return <div className="space-y-6 animate-rise">
    <header><p className="text-xs uppercase text-primary">CIVITAS · Vie pratique</p><h1 className="mt-1 text-3xl font-bold">Mes démarches</h1></header>
    <SimulationBanner />
    <WorldClock />
    <Tabs defaultValue="demarches"><TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">{([['demarches', 'Démarches'], ['documents', 'Documents'], ['historique', 'Historique']] as const).map(([id, label]) => <TabsTrigger key={id} value={id} className="min-h-11 border border-border px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{label}</TabsTrigger>)}</TabsList>
      <TabsContent value="demarches" className="mt-6 space-y-6">
        {deadlines.length > 0 && <section><h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><CalendarClock className="h-5 w-5 text-primary" />Prochaines échéances</h2><ul className="divide-y divide-border border-y border-border">{deadlines.map(d => <li key={d.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{d.label} · {d.title}</span><span className="font-semibold">{fmtDate(d.date)}</span></li>)}</ul></section>}
        <section className="space-y-3"><h2 className="text-xl font-semibold">À faire</h2>{todo.length === 0 ? <p className="text-muted-foreground">Aucune démarche à faire.</p> : <div className="grid gap-3 sm:grid-cols-2">{todo.map(card)}</div>}</section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">En cours</h2>{ongoing.length === 0 ? <p className="text-muted-foreground">Aucune démarche en cours.</p> : <div className="grid gap-3 sm:grid-cols-2">{ongoing.map(card)}</div>}</section>
        <section className="space-y-3 border-t border-border pt-5"><h2 className="text-xl font-semibold">Commencer une démarche</h2>
          <div className="grid gap-3 sm:grid-cols-2">{startable.map(t => <article key={t.id} className="space-y-2 rounded-lg border border-border bg-card p-4"><h3 className="font-semibold">{t.title}</h3><p className="text-sm text-muted-foreground">{t.description}</p><p className="text-xs text-muted-foreground">{t.category} · à partir de {t.min_age} ans</p><Button className="min-h-11" disabled={action.isPending || state.situation.age < t.min_age} onClick={() => run('start', { type_id: t.id })}><Plus />Commencer</Button></article>)}
            <article className="space-y-2 rounded-lg border border-border bg-card p-4"><h3 className="font-semibold">Signaler un changement de situation</h3><p className="text-sm text-muted-foreground">Emploi, logement, études ou ville : vos démarches se mettent à jour.</p><Button variant="outline" className="min-h-11" onClick={() => setChange(true)}><AlertTriangle />Signaler</Button></article>
          </div></section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Terminées</h2>{done.length === 0 ? <p className="text-muted-foreground">Aucune démarche terminée.</p> : <div className="grid gap-3 sm:grid-cols-2">{done.map(card)}</div>}</section>
      </TabsContent>
      <TabsContent value="documents" className="mt-6 space-y-4">
        <p className="text-sm text-muted-foreground">Documents virtuels créés à partir des données de votre personnage. Aucun vrai document n’est demandé.</p>
        <div className="grid gap-3 sm:grid-cols-2">{state.document_types.map(dt => {
          const doc = state.documents.find(d => d.type_id === dt.id && d.status === 'valide') ?? state.documents.find(d => d.type_id === dt.id);
          return <article key={dt.id} className="space-y-2 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2"><h3 className="flex items-center gap-2 font-semibold"><FileText className="h-5 w-5 text-primary" />{dt.name}</h3>{doc && <Badge variant={doc.status === 'valide' ? 'secondary' : 'destructive'}>{doc.status === 'valide' ? 'Valide' : doc.status === 'perime' ? 'Périmé' : 'Remplacé'}</Badge>}</div>
            <p className="text-xs text-muted-foreground">{dt.category} · {dt.origin}{doc ? ` · émis le ${fmtDate(doc.issued_at)} · valable jusqu’au ${fmtDate(doc.valid_until)}` : ''}</p>
            <div className="flex flex-wrap gap-1"><Button size="sm" className="min-h-11" variant={doc?.status === 'valide' ? 'outline' : 'default'} disabled={action.isPending} onClick={() => run('document', { type_id: dt.id })}>{doc ? 'Mettre à jour' : 'Obtenir'}</Button>
              <Help title="À quoi sert ce document ?" lines={[['Utilité', dt.explanation], ['Validité', `${dt.validity_days} jours du monde.`]]} /></div>
          </article>;
        })}</div>
      </TabsContent>
      <TabsContent value="historique" className="mt-6">
        {state.events.length === 0 ? <p className="text-muted-foreground">Aucun événement.</p> : <ul className="divide-y divide-border border-y border-border">{state.events.map(e => <li key={e.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{e.label}</span><span className="text-muted-foreground">{fmtDate(e.occurred_at)}</span></li>)}</ul>}
      </TabsContent>
    </Tabs>
    {current && <ProcedureDialog p={current} state={state} onClose={() => setSelected(null)} />}
    <Dialog open={change} onOpenChange={setChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Signaler un changement</DialogTitle><DialogDescription>Choisissez un changement qui s’est réellement produit dans le jeu.</DialogDescription></DialogHeader>
      <div className="grid gap-2">{SITUATION_CHANGES.map(c => <Button key={c.id} variant="outline" className="min-h-12 justify-start" disabled={action.isPending} onClick={() => action.mutate({ command: 'report_change', requestId: crypto.randomUUID(), input: { change: c.id } }, { onSuccess: () => setChange(false) })}>{c.label}</Button>)}</div>
    </DialogContent></Dialog>
  </div>;
}

export function AdminDeadlines() {
  const { data } = useSuspenseQuery(adminQuery);
  const d = upcomingDeadlines(data);
  if (d.length === 0) return null;
  return <section aria-label="Échéances administratives"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><CalendarClock className="h-4 w-4 text-primary" />Échéances administratives (simulation)</h2>
    <ul className="divide-y divide-border border-y border-border">{d.map(x => <li key={x.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{x.label} · {x.title}</span><span className="font-semibold">{fmtDate(x.date)}</span></li>)}</ul></section>;
}
