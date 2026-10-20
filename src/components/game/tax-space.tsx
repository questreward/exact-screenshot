import { useState } from 'react';
import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { taxSpaceQuery, chooseTaxPayment, sendTaxQuestion, incomeTaxQuery } from '@/services/game';
import { taxInstalments, type TaxSpaceState } from '@/game/tax-space';
import { euros } from '@/game/income-tax';

export function TaxSpace() {
  const { data } = useSuspenseQuery(taxSpaceQuery);
  const qc = useQueryClient();
  const [tab, setTab] = useState('Avis');
  const [category, setCategory] = useState('revenu');
  const [body, setBody] = useState('');
  const update = (state: TaxSpaceState) => {
    qc.setQueryData(taxSpaceQuery.queryKey, state);
    void qc.invalidateQueries({ queryKey: incomeTaxQuery.queryKey });
    void qc.invalidateQueries({ queryKey: ['bank'] });
  };
  const payment = useMutation({ mutationFn: chooseTaxPayment, onSuccess: update, onError: (e: Error) => toast.error(e.message) });
  const question = useMutation({ mutationFn: sendTaxQuestion, onSuccess: (s) => { update(s); setBody(''); toast.success('Question envoyée. Réponse sous 2 jours du jeu.'); }, onError: (e: Error) => toast.error(e.message) });
  const notices = data.notices.filter(n => tab === 'Paiements' || n.kind === (tab === 'Taxe foncière' ? 'foncier' : 'revenu'));
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">Mon espace fiscal · FICTIF</h2>
    <nav aria-label="Espace fiscal" className="grid grid-cols-2 gap-2 print:hidden">
      {['Avis', 'Taxe foncière', 'Paiements', 'Messagerie'].map(t => <Button key={t} variant={tab === t ? 'default' : 'outline'} className="min-h-12" aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</Button>)}
    </nav>
    {tab === 'Taxe foncière' && <p className="text-sm text-muted-foreground">Un avis par bien détenu et par année. Montant : coût quotidien du type de logement × 30, sinon prix catalogue ÷ 240 (loyer théorique sur 20 ans). Base multipliée par le taux communal de l’année (100 % par défaut). Les futurs règlements vont à la commune du logement ; les paiements passés restent à l’État.</p>}
    {tab !== 'Messagerie' ? <>
      {notices.length === 0 && <p className="text-sm text-muted-foreground">Aucun avis disponible.</p>}
      {notices.map(n => <article key={n.id} className="space-y-2 rounded-lg border border-border p-3 break-inside-avoid">
        <h3 className="font-semibold">{n.label} · {n.year}</h3>
        <p className="text-sm">Avis FICTIF · {n.notice_key}</p>
        {n.kind === 'foncier' && <p className="text-sm">Commune : {n.city_id ?? 'Historique non renseigné'} · Taux : {n.rate_pct ?? 100} % {n.base_amount != null && <>· Base : {euros(n.base_amount)}</>}</p>}
        <p>Montant : {euros(n.amount)} · Réglé : {euros(n.paid)} · Reste : {euros(n.amount - n.paid)}</p>
        {n.instalments === 10 && <p className="text-sm">10 mensualités : {taxInstalments(n.amount).map(euros).join(' / ')}. Première échéance au choix, puis chaque mois du jeu.</p>}
        {n.amount > n.paid && n.instalments === null && <div className="grid gap-2 sm:grid-cols-2 print:hidden">
          <Button className="min-h-12" disabled={payment.isPending} onClick={() => payment.mutate({ id: n.id, count: 1 })}>Payer en une fois</Button>
          <Button variant="outline" className="min-h-12" disabled={payment.isPending} onClick={() => payment.mutate({ id: n.id, count: 10 })}>Choisir 10 mensualités</Button>
        </div>}
        {n.instalments !== null && <p className="text-sm text-muted-foreground">Choix enregistré : {n.instalments === 1 ? 'paiement unique' : '10 mensualités'}. Les impayés restent dus et sont réessayés à la consultation, sans solde négatif.</p>}
      </article>)}
      <Button variant="outline" className="min-h-12 print:hidden" onClick={() => window.print()}>Imprimer les avis affichés</Button>
      <p className="text-xs text-muted-foreground">Les anciens avis de revenus restent détaillés ci-dessus et sont réglés par le système historique. Le prélèvement mensuel continue ; seule la déclaration automatique entraîne une majoration de 10 %.</p>
    </> : <div className="space-y-4">
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); question.mutate({ category, body }); }}>
        <label className="block text-sm">Catégorie<select className="mt-1 min-h-12 w-full rounded-lg border border-input bg-background px-3" value={category} onChange={e => setCategory(e.target.value)}><option value="revenu">Revenus</option><option value="foncier">Taxe foncière</option><option value="paiement">Paiement</option></select></label>
        <label className="block text-sm">Votre question<textarea className="mt-1 min-h-32 w-full rounded-lg border border-input bg-background p-3" minLength={10} maxLength={2000} required value={body} onChange={e => setBody(e.target.value)} /></label>
        <p className="text-xs text-muted-foreground">10–2000 caractères · 3 questions par jour du jeu · Réponse automatique sous 2 jours du jeu, sans IA.</p>
        <Button className="min-h-12 w-full" disabled={question.isPending || body.trim().length < 10}>Envoyer en messagerie sécurisée</Button>
      </form>
      {data.messages.map(m => <article key={m.id} className="space-y-2 rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">{m.category} · {new Date(m.created_at).toLocaleDateString('fr-FR')}</p><p className="whitespace-pre-wrap break-words">{m.body}</p><p className="text-sm text-muted-foreground">{m.answer ?? `Réponse attendue le ${new Date(m.reply_at).toLocaleString('fr-FR')} (jeu).`}</p></article>)}
    </div>}
  </section>;
}
