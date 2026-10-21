import { useState } from 'react';
import { DeskScene } from "@/components/game/DeskScene";
import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { gameMeta } from '@/game/metadata';
import { prefectureTitlesQuery, prefectureTitleAction } from '@/services/game';
export const Route = createFileRoute('/_authenticated/_game/titres')({
  head: () => ({ meta: gameMeta('Titres sécurisés · FICTIF', 'CNI, passeport et certificat d’immatriculation fictifs.') }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(prefectureTitlesQuery),
  component: TitlesPage,
});
function TitlesPage() {
  const { data } = useSuspenseQuery(prefectureTitlesQuery); const q = useQueryClient();
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [loss, setLoss] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const button = 'min-h-11 rounded-md border border-border bg-background px-4 py-2 text-foreground disabled:opacity-50';
  const valid = (type: string) => data.documents.some(d => d.type_id === type && d.status === 'valide' && d.valid_until > data.now);
  const pending = (type: string) => data.requests.some(r => r.type_id === type && !r.completed_at);
  async function act(kind: string, asset?: string, declare = false) {
    setBusy(true); setMessage('');
    const key = kind + (asset ?? ''); const id = keys[key] ?? crypto.randomUUID();
    setKeys(k => ({ ...k, [key]: id }));
    try {
      const next = await prefectureTitleAction(declare ? 'prefecture_loss' : 'prefecture_request', declare ? { _kind: kind } : { _kind: kind, _request: id, _asset: asset ?? null });
      q.setQueryData(prefectureTitlesQuery.queryKey, next); setMessage(declare ? 'Perte déclarée. Le titre n’est plus valide.' : 'Demande enregistrée.');
      setKeys(k => { const n = { ...k }; delete n[key]; return n; }); setLoss(null);
      await Promise.all([q.invalidateQueries({ queryKey: ['identity'] }), q.invalidateQueries({ queryKey: ['documents'] }), q.invalidateQueries({ queryKey: ['character'] })]);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Opération impossible.'); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-5 pb-24">
    <DeskScene service="prefecture" />
    <header className="rounded-xl border-b-4 border-primary bg-secondary p-5 text-secondary-foreground"><h1 className="text-2xl font-bold">Titres sécurisés</h1><p>FICTIF · Aucun document ni service officiel</p></header>
    <p>Traitement : 7 à 21 jours du jeu. CNI et passeport deviennent valides au retrait du recommandé à La Poste. Carte grise : activation à la distribution du courrier. Frais arrondis à l’euro supérieur par demande.</p>
    <nav className="flex flex-wrap gap-4"><Link className={button} to="/la-poste">La Poste</Link><Link className={button} to="/mes-documents">Mes documents</Link><Link className={button} to="/mon-profil">Ma carte d’identité</Link></nav>
    <p role="status" aria-live="polite">{message}</p>
    {(['identity', 'passport'] as const).map(kind => {
      const cni = kind === 'identity'; const active = cni ? !data.identity.lost && data.identity.expires_at >= data.now.slice(0, 10) : valid(kind);
      return <section key={kind} className="space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground"><h2 className="text-xl font-semibold">{cni ? 'Carte d’identité' : 'Passeport'}</h2><p>{active ? 'Valide' : 'Absent, perdu ou expiré'} · {cni ? (data.identity.lost ? '25 € après perte' : 'Gratuit') : '86 €'}</p>{cni && <p>{data.identity.number} · échéance {data.identity.expires_at}</p>}
      {!cni && <p>Validité conservée pour de futurs voyages à l’étranger. Aucun voyage disponible actuellement.</p>}
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || pending(kind) || active} onClick={() => void act(kind)}>{pending(kind) ? 'Demande en cours' : 'Demander le titre'}</button><button className={button} disabled={busy || pending(kind) || !active} onClick={() => setLoss(kind)}>Déclarer une perte</button></div>
      {loss === kind && <div role="alert" className="space-y-2"><p>Confirmer la perte ? Votre titre sera immédiatement invalidé.</p><button className={button} disabled={busy} onClick={() => void act(kind, undefined, true)}>Confirmer la perte</button> <button className={button} onClick={() => setLoss(null)}>Annuler</button></div>}
      </section>;
    })}
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground"><h2 className="text-xl font-semibold">Certificats d’immatriculation</h2><p>13,76 € + 46 € par CV fiscal. À défaut de puissance renseignée : voiture 5, moto 2, scooter 1, utilitaire 7 ; autre véhicule 5 CV.</p>{!data.vehicles.length && <p>Aucun véhicule possédé.</p>}{data.vehicles.map(v => <div key={v.id} className="space-y-2 border-t border-border pt-3"><h3>{v.name} · {v.cv} CV · {v.fee} €</h3><button className={button} disabled={busy || pending(v.type_id) || valid(v.type_id)} onClick={() => void act('registration', v.id)}>{valid(v.type_id) ? 'Titre valide' : pending(v.type_id) ? 'Demande en cours' : 'Demander la carte grise'}</button></div>)}</section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Suivi des demandes</h2>{!data.requests.length && <p>Aucune demande.</p>}{data.requests.map(r => <article key={r.id} className="rounded-lg border border-border p-4"><p>{r.kind === 'identity' ? 'Carte d’identité' : r.kind === 'passport' ? 'Passeport' : 'Carte grise'} · {r.fee} €</p><p>{r.completed_at ? 'Titre activé' : r.ready_at <= data.now ? 'Disponible : consultez La Poste' : `Prévu le ${new Date(r.ready_at).toLocaleDateString('fr-FR')}`}</p></article>)}</section>
  </main>;
}
