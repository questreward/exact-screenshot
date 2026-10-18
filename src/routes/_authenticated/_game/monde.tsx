import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Cloud, Landmark, Newspaper, Sparkles } from 'lucide-react';
import { worldOverviewQuery } from '@/services/game';
import { gameMeta } from '@/game/metadata';

export const Route = createFileRoute('/_authenticated/_game/monde')({
  head: () => ({ meta: gameMeta('Monde', 'L’état du monde de CIVITAS : date, météo, villes, maires, événements nationaux et gros titres.') }),
  loader: ({ context: { queryClient: q } }) => q.ensureQueryData(worldOverviewQuery),
  component: WorldPage,
});

function WorldPage() {
  const { data: w } = useSuspenseQuery(worldOverviewQuery);
  const now = new Date(w.now);
  return (
    <div className="space-y-6 animate-rise">
      <header>
        <p className="text-xs uppercase tracking-wider text-primary">{w.season}</p>
        <h1 className="text-3xl font-bold">Le monde</h1>
        <p className="text-muted-foreground">{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {w.cities.map((c) => (
          <article key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">{c.name}</h2>
            {c.weather && <p className="mt-1 flex items-center gap-2 text-sm"><Cloud className="h-4 w-4 text-primary" />{c.weather.condition} · {c.weather.temperature} °C</p>}
            <p className="mt-1 flex items-center gap-2 text-sm"><Landmark className="h-4 w-4 text-primary" />{c.mayor ? `Maire : ${c.mayor}` : 'Aucun maire élu pour l’instant'}</p>
            {c.indicators && (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(c.indicators).map(([k, v]) => <div key={k}><dt className="text-muted-foreground">{k.replaceAll('_', ' ')}</dt><dd className="font-semibold">{v}</dd></div>)}
              </dl>
            )}
          </article>
        ))}
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-primary" />Événements nationaux en cours</h2>
        {w.national_events.length ? <ul className="space-y-2">{w.national_events.map((e) => <li key={e.id} className="rounded-xl border border-border bg-card p-3 text-sm">{e.title}</li>)}</ul>
          : <p className="text-sm text-muted-foreground">Aucun événement national en ce moment.</p>}
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><Newspaper className="h-5 w-5 text-primary" />Gros titres</h2>
        <ul className="space-y-2">{w.headlines.map((n) => <li key={n.id}><Link to="/actualites/$id" params={{ id: n.id }} className="block min-h-12 rounded-xl border border-border bg-card p-3 text-sm hover:border-primary/40">{n.title}</Link></li>)}</ul>
      </section>
    </div>
  );
}
