import { useState } from 'react';
import { ReceiptText, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GameSelect } from './GameSelect';
import { GameDocument } from './FinancialTools';
import { bankDate, cashReceiptText, filterBankHistory, type BankMovement, type CashReceipt } from '@/game/bank-history';
import { formatMoney } from '@/services/game';

export function CashReceiptDialog({ receipt, onClose }: { receipt: CashReceipt | null; onClose: () => void }) {
  return <Dialog open={Boolean(receipt)} onOpenChange={open => { if (!open) onClose(); }}><DialogContent>
    <DialogTitle>Reçu de {receipt && receipt.amount < 0 ? 'retrait' : 'dépôt'}</DialogTitle>
    <DialogDescription>Opération enregistrée · Argent du jeu uniquement.</DialogDescription>
    {receipt && <GameDocument title="Reçu d’opération en espèces" reference={receipt.operation_key} text={cashReceiptText(receipt)}>
      <dl className="space-y-3 text-sm"><div><dt>Date du jeu · Paris</dt><dd>{bankDate(receipt.occurred_at)}</dd></div><div><dt>Montant</dt><dd className="text-xl font-semibold">{formatMoney(Math.abs(receipt.amount))}</dd></div><div><dt>Mouvement du compte</dt><dd>{formatMoney(receipt.amount)}</dd></div><div><dt>Mouvement des espèces</dt><dd>{formatMoney(-receipt.amount)}</dd></div></dl>
    </GameDocument>}
  </DialogContent></Dialog>;
}

export function BankHistory({ movements, cash = [], cashOnly = false }: { movements: BankMovement[]; cash?: CashReceipt[]; cashOnly?: boolean }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('all');
  const [receipt, setReceipt] = useState<CashReceipt | null>(null);
  const rows = filterBankHistory(movements, from, to, type);
  const categories = [...new Set(movements.map(m => m.category))].filter(c => c !== 'especes').sort();
  return <section className="space-y-4" aria-label={cashOnly ? 'Historique des espèces' : 'Historique bancaire'}>
    <h2 className="font-heading text-lg font-bold">{cashOnly ? 'Dépôts et retraits' : 'Historique des opérations'}</h2>
    <p className="text-xs text-muted-foreground">{cashOnly ? 'Les 20 dernières opérations en espèces enregistrées.' : 'Opérations des relevés disponibles.'} Dates du jeu · heure française.</p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="min-w-0 space-y-1 text-sm">Du<Input type="date" className="min-h-12 w-full min-w-0" value={from} onChange={e => setFrom(e.target.value)} /></label><label className="min-w-0 space-y-1 text-sm">Au<Input type="date" className="min-h-12 w-full min-w-0" value={to} onChange={e => setTo(e.target.value)} /></label></div>
    <GameSelect aria-label="Type d’opération" value={type} onChange={e => setType(e.target.value)}><option value="all">Tous les types</option><option value="withdraw">Retraits</option><option value="deposit">Dépôts</option>{categories.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}</GameSelect>
    {(from || to || type !== 'all') && <Button variant="ghost" className="min-h-12" onClick={() => { setFrom(''); setTo(''); setType('all'); }}><RotateCcw />Réinitialiser</Button>}
    {from && to && from > to ? <p role="alert" className="text-sm text-destructive">La date de fin doit suivre la date de début.</p> : <p role="status" className="text-sm text-muted-foreground">{rows.length} opération{rows.length > 1 ? 's' : ''}</p>}
    {!rows.length && <p className="py-3 text-sm text-muted-foreground">Aucune opération pour ces filtres.</p>}
    <ul className="divide-y divide-border">{rows.map((m, i) => {
      const saved = cash.find(h => h.occurred_at === m.at && h.amount === m.amount);
      return <li key={`${m.at}-${i}`} className="space-y-2 py-3"><div className="flex flex-wrap justify-between gap-2"><span className="min-w-0 break-words text-sm">{m.label}</span><strong className="shrink-0 text-sm">{formatMoney(m.amount)}</strong></div><p className="text-xs text-muted-foreground">{bankDate(m.at)}</p>{saved && <Button variant="outline" className="min-h-12" onClick={() => setReceipt(saved)}><ReceiptText />Voir le reçu</Button>}</li>;
    })}</ul><CashReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />
  </section>;
}