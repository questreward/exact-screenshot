import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { gameMeta } from "@/game/metadata";
import { PUBLIC_SERVICES, searchServices } from "@/game/public-services";

export const Route = createFileRoute("/_authenticated/_game/services-publics")({
  head: () => ({ meta: gameMeta("Mes services publics", "Toutes tes administrations CIVITAS au même endroit : aides, emploi, santé, impôts, retraite, logement, mairie, préfecture, justice.") }),
  component: PublicServicesPage,
});

function PublicServicesPage() {
  const [q, setQ] = useState("");
  const hits = searchServices(q);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="font-heading text-2xl font-bold">🇫🇷 Mes services publics</h1>
        <p className="text-sm text-muted-foreground">Toutes tes administrations au même endroit. Services fictifs propres à CIVITAS.</p>
      </header>
      <label className="block">
        <span className="text-sm font-semibold">Quelle démarche cherchez-vous ?</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="logement, emploi, impôts, naissance…" className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base" />
      </label>
      {q.trim() && (
        <ul className="space-y-2">{hits.length === 0 ? <li className="text-sm text-muted-foreground">Aucune démarche trouvée. Essaie un autre mot.</li> : hits.map((h) => (
          <li key={h.label}><Link to={h.to} className="flex min-h-12 items-center justify-between rounded-xl border border-border bg-card px-4 py-3"><span>{h.label}</span><span className="text-xs text-muted-foreground">{h.service}</span></Link></li>))}</ul>)}
      <div className="grid grid-cols-2 gap-3">{PUBLIC_SERVICES.map((s) => (
        <Link key={s.id} to={s.to} className="flex min-h-24 flex-col rounded-xl border border-border bg-card p-3">
          <span className="text-2xl">{s.emoji}</span>
          <span className="font-heading font-bold">{s.name}</span>
          <span className="text-xs text-muted-foreground">{s.role}</span>
        </Link>))}</div>
    </div>
  );
}
