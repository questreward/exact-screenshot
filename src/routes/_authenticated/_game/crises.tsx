import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, HandCoins, HandHeart, LoaderCircle, Megaphone, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLifeMutation } from "@/components/game/LifeControls";
import { EffectsList } from "@/components/game/EffectsList";
import { cityEffectsQuery, crisesQuery, crisisAction, type CrisesState, type Crisis } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { INDICATOR_LABELS, crisisRecovery, formatEuros } from "@/game/society";

export const Route = createFileRoute("/_authenticated/_game/crises")({
  head: () => ({ meta: gameMeta("Crises", "Inondations, pannes, crises économiques : choisissez une réponse et suivez ses conséquences.") }),
  component: CrisesPage,
});

const STATUS = { urgence: "Urgence", gestion: "Réponse en cours", terminee: "Terminée" } as const;
const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function CrisisCard({ c, st }: { c: Crisis; st: CrisesState }) {
  const act = useLifeMutation(crisisAction, "C'est fait");
  const [amount, setAmount] = useState(20); const [rid, setRid] = useState(() => crypto.randomUUID());
  const don = useLifeMutation(async (i: Parameters<typeof crisisAction>[0]) => { await crisisAction(i); setRid(crypto.randomUUID()); }, "Merci pour votre don");
  const resident = st.city === st.my_city; const active = c.status !== "terminee";
  const drop = Math.abs(c.impact[c.main_indicator] ?? 0);
  const chosen = st.options.find(o => o.id === c.option_id);
  return <article className={`space-y-3 rounded-xl border bg-card p-4 ${c.status === "urgence" ? "border-destructive/50" : "border-border"}`}>
    <div className="flex items-start justify-between gap-2">
      <div><h2 className="font-heading text-lg font-bold">{c.title}</h2>
        <p className="text-xs text-muted-foreground">{c.national ? "Crise nationale" : c.district ? `Quartier ${c.district}` : "Toute la ville"} · jusqu'au {fmt(c.ends_at)}</p></div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${c.status === "urgence" ? "bg-destructive/15 text-destructive" : "bg-muted"}`}>{STATUS[c.status]}</span>
    </div>
    <p className="text-sm">{c.description}</p>
    <p className="text-xs text-muted-foreground">Touché : {Object.entries(c.impact).map(([k, v]) => `${INDICATOR_LABELS[k] ?? k} ${v}`).join(" · ")}</p>

    {c.status === "urgence" && <div className="space-y-2">
      <p className="flex items-center gap-1 text-sm font-semibold"><Clock className="h-4 w-4" />{st.is_mayor ? "À vous de choisir" : "La mairie doit choisir"} avant le {fmt(c.decide_by)}</p>
      {st.options.map(o => <div key={o.id} className="space-y-1 rounded-lg border border-border p-3">
        <p className="font-semibold">{o.label} <span className="text-xs font-normal text-muted-foreground">· {formatEuros(o.cost)}</span></p>
        <p className="text-sm">{o.description}</p>
        <p className="text-xs"><span className="text-primary">+ {o.pros}</span> · <span className="text-destructive">− {o.cons}</span></p>
        <p className="text-xs text-muted-foreground">
          {o.immediate_pct > 0 && `${INDICATOR_LABELS[c.main_indicator]} +${crisisRecovery(drop, o.immediate_pct)} tout de suite. `}
          {o.later_pct > 0 && `${INDICATOR_LABELS[c.main_indicator]} +${crisisRecovery(drop, o.later_pct)} dans ${o.later_days} jours. `}
          {o.side_delta !== 0 && `${INDICATOR_LABELS[c.side_indicator]} ${o.side_delta}. `}
          Pour : {o.favorable}. Contre : {o.unfavorable}.</p>
        {st.is_mayor && <Button className="mt-1 h-12 w-full" disabled={act.isPending} onClick={() => { if (confirm(`Choisir « ${o.label} » ?`)) act.mutate({ command: "decide", crisis_id: c.id, option_id: o.id }); }}>Choisir</Button>}
      </div>)}
      {!st.is_mayor && <p className="text-xs text-muted-foreground">Sans décision du maire, le conseil municipal choisit à l'échéance.</p>}
    </div>}
    {chosen && <p className="rounded-lg bg-muted p-3 text-sm">Réponse choisie par {c.decided_by === "maire" ? "le maire" : "le conseil municipal"} : <b>{chosen.label}</b>.</p>}

    <p className="text-xs text-muted-foreground">{c.helpers} bénévole(s) · {c.protests} protestation(s) · {c.donations} crédits de dons</p>
    {active && resident && <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-12" disabled={c.my_actions.includes("aide") || st.energy < st.settings.help_energy || act.isPending} onClick={() => act.mutate({ command: "help", crisis_id: c.id })}>
          <HandHeart />{c.my_actions.includes("aide") ? "Vous avez aidé" : `Aider (−${st.settings.help_energy} énergie)`}</Button>
        <Button variant="outline" className="h-12" disabled={c.my_actions.includes("protestation") || act.isPending} onClick={() => act.mutate({ command: "protest", crisis_id: c.id })}>
          <Megaphone />{c.my_actions.includes("protestation") ? "Vous protestez" : "Protester"}</Button>
      </div>
      <div className="flex gap-2">
        <Input type="number" inputMode="numeric" className="h-12 w-28" min={5} max={500} value={amount} onChange={e => setAmount(Number(e.target.value))} />
        <Button variant="outline" className="h-12 flex-1" disabled={amount < 5 || amount > 500 || don.isPending} onClick={() => don.mutate({ command: "donate", crisis_id: c.id, request_id: rid, amount })}><HandCoins />Donner (solidarité)</Button>
      </div>
      <p className="text-xs text-muted-foreground">Aider donne +{st.settings.help_reputation} réputation et accélère la reprise. À partir de {st.settings.protest_threshold} protestations, la satisfaction baisse et un maire joueur perd {st.settings.protest_political} points de réputation politique.</p>
    </div>}
    <EffectsList effects={c.effects} />
  </article>;
}

function Upcoming({ city }: { city: string }) {
  const { data } = useQuery(cityEffectsQuery(city));
  if (!data || data.upcoming.length === 0) return null;
  return <section className="space-y-2 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">À venir dans la ville</h2>
    <EffectsList title="Conséquences programmées" effects={data.upcoming.slice(0, 10).map(e => ({ ...e, applied: false }))} />
  </section>;
}

function CrisesPage() {
  const [city, setCity] = useState<string | null>(null);
  const { data: st, isError, isLoading } = useQuery(crisesQuery(city));
  const active = st?.crises.filter(c => c.status !== "terminee") ?? [];
  const past = st?.crises.filter(c => c.status === "terminee") ?? [];
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Siren className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Crises</h1><p className="text-sm text-muted-foreground">Aucune bonne réponse unique : à chacun d'arbitrer.</p></div></header>
    {st && <div className="flex gap-2 overflow-x-auto pb-1">{st.cities.map(c => <Button key={c.id} variant={st.city === c.id ? "default" : "outline"} className="h-11 shrink-0" onClick={() => setCity(c.id)}>{c.name}</Button>)}</div>}
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Crises : Disponible dans une prochaine étape.</p>}
    {st && <>
      {active.length === 0 && <p className="rounded-xl border border-border bg-card p-4 text-sm">Aucune crise en cours ici. Tout est calme… pour l'instant.</p>}
      {active.map(c => <CrisisCard key={c.id} c={c} st={st} />)}
      <Upcoming city={st.city} />
      {past.length > 0 && <h2 className="font-heading text-lg font-bold">Crises passées</h2>}
      {past.map(c => <CrisisCard key={c.id} c={c} st={st} />)}
    </>}
  </div>;
}
