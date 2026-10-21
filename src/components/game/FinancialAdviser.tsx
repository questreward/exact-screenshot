import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { MessageCircle, Send, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { askFinancialAdviser } from '@/lib/financial-adviser.functions';

export function FinancialAdviser() {
  const ask = useServerFn(askFinancialAdviser);
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true); setError(''); setReply('');
    try { const result = await ask({ data: { question } }); setReply(result.reply); }
    catch (e) { setError(e instanceof Error ? e.message : 'La conseillère est indisponible.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 border-y border-border py-5" aria-label="Conseillère financière">
    <h2 className="flex items-center gap-2 font-heading text-lg font-bold"><MessageCircle className="h-5 w-5 text-primary" />Camille · Votre conseillère IA</h2>
    <p className="text-xs text-muted-foreground">Conseillère fictive · Situation du jeu uniquement · Aucune opération automatique</p>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <Textarea aria-label="Votre question financière" placeholder="Puis-je mettre de l’argent de côté avant ma prochaine mensualité ?" maxLength={600} required minLength={3} value={question} onChange={e => setQuestion(e.target.value)} className="min-h-28 text-base" disabled={busy} />
      <Button type="submit" disabled={busy || question.trim().length < 3} className="min-h-12 w-full sm:w-auto">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{busy ? 'Camille examine votre situation…' : 'Poser ma question'}</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {reply && <div role="status" className="border-l-4 border-primary bg-surface p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">{reply}</div>}
  </section>;
}