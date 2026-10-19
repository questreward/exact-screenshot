import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CharacterCard } from "@/components/game/CharacterCard";
import { APPEARANCE_OPTIONS, normalizeAppearance, type Appearance, type Option } from "@/game/appearance";
import { characterQuery, lifeQuery, socialQuery, organizationsQuery, civicQuery, politicsQuery } from "@/services/game";
import { PoliticalSummary } from "@/components/game/PoliticalSummary";
import { CivicSummary } from '@/components/game/CivicSummary';
import { Link } from "@tanstack/react-router";
import { SocialSummary } from "@/components/game/SocialSummary";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/personnage")({
  head: () => ({ meta: gameMeta("Personnage", "Votre identité et votre apparence dans CIVITAS.") }),
  loader: async ({ context: { queryClient: q } }) => { const c = await q.ensureQueryData(characterQuery); await Promise.all([q.ensureQueryData(lifeQuery), q.ensureQueryData(socialQuery), q.ensureQueryData(organizationsQuery(c?.city_id ?? 'paris')),q.ensureQueryData(civicQuery),q.ensureQueryData(politicsQuery)]); },
  component: CharacterPage,
});

const LABELS: Record<keyof Appearance, string> = {
  silhouette: "Silhouette", skin: "Teint", hair: "Cheveux", hairColor: "Couleur", outfit: "Vêtements", style: "Style", accessory: "Accessoire",
};

function CharacterPage() {
  const { data: c } = useSuspenseQuery(characterQuery);
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { data: social } = useSuspenseQuery(socialQuery);
  const { data: orgs } = useSuspenseQuery(organizationsQuery(c?.city_id ?? 'paris'));
  if (!c) return null;
  const a = normalizeAppearance(c.appearance);
  return (
    <div className="space-y-6 animate-rise">
      <h1 className="text-3xl font-bold">Personnage</h1>
      <CharacterCard character={c} />
      <section className="border-y border-border py-4"><h2 className="mb-2 text-lg font-semibold">Vie</h2><p>{c.situation}</p><p className="mt-1 text-sm text-muted-foreground">{life.housing?.name} · {life.housing?.location.name} · Énergie {life.character.energy}/100</p></section>
      <SocialSummary />
      <CivicSummary profile/>
      <PoliticalSummary />
      <section><h2 className="mb-3 text-lg font-semibold">Mes organisations</h2><ul className="space-y-3">{orgs.filter(o => social.memberships.some(m => m.organization_id === o.id && m.status === 'active')).map(o => <li key={o.id}><Link to="/organisations/$id" params={{ id: o.id }} search={{ city: c.city_id }} className="text-primary">{o.name} · Membre</Link></li>)}</ul>{!social.memberships.some(m => m.status === 'active') && <p className="text-sm text-muted-foreground">Aucune adhésion active.</p>}</section>
      <section><h2 className="mb-3 text-lg font-semibold">Relations importantes</h2><ul className="space-y-2">{social.relations.slice(0,3).map(r => <li key={r.id}><Link to="/telephone" search={{ app: 'contacts' }} className="text-sm text-primary">{r.npc.first_name} {r.npc.last_name} · {r.level}</Link></li>)}</ul></section>
      <div className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
        <h2 className="text-lg font-semibold">Apparence</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(LABELS) as (keyof Appearance)[]).map((k) => (
            <div key={k} className="rounded-2xl bg-accent/60 p-3">
              <dt className="text-xs text-muted-foreground">{LABELS[k]}</dt>
              <dd className="font-semibold">{(APPEARANCE_OPTIONS[k] as Option[]).find((o) => o.id === a[k])?.label}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-sm text-muted-foreground">Créé le {new Date(c.created_at).toLocaleDateString("fr-FR")}</p>
    </div>
  );
}
