import { CalendarDays, Download, FileText, MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dateMilestones } from '@/game/financial-dates';
import bankDesk from '@/assets/v2/desk-banque.webp';
import retirementDesk from '@/assets/v2/desk-prefecture.webp';

export function FinancialDesk({ title, comment, retirement = false }: { title: string; comment: string; retirement?: boolean }) {
  return <section className="space-y-4">
    <div className="relative overflow-hidden rounded-lg">
      <img src={retirement ? retirementDesk : bankDesk} alt={`Guichet fictif · ${title}`} width={1024} height={576} className="h-52 w-full object-cover sm:h-64" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      <h2 className="absolute inset-x-4 bottom-4 font-heading text-2xl font-bold">{title}</h2>
    </div>
    <div className="flex items-start gap-3 border-l-2 border-primary py-3 pl-4"><MessageCircle className="mt-1 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><p className="text-sm font-semibold">Votre conseillère · CIVITAS</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{comment}</p></div></div>
  </section>;
}

export function GameDocument({ title, reference, children, text }: { title: string; reference: string; children: ReactNode; text: string }) {
  function download() {
    const url = URL.createObjectURL(new Blob([`${title}\nCIVITAS — DOCUMENT FICTIF\n${reference}\n\n${text}`], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'civitas-document-fictif.txt'; a.click(); URL.revokeObjectURL(url);
  }
  return <section className="space-y-4 border-y-2 border-border bg-card px-4 py-6 text-card-foreground sm:px-6">
    <header className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-primary">CIVITAS · DOCUMENT FICTIF</p><h2 className="mt-1 font-heading text-lg font-bold">{title}</h2><p className="text-xs text-muted-foreground">{reference}</p></div><FileText className="h-7 w-7 shrink-0 text-primary" /></header>
    {children}<p className="border-t border-border pt-3 text-xs text-muted-foreground">Simulation de jeu · Sans valeur bancaire, juridique ou administrative.</p>
    <Button type="button" variant="outline" className="min-h-12" onClick={download}><Download className="h-4 w-4" />Télécharger le document</Button>
  </section>;
}

export function QuickAmounts({ value, onChange, max = Infinity }: { value: string; onChange: (value: string) => void; max?: number }) {
  return <div role="group" aria-label="Montants rapides" className="flex flex-wrap gap-2">{[10, 50, 100].map(amount => <Button type="button" key={amount} variant={Number(value) === amount ? 'secondary' : 'outline'} aria-pressed={Number(value) === amount} disabled={amount > max} className="min-h-12 min-w-20" onClick={() => onChange(String(amount))}>{amount} €</Button>)}</div>;
}

export function DateTimeline({ items, value, onChange, label }: { items: { value: string; label: string }[]; value: string; onChange: (value: string) => void; label: string }) {
  return <div role="group" aria-label={label} className="flex max-w-full gap-2 overflow-x-auto border-t-2 border-primary/30 pt-3 pb-2">{items.map(item => <Button key={item.value} type="button" variant={value === item.value ? 'secondary' : 'outline'} aria-pressed={value === item.value} className="min-h-12 shrink-0" onClick={() => onChange(item.value)}><CalendarDays className="h-4 w-4" />{item.label}</Button>)}</div>;
}

export function GoalDatePicker({ anchor, value, onChange }: { anchor: Date; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-3"><DateTimeline items={dateMilestones(anchor)} value={value} onChange={onChange} label="Date cible de l’objectif" /><Input aria-label="Date cible personnalisée" type="date" value={value} onChange={e => onChange(e.target.value)} /><Button type="button" variant="ghost" onClick={() => onChange('')}>Sans date cible</Button></div>;
}