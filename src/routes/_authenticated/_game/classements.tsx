import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, LoaderCircle, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLifeMutation } from "@/components/game/LifeControls";
import { rankingsQuery, rankingsSetWealth, type RankingKind } from "@/services/game";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/classements")({
  head: () => ({ meta: gameMeta("Classements", "Les joueurs les plus réputés, influents, populaires et fortunés.") }),
  component: RankingsPage,
});

const KINDS: { id: RankingKind; label: string; unit: string }[] = [
  { id: "reputation", label: "Réputation", unit: "pts" },
  { id: "influence", label: "Influence", unit: "pts" },
  { id: "popularite", label: "Popularité", unit: "abonnés" },
  { id: "fortune", label: "Fortune", unit: "crédits" },
];

function RankingsPage() {
  const [kind, setKind] = useState<RankingKind>("reputation");
  const [city, setCity] = useState<string | null>(null);
  const { data: st, isError, isLoading } = useQuery(rankingsQuery(kind, city));
  const wealth = useLifeMutation(rankingsSetWealth, "Préférence enregistrée");
  const unit = KINDS.find(k => k.id === kind)!.unit;
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><BarChart3 className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Classements</h1><p className="text-sm text-muted-foreground">Les 20 premiers joueurs.</p></div></header>
    <div className="grid grid-cols-2 gap-2">{KINDS.map(k => <Button key={k.id} variant={kind === k.id ? "default" : "outline"} className="h-12" onClick={() => setKind(k.id)}>{k.label}</Button>)}</div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      <Button variant={city === null ? "default" : "outline"} className="h-11 shrink-0" onClick={() => setCity(null)}>Toute la France</Button>
      {st?.cities.map(c => <Button key={c.id} variant={city === c.id ? "default" : "outline"} className="h-11 shrink-0" onClick={() => setCity(c.id)}>{c.name}</Button>)}
    </div>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Classements : Disponible dans une prochaine étape.</p>}
    {st && <>
      {kind === "fortune" && <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <span className="text-sm">Afficher ma fortune dans ce classement<br /><span className="text-xs text-muted-foreground">Désactivé par défaut : votre argent reste privé.</span></span>
        <Switch checked={st.show_wealth} disabled={wealth.isPending} onCheckedChange={v => wealth.mutate(v)} />
      </label>}
      {st.mine && <p className="rounded-xl bg-primary/10 p-4 text-sm">Votre rang : <b>{st.mine.rank}</b> sur {st.mine.total} · {st.mine.score} {unit}</p>}
      <ol className="space-y-2">
        {st.top.length === 0 && <p className="text-sm text-muted-foreground">Personne dans ce classement pour l'instant.</p>}
        {st.top.map(r => <li key={r.id} className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${r.id === st.me ? "border-primary" : "border-border"}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-heading font-bold">{r.rank <= 3 ? <Medal className="h-5 w-5 text-primary" /> : r.rank}</span>
          <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{r.name}</span><span className="text-xs text-muted-foreground">{r.city}</span></span>
          <span className="shrink-0 text-sm font-bold">{r.score} <span className="text-xs font-normal text-muted-foreground">{unit}</span></span>
        </li>)}
      </ol>
    </>}
  </div>;
}
