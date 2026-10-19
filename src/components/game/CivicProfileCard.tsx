import { useQuery } from "@tanstack/react-query";
import { Landmark, LoaderCircle } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import { normalizeAppearance } from "@/game/appearance";
import { SKILL_LABELS } from "@/game/life-profile";
import { publicPhotoQuery, publicProfileQuery } from "@/services/game";

/** Photo publique d'un joueur si elle est autorisée, sinon son avatar. */
export function PlayerPortrait({ id, appearance, hasPhoto, className }: { id: string; appearance: unknown; hasPhoto: boolean; className?: string }) {
  const { data: photo } = useQuery({ ...publicPhotoQuery(id), enabled: hasPhoto });
  return <CharacterAvatar appearance={normalizeAppearance(appearance)} photo={hasPhoto ? photo : null} className={className} />;
}

/** Carte « Profil citoyen » : uniquement ce que le joueur a choisi de rendre public. */
export function CivicProfileCard({ id }: { id: string }) {
  const { data: p, isLoading, isError } = useQuery(publicProfileQuery(id));
  if (isLoading) return <LoaderCircle className="mx-auto animate-spin text-primary" />;
  if (isError || !p) return null;
  return <section className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 text-secondary-foreground"><Landmark className="h-4 w-4" /><span className="font-heading text-xs font-bold tracking-wider">PROFIL CITOYEN</span></div>
    <div className="flex gap-3 p-3">
      <div className="aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg border border-border"><PlayerPortrait id={id} appearance={p.appearance} hasPhoto={p.has_photo} /></div>
      <div className="min-w-0 space-y-1">
        <p className="font-heading text-lg font-bold leading-tight">{p.name}</p>
        <p className="text-sm text-muted-foreground">{p.age} ans · {p.city}{p.job ? ` · ${p.job}` : ""}</p>
        {p.party && <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold">{p.party}</span>}
        <p className="text-xs text-muted-foreground">Réputation {p.engagement.reputation} · Réputation politique {p.engagement.political_reputation} · {p.engagement.followers} abonné(s)</p>
      </div>
    </div>
    <div className="space-y-2 border-t border-border p-3 text-sm">
      {p.mandates && p.mandates.length > 0 && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Mandats</p>
        {p.mandates.map((m, i) => <p key={i}>{m.function} de {m.city} · {new Date(m.starts_at).getFullYear()}–{m.active ? "en cours" : new Date(m.ends_at).getFullYear()}</p>)}</div>}
      {p.organizations && p.organizations.length > 0 && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Engagements</p><p>{p.organizations.map(o => o.name).join(" · ")}</p></div>}
      {p.projects && <p><span className="text-xs font-semibold uppercase text-muted-foreground">Projets </span>{p.projects.proposed} proposé(s), {p.projects.done} réalisé(s), {p.projects.petitions} pétition(s)</p>}
      {p.skills && p.skills.length > 0 && <div className="flex flex-wrap gap-1.5">{p.skills.map(s => <span key={s.dimension} className="rounded-full bg-muted px-2 py-0.5 text-xs">{SKILL_LABELS[s.dimension]} {s.value}</span>)}</div>}
    </div>
  </section>;
}
