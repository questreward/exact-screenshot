import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { economyQuery } from '@/services/game';
import { gameMeta } from '@/game/metadata';
import { economyPercent } from '@/game/economy-presentation';
import { euros } from '@/game/income-tax';

export const Route = createFileRoute('/_authenticated/_game/conjoncture')({
  head: () => ({ meta: gameMeta('Conjoncture', 'Inflation, SMIC, prix locaux et budget de l’État dans CIVITAS.') }),
  loader: ({ context }) => context.queryClient.ensureQueryData(economyQuery),
  component: EconomyPage,
});
function EconomyPage() {
  const { data: s } = useSuspenseQuery(economyQuery);
  const current = s.history[0];
  return <main className="mx-auto max-w-4xl space-y-6 p-4 pb-24">
    <header><h1 className="font-heading text-2xl font-bold">Conjoncture</h1><p className="text-sm text-muted-foreground">Économie fictive · Mise à jour à la lecture · Mois du jeu</p></header>
    <section aria-label="Indicateurs nationaux" className="grid grid-cols-2 gap-3">
      {[['Inflation mensuelle', economyPercent(current?.inflation ?? 0)], ['SMIC net mensuel', euros(s.smic)], ['Chômage des joueurs', economyPercent(current?.unemployment ?? 0)], ['Croissance démographique', economyPercent(current?.growth ?? 0)], ['Trésorerie de l’État', euros(s.treasury.balance)], ['Dette publique', euros(s.treasury.debt)], ['Recettes cumulées', euros(s.treasury.income)], ['Dépenses cumulées', euros(s.treasury.expenses)]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm text-muted-foreground">{label}</h2><p className="mt-2 break-words text-xl font-bold">{value}</p></div>)}
    </section>
    <p className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">Les indices de prix et de revalorisation sont indicatifs : les anciens achats, loyers, salaires et prestations restent inchangés. Le budget retrace les flux raccordés depuis l’installation, pas toutes les dépenses publiques. Le chômage mesure l’absence d’emploi des joueurs ; la croissance est un indicateur démographique.</p>
    <section><h2 className="mb-3 font-heading text-xl font-bold">Prix par ville</h2><p className="mb-3 text-sm text-muted-foreground">Base 100 · Bornes 80–130 · Loyers : +3 % maximum par mois · Carburant : choc de 5–15 % pendant au plus une semaine, plafonné à 130.</p>
      <div className="grid gap-3 sm:grid-cols-2">{s.cities.map(c => <article key={c.id} className="rounded-xl border border-border bg-card p-4"><h3 className="font-semibold">{c.name}</h3><dl className="mt-3 space-y-2">{[['Alimentation', c.food], ['Loyer', c.rent], ['Carburant', c.fuel]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold">{Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</dd></div>)}</dl></article>)}</div>
    </section>
    <section><h2 className="mb-3 font-heading text-xl font-bold">Historique · 12 derniers mois</h2><p className="mb-3 text-sm text-muted-foreground">Disponible depuis l’installation. Inflation mensuelle, SMIC, chômage, croissance et solde budgétaire cumulé.</p>
      <ul className="space-y-3">{s.history.map(h => <li key={h.month} className="rounded-xl border border-border bg-card p-4"><h3 className="font-semibold">{h.month.slice(0, 7)}</h3><p className="mt-2 text-sm">Inflation {economyPercent(h.inflation)} · SMIC {euros(h.smic)} · Chômage {economyPercent(h.unemployment)} · Croissance {economyPercent(h.growth)}</p><p className="mt-2 text-sm text-muted-foreground">Budget {euros(h.budget)} · Dette {euros(h.debt)}</p><ul className="mt-3 space-y-1 text-sm">{s.city_history.filter(c => c.month === h.month).map(c => <li key={c.city_id}>{s.cities.find(city => city.id === c.city_id)?.name ?? c.city_id} : alimentation {Number(c.food).toFixed(1)} · loyer {Number(c.rent).toFixed(1)} · carburant {Number(c.fuel).toFixed(1)}</li>)}</ul></li>)}</ul>
    </section>
  </main>;
}
