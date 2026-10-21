import { GameSelect } from "@/components/game/GameSelect";
import { useState } from 'react';
import { DeskScene } from "@/components/game/DeskScene";
import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { gameMeta } from '@/game/metadata';
import { onlineBankQuery, onlineBankAction, networkQuery } from '@/services/game';
import { cardRemaining, statementText } from '@/game/online-bank';

export const Route = createFileRoute('/_authenticated/_game/banque')({
  head: () => ({ meta: gameMeta('Banque Horizon — FICTIF', 'Compte, carte, virements et relevés fictifs CIVITAS.') }),
  loader: async ({ context: { queryClient: q } }) => { await Promise.all([q.ensureQueryData(onlineBankQuery), q.ensureQueryData(networkQuery)]); },
  component: BankPage,
});
function BankPage() {
  const { data } = useSuspenseQuery(onlineBankQuery);
  const { data: network } = useSuspenseQuery(networkQuery);
  const q = useQueryClient();
  const [target, setTarget] = useState(''); const [amount, setAmount] = useState('1');
  const [month, setMonth] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [request, setRequest] = useState(() => crypto.randomUUID());
  const selected = data.statements.find(s => s.month === month) ?? data.statements[0];
  const button = 'min-h-11 rounded-md border border-border bg-background px-4 py-2 text-foreground disabled:opacity-50';
  const panel = 'space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground';
  async function act(fn: 'online_bank_card' | 'online_bank_transfer', args: Record<string, unknown>) {
    setBusy(true); setMessage('');
    try { const next = await onlineBankAction(fn, args); q.setQueryData(onlineBankQuery.queryKey, next); if (fn === 'online_bank_transfer') setRequest(crypto.randomUUID()); setMessage('Opération enregistrée.'); await q.invalidateQueries({ queryKey: ['character'] }); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Opération impossible.'); } finally { setBusy(false); }
  }
  function download() {
    if (!selected) return;
    const url = URL.createObjectURL(new Blob([statementText(selected)], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `releve-fictif-${selected.month}.txt`; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="mx-auto max-w-3xl space-y-5 pb-24">
    <DeskScene service="banque" />
    <header className="rounded-xl border-b-4 border-primary bg-secondary p-5 text-secondary-foreground"><h1 className="font-heading text-2xl font-bold">Banque Horizon</h1><p>FICTIF · Aucun service bancaire réel</p><p className="mt-3 text-3xl font-semibold">{data.balance.toLocaleString('fr-FR')} €</p></header>
    <p role="status">{message}</p>
    <section className={panel}><h2 className="text-lg font-semibold">Mon RIB fictif</h2><p className="break-all font-mono">{data.iban}</p><p>BIC : {data.bic} · Code banque inventé 00000</p><p className="text-sm text-muted-foreground">Ne pas utiliser pour un paiement réel. Votre carte et votre RIB sont aussi dans La Poste.</p></section>
    <section className={panel}><h2 className="text-lg font-semibold">Carte Horizon · FICTIF</h2><p className="font-semibold">{data.blocked ? 'Carte bloquée' : 'Carte débloquée'}{data.spent >= data.ceiling ? ' · Plafond atteint ou dépassé' : ''}</p><p>{data.spent.toLocaleString('fr-FR')} € / 1 500 € ce mois · Reste indicatif : {cardRemaining(data.spent)} €</p><button className={button} disabled={busy} onClick={() => void act('online_bank_card', { _blocked: !data.blocked })}>{data.blocked ? 'Débloquer' : 'Bloquer'} la carte</button><p className="text-sm text-muted-foreground">Blocage et plafond informatifs : les achats existants ne sont pas refusés. Dépenses : débits de catégorie « achat », par mois calendaire du jeu (UTC).</p></section>
    <form className={panel} onSubmit={e => { e.preventDefault(); void act('online_bank_transfer', { _target: target, _amount: Number(amount), _request: request }); }}><h2 className="text-lg font-semibold">Virement à un contact</h2><label className="block">Contact<GameSelect required className="mt-1 min-h-11 w-full rounded border border-input bg-background p-2" value={target} onChange={e => { setTarget(e.target.value); setRequest(crypto.randomUUID()); }}><option value="">Choisir un contact</option>{network.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</GameSelect></label><label className="block">Montant en euros<input required type="number" min={1} max={5000} step={1} value={amount} onChange={e => { setAmount(e.target.value); setRequest(crypto.randomUUID()); }} className="mt-1 min-h-11 w-full rounded border border-input bg-background p-2" /></label><button disabled={busy} className={button}>Envoyer le virement</button><p className="text-sm text-muted-foreground">1–5 000 € · 10 virements par jour du jeu. Crédité à la prochaine consultation du destinataire. Aucun solde négatif.</p></form>
    <section className={panel}><h2 className="text-lg font-semibold">Frais de compte · 2 €/mois</h2><p className="text-sm text-muted-foreground">Prélevés une seule fois à la consultation, dès ce mois. Si le solde est insuffisant, frais abandonnés pour le mois, sans dette ni découvert. Les mois sans consultation ne sont pas facturés.</p>{data.fees.map(f => <p key={f.month}>{f.month.slice(0,7)} : {f.paid ? '2 € réglés' : 'Non prélevés — solde insuffisant'}</p>)}</section>
    <section className={panel}><h2 className="text-lg font-semibold">Relevés mensuels</h2><label className="block print:hidden">Mois<GameSelect value={selected?.month ?? ''} onChange={e => setMonth(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-input bg-background p-2">{data.statements.map(s => <option key={s.month} value={s.month}>{s.month.slice(0,7)}</option>)}</GameSelect></label>{selected && <><p>Relevé FICTIF · {selected.month.slice(0,7)} · Mois courant provisoire</p><p>Solde d’ouverture : {selected.opening} €</p><ul className="divide-y divide-border">{selected.movements.map((m,i) => <li key={i} className="flex flex-wrap justify-between gap-2 py-3"><span>{m.at.slice(0,10)} · {m.label}</span><strong>{m.amount} €</strong></li>)}</ul><p>Solde de clôture : {selected.closing} €</p><div className="flex flex-wrap gap-2 print:hidden"><button className={button} onClick={() => window.print()}>Imprimer / PDF</button><button className={button} onClick={download}>Télécharger le relevé</button></div></>}</section>
  </div>;
}
