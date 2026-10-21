import { Suspense, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { housingQuery } from "@/services/game";
import type { FurnishingHome, Furniture } from "@/game/home-furnishing";
import { DailyActions } from "./LifeControls";
import { HomeInvitesPanel } from "./HomeVisits";

const MOMENTS: Record<string, [string, string]> = {
  sofa: ["🛋️ S'installer dans le canapé", "Tu t'installes confortablement. La ville peut attendre un instant."],
  bed: ["🛏️ S'allonger un moment", "Tu fermes les yeux quelques secondes. Pour vraiment récupérer, lance « Se reposer »."],
  mattress: ["🛏️ S'allonger un moment", "Tu fermes les yeux quelques secondes. Pour vraiment récupérer, lance « Se reposer »."],
  fridge: ["🍳 Ouvrir le frigo", "Tu regardes ce qu'il reste. Pour vraiment manger, lance le repas ci-dessous."],
  shelf: ["📚 Regarder l'étagère", "Tes affaires racontent un peu ton parcours."],
  washer: ["🧺 Lancer une machine", "Le linge tourne. Une petite chose de faite."],
};

/** Life at home: real daily actions (rest/eat) + light moments from owned furniture + a compact hub. */
export function HomeLife({ home, furniture }: { home: FurnishingHome; furniture: Furniture[] }) {
  const kinds = new Set(home.placements.map(p => furniture.find(f => f.asset_id === p.asset_id)?.visual).filter(Boolean) as string[]);
  const [said, setSaid] = useState<string | null>(null);
  const { data: housing } = useQuery(housingQuery);
  const story = [...(housing?.past_leases ?? []).map(l => ({ at: l.started_at, label: `🔑 ${l.title}` })),
    ...(housing?.owned ?? []).map(o => ({ at: "", label: `🏡 Propriétaire : ${o.name}` }))];

  return <div className="space-y-4">
    <section className="space-y-2 rounded-2xl bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Vivre chez moi</h2>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}><DailyActions /></Suspense>
      <div className="grid grid-cols-2 gap-2">
        {[...kinds].filter(k => MOMENTS[k]).map(k => <Button key={k} variant="outline" className="h-auto min-h-14 whitespace-normal" onClick={() => setSaid(MOMENTS[k]![1])}>{MOMENTS[k]![0]}</Button>)}
        {kinds.has("tv") && <Button asChild variant="outline" className="min-h-14"><Link to="/jt">📺 Regarder le JT</Link></Button>}
      </div>
      {said && <p className="rounded-lg bg-muted p-3 text-sm animate-page">{said}</p>}
      {kinds.size === 0 && <p className="text-xs text-muted-foreground">Installe des meubles pour débloquer des petits moments (canapé, télé, lit…).</p>}
    </section>

    <HomeInvitesPanel />
    <section className="grid grid-cols-3 gap-2" aria-label="Raccourcis">
      {([["/boutique", "🛍️", "Boutique"], ["/style", "👕", "Style"], ["/patrimoine", "💼", "Patrimoine"], ["/famille", "👨‍👩‍👧", "Famille"], ["/agenda", "📅", "Agenda"], ["/carte", "🗺️", "Carte"]] as const).map(([to, e, l]) =>
        <Button key={to} asChild variant="outline" className="h-auto min-h-16 flex-col gap-1 p-2"><Link to={to}><span className="text-xl">{e}</span><span className="text-xs">{l}</span></Link></Button>)}
    </section>

    {story.length > 0 && <section className="rounded-2xl bg-card p-4">
      <h2 className="mb-2 font-heading text-lg font-bold">Mon parcours de logement</h2>
      <ol className="space-y-1 border-l-2 border-primary pl-3 text-sm">{story.map((s, i) => <li key={i}>{s.label}{s.at && <span className="text-xs text-muted-foreground"> · depuis le {new Date(s.at).toLocaleDateString("fr-FR")}</span>}</li>)}
        <li className="font-semibold">🏠 Aujourd'hui : {home.name}</li></ol>
    </section>}
  </div>;
}
