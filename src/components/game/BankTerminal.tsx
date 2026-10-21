import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, ArrowDownToLine, ArrowUpFromLine, Check, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { bankCashQuery, bankCashAction, formatMoney } from '@/services/game';
import { QuickAmounts } from './FinancialTools';
import { Link } from '@tanstack/react-router';
import bankDesk from '@/assets/v2/desk-banque.webp';

export function BankTerminal() {
  const { data, isError, refetch } = useQuery(bankCashQuery);
  const q = useQueryClient();
  const [direction, setDirection] = useState<'withdraw' | 'deposit'>('withdraw');
  const [amount, setAmount] = useState('50');
  const [confirming, setConfirming] = useState(false);
  const [request, setRequest] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const max = direction === 'withdraw' ? data?.balance ?? 0 : data?.cash ?? 0;
  function edit(value: string) { setAmount(value); setRequest(crypto.randomUUID()); setConfirming(false); }
  async function execute() {
    if (busy) return;
    setBusy(true); setMessage('');
    try { const result = await bankCashAction({ direction, amount: Number(amount), request }); q.setQueryData(bankCashQuery.queryKey,result); setRequest(crypto.randomUUID()); setConfirming(false); setMessage('Opération enregistrée. Compte et espèces mis à jour.'); await Promise.all(['online-bank','economy','bank','financial-adviser'].map(key=>q.invalidateQueries({queryKey:[key]}))); }
    catch(e) { setMessage(e instanceof Error ? e.message : 'Opération impossible'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Distributeur du jeu" className="space-y-4 border-y border-border py-5">
    <img src={bankDesk} alt="Espace bancaire fictif CIVITAS" className="h-36 w-full rounded-lg object-cover" width={1024} height={576} loading="lazy" />
    <h2 className="flex items-center gap-2 font-heading text-lg font-bold"><Banknote className="text-primary" />Distributeur CIVITAS · FICTIF</h2>
    {isError && <p role="alert" className="text-sm text-muted-foreground">Le distributeur attend son installation sur le serveur.</p>}
    {data && <><dl className="grid grid-cols-2 gap-3"><div><dt className="text-sm text-muted-foreground">Compte</dt><dd className="font-semibold">{formatMoney(data.balance)}</dd></div><div><dt className="text-sm text-muted-foreground">Espèces sur soi</dt><dd className="font-semibold">{formatMoney(data.cash)}</dd></div></dl>
      <Button type="button" variant="outline" className="min-h-12" onClick={()=>void refetch()} disabled={busy}>Consulter le solde</Button>
      {!data.here ? <Button asChild variant="secondary" className="min-h-12 w-full"><Link to="/carte"><MapPin />Rejoindre une agence ou un distributeur</Link></Button> : <>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Opération en espèces">{(['withdraw','deposit'] as const).map(d=><Button type="button" key={d} disabled={busy} variant={direction===d?'secondary':'outline'} className="min-h-12" aria-pressed={direction===d} onClick={()=>{setDirection(d);setConfirming(false);setRequest(crypto.randomUUID());}}>{d==='withdraw'?<ArrowDownToLine />:<ArrowUpFromLine />}{d==='withdraw'?'Retirer':'Déposer'}</Button>)}</div>
        <label className="block space-y-2 text-sm"><span>Montant (€ du jeu)</span><Input type="number" inputMode="numeric" min={1} max={max} step={1} value={amount} onChange={e=>edit(e.target.value)} disabled={busy} className="min-h-12" /></label>
        <QuickAmounts value={amount} max={max} onChange={edit}/>
        {confirming ? <div className="space-y-3 border-l-4 border-primary p-3"><p className="text-sm">{direction==='withdraw'?'Retrait':'Dépôt'} de {formatMoney(Number(amount))}. Compte après : {formatMoney(data.balance+(direction==='deposit'?1:-1)*Number(amount))}. Espèces après : {formatMoney(data.cash+(direction==='withdraw'?1:-1)*Number(amount))}.</p><div className="flex flex-wrap gap-2"><Button disabled={busy} className="min-h-12" onClick={()=>void execute()}><Check />{busy?'Enregistrement…':'Confirmer'}</Button><Button disabled={busy} variant="ghost" onClick={()=>setConfirming(false)}>Annuler</Button></div></div> : <Button className="min-h-12 w-full" disabled={busy || !Number.isInteger(Number(amount)) || Number(amount)<=0 || Number(amount)>max} onClick={()=>setConfirming(true)}>Vérifier mon opération</Button>}
      </>}
      <p className="text-xs text-muted-foreground">Transfert entre votre compte et vos espèces uniquement. Aucun argent créé, aucun service bancaire réel.</p>
      <div className="divide-y divide-border">{data.history.map(h=><p key={h.operation_key} className="py-2 text-sm">{h.amount<0?'Retrait':'Dépôt'} · {formatMoney(Math.abs(h.amount))} · {h.occurred_at.slice(0,10)}</p>)}</div>
    </>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}