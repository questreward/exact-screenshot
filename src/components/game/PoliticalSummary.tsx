import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Vote } from "lucide-react";
import { politicsQuery } from "@/services/game";
import { POLITICAL_ROLE_LABELS } from "@/game/politics";

export function PoliticalSummary() {
  const { data: s } = useSuspenseQuery(politicsQuery);
  const active = s.memberships.filter(m => m.status === "active");
  return <section className="space-y-2 border-b border-border pb-4">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Vote className="h-5 w-5 text-primary" />Profil politique</h2>
    <p className="text-sm text-muted-foreground">Intérêt {s.stats.interest} · Engagement {s.stats.engagement} · Réputation politique {s.stats.reputation} · Influence politique {s.stats.influence}</p>
    {active.length ? <ul className="space-y-1">{active.map(m => <li key={m.id}><Link to="/politique/$id" params={{ id: m.organization_id }} className="text-sm text-primary">{m.symbol} {m.name} · {POLITICAL_ROLE_LABELS[m.role] ?? m.role}</Link></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune organisation politique.</p>}
    <Link to="/politique" search={{ tab: "profil" }} className="inline-flex min-h-11 items-center text-sm text-primary">Voir mon profil politique</Link>
  </section>;
}
