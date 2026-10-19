import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { unionAction, unionQuery, type UnionCampaign, type UnionState } from "@/services/game";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/syndicats")({
  head: () => ({ meta: gameMeta("Syndicats", "Rejoignez un syndicat, lancez une revendication et faites grève.") }),
  component: UnionsPage,
});

const STATUS = { collecte: "Collecte de soutiens", greve: "En grève", gagnee: "Gagnée", perdue: "Perdue", abandonnee: "Abandonnée" } as const;
const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Bar({ value, goal, label }: { value: number; goal: number; label: string }) {
  return <div className="space-y-1">
    <div className="flex justify-between text-xs"><span>{label}</span><span>{value}/100 (objectif {goal})</span></div>
    <div className="relative h-3 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${goal}%` }} />
    </div>
  </div>;
}

function Campaign({ k, st, member }: { k: UnionCampaign; st: UnionState; member: boolean }) {
  const act = useLifeMutation(unionAction, "C'est fait");
  const s = st.settings; const now = new Date(st.now).getTime();
  const striking = k.status === "greve" && k.strike_from && k.ends_at && now >= new Date(k.strike_from).getTime() && now < new Date(k.ends_at).getTime();
  return <div className="space-y-2 rounded-lg border border-border p-3">
    <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">« {k.demand} »</p>
      <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{STATUS[k.status]}</span></div>
    <p className="text-xs text-muted-foreground">Par {k.author.name} · {k.supporters} soutien(s) joueur · {k.strikers} gréviste(s)</p>
    {k.status === "collecte" && <><Bar value={k.support} goal={s.support_threshold} label="Soutien" />
      <p className="text-xs text-muted-foreground">Fin de la collecte : {fmt(k.collect_ends)}</p>
      {member && (k.i_support ? <p className="text-sm text-primary">Vous soutenez cette revendication.</p>
        : <Button className="h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ command: "support", campaign_id: k.id })}>Soutenir (+{s.player_support})</Button>)}</>}
    {k.status === "greve" && <><Bar value={k.pressure} goal={s.success_threshold} label="Pression" />
      {k.ends_at && <p className="text-xs text-muted-foreground">Fin de la grève : {fmt(k.ends_at)}</p>}
      {member && striking && (k.struck_today ? <p className="text-sm text-primary">Vous faites grève aujourd'hui ({k.my_days} jour(s) au total).</p>
        : <Button className="h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ command: "strike", campaign_id: k.id })}>
            Faire grève aujourd'hui (−{s.strike_energy} énergie{st.daily_wage > 0 && `, −${st.daily_wage} crédits`})</Button>)}</>}
    {k.my_prime != null && <p className="text-sm font-semibold text-primary">Prime reçue : {k.my_prime} crédits</p>}
  </div>;
}

function UnionsPage() {
  const { data: st, isError, isLoading } = useQuery(unionQuery);
  const act = useLifeMutation(async (i: Parameters<typeof unionAction>[0]) => { await unionAction(i); setTxt(""); setRid(crypto.randomUUID()); }, "C'est fait");
  const [txt, setTxt] = useState(""); const [rid, setRid] = useState(() => crypto.randomUUID());
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Megaphone className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Syndicats</h1><p className="text-sm text-muted-foreground">Défendez vos conditions de travail.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Syndicats et grèves : Disponible dans une prochaine étape.</p>}
    {st && <>
      {!st.employed && !st.my_union && <p className="rounded-xl border border-border bg-card p-4 text-sm">Il faut avoir un emploi pour se syndiquer. Trouvez un travail dans la page Vie.</p>}
      {st.unions.map(u => {
        const member = st.my_union === u.id; const open = u.campaigns.some(k => k.status === "collecte" || k.status === "greve");
        return <section key={u.id} className={`space-y-3 rounded-xl border bg-card p-4 ${member ? "border-primary" : "border-border"}`}>
          <div><h2 className="font-heading text-lg font-bold">{u.name}</h2><p className="text-sm text-muted-foreground">{u.motto} · {u.members} adhérent(s) joueur(s)</p></div>
          {member ? <Button variant="ghost" className="h-11 w-full" onClick={() => { if (confirm("Quitter ce syndicat ?")) act.mutate({ command: "leave" }); }}>Quitter le syndicat</Button>
            : !st.my_union && st.employed && <Button className="h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ command: "join", union_id: u.id })}>Adhérer ({st.settings.join_fee} crédits)</Button>}
          {member && !open && <div className="space-y-2">
            <Textarea value={txt} onChange={e => setTxt(e.target.value)} maxLength={300} placeholder="Votre revendication (ex. : hausse des salaires)" className="min-h-20" />
            <Button className="h-12 w-full" disabled={txt.trim().length < 10 || act.isPending} onClick={() => act.mutate({ command: "propose", request_id: rid, text: txt })}>Lancer la revendication</Button>
          </div>}
          {u.campaigns.map(k => <Campaign key={k.id} k={k} st={st} member={member} />)}
        </section>;
      })}
      <p className="text-xs text-muted-foreground">Une revendication collecte des soutiens pendant {st.settings.collect_days} jours (salariés simulés + {st.settings.player_support} par joueur). Au-dessus de {st.settings.support_threshold}, la grève dure {st.settings.strike_days} jours : chaque jour de grève coûte de l'énergie et une journée de salaire (seulement si votre solde suffit). Si la pression atteint {st.settings.success_threshold}, les grévistes reçoivent une prime (au moins {st.settings.prime_min} crédits) et +{st.settings.win_reputation} réputation.</p>
    </>}
  </div>;
}
