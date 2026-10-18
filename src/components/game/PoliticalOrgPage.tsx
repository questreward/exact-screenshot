import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, UserPlus, LogOut, CalendarPlus, CalendarDays, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { politicsQuery, changePoliticalMembership, reservePoliticalEvent } from "@/services/game";
import { POLITICAL_EVENT_KINDS, POLITICAL_KINDS, POLITICAL_ROLE_LABELS, POLITICAL_SCOPES } from "@/game/politics";
import { nextEventDate } from "@/game/social";
import { durationLabel, gameDate, gameHour } from "@/game/life";
import { LocationLink, useLifeMutation } from "./LifeControls";
import { affinityFor, Meter, Personalities } from "./PoliticsPage";

export function PoliticalOrgPage({ id }: { id: string }) {
  const { data: s } = useSuspenseQuery(politicsQuery);
  const join = useLifeMutation(changePoliticalMembership, "Adhésion mise à jour");
  const reserve = useLifeMutation(reservePoliticalEvent, "Activité ajoutée à l’agenda");
  const o = s.organizations.find(o => o.id === id);
  if (!o) return <div className="space-y-4"><p>Organisation introuvable.</p><Button asChild variant="outline"><Link to="/politique">Politique</Link></Button></div>;
  const m = s.memberships.find(m => m.organization_id === id && m.status === "active");
  const aff = affinityFor(s)(o);
  const localOnly = o.scope === "local" && o.city_id !== s.city_id;
  const otherParty = o.kind === "party" && s.settings.single_party ? s.memberships.find(x => x.kind === "party" && x.status === "active" && x.organization_id !== id) : undefined;
  const running = s.activities.some(a => a.organization_id === id && a.status === "running");
  const events = [...o.events].sort((a, b) => Number(b.location.city_id === s.city_id) - Number(a.location.city_id === s.city_id));
  return <div className="space-y-7 animate-rise">
    <Button variant="ghost" asChild className="px-0"><Link to="/politique"><ChevronLeft />Politique</Link></Button>
    <header className="space-y-3"><span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-4xl text-primary">{o.symbol}</span><p className="text-sm text-primary">{POLITICAL_KINDS[o.kind]} · Portée {POLITICAL_SCOPES[o.scope]?.toLowerCase()} · Origine : {o.city_name}</p><h1 className="text-3xl font-bold break-words">{o.name}</h1><p className="italic text-muted-foreground">« {o.slogan} »</p><p>{o.description}</p><p className="text-sm text-muted-foreground">Active · Organisation fictive · Créée le {gameDate(o.created_at).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</p></header>
    <dl className="grid grid-cols-3 gap-3 border-y border-border py-4">{[["Membres", o.member_count], ["Réputation", o.reputation], ["Influence", o.influence]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 text-xl font-semibold">{v}</dd></div>)}</dl>
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p>{aff === null ? <span className="text-muted-foreground">Définissez vos opinions pour voir votre affinité indicative.</span> : <>Affinité indicative : <strong>{aff} %</strong> <span className="text-xs text-muted-foreground">— vous restez libre de votre choix.</span></>}</p>
      {m ? <div className="space-y-3"><p className="text-success">Membre · Rôle : {POLITICAL_ROLE_LABELS[m.role] ?? m.role} · {m.progress} participation(s)</p><Button variant="outline" className="h-11" disabled={join.isPending || running} onClick={() => join.mutate({ organizationId: id, join: false })}><LogOut />Quitter l’organisation</Button>{running && <p className="text-sm text-muted-foreground">Terminez l’activité en cours avant de quitter.</p>}</div>
        : <div className="space-y-2"><Button className="h-11" disabled={join.isPending || localOnly || !!otherParty} onClick={() => join.mutate({ organizationId: id, join: true })}><UserPlus />Rejoindre</Button>{localOnly && <p className="text-sm text-muted-foreground">Ce mouvement local accueille uniquement les habitants de {o.city_name}.</p>}{otherParty && <p className="text-sm text-muted-foreground">Vous êtes déjà membre de {otherParty.name}. Un seul parti à la fois ; les mouvements restent cumulables.</p>}<p className="text-xs text-muted-foreground">Vous commencez comme Membre. Les autres rôles viendront plus tard.</p></div>}
      <Button asChild variant="ghost"><Link to="/politique" search={{ tab: "comparer", a: o.id }}><Scale />Comparer avec une autre organisation</Link></Button>
    </section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Positionnement</h2><p className="text-xs text-muted-foreground">Repères internes au jeu, pas une vérité absolue.</p><div className="grid gap-3 sm:grid-cols-2">{s.axes.map(a => <div key={a.id}><Meter value={o.ideology[a.id] ?? 50} label={a.label} /><div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{a.low_label}</span><span>{a.high_label}</span></div></div>)}</div></section>
    <section className="grid gap-4 sm:grid-cols-2"><div><h2 className="mb-2 text-lg font-semibold">Valeurs</h2><ul className="list-inside list-disc text-sm">{o.core_values.map(v => <li key={v}>{v}</li>)}</ul></div><div><h2 className="mb-2 text-lg font-semibold">Priorités</h2><ol className="list-inside list-decimal text-sm">{o.priorities.map(v => <li key={v}>{v}</li>)}</ol></div></section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Implantation</h2><div className="grid gap-3 sm:grid-cols-2">{o.branches.map(b => <div key={b.city_id + b.kind} className="space-y-2 rounded-lg border border-border bg-card p-4"><p className="font-medium">{b.kind === "siege" ? "Siège" : "Permanence locale"} · {b.city_name}</p><p className="text-sm text-muted-foreground">{b.location.name}</p><LocationLink location={b.location} label="Voir sur la carte" /></div>)}</div></section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Activités</h2><div className="space-y-3">{events.map(e => {
      const a = s.activities.find(a => a.organization_event_id === e.id && (a.status === "planned" || a.status === "running"));
      const date = a?.start_time ?? nextEventDate(s.world_now, e.start_hour);
      const here = e.location.city_id === s.city_id;
      return <article key={e.id} className="space-y-2 rounded-lg border border-border bg-card p-4"><p className="text-xs text-primary">{POLITICAL_EVENT_KINDS[e.political_kind] ?? "Activité"} · {e.city_name}</p><h3 className="font-semibold">{e.title}</h3><p className="text-sm text-muted-foreground">{e.description}</p><p className="text-sm">{gameDate(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })} · {gameHour(date)} · {durationLabel(e.duration_minutes)} · {e.location.name}</p><p className="text-xs text-primary">−{e.energy_cost} énergie · +{e.political_reputation_gain} réputation politique · +{e.political_influence_gain} influence politique · +{e.political_engagement_gain} engagement</p>
        <div className="flex flex-wrap gap-2">{a ? <Button asChild variant="outline" className="h-11"><Link to="/agenda"><CalendarDays />Voir dans l’agenda</Link></Button> : <Button className="h-11" disabled={!m || !here || reserve.isPending} onClick={() => reserve.mutate(e.id)}><CalendarPlus />Participer</Button>}<LocationLink location={e.location} label="Voir sur la carte" /></div>
        {!m && <p className="text-xs text-muted-foreground">Réservé aux membres.</p>}{m && !here && <p className="text-xs text-muted-foreground">Cette activité a lieu dans une autre ville.</p>}
      </article>;
    })}</div></section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Dirigeants et personnalités</h2><Personalities s={s} organizationId={o.id} /></section>
  </div>;
}
