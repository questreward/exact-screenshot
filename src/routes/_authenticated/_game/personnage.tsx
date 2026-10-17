import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CharacterCard } from "@/components/game/CharacterCard";
import { APPEARANCE_OPTIONS, normalizeAppearance, type Appearance, type Option } from "@/game/appearance";
import { characterQuery } from "@/services/game";

export const Route = createFileRoute("/_authenticated/_game/personnage")({
  head: () => ({ meta: [{ title: "Personnage — CIVITAS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(characterQuery),
  component: CharacterPage,
});

const LABELS: Record<keyof Appearance, string> = {
  silhouette: "Silhouette", skin: "Teint", hair: "Cheveux", hairColor: "Couleur", outfit: "Vêtements", style: "Style",
};

function CharacterPage() {
  const { data: c } = useSuspenseQuery(characterQuery);
  if (!c) return null;
  const a = normalizeAppearance(c.appearance);
  return (
    <div className="space-y-6 animate-rise">
      <h1 className="text-3xl font-bold">Personnage</h1>
      <CharacterCard character={c} />
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
