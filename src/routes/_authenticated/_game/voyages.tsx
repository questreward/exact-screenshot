import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { foreignTravelQuery, departForeignTravel } from '@/services/game';
import { documentRequirement, leaveUsage, lodgingPrices, travelPrice, type Lodging } from '@/game/foreign-travel';
import { gameMeta } from '@/game/metadata';
import { euros } from '@/game/income-tax';
export const Route = createFileRoute('/_authenticated/_game/voyages')({
 head: () => ({ meta: gameMeta('Voyages', 'Voyages fictifs à l’étranger, congés et souvenirs.') }),
 loader: ({ context }) => context.queryClient.ensureQueryData(foreignTravelQuery), component: TravelPage,
});
function TravelPage() {
 const { data: s } = useSuspenseQuery(foreignTravelQuery); const q = useQueryClient();
 const [days, setDays] = useState(2); const [lodging, setLodging] = useState<Lodging>('auberge');
 const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
 const [request, setRequest] = useState<{ signature: string; id: string } | null>(null);
 const active = s.trips.find(t => t.status === 'abroad'); const leave = leaveUsage(days, s.leave_used, s.employed);
 async function depart(country: string) {
  const signature = `${country}:${days}:${lodging}`;
  const id = request?.signature === signature ? request.id : crypto.randomUUID();
  setRequest({ signature, id }); setBusy(true); setMessage('');
  try { const state = await departForeignTravel({ _country: country, _days: days, _lodging: lodging, _request: id }); q.setQueryData(foreignTravelQuery.queryKey, state); await q.invalidateQueries({ queryKey: ['character'] }); setRequest(null); setMessage('Bon voyage !'); }
  catch (e) { setMessage(e instanceof Error ? e.message : 'Départ impossible.'); } finally { setBusy(false); }
 }
 return <main className="mx-auto max-w-4xl space-y-6 p-4 pb-24">
  <header><h1 className="font-heading text-2xl font-bold">Voyages à l’étranger</h1><p className="text-sm text-muted-foreground">12 destinations fictives · Aller-retour et hébergement prépayés</p></header>
  <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Vos documents</h2><p>CNI : {s.documents.cni ? 'valide' : 'absente, perdue ou expirée'} · Passeport : {s.documents.passport ? 'valide' : 'absent, perdu ou expiré'}</p><Link to="/titres" className="inline-flex min-h-12 items-center text-primary underline">Gérer mes titres sécurisés</Link></section>
  {active && <section className="rounded-xl border border-primary bg-card p-4" aria-label="Voyage en cours"><h2 className="text-xl font-bold">À l’étranger · {s.countries.find(c => c.id === active.country_id)?.name}</h2><p role="timer">Retour dans {Math.max(0, Math.ceil((Date.parse(active.returns_at) - Date.parse(s.now)) / 3600000))} heures de jeu</p><p>{new Date(active.returns_at).toLocaleString('fr-FR', { timeZone: 'UTC' })} (UTC du jeu)</p><p>{active.paid_days} jours de congés · {active.absence_days} jours d’absence injustifiée</p>{active.incident && <p className="mt-2">Incident : {active.incident}{active.incident === 'Bagage perdu' ? ' (30 € si le solde le permet)' : ' (+1 jour, hébergement pris en charge)'}</p>}<p className="mt-2 text-sm text-muted-foreground">Retour réglé automatiquement à la lecture, sans versement d’argent.</p></section>}
  <section className="space-y-4 rounded-xl border bg-card p-4"><h2 className="font-semibold">Préparer mon séjour</h2><div className="grid gap-4 sm:grid-cols-2"><label>Durée en jours de jeu<select className="mt-1 min-h-12 w-full rounded-lg border bg-background px-3" value={days} onChange={e => setDays(Number(e.target.value))} disabled={busy || !!active}>{Array.from({ length: 13 }, (_, i) => i + 2).map(d => <option key={d} value={d}>{d} jours / {d} nuits</option>)}</select></label><label>Hébergement<select className="mt-1 min-h-12 w-full rounded-lg border bg-background px-3" value={lodging} onChange={e => setLodging(e.target.value as Lodging)} disabled={busy || !!active}>{Object.entries(lodgingPrices).map(([name, price]) => <option key={name} value={name}>{name} · {euros(price)} / nuit (base)</option>)}</select></label></div><p>{s.employed ? `Congés disponibles : ${leave.balance} / 25 jours cette année · ${leave.paid} consommés pour ce séjour · ${leave.absence} jours injustifiés.` : 'Sans emploi actif : aucun congé consommé, aucune pénalité d’absence.'}</p><p className="text-sm text-muted-foreground">Départ enregistré depuis votre ville actuelle. Terminez ou annulez votre agenda avant de partir. Travail, agenda, déplacements locaux et votes sont indisponibles à l’étranger ; vos factures continuent. Au-delà des congés, la progression professionnelle baisse (maximum 5 points). Incident rare : 5 % ; retard, bagage perdu ou passeport oublié.</p></section>
  <p role="status" aria-live="polite">{message}</p>
  <section aria-label="Destinations" className="grid gap-4 sm:grid-cols-2">{s.countries.map(c => { const price = travelPrice(c.fare, days, lodging, Number(s.factor)); const valid = c.eu ? s.documents.cni : s.documents.passport; return <article key={c.id} className="space-y-3 rounded-xl border bg-card p-4"><h2 className="text-xl font-bold"><span aria-hidden="true">{c.flag}</span> {c.name}</h2><p>{documentRequirement(c.eu)} valide requise · {valid ? 'Document prêt' : 'Document à obtenir'}</p><dl className="space-y-1 text-sm"><div className="flex justify-between"><dt>{c.mode} · aller-retour</dt><dd>{euros(price.transport)}</dd></div><div className="flex justify-between"><dt>{days} nuits · {lodging}</dt><dd>{euros(price.accommodation)}</dd></div><div className="flex justify-between font-bold"><dt>Total à payer</dt><dd>{euros(price.total)}</dd></div></dl><button className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50" disabled={!valid || busy || !!active} onClick={() => void depart(c.id)}>{busy ? 'Départ en cours…' : active ? 'Voyage déjà en cours' : `Payer ${euros(price.total)} et partir`}</button></article>; })}</section>
  <section><h2 className="mb-3 text-xl font-bold">Mes cartes postales</h2>{!s.postcards.length && <p className="text-muted-foreground">Vos souvenirs apparaîtront au retour.</p>}<ul className="grid gap-3 sm:grid-cols-2">{s.postcards.map(p => <li key={p.id} className="rounded-xl border bg-card p-4"><p className="font-semibold">{s.countries.find(c => c.id === p.country_id)?.flag} {p.text}</p></li>)}</ul></section>
 </main>;
}
