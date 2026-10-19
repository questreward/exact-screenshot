import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Map as MapIcon, Search, LocateFixed, X, Landmark, MapPin, Layers, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gameMeta } from "@/game/metadata";
import { citiesQuery, positionQuery } from "@/services/game";
import { circoLabel, formatPopulation, PLAYABLE_CENTER, PLAYABLE_INSEE, searchCommunes, type CommuneIndexRow, type CommuneRow } from "@/game/france";
import type { MapSelection } from "@/components/game/FranceMap";

const FranceMap = lazy(() => import("@/components/game/FranceMap"));

export const Route = createFileRoute("/_authenticated/_game/france")({
  head: () => ({ meta: gameMeta("Carte de France", "La vraie carte de France : régions, départements, 577 circonscriptions et toutes les communes.") }),
  loader: async ({ context: { queryClient: q } }) => { await Promise.all([q.ensureQueryData(citiesQuery), q.ensureQueryData(positionQuery)]); },
  component: FrancePage,
});

const MapFallback = () => <div className="flex h-[65vh] min-h-[420px] items-center justify-center rounded-xl border border-border bg-card"><LoaderCircle className="animate-spin text-primary" /></div>;

function FrancePage() {
  const { data: cities } = useSuspenseQuery(citiesQuery);
  const { data: position } = useSuspenseQuery(positionQuery);
  const [sel, setSel] = useState<MapSelection | null>(null);
  const [focus, setFocus] = useState<{ lon: number; lat: number; zoom: number; key: number } | null>(null);
  const [showCircos, setShowCircos] = useState(true);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<CommuneIndexRow[] | null>(null);
  const [deps, setDeps] = useState<Record<string, string>>({});
  const [circoCommunes, setCircoCommunes] = useState<CommuneRow[] | null>(null);

  useEffect(() => {
    void fetch("/geo/departements.json").then(r => r.json()).then((g: { features: { properties: { code: string; nom: string } }[] }) =>
      setDeps(Object.fromEntries(g.features.map(f => [f.properties.code, f.properties.nom])))).catch(() => {});
  }, []);
  useEffect(() => { if (q.length >= 2 && !index) void fetch("/geo/communes-index.json").then(r => r.json()).then(setIndex).catch(() => {}); }, [q, index]);
  useEffect(() => {
    setCircoCommunes(null);
    if (sel?.kind !== "circo") return;
    void fetch(`/geo/communes/${sel.dep}.json`).then(r => r.json()).then((rows: CommuneRow[]) => setCircoCommunes(rows.filter(r => r[6] === sel.code).sort((a, b) => b[3] - a[3])));
  }, [sel]);

  const results = useMemo(() => (index ? searchCommunes(index, q) : []), [index, q]);
  const myCity = position?.city_id as string | undefined;

  const pickCommune = async (r: CommuneIndexRow) => {
    setQ("");
    const rows: CommuneRow[] = await fetch(`/geo/communes/${r[3]}.json`).then(x => x.json());
    const row = rows.find(x => x[0] === r[0]); if (!row) return;
    setSel({ kind: "commune", row, dep: r[3] });
    setFocus({ lon: row[4], lat: row[5], zoom: 11, key: Date.now() });
  };
  const locate = () => { const c = myCity ? PLAYABLE_CENTER[myCity] : undefined; if (c) setFocus({ lon: c[0], lat: c[1], zoom: 10, key: Date.now() }); };

  return <div className="space-y-4 animate-rise">
    <div className="flex items-center gap-3"><MapIcon className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Carte de France</h1><p className="text-sm text-muted-foreground">34 969 communes · 101 départements · circonscriptions législatives</p></div></div>

    <div className="relative">
      <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
      <Input className="h-12 pl-10" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une commune ou un code postal" />
      {q.length >= 2 && <ul className="absolute inset-x-0 top-14 z-20 max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
        {!index ? <li className="p-3 text-sm text-muted-foreground">Chargement…</li> : results.length === 0 ? <li className="p-3 text-sm text-muted-foreground">Aucune commune trouvée.</li>
          : results.map(r => <li key={r[0]}><button className="flex min-h-12 w-full items-center justify-between px-4 py-2 text-left hover:bg-accent" onClick={() => void pickCommune(r)}>
            <span className="font-medium">{r[1]}</span><span className="text-xs text-muted-foreground">{r[2]} · {deps[r[3]] ?? r[3]}</span></button></li>)}
      </ul>}
    </div>

    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" className="h-12" onClick={locate} disabled={!myCity}><LocateFixed /> Ma position</Button>
      <Button variant={showCircos ? "default" : "outline"} className="h-12" onClick={() => setShowCircos(v => !v)}><Layers /> Circonscriptions</Button>
    </div>

    <ClientOnly fallback={<MapFallback />}><Suspense fallback={<MapFallback />}><FranceMap onSelect={setSel} focus={focus} showCircos={showCircos} /></Suspense></ClientOnly>
    <p className="text-xs text-muted-foreground">Zoomez pour voir les circonscriptions, puis toutes les communes. Touchez un élément pour sa fiche.</p>

    {sel && <section className="relative space-y-2 rounded-lg border border-primary bg-card p-5">
      <Button size="icon" variant="ghost" className="absolute right-2 top-2 h-11 w-11" aria-label="Fermer" onClick={() => setSel(null)}><X /></Button>
      {sel.kind === "commune" && (() => {
        const [code, name, cp, pop, , , circo] = sel.row; const cityId = PLAYABLE_INSEE[code];
        const city = cities.find(c => c.id === cityId);
        return <>
          <p className="flex items-center gap-1 text-xs font-semibold text-primary"><MapPin className="h-4 w-4" />Commune</p>
          <h2 className="pr-10 text-xl font-bold">{name}</h2>
          <p className="text-sm text-muted-foreground">{cp} · {deps[sel.dep] ?? sel.dep} ({sel.dep}) · {formatPopulation(pop)}</p>
          {circo && <p className="text-sm">{circoLabel(circo, deps[sel.dep] ?? sel.dep)}</p>}
          {city ? (cityId === myCity ? <p className="text-sm font-medium text-primary">Vous êtes ici.</p>
            : <div className="space-y-1"><Button asChild className="h-12 w-full"><Link to="/carte">Y aller (départ depuis la gare)</Link></Button><p className="text-xs text-muted-foreground">Rendez-vous à la gare de votre ville pour prendre un train ou un car vers {city.name}.</p></div>)
            : <p className="text-sm text-muted-foreground">Ville pas encore habitable : Disponible dans une prochaine étape.</p>}
        </>;
      })()}
      {sel.kind === "circo" && <>
        <p className="flex items-center gap-1 text-xs font-semibold text-primary"><Landmark className="h-4 w-4" />Circonscription législative</p>
        <h2 className="pr-10 text-xl font-bold">{circoLabel(sel.code, sel.depName)}</h2>
        {circoCommunes === null ? <p className="text-sm text-muted-foreground">Chargement des communes…</p>
          : circoCommunes.length === 0 ? <p className="text-sm text-muted-foreground">Circonscription située à l'intérieur d'une grande ville.</p>
          : <><p className="text-sm text-muted-foreground">{circoCommunes.length} commune{circoCommunes.length > 1 ? "s" : ""} · {formatPopulation(circoCommunes.reduce((s, r) => s + r[3], 0))}</p>
            <p className="text-sm">{circoCommunes.slice(0, 12).map(r => r[1]).join(", ")}{circoCommunes.length > 12 ? "…" : ""}</p></>}
        <p className="text-xs text-muted-foreground">Les élections législatives par circonscription réelle : Disponible dans une prochaine étape.</p>
      </>}
      {sel.kind === "departement" && <>
        <p className="text-xs font-semibold text-primary">Département</p>
        <h2 className="pr-10 text-xl font-bold">{sel.name} ({sel.code})</h2>
        <Button variant="outline" className="h-12" onClick={() => setSel(null)}>Zoomez pour voir ses communes</Button>
      </>}
    </section>}
  </div>;
}
