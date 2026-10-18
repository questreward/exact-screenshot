import { Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Scale, UserRound, Users, Vote, Sparkles, Info, HandHeart, MapPin, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { politicsQuery, positionQuery, setPoliticalOpinion, interactSocial } from "@/services/game";
import { POLITICAL_KINDS, POLITICAL_ROLE_LABELS, POLITICAL_SCOPES, compareAxes, compareLists, gapLabel, politicalAffinity, type PoliticalOrganization, type PoliticalState } from "@/game/politics";
import { gameDate } from "@/game/life";
import { LocationLink, useLifeMutation } from "./LifeControls";
import { cn } from "@/lib/utils";
import { GovernanceLink } from './GovernancePage';

export const POLITICS_TABS = [
  { id: "decouvrir", label: "Découvrir", icon: Vote },
  { id: "opinions", label: "Mes opinions", icon: Sparkles },
  { id: "comparer", label: "Comparer", icon: Scale },
  { id: "personnalites", label: "Personnalités", icon: UserRound },
  { id: "profil", label: "Mon profil", icon: Users },
] as const;
export type PoliticsSearch = { tab?: string | undefined; a?: string | undefined; b?: string | undefined };

export function affinityFor(s: PoliticalState) {
  return (o: PoliticalOrganization) => politicalAffinity(o.ideology, s.opinions, s.topics, s.stances);
}

export function Meter({ value, label }: { value: number; label: string }) {
  return <div><div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

function Chips({ items, tone = "default" }: { items: string[]; tone?: "default" | "muted" }) {
  return <div className="flex flex-wrap gap-2">{items.map(i => <span key={i} className={cn("rounded-full px-3 py-1 text-xs", tone === "default" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{i}</span>)}</div>;
}

export function PoliticsPage({ search }: { search: PoliticsSearch }) {
  const { data: s } = useSuspenseQuery(politicsQuery);
  const tab = POLITICS_TABS.some(t => t.id === search.tab) ? search.tab : "decouvrir";
  return <div className="space-y-6 animate-rise">
    <header className="space-y-2"><p className="text-sm text-primary">Vie politique fictive</p><h1 className="text-3xl font-bold">Politique</h1><p className="text-muted-foreground">Découvrez les idées, comparez, et engagez-vous seulement si vous le souhaitez.</p></header>
    <Button asChild variant="outline" className="min-h-12"><Link to="/elections"><Vote/>Élections municipales<ArrowRight/></Link></Button>
    <GovernanceLink/>
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Rubriques politiques">{POLITICS_TABS.map(t => <Button key={t.id} asChild variant={tab === t.id ? "default" : "outline"} className="h-11 shrink-0"><Link to="/politique" search={{ tab: t.id }}><t.icon />{t.label}</Link></Button>)}</nav>
    {tab === "decouvrir" && <Discover s={s} />}
    {tab === "opinions" && <Opinions s={s} />}
    {tab === "comparer" && <Compare s={s} a={search.a} b={search.b} />}
    {tab === "personnalites" && <Personalities s={s} />}
    {tab === "profil" && <Profile s={s} />}
  </div>;
}

function OrgCard({ o, s }: { o: PoliticalOrganization; s: PoliticalState }) {
  const aff = affinityFor(s)(o);
  const member = s.memberships.some(m => m.organization_id === o.id && m.status === "active");
  return <article className="space-y-3 rounded-lg border border-border bg-card p-5">
    <div className="flex items-start gap-3"><span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-2xl text-primary">{o.symbol}</span><div className="min-w-0"><p className="text-xs text-muted-foreground">{POLITICAL_KINDS[o.kind]} · Portée {POLITICAL_SCOPES[o.scope]?.toLowerCase()} · {o.city_name}</p><h3 className="text-lg font-semibold break-words">{o.name}</h3></div></div>
    <p className="text-sm text-muted-foreground">{o.description}</p>
    <Chips items={o.core_values} />
    <p className="text-sm"><span className="text-muted-foreground">Priorités : </span>{o.priorities.join(" · ")}</p>
    <div className="grid grid-cols-3 gap-2 text-sm"><p><span className="block text-xs text-muted-foreground">Réputation</span>{o.reputation}</p><p><span className="block text-xs text-muted-foreground">Influence</span>{o.influence}</p><p><span className="block text-xs text-muted-foreground">Membres</span>{o.member_count}</p></div>
    <p className="text-sm">{aff === null ? <span className="text-muted-foreground">Affinité : définissez vos opinions pour la voir</span> : <>Affinité indicative : <strong>{aff} %</strong></>}{member && <span className="ml-2 text-success">· Vous êtes membre</span>}</p>
    <Button asChild variant="outline" className="h-11 w-full sm:w-auto"><Link to="/politique/$id" params={{ id: o.id }}>Consulter <ArrowRight /></Link></Button>
  </article>;
}

function Discover({ s }: { s: PoliticalState }) {
  const parties = s.organizations.filter(o => o.kind === "party"), movements = s.organizations.filter(o => o.kind === "movement");
  return <div className="space-y-8">
    <p className="flex gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"><Info className="h-5 w-5 shrink-0 text-primary" />Tous les partis, mouvements et personnalités sont fictifs. Les associations citoyennes restent dans « Organisations ».</p>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Partis politiques</h2><div className="grid gap-4 md:grid-cols-2">{parties.map(o => <OrgCard key={o.id} o={o} s={s} />)}</div></section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Mouvements politiques</h2><div className="grid gap-4 md:grid-cols-2">{movements.map(o => <OrgCard key={o.id} o={o} s={s} />)}</div></section>
    <Button asChild variant="ghost"><Link to="/actualites"><Newspaper />Suivre l’actualité politique</Link></Button>
  </div>;
}

function Opinions({ s }: { s: PoliticalState }) {
  const save = useLifeMutation(setPoliticalOpinion, "Opinion enregistrée");
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Vos opinions vous appartiennent : rien n’est déduit de votre âge, de votre métier ou de votre parcours. Vous pouvez avoir des positions qui semblent contradictoires et les changer à tout moment.</p>
    {s.topics.map(t => {
      const current = s.opinions.find(o => o.topic_id === t.id)?.stance ?? "undefined";
      return <fieldset key={t.id} className="space-y-3 rounded-lg border border-border bg-card p-4"><legend className="sr-only">{t.label}</legend><div><p className="font-semibold">{t.label}</p><p className="text-sm text-muted-foreground">{t.description}</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{s.stances.map(st => <Button key={st.id} variant={current === st.id ? "default" : "outline"} aria-pressed={current === st.id} disabled={save.isPending} className="h-11" onClick={() => current !== st.id && save.mutate({ topicId: t.id, stance: st.id })}>{st.label}</Button>)}</div>
      </fieldset>;
    })}
    <AffinityList s={s} />
  </div>;
}

function AffinityList({ s }: { s: PoliticalState }) {
  const aff = affinityFor(s);
  const rows = s.organizations.map(o => ({ o, v: aff(o) }));
  if (rows.every(r => r.v === null)) return null;
  return <section className="space-y-3 rounded-lg border border-border bg-card p-4"><h2 className="font-semibold">Vos affinités (indicatives)</h2><p className="text-xs text-muted-foreground">Une simple indication : elle ne décide rien à votre place et ne vous empêche jamais de rejoindre une organisation.</p>{rows.map(({ o, v }) => <Link key={o.id} to="/politique/$id" params={{ id: o.id }} className="block"><Meter value={v ?? 0} label={`${o.symbol} ${o.name}`} /></Link>)}</section>;
}

function Compare({ s, a, b }: { s: PoliticalState; a?: string | undefined; b?: string | undefined }) {
  const navigate = useNavigate();
  const A = s.organizations.find(o => o.id === a) ?? s.organizations[0], B = s.organizations.find(o => o.id === b) ?? s.organizations[1];
  if (!A || !B) return null;
  const aff = affinityFor(s);
  const values = compareLists(A.core_values, B.core_values), prios = compareLists(A.priorities, B.priorities);
  const pick = (side: "a" | "b", id: string) => navigate({ to: "/politique", search: { tab: "comparer", a: side === "a" ? id : A.id, b: side === "b" ? id : B.id } });
  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Le comparateur présente les différences, sans désigner de « meilleure » organisation. Les positions sont des repères internes au jeu.</p>
    <div className="grid grid-cols-2 gap-3">{(["a", "b"] as const).map(side => <label key={side} className="space-y-1 text-sm"><span className="text-muted-foreground">{side === "a" ? "Première" : "Seconde"} organisation</span><select className="h-11 w-full rounded-md border border-input bg-background px-2" value={side === "a" ? A.id : B.id} onChange={e => pick(side, e.target.value)}>{s.organizations.map(o => <option key={o.id} value={o.id}>{o.symbol} {o.name}</option>)}</select></label>)}</div>
    <section className="space-y-4 rounded-lg border border-border bg-card p-4"><h2 className="font-semibold">Positions sur chaque axe</h2>{compareAxes(A, B, s.axes).map(r => <div key={r.axis.id} className="space-y-1"><div className="flex justify-between text-sm"><span className="font-medium">{r.axis.label}</span><span className="text-xs text-muted-foreground">{gapLabel(r.gap)}</span></div><div className="relative h-3 rounded-full bg-muted"><span title={A.name} className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary" style={{ left: `${r.a}%` }} /><span title={B.name} className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground" style={{ left: `${r.b}%` }} /></div><div className="flex justify-between text-[11px] text-muted-foreground"><span>{r.axis.low_label}</span><span>{r.axis.high_label}</span></div><p className="text-xs">{A.symbol} {r.a} · {B.symbol} {r.b}</p></div>)}<p className="flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-primary" />{A.name}</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-foreground" />{B.name}</span></p></section>
    <section className="grid gap-4 md:grid-cols-2">{[["Valeurs", values], ["Priorités", prios]].map(([title, l]) => { const list = l as ReturnType<typeof compareLists>; return <div key={title as string} className="space-y-3 rounded-lg border border-border bg-card p-4"><h2 className="font-semibold">{title as string}</h2>{list.common.length > 0 && <div><p className="mb-1 text-xs text-muted-foreground">En commun</p><Chips items={list.common} /></div>}<div><p className="mb-1 text-xs text-muted-foreground">Seulement {A.name}</p><Chips items={list.onlyA.length ? list.onlyA : ["—"]} tone="muted" /></div><div><p className="mb-1 text-xs text-muted-foreground">Seulement {B.name}</p><Chips items={list.onlyB.length ? list.onlyB : ["—"]} tone="muted" /></div></div>; })}</section>
    <section className="overflow-x-auto rounded-lg border border-border bg-card p-4"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2"></th><th>{A.symbol} {A.name}</th><th>{B.symbol} {B.name}</th></tr></thead><tbody className="divide-y divide-border">{[["Type", POLITICAL_KINDS[A.kind], POLITICAL_KINDS[B.kind]], ["Réputation", A.reputation, B.reputation], ["Influence", A.influence, B.influence], ["Membres", A.member_count, B.member_count], ["Implantation", A.branches.map(x => x.city_name).join(", "), B.branches.map(x => x.city_name).join(", ")], ["Votre affinité", aff(A) === null ? "—" : `${aff(A)} %`, aff(B) === null ? "—" : `${aff(B)} %`]].map(row => <tr key={String(row[0])}><th className="py-2 pr-3 text-left font-normal text-muted-foreground">{row[0]}</th><td className="pr-3">{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></section>
  </div>;
}

export function Personalities({ s, organizationId }: { s: PoliticalState; organizationId?: string }) {
  const { data: pos } = useSuspenseQuery(positionQuery);
  const meet = useLifeMutation(interactSocial, "Nouvelle rencontre");
  const list = s.personalities.filter(p => !organizationId || p.organization?.id === organizationId).sort((a, b) => Number(b.city_id === s.city_id) - Number(a.city_id === s.city_id));
  return <div className="space-y-3">
    {!organizationId && <p className="text-sm text-muted-foreground">Personnages fictifs. Rendez-vous sur leur lieu pour vous présenter ; la relation évolue ensuite comme vos autres contacts.</p>}
    <div className="grid gap-3 md:grid-cols-2">{list.map(p => {
      const here = pos?.location_id === p.location.id;
      return <article key={p.id} className="space-y-2 rounded-lg border border-border bg-card p-4"><p className="text-xs text-primary">{p.political_role} · {p.city_name}</p><h3 className="font-semibold">{p.first_name} {p.last_name}, {p.age} ans</h3><p className="text-sm text-muted-foreground">{p.description}</p>{p.organization && <p className="text-sm">{p.organization.symbol} <Link className="underline underline-offset-4" to="/politique/$id" params={{ id: p.organization.id }}>{p.organization.name}</Link></p>}<p className="text-xs text-muted-foreground">Réputation {p.reputation} · Influence {p.influence} · {p.location.name}</p>
        {p.relation ? <p className="text-sm text-success"><HandHeart className="mr-1 inline h-4 w-4" />Contact · {p.relation.level} ({p.relation.score}/100)</p> : here ? <Button className="h-11" disabled={meet.isPending} onClick={() => meet.mutate({ npcId: p.id, actionId: "introduce" })}><HandHeart />Se présenter</Button> : <LocationLink location={p.location} label="Aller à sa rencontre" />}
      </article>;
    })}</div>
  </div>;
}

function Profile({ s }: { s: PoliticalState }) {
  const active = s.memberships.filter(m => m.status === "active");
  const defined = s.opinions.filter(o => o.stance !== "undefined").length;
  const contacts = s.personalities.filter(p => p.relation).length;
  return <div className="space-y-5">
    <section className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"><Meter value={s.stats.interest} label="Intérêt politique" /><Meter value={s.stats.engagement} label="Engagement politique" /><Meter value={s.stats.reputation} label="Réputation politique" /><Meter value={s.stats.influence} label="Influence politique" /></section>
    <p className="text-sm text-muted-foreground">Ces valeurs évoluent uniquement par vos actions : opinions définies, adhésions et activités. Elles sont distinctes de votre réputation et de votre influence sociales et ne s’achètent pas.</p>
    <section className="space-y-2"><h2 className="text-lg font-semibold">Mes organisations politiques</h2>{active.length ? active.map(m => <Link key={m.id} to="/politique/$id" params={{ id: m.organization_id }} className="flex min-h-14 items-center justify-between rounded-lg border border-border bg-card px-4"><span>{m.symbol} {m.name}</span><span className="text-sm text-primary">{POLITICAL_ROLE_LABELS[m.role] ?? m.role} · {m.progress} participation(s)</span></Link>) : <p className="text-sm text-muted-foreground">Aucune adhésion : c’est un choix possible.</p>}</section>
    <p className="text-sm">{defined} opinion(s) définie(s) · {contacts} contact(s) politique(s)</p>
    <section className="space-y-2"><h2 className="text-lg font-semibold">Historique</h2>{s.history.length ? <ul className="divide-y divide-border">{s.history.slice(0, 20).map((h, i) => <li key={i} className="py-2 text-sm"><span className="text-muted-foreground">{gameDate(h.occurred_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })} · </span>{h.kind === "joined" ? `Adhésion : ${h.label}` : h.kind === "left" ? `Départ : ${h.label}` : `${h.label} : +${h.reputation} réputation, +${h.influence} influence`}</li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune participation pour l’instant.</p>}</section>
    <Button asChild variant="outline"><Link to="/agenda"><MapPin />Mon agenda</Link></Button>
  </div>;
}
