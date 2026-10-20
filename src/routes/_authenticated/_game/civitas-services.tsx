import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Compass, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { gameMeta } from "@/game/metadata";
import { searchServices } from "@/game/civitas-services";

export const Route = createFileRoute("/_authenticated/_game/civitas-services")({
  head: () => ({ meta: gameMeta("CIVITAS Services", "Toutes les démarches, logements, emplois et entreprises du jeu réunis par besoin de vie.") }),
  component: ServicesHub,
});

function ServicesHub() {
  const [q, setQ] = useState("");
  const groups = searchServices(q);
  return <main className="mx-auto max-w-4xl space-y-5 p-4 pb-24">
    <header className="flex items-center gap-3"><Compass className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">CIVITAS Services</h1><p className="text-sm text-muted-foreground">Trouve le bon service selon ce dont tu as besoin.</p></div></header>
    <label className="relative block"><span className="sr-only">Rechercher un service</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Je veux… louer, assurer, travailler…" className="h-12 pl-10 text-base" /></label>
    <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Simulation CIVITAS. Les entreprises des joueurs passent en priorité ; des entreprises fictives prennent le relais quand il n'y en a pas.</p>
    {groups.length === 0 && <p className="text-sm text-muted-foreground">Aucun service ne correspond. Essaie un autre mot.</p>}
    {groups.map(g => <section key={g.id} className="space-y-2">
      <h2 className="font-heading text-lg font-semibold">{g.label}</h2>
      <div className="grid gap-2 sm:grid-cols-2">{g.services.map(s =>
        <Link key={s.id} to={s.path} className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary">
          <span className="min-w-0 flex-1"><span className="block font-semibold">{s.label}</span><span className="block text-sm text-muted-foreground">{s.real}</span></span>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary" /></Link>)}</div>
    </section>)}
  </main>;
}
