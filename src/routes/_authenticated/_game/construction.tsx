import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Hammer, LoaderCircle, Maximize2, PaintRoller, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { constructionQuery, orderWorks, type BuildProperty, type ConstructionState } from "@/services/game";
import { serviceAmount } from "@/game/services";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/construction")({
  head: () => ({ meta: gameMeta("Construction", "Rénover ou agrandir ton logement : la valeur de ton bien et son loyer augmentent.") }),
  component: ConstructionPage,
});

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const KIND: Record<string, string> = { renovation: "Rénovation", extension: "Agrandissement" };

function ConstructionPage() {
  const qc = useQueryClient();
  const { data: s, isLoading, isError } = useQuery(constructionQuery);
  const [builder, setBuilder] = useState<string>("");
  const act = useMutation({
    mutationFn: (v: { property: string; kind: "renovation" | "extension" }) => orderWorks(builder || null, v.property, v.kind),
    onSuccess: r => { toast.success(r?.already ? "Déjà fait." : `Travaux terminés : +${eur(r?.gain ?? 0)} de valeur`); ["construction", "economy", "agency", "shop", "character", "services"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <div className="flex justify-center py-20"><LoaderCircle className="animate-spin" /></div>;
  if (isError || !s) return <p className="py-10 text-center text-muted-foreground">La construction n'est pas encore installée sur le serveur.</p>;
  const others = s.builders.filter(b => !b.mine);
  const pct = others.find(b => b.id === builder)?.percent ?? null;
  return <div className="space-y-5 animate-rise">
    <div className="flex items-center gap-3"><Hammer className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Construction</h1>
      <p className="text-sm text-muted-foreground">Rénove ou agrandis les biens que tu possèdes. Les travaux sont faits tout de suite.</p></div></div>
    <Tabs defaultValue="travaux">
      <TabsList className="grid h-auto w-full grid-cols-2">
        <TabsTrigger value="travaux" className="h-11">Mes travaux</TabsTrigger>
        <TabsTrigger value="mienne" className="h-11">Mon entreprise</TabsTrigger>
      </TabsList>
      <TabsContent value="travaux" className="space-y-4">
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <p className="font-semibold">Qui fait les travaux ?</p>
          <div className="grid gap-2">
            <Button variant={builder === "" ? "default" : "outline"} className="h-12 justify-start" onClick={() => setBuilder("")}>Entreprise fictive CIVITAS · prix normal</Button>
            {others.map(b => <Button key={b.id} variant={builder === b.id ? "default" : "outline"} className="h-12 justify-start" onClick={() => setBuilder(b.id)}>
              {b.name} · tarif {b.percent} %{b.rating != null ? ` · ${b.rating}/5` : ""}</Button>)}
          </div>
          {!others.length && <p className="text-xs text-muted-foreground">Aucune entreprise de construction de joueur dans ta ville pour l'instant.</p>}
        </div>
        <p className="text-sm text-muted-foreground">Rénovation : {s.settings.renov_percent} % du prix du bien, +{s.settings.renov_gain} % de valeur, une fois par an.
          Agrandissement : {s.settings.ext_percent} % du prix, +{s.settings.ext_m2} m², +{s.settings.ext_gain} % de valeur et un loyer plus élevé ({s.settings.ext_max} au maximum).</p>
        {!s.properties.length && <div className="rounded-xl border border-border bg-card p-4 text-sm">Tu ne possèdes aucun bien immobilier.
          <Button asChild variant="outline" className="mt-3 h-11 w-full"><Link to="/boutique">Voir les biens à vendre</Link></Button></div>}
        {s.properties.map(p => <PropertyCard key={p.catalog_id} p={p} pct={pct} busy={act.isPending} onOrder={kind => act.mutate({ property: p.catalog_id, kind })} />)}
        {s.history.length > 0 && <div className="space-y-2"><h2 className="font-heading text-lg font-bold">Mes chantiers</h2>
          {s.history.map((h, i) => <div key={i} className="flex justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm">
            <span>{KIND[h.kind]} — {h.name}<br /><span className="text-xs text-muted-foreground">{h.builder}</span></span>
            <span className="text-right">{eur(h.amount)}<br /><span className="text-xs text-muted-foreground">+{eur(h.gain)}</span></span></div>)}</div>}
      </TabsContent>
      <TabsContent value="mienne" className="space-y-4">
        {s.mine ? <MyBuilder m={s.mine} />
          : <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <p>Tu n'as pas d'entreprise de construction. Crée une entreprise du type <strong>« Entreprise de construction »</strong> depuis Patrimoine.</p>
              <Button asChild variant="outline" className="mt-3 h-11"><Link to="/patrimoine"><Store />Aller à Patrimoine</Link></Button>
            </div>}
      </TabsContent>
    </Tabs>
  </div>;
}

function PropertyCard({ p, pct, busy, onOrder }: { p: BuildProperty; pct: number | null; busy: boolean; onOrder: (k: "renovation" | "extension") => void }) {
  const price = (ref: number) => pct == null ? ref : serviceAmount(ref, pct);
  return <div className="space-y-3 rounded-xl border border-border bg-card p-4">
    <div><p className="font-semibold">{p.name}</p>
      <p className="text-xs text-muted-foreground">{p.surface} m²{p.extension_m2 ? ` (dont +${p.extension_m2} m² agrandis)` : ""} · valeur {eur(p.value)}
        {p.renovated_at ? ` · rénové le ${new Date(p.renovated_at).toLocaleDateString("fr-FR")}` : ""}</p></div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button className="h-12" disabled={busy || !p.can_renovate} onClick={() => onOrder("renovation")}>
        <PaintRoller />{p.can_renovate ? `Rénover · ${eur(price(p.renov_ref))}` : "Déjà rénové cette année"}</Button>
      <Button variant="outline" className="h-12" disabled={busy || !p.can_extend} onClick={() => onOrder("extension")}>
        <Maximize2 />{p.can_extend ? `Agrandir · ${eur(price(p.ext_ref))}` : "Agrandissement maximum"}</Button>
    </div>
  </div>;
}

function MyBuilder({ m }: { m: NonNullable<ConstructionState["mine"]> }) {
  return <div className="space-y-3">
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-heading text-lg font-bold">{m.name}</p>
      <p className="text-sm text-muted-foreground">Caisse : {eur(m.balance ?? 0)} · tarif {m.percent} %</p>
      <Button asChild variant="outline" className="mt-3 h-11"><Link to="/services">Changer mon tarif dans Services</Link></Button>
    </div>
    <h2 className="font-heading text-lg font-bold">Chantiers des joueurs</h2>
    {!m.works.length && <p className="text-sm text-muted-foreground">Aucun chantier pour l'instant.</p>}
    {m.works.map((w, i) => <div key={i} className="flex justify-between rounded-lg border border-border bg-card p-3 text-sm"><span>{KIND[w.kind]} — {w.name} · {w.client}</span><span>{eur(w.amount)}</span></div>)}
    <h2 className="font-heading text-lg font-bold">Clients fictifs</h2>
    {!m.npc_weeks.length && <p className="text-sm text-muted-foreground">Les clients fictifs arrivent à la fin de chaque semaine.</p>}
    {m.npc_weeks.map(n => <div key={n.week} className="flex justify-between rounded-lg border border-border bg-card p-3 text-sm"><span>{n.clients} clients</span><span>{eur(n.revenue)}</span></div>)}
  </div>;
}
